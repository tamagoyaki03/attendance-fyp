import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  InputAdornment,
  Snackbar,
  Alert,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  Mail,
  Search,
  FileCopy,
  Cancel,
  ContentPaste,
} from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import MCSubmissions from "../components/MCSubmission";
import LeaveRequestList from "../components/LeaveRequestList";
import AbsenceTable from "../components/AbsenceTable";
import supabase from "../config/supabaseClient";

export default function AbsenceManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [user, setUser] = useState(null);
  const [absenceStats, setAbsenceStats] = useState({
    totalAbsences: 0,
    emailsSent: 0,
    mcSubmitted: 0,
    pendingReview: 0
  });
  const [loading, setLoading] = useState(true);

  // Get user data
  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem("user") || "null");
    if (userData && userData.id) {
      setUser(userData);
    }
  }, []);

  // Fetch absence statistics
  useEffect(() => {
    if (!user?.id) return;
    fetchAbsenceStats();
  }, [user?.id]);

  const fetchAbsenceStats = async () => {
    try {
      setLoading(true);
      console.log("Fetching absence stats for lecturer:", user.id);

      // Get lecturer's courses (both lecture and tutorial)
      const [lectureRes, tutorialRes] = await Promise.all([
        supabase
          .from("course_lecture")
          .select("id")
          .eq("lecturer_id", user.id),
        supabase
          .from("course_tutorial")
          .select("id")
          .eq("lecturer_id", user.id)
      ]);

      if (lectureRes.error) throw lectureRes.error;
      if (tutorialRes.error) throw tutorialRes.error;

      const lectureIds = lectureRes.data?.map(course => course.id) || [];
      const tutorialIds = tutorialRes.data?.map(course => course.id) || [];

      console.log("Found lecture IDs:", lectureIds);
      console.log("Found tutorial IDs:", tutorialIds);

      if (lectureIds.length === 0 && tutorialIds.length === 0) {
        setAbsenceStats({
          totalAbsences: 0,
          emailsSent: 0,
          mcSubmitted: 0,
          pendingReview: 0
        });
        return;
      }

      // Get today's date for filtering
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      // Get attendance sessions for today (or recent sessions)
      const [lectureSessionsRes, tutorialSessionsRes] = await Promise.all([
        lectureIds.length > 0 ? supabase
          .from("attendance_session")
          .select(`
            id, 
            course_lecture_id, 
            created_at,
            status
          `)
          .in("course_lecture_id", lectureIds)
          .gte("created_at", todayString) // Today's sessions or later
          .not("status", "is", null) // Only completed sessions
        : { data: [], error: null },
        
        tutorialIds.length > 0 ? supabase
          .from("attendance_session")
          .select(`
            id, 
            course_tutorial_id, 
            created_at,
            status
          `)
          .in("course_tutorial_id", tutorialIds)
          .gte("created_at", todayString) // Today's sessions or later
          .not("status", "is", null) // Only completed sessions
        : { data: [], error: null }
      ]);

      if (lectureSessionsRes.error) throw lectureSessionsRes.error;
      if (tutorialSessionsRes.error) throw tutorialSessionsRes.error;

      const lectureSessions = lectureSessionsRes.data || [];
      const tutorialSessions = tutorialSessionsRes.data || [];
      const allSessions = [...lectureSessions, ...tutorialSessions];

      console.log("Found today's attendance sessions:", allSessions);

      if (allSessions.length === 0) {
        setAbsenceStats({
          totalAbsences: 0,
          emailsSent: 0,
          mcSubmitted: 0,
          pendingReview: 0
        });
        return;
      }

      const sessionIds = allSessions.map(session => session.id);

      // Get all students enrolled in lecturer's courses
      const [lectureEnrollmentsRes, tutorialEnrollmentsRes] = await Promise.all([
        lectureIds.length > 0 ? supabase
          .from("enrollment_lecture")
          .select("user_id, course_id")
          .in("course_id", lectureIds)
        : { data: [], error: null },
        
        tutorialIds.length > 0 ? supabase
          .from("enrollment_tutorial")
          .select("user_id, tutorial_id")
          .in("tutorial_id", tutorialIds)
        : { data: [], error: null }
      ]);

      if (lectureEnrollmentsRes.error) throw lectureEnrollmentsRes.error;
      if (tutorialEnrollmentsRes.error) throw tutorialEnrollmentsRes.error;

      const lectureEnrollments = lectureEnrollmentsRes.data || [];
      const tutorialEnrollments = tutorialEnrollmentsRes.data || [];

      // Get attendance records for today's sessions
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance_record")
        .select(`
          user_id,
          attendance_session_id,
          status,
          attendance_session (
            course_lecture_id,
            course_tutorial_id,
            created_at,
          )
        `)
        .in("attendance_session_id", sessionIds);

      if (attendanceError) throw attendanceError;

      console.log("Attendance records:", attendanceRecords);

      // Calculate total absences
      let totalAbsences = 0;

      allSessions.forEach(session => {
        // Get enrolled students for this session
        let enrolledStudentIds = [];
        
        if (session.course_lecture_id) {
          enrolledStudentIds = lectureEnrollments
            .filter(enrollment => enrollment.course_id === session.course_lecture_id)
            .map(enrollment => enrollment.user_id);
        } else if (session.course_tutorial_id) {
          enrolledStudentIds = tutorialEnrollments
            .filter(enrollment => enrollment.tutorial_id === session.course_tutorial_id)
            .map(enrollment => enrollment.user_id);
        }

        // Get students who attended this session
        const attendedStudentIds = attendanceRecords
          .filter(record => record.attendance_session_id === session.id)
          .map(record => record.user_id);

        // Calculate absences for this session
        const absentStudentIds = enrolledStudentIds.filter(
          studentId => !attendedStudentIds.includes(studentId)
        );

        totalAbsences += absentStudentIds.length;
      });

      // Get MC submissions count for lecturer's courses
      const { data: mcSubmissions, error: mcError } = await supabase
        .from("mc_submissions")
        .select("id, status, course_id")
        .or(`course_id.in.(${[...lectureIds, ...tutorialIds].join(',')})`);

      if (mcError && mcError.code !== 'PGRST116') { // Ignore "relation does not exist" error
        console.error("Error fetching MC submissions:", mcError);
      }

      const mcSubmitted = mcSubmissions?.length || 0;
      const pendingReview = mcSubmissions?.filter(mc => mc.status === 'pending')?.length || 0;

      // For now, assume emails are sent for all absences (you can implement actual email tracking)
      const emailsSent = totalAbsences;

      console.log("Calculated stats:", {
        totalAbsences,
        emailsSent,
        mcSubmitted,
        pendingReview
      });

      setAbsenceStats({
        totalAbsences,
        emailsSent,
        mcSubmitted,
        pendingReview
      });

    } catch (error) {
      console.error("Error fetching absence stats:", error);
      setAbsenceStats({
        totalAbsences: 0,
        emailsSent: 0,
        mcSubmitted: 0,
        pendingReview: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = () => {
    setSnackbar({ open: true, message: "Email settings updated successfully.", severity: "success" });
  };

  const handleTabChange = (_e, newValue) => setActiveTab(newValue);

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
    input: { color: "#0f172a" },
  };

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
        <div>
          <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left" style={{ color: "#0f172a", marginBottom: 0 }}>
            Absence Management
          </h2>
          <div className="flex justify-between items-center">
            <p className="text-[14px] font-inter font-normal leading-[17px] text-left" style={{ color: "#374151" }}>
              Manage absences, MC submissions and leave requests
            </p>
          </div>
        </div>

        <Box sx={{ borderBottom: 1, borderColor: "#e5e7eb", mt: 1}}>
          <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
            <Tab label={<Box display="flex" alignItems="center"><Cancel fontSize="small" sx={{ mr: 1 }} /> Absences</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><FileCopy fontSize="small" sx={{ mr: 1 }} /> MC Submissions</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><ContentPaste fontSize="small" sx={{ mr: 1 }} /> Leave Requests</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><Mail fontSize="small" sx={{ mr: 1 }} /> Email Settings</Box>} />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <>
            <div className="grid grid-cols-4 gap-[10px] mt-[20px]">
              {loading ? (
                // Loading state
                Array.from({ length: 4 }).map((_, idx) => (
                  <Card key={idx} className="border" sx={{ background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
                    <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '120px' }}>
                      <CircularProgress size={24} />
                    </CardContent>
                  </Card>
                ))
              ) : (
                [
                  { 
                    title: "Total Absences", 
                    value: absenceStats.totalAbsences, 
                    subtitle: "Today's absence count" 
                  },
                  { 
                    title: "Emails Sent", 
                    value: absenceStats.emailsSent, 
                    subtitle: absenceStats.totalAbsences > 0 ? `${Math.round((absenceStats.emailsSent / absenceStats.totalAbsences) * 100)}% of absences` : "No absences today"
                  },
                  { 
                    title: "MC Submitted", 
                    value: absenceStats.mcSubmitted, 
                    subtitle: absenceStats.totalAbsences > 0 ? `${Math.round((absenceStats.mcSubmitted / absenceStats.totalAbsences) * 100)}% of absences` : "No submissions"
                  },
                  { 
                    title: "Pending Review", 
                    value: absenceStats.pendingReview, 
                    subtitle: absenceStats.totalAbsences > 0 ? `${Math.round((absenceStats.pendingReview / absenceStats.totalAbsences) * 100)}% of absences` : "No pending reviews"
                  },
                ].map((item, idx) => (
                  <Card key={idx} className="border" sx={{ background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
                    <CardHeader title={<Typography variant="h6" fontWeight="bold">{item.title}</Typography>} />
                    <CardContent sx={{ pt: 0 }}>
                      <Typography variant="h5" fontWeight="bold" color="text.primary">{item.value}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.subtitle}</Typography>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader sx={{ pb: 0 }}
                title={<Typography variant="h6" fontWeight="bold">Absence Records</Typography>}
                subheader={<Typography variant="body2" color="text.secondary">Manage and track student absences</Typography>}
              />

              <CardContent>
                <div className="flex items-center gap-4 w-full mb-[10px]">
                  <TextField
                    variant="outlined"
                    placeholder="Search students..."
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    size="small"
                    sx={{ borderRadius: 1, flex: 1, ...inputSx }}
                  />
                </div>

                <AbsenceTable />
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 1 && (
          <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <CardHeader sx={{ pb: 0 }}
              title={<Typography variant="h6" fontWeight="bold" color="text.primary">Medical Certificate & Absence Letter Submissions</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Review and approve student absence documentation</Typography>}
            />
            <CardContent>
              <MCSubmissions />
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <CardHeader sx={{ pb: 0 }}
              title={<Typography variant="h6" fontWeight="bold">Leave Requests</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Review and manage student leave requests</Typography>}
            />
            <LeaveRequestList />
          </Card>
        )}

        {activeTab === 3 && (
          <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0", p: 2 }}>
            <CardHeader
              title={<Typography variant="h6" color="text.primary" fontWeight="bold">Email Notification Settings</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Configure automated absence email notifications</Typography>}
            />
            <CardContent>
              <TextField select fullWidth label="Email Timing" defaultValue="immediate" margin="normal">
                <MenuItem value="immediate">Immediate (After class)</MenuItem>
                <MenuItem value="daily">Daily Summary</MenuItem>
                <MenuItem value="weekly">Weekly Summary</MenuItem>
              </TextField>

              <TextField select fullWidth label="Reminder Frequency" defaultValue="3days" margin="normal">
                <MenuItem value="none">No Reminders</MenuItem>
                <MenuItem value="1day">Every Day</MenuItem>
                <MenuItem value="3days">Every 3 Days</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
              </TextField>

              <Box mt={2}>
                <Typography variant="body2" gutterBottom>Email Template</Typography>
                <textarea
                  rows={10}
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #e5e7eb", background: "#ffffff", color: "#0f172a" }}
                  defaultValue={`Dear [Student Name],

We have noticed that you were absent from [Course Name] on [Absence Date].

According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. Please submit your documentation within 7 days of this notice through the student portal.

If you have any questions or need assistance, please contact the Student Affairs Office.

Thank you,
[University Name] Attendance Management System`}
                />
              </Box>

              <TextField fullWidth margin="normal" label="CC Emails" defaultValue="studentaffairs@university.edu, academicoffice@university.edu" />

              <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={handleUpdateTemplate}>
                Update Email Settings
              </Button>
            </CardContent>
          </Card>
        )}

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </main>
    </div>
  );
}