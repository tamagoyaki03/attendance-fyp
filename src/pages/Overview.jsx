import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  TextField,
  CircularProgress,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import ClassAttendance from "../components/Event/ClassAttendance";
import StudentView from "../components/Event/StudentsView";
import supabase from "../config/supabaseClient";
import { calculateAttendanceRate } from "../utils/attendanceUtils";

export default function Overview() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("classes");
  const [userClasses, setUserClasses] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
   totalClasses: 0,
   averageAttendance: 0,
   classesBelow60: 0,
   loading: true
 });

  const [leaveRequests, setLeaveRequests] = useState({
    fraudCases: 0,
    pendingLeave: 0,
    pendingDocuments: 0
  });
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    if (!user?.id || user.role !== "lecturer") {
      setLoadingNotifications(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        console.log("Fetching notifications for lecturer:", user.id);
        
        // Fetch lecturer's classes
        const { data: lecturerClasses, error: classError } = await supabase
          .from("course_lecture")
          .select("id")
          .eq("lecturer_id", user.id);

        if (classError) {
          console.error("Error fetching lecturer classes:", classError);
          return;
        }

        const classIds = lecturerClasses?.map(cls => cls.id) || [];
        console.log("Class IDs for lecturer:", classIds);
        
        if (classIds.length === 0) {
          setLoadingNotifications(false);
          return;
        }

        // Fetch fraud cases from fraud_detection_alerts table for sessions belonging to this lecturer's classes
        // First, get all session IDs for this lecturer's classes
        const { data: sessions, error: sessionsError } = await supabase
          .from("attendance_session")
          .select("id, course_lecture_id")
          .in("course_lecture_id", classIds);

        if (sessionsError) {
          console.error("Error fetching sessions for fraud alerts:", sessionsError);
        } else {
          const sessionIds = (sessions || []).map(s => s.id);
          let fraudCases = 0;
          if (sessionIds.length > 0) {
            const { data: fraudAlerts, error: fraudError } = await supabase
              .from("fraud_detection_alerts")
              .select("id, session_id")
              .in("session_id", sessionIds);
            if (fraudError) {
              console.error("Error fetching fraud alerts:", fraudError);
            } else {
              fraudCases = fraudAlerts?.length || 0;
            }
          }
          console.log("Found fraud cases (fraud_detection_alerts):", fraudCases);
          setLeaveRequests(prev => ({
            ...prev,
            fraudCases: fraudCases
          }));
        }

        // Fetch leave requests
        const { data: leaveData, error: leaveError } = await supabase
          .from("leave_requests")
          .select("id, status, course_id")
          .eq("status", "pending")
          .in("course_id", classIds);

        if (leaveError) {
          console.error("Error fetching leave requests:", leaveError);
        } else {
          const pendingLeave = leaveData?.length || 0;
          console.log("Found pending leave requests:", pendingLeave);
          setLeaveRequests(prev => ({
            ...prev,
            pendingLeave: pendingLeave
          }));
        }

        // Fetch pending absence documents by first finding sessions for this lecturer's classes,
        // then counting mc_submissions linked to those sessions with status pending_review
        const { data: absenceSessions, error: absenceSessionsError } = await supabase
          .from("attendance_session")
          .select("id, course_lecture_id")
          .in("course_lecture_id", classIds);

        if (absenceSessionsError) {
          console.error("Error fetching sessions:", absenceSessionsError);
        } else {
          const sessionIds = (absenceSessions || []).map(s => s.id);
          let pendingDocuments = 0;

          if (sessionIds.length > 0) {
            const { data: mcData, error: mcError } = await supabase
              .from("mc_submissions")
              .select("id")
              .eq("status", "pending_review")
              .in("session_id", sessionIds);

            if (mcError) {
              console.error("Error fetching MC submissions:", mcError);
            } else {
              pendingDocuments = mcData?.length || 0;
            }
          }

          console.log("Found pending documents:", pendingDocuments);
          setLeaveRequests(prev => ({
            ...prev,
            pendingDocuments
          }));
        }

      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [user?.id, user?.role]);

  useEffect(() => {
   const getUserData = () => {
     const userData = JSON.parse(sessionStorage.getItem("user") || "null");
     if (userData && userData.id) {
       setUser(userData);
       return userData;
     }
     return null;
   };

   const userData = getUserData();
   if (!userData) {
     // Retry after a short delay if user data isn't ready
     const timer = setTimeout(() => {
       const retryUserData = getUserData();
       if (retryUserData) {
         setUser(retryUserData);
       }
     }, 100);
     return () => clearTimeout(timer);
   }
 }, []);

  useEffect(() => {
    if (!user?.id) {
      // nothing to fetch yet
      setUserClasses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let cancelled = false;
    const fetchClasses = async () => {
      try {
        let query = supabase
          .from("course_lecture")
          .select(`
            *,
            users(name),
            enrollment_lecture(id)
          `);
        if (user.role !== "admin") {
          query = query.eq("lecturer_id", user.id);
        }
        const { data, error } = await query;
        if (cancelled) return;
        if (error) {
          console.error("Supabase fetch error:", error);
          setUserClasses([]);
        } else {
          const classesWithType = (data || []).map(c => ({ ...c, type: "Lecture" }));
          setUserClasses(classesWithType);
          
          // Calculate aggregate stats
          const classStats = await Promise.all(
            classesWithType.map(async (classItem) => {
              const stats = await calculateAttendanceRate(classItem.id, "Lecture");
              return stats.attendanceRate;
            })
          );
          
          const validStats = classStats.filter(stat => !isNaN(stat) && stat >= 0);
          const averageAttendance = validStats.length > 0
            ? Math.round((validStats.reduce((a, b) => a + b, 0) / validStats.length) * 10) / 10
            : 0;
          const classesBelow60 = validStats.filter(stat => stat < 60).length;
          
          setAttendanceStats({
            totalClasses: classesWithType.length,
            averageAttendance,
            classesBelow60,
            loading: false
          });
        }
      } catch (err) {
        console.error("Unexpected fetch error:", err);
        if (!cancelled) setUserClasses([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchClasses();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  // Show loading state
 if (!user || isLoading) {
   return (
     <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
       <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
         <Sidebar />
       </div>
       <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
         <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
           <Typography>Loading classes...</Typography>
         </Box>
       </main>
     </div>
   );
 }

  const filteredClasses = userClasses.filter(
    (cls) =>
      cls.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.course_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      <main
        className="ml-[250px] p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh" }}
      >
        <div>
          <h2
            className="text-[24px] font-inter font-semibold leading-[30px] text-left"
            style={{ color: "#0f172a", marginBottom: 0 }}
          >
            Dashboard
          </h2>
          <div className="flex justify-between items-center">
            <p
              className="text-[14px] font-inter font-normal leading-[17px] text-left"
              style={{ color: "#374151" }}
            >
              View attendance statistics and class performance
            </p>
          </div>
        </div>

        {user.role === "lecturer" && !loadingNotifications && (
          <>
            {leaveRequests.fraudCases > 0 && (
              <Box my={3}>
                <Alert severity="error" sx={{ fontSize: "16px" }}>
                  <strong>Attention Required</strong> — {leaveRequests.fraudCases} potential fraud case{leaveRequests.fraudCases !== 1 ? 's' : ''} detected.
                </Alert>
              </Box>
            )}

            {leaveRequests.pendingLeave > 0 && (
              <Box my={3}>
                <Alert severity="warning" sx={{ fontSize: "16px" }}>
                  <strong>New Leave Request</strong> — {leaveRequests.pendingLeave} pending leave application{leaveRequests.pendingLeave !== 1 ? 's' : ''} awaiting review.
                </Alert>
              </Box>
            )}

            {leaveRequests.pendingDocuments > 0 && (
              <Box my={3}>
                <Alert severity="info" sx={{ fontSize: "16px" }}>
                  <strong>Pending Review</strong> — {leaveRequests.pendingDocuments} absence document{leaveRequests.pendingDocuments !== 1 ? 's' : ''} pending review.
                </Alert>
              </Box>
            )}

            {leaveRequests.fraudCases === 0 && leaveRequests.pendingLeave === 0 && leaveRequests.pendingDocuments === 0 && (
              <Box my={3}>
                <Alert severity="success" sx={{ fontSize: "16px" }}>
                  <strong>All Clear</strong> — No pending items at this time.
                </Alert>
              </Box>
            )}
          </>
        )}

        {user.role === "lecturer" && loadingNotifications && (
          <Box my={3}>
            <Alert severity="info" sx={{ fontSize: "16px" }}>
              Loading notifications...
            </Alert>
          </Box>
        )}

        {user.role === "admin" && (
          <>
            <Tabs
              value={tab}
              onChange={(e, val) => setTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ mb: 3 }}
            >
              <Tab label="Classes View" value="classes" sx={{ color: "#0f172a" }} />
              <Tab label="Students View" value="students" sx={{ color: "#0f172a" }} />
            </Tabs>
          </>
        )}

        {tab === "classes" && (
          <>
            <div className="grid grid-cols-3 gap-[20px] mt-6">
              <Card
                className="border"
                sx={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Classes
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {attendanceStats.loading ? <CircularProgress size={24} /> : attendanceStats.totalClasses}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active classes 
                  </Typography>
                </CardContent>
              </Card>

              <Card
                className="border"
                sx={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Average Attendance
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {attendanceStats.loading ? <CircularProgress size={24} /> : `${attendanceStats.averageAttendance}%`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Across all classes
                  </Typography>
                </CardContent>
              </Card>

              <Card
                className="border"
                sx={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Classes Below 60%
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {attendanceStats.loading ? <CircularProgress size={24} /> : attendanceStats.classesBelow60}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Require attention
                  </Typography>
                </CardContent>
              </Card>
            </div>

            <Box display="flex" alignItems="center" mb={3} mt={3}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  ...inputSx,
                }}
                InputProps={{
                  startAdornment: <Search fontSize="small" style={{ marginRight: 8, color: "#64748b" }} />,
                }}
              />
            </Box>

            <ClassAttendance classes={filteredClasses} />
          </>
        )}

        {tab === "students" && (
          <div className="gap-[20px] mt-6">
            <StudentView />
          </div>
        )}
      </main>
    </div>
  );
}