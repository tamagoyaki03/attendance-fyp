import React, { useState, useEffect, useCallback } from "react";
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

const DEFAULT_EMAIL_TEMPLATE = `Dear [Student Name],

We have noticed that you were absent from [Course Code] - [Course Name] on [Absence Date].

According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. Please submit your documentation within 7 days using the following link: [Submission Link].

If you have any questions or need assistance, please contact the Student Affairs Office.

Thank you`;

export default function AbsenceManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [user, setUser] = useState(null);
  const [absenceStats, setAbsenceStats] = useState({
    totalAbsences: 0,
    mcSubmitted: 0,
    pendingReview: 0
  });
  const [absences, setAbsences] = useState([]);
  const [absencesLoading, setAbsencesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Email settings state
  const [emailSettings, setEmailSettings] = useState({
    emailTemplate: DEFAULT_EMAIL_TEMPLATE
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Get user data
  useEffect(() => {
    const userData = JSON.parse(sessionStorage.getItem("user") || "null");
    if (userData && userData.id) {
      setUser(userData);
    }
  }, []);

  // Fetch email settings when user is loaded
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchEmailSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('email_settings')
          .select('*')
          .eq('lecturer_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('Error fetching email settings:', error);
          return;
        }

        if (data) {
          setEmailSettings({
            emailTemplate: data.email_template || DEFAULT_EMAIL_TEMPLATE
          });
        }
      } catch (error) {
        console.error('Error loading email settings:', error);
      }
    };

    fetchEmailSettings();
  }, [user?.id]);

  const fetchAbsenceStats = useCallback(async () => {
    try {
      setLoading(true);
      setAbsencesLoading(true);
      console.log("Fetching absence stats for lecturer:", user.id);

      // Get lecturer's courses (both lecture and tutorial)
      const [lectureRes, tutorialRes] = await Promise.all([
        supabase
          .from("course_lecture")
          .select("id, course_code, course_title")
          .eq("lecturer_id", user.id),
        supabase
          .from("course_tutorial")
          .select("id, course_code, course_title")
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
          mcSubmitted: 0,
          pendingReview: 0
        });
        setAbsences([]);
        setAbsencesLoading(false);
        setLoading(false);
        return;
      }

      // Get all attendance sessions for these courses (all time)
      const sessionFilters = [];
      if (lectureIds.length > 0) sessionFilters.push(`course_lecture_id.in.(${lectureIds.join(',')})`);
      if (tutorialIds.length > 0) sessionFilters.push(`course_tutorial_id.in.(${tutorialIds.join(',')})`);

      let sessionQuery = supabase
        .from("attendance_session")
        .select(`
          id, 
          course_lecture_id,
          course_tutorial_id,
          date,
          start_time,
          end_time,
          created_at
        `);

      if (sessionFilters.length > 0) {
        sessionQuery = sessionQuery.or(sessionFilters.join(','));
      }

      const { data: allSessions, error: sessionsError } = await sessionQuery;

      if (sessionsError) throw sessionsError;

      console.log("Found today's attendance sessions:", allSessions);

      if (!allSessions || allSessions.length === 0) {
        setAbsenceStats({
          totalAbsences: 0,
          mcSubmitted: 0,
          pendingReview: 0
        });
        setAbsences([]);
        setAbsencesLoading(false);
        setLoading(false);
        return;
      }

      const sessionIds = allSessions.map(session => session.id);

      // Get all students enrolled in lecturer's courses
      let allEnrollments = [];
      
      if (lectureIds.length > 0) {
        const { data: lectureEnrollments, error: lectureEnrollError } = await supabase
          .from("enrollment_lecture")
          .select("id, student_id, course_id, users(name, email)")
          .in("course_id", lectureIds);
          
        if (lectureEnrollError) throw lectureEnrollError;
        allEnrollments = [...allEnrollments, ...lectureEnrollments.map(e => ({ ...e, enrollmentType: "lecture" }))];
      }
      
      if (tutorialIds.length > 0) {
        const { data: tutorialEnrollments, error: tutorialEnrollError } = await supabase
          .from("enrollment_tutorial")
          .select("id, student_id, tutorial_id, users(name, email)")
          .in("tutorial_id", tutorialIds);
          
        if (tutorialEnrollError) throw tutorialEnrollError;
        allEnrollments = [
          ...allEnrollments,
          ...tutorialEnrollments.map(e => ({ ...e, course_id: e.tutorial_id, enrollmentType: "tutorial" }))
        ];
      }

      console.log("All enrollments:", allEnrollments);

      // Get attendance records for today's sessions
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance_record")
        .select("session_id, lecture_enrollment_id, tutorial_enrollment_id, status")
        .in("session_id", sessionIds);

      if (attendanceError) throw attendanceError;

      console.log("Attendance records:", attendanceRecords);

      // Calculate total absences
      const courseMeta = {};
      lectureRes.data?.forEach(c => { courseMeta[c.id] = { code: c.course_code, title: c.course_title }; });
      tutorialRes.data?.forEach(c => { courseMeta[c.id] = { code: c.course_code, title: c.course_title }; });

      let totalAbsences = 0;
      const absencesList = [];

      allSessions.forEach(session => {
        // Get enrolled students for this session
        let enrolledEnrollments = [];
        const isLecture = Boolean(session.course_lecture_id);

        if (isLecture) {
          enrolledEnrollments = allEnrollments
            .filter(enrollment => enrollment.enrollmentType === "lecture" && enrollment.course_id === session.course_lecture_id);
        } else {
          enrolledEnrollments = allEnrollments
            .filter(enrollment => enrollment.enrollmentType === "tutorial" && enrollment.course_id === session.course_tutorial_id);
        }

        // Get enrollment ids that attended this session
        const attendedEnrollmentIds = attendanceRecords
          .filter(record => record.session_id === session.id)
          .map(record => isLecture ? record.lecture_enrollment_id : record.tutorial_enrollment_id);

        // Calculate absences for this session
        const absentEnrollments = enrolledEnrollments.filter(
          enrollment => !attendedEnrollmentIds.includes(enrollment.id)
        );

        console.log(`Session ${session.id}: ${enrolledEnrollments.length} enrolled, ${attendedEnrollmentIds.length} attended, ${absentEnrollments.length} absent`);
        
        totalAbsences += absentEnrollments.length;

        // Build absence entries for this session
        const courseInfo = session.course_lecture_id
          ? courseMeta[session.course_lecture_id]
          : courseMeta[session.course_tutorial_id];

        const sessionDate = session.date || session.created_at;
        const sessionTime = session.start_time || session.created_at;

        absentEnrollments.forEach(enrollment => {
          absencesList.push({
            id: `${session.id}-${enrollment.id}`,
            sessionId: session.id,
            student: enrollment.users?.name || "Unknown",
            studentId: enrollment.student_id,
            course: courseInfo?.code || courseInfo?.title || "Course",
            date: sessionDate ? new Date(sessionDate).toLocaleDateString() : "",
            time: sessionTime ? new Date(sessionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
            mcSubmitted: false,
            status: "Pending",
          });
        });
      });

      // Fetch MC submissions for these sessions to mark per-row MC status and summary stats
      const { data: mcRows, error: mcRowsError } = await supabase
        .from("mc_submissions")
        .select("student_id, session_id, status")
        .in("session_id", sessionIds);

      if (mcRowsError && mcRowsError.code !== 'PGRST116') {
        console.error("Error fetching MC submissions:", mcRowsError);
      }
      const mcMap = new Map((mcRows || []).map(r => [`${r.session_id}-${r.student_id}`, r.status]));
      const mcSubmitted = (mcRows || []).length;
      const pendingReview = (mcRows || []).filter(r => r.status === 'pending_review').length;

      // Enhance per-row data using email logs and MC submissions
      const enhancedAbsences = absencesList.map(a => {
        const key = `${a.sessionId}-${a.studentId}`;
        const mcStatus = mcMap.get(key);
        return {
          ...a,
          mcSubmitted: Boolean(mcStatus),
          status: mcStatus
            ? (mcStatus === 'pending_review'
                ? 'Under Review'
                : mcStatus === 'approved'
                  ? 'Approved'
                  : mcStatus === 'rejected'
                    ? 'Rejected'
                    : 'Under Review')
            : 'Pending'
        };
      });

      console.log("Calculated stats:", {
        totalAbsences,
        mcSubmitted,
        pendingReview
      });

      setAbsenceStats({
        totalAbsences,
        mcSubmitted,
        pendingReview
      });

      setAbsences(enhancedAbsences);
      setAbsencesLoading(false);

    } catch (error) {
      console.error("Error fetching absence stats:", error);
      setAbsenceStats({
        totalAbsences: 0,
        mcSubmitted: 0,
        pendingReview: 0
      });
      setAbsences([]);
      setAbsencesLoading(false);
    } finally {
      setLoading(false);
      setAbsencesLoading(false);
    }
  }, [user?.id]);

  // Fetch absence statistics
  useEffect(() => {
    if (!user?.id) return;
    fetchAbsenceStats();
  }, [fetchAbsenceStats, user?.id]);

  const handleUpdateTemplate = async () => {
    if (!user?.id) {
      setSnackbar({ open: true, message: "User not found. Please log in again.", severity: "error" });
      return;
    }

    // Validate template is not empty
    if (!emailSettings.emailTemplate || emailSettings.emailTemplate.trim() === "") {
      setSnackbar({ open: true, message: "Email template cannot be empty.", severity: "error" });
      return;
    }

    // Validate template has required placeholders
    const requiredPlaceholders = ["[Student Name]", "[Course Code]", "[Course Name]", "[Absence Date]", "[Submission Link]"];
    const missingPlaceholders = requiredPlaceholders.filter(
      placeholder => !emailSettings.emailTemplate.includes(placeholder)
    );

    if (missingPlaceholders.length > 0) {
      setSnackbar({ 
        open: true, 
        message: `Email template must include: ${missingPlaceholders.join(", ")}`, 
        severity: "error" 
      });
      return;
    }

    setSettingsLoading(true);
    try {
      // Check if settings exist for this lecturer
      const { data: existingSettings } = await supabase
        .from('email_settings')
        .select('lecturer_id')
        .eq('lecturer_id', user.id)
        .single();

      let result;
      if (existingSettings) {
        // Update existing settings
        result = await supabase
          .from('email_settings')
          .update({
            email_template: emailSettings.emailTemplate,
            updated_at: new Date().toISOString()
          })
          .eq('lecturer_id', user.id);
      } else {
        // Insert new settings
        result = await supabase
          .from('email_settings')
          .insert([{
            lecturer_id: user.id,
            email_template: emailSettings.emailTemplate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
      }

      if (result.error) {
        throw result.error;
      }

      setSnackbar({ open: true, message: "Email settings updated successfully.", severity: "success" });
    } catch (error) {
      console.error('Error saving email settings:', error);
      setSnackbar({ open: true, message: "Failed to update email settings. Please try again.", severity: "error" });
    } finally {
      setSettingsLoading(false);
    }
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

  // Derived list filtered by search term (case-insensitive)
  const filteredAbsences = (absences || []).filter((a) => {
    const q = (searchTerm || "").toLowerCase().trim();
    if (!q) return true;
    return (
      String(a.student || "").toLowerCase().includes(q) ||
      String(a.studentId || "").toLowerCase().includes(q) ||
      String(a.course || "").toLowerCase().includes(q) ||
      String(a.status || "").toLowerCase().includes(q)
    );
  });

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
            <div className="grid grid-cols-3 gap-[10px] mt-[20px]">
              {loading ? (
                // Loading state
                Array.from({ length: 3 }).map((_, idx) => (
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
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <AbsenceTable absences={filteredAbsences} loading={absencesLoading} />
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
              <MCSubmissions onChanged={fetchAbsenceStats} />
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <CardHeader sx={{ pb: 0 }}
              title={<Typography variant="h6" fontWeight="bold">Leave Requests</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Review and manage student leave requests</Typography>}
            />
            <LeaveRequestList onChanged={fetchAbsenceStats} />
          </Card>
        )}

        {activeTab === 3 && (
          <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0", p: 2 }}>
            <CardHeader
              title={<Typography variant="h6" color="text.primary" fontWeight="bold">Email Notification Settings</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Configure automated absence email notifications</Typography>}
            />
            <CardContent>
              <Box>
                <Typography variant="body2" gutterBottom>Email Template</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Use placeholders: [Student Name], [Course Code], [Course Name], [Absence Date], [Submission Link]
                </Typography>
                <textarea
                  rows={12}
                  style={{ width: "100%", padding: 12, borderRadius: 4, border: "1px solid #e5e7eb", background: "#ffffff", color: "#0f172a", fontFamily: "monospace", fontSize: "14px" }}
                  value={emailSettings.emailTemplate}
                  onChange={(e) => setEmailSettings({ ...emailSettings, emailTemplate: e.target.value })}
                />
              </Box>

              <Button 
                fullWidth 
                variant="contained" 
                sx={{ mt: 2 }} 
                onClick={handleUpdateTemplate}
                disabled={settingsLoading}
              >
                {settingsLoading ? "Saving..." : "Update Email Settings"}
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