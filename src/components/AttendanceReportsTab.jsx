import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import supabase from "../config/supabaseClient";


export default function AttendanceReportsTab() {
  const [fromDate, setFromDate] = useState(new Date(2025, 0, 1));
  const [toDate, setToDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const user = useMemo(() => {
    const cached = sessionStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Format dates for filtering
        const fromDateStr = format(fromDate, "yyyy-MM-dd");
        const toDateStr = format(toDate, "yyyy-MM-dd");

        // Fetch classes: all if admin, only lecturer's if lecturer
        let lectureQuery = supabase.from("course_lecture").select("id, course_code, course_title, lecture_end_date");
        let tutorialQuery = supabase.from("course_tutorial").select("id, course_code, course_title, tutorial_end_date");
        
        if (user.role !== "admin") {
          lectureQuery = lectureQuery.eq("lecturer_id", user.id);
          tutorialQuery = tutorialQuery.eq("lecturer_id", user.id);
        }

        const [lectureRes, tutorialRes] = await Promise.all([lectureQuery, tutorialQuery]);

        if (lectureRes.error) throw lectureRes.error;
        if (tutorialRes.error) throw tutorialRes.error;

        const courseItems = [
          ...(lectureRes.data || []).map((c) => ({ ...c, classType: "Lecture", endDate: c.lecture_end_date })),
          ...(tutorialRes.data || []).map((c) => ({ ...c, classType: "Tutorial", endDate: c.tutorial_end_date })),
        ];

        // Sort by class code: letters first, then numbers
        courseItems.sort((a, b) => {
          const codeA = a.course_code || "";
          const codeB = b.course_code || "";
          
          // Extract letters and numbers
          const lettersA = codeA.replace(/[0-9]/g, "");
          const lettersB = codeB.replace(/[0-9]/g, "");
          const numbersA = parseInt(codeA.replace(/[^0-9]/g, "")) || 0;
          const numbersB = parseInt(codeB.replace(/[^0-9]/g, "")) || 0;
          
          // Compare letters first
          if (lettersA !== lettersB) {
            return lettersA.localeCompare(lettersB);
          }
          // If letters are same, compare numbers
          return numbersA - numbersB;
        });

        const summaries = await Promise.all(
          courseItems.map(async (course) => {
            const isLecture = course.classType === "Lecture";
            const sessionField = isLecture ? "course_lecture_id" : "course_tutorial_id";
            const enrollmentTable = isLecture ? "enrollment_lecture" : "enrollment_tutorial";
            const courseIdField = isLecture ? "course_id" : "tutorial_id";

            // Sessions within date range (latest first)
            const { data: sessionsInRange } = await supabase
              .from("attendance_session")
              .select("id, date, created_at")
              .eq(sessionField, course.id)
              .gte("date", fromDateStr)
              .lte("date", toDateStr)
              .order("date", { ascending: false })
              .order("created_at", { ascending: false });

            const sessionsInRangeCount = (sessionsInRange || []).length;
            const lastSessionId = sessionsInRange?.[0]?.id || null;
            const lastSessionDate = sessionsInRange?.[0]?.date || sessionsInRange?.[0]?.created_at || null;

            // Enrolled students count
            const { data: enrollments } = await supabase
              .from(enrollmentTable)
              .select("id")
              .eq(courseIdField, course.id);
            const totalStudents = (enrollments || []).length;

            // Get students who attended last session
            let lastSessionAttendedCount = 0;
            let lastSessionAttendancePercentage = 0;
            if (lastSessionId) {
              const { data: lastSessionRecords } = await supabase
                .from("attendance_record")
                .select("status")
                .eq("session_id", lastSessionId);
              lastSessionAttendedCount = (lastSessionRecords || []).filter((r) => r.status === "present").length;
              lastSessionAttendancePercentage = totalStudents > 0 
                ? Math.round((lastSessionAttendedCount / totalStudents) * 100) 
                : 0;
            }

            return {
              class: course.course_code || course.course_title,
              totalSessions: sessionsInRangeCount,
              // Students who attended last session
              lastSessionAttended: lastSessionAttendedCount,
              lastSessionPercentage: `${lastSessionAttendancePercentage}%`,
              lastSession: lastSessionDate ? format(new Date(lastSessionDate), "PPP") : "-",
              isArchived: course.endDate ? new Date(course.endDate) < new Date() : false,
            };
          })
        );

        // Sort: active classes first, then archived at bottom
        summaries.sort((a, b) => {
          if (a.isArchived !== b.isArchived) {
            return a.isArchived ? 1 : -1;
          }
          // Secondary sort by class name
          return (a.class || '').localeCompare(b.class || '');
        });

        setRows(summaries);
      } catch (err) {
        setError(err.message || "Failed to load attendance reports");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, user?.role, fromDate, toDate]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
        <CardHeader
          sx={{ pb: 0 }}
          title={<Typography variant="h6" fontWeight="bold" color="text.primary">Attendance Overview</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">Summary of attendance across all classes.</Typography>}
        />
        <CardContent>
          {/* Date Range Pickers */}
          <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
            <DatePicker
              label="From"
              value={fromDate}
              onChange={(newDate) => setFromDate(newDate)}
              slotProps={{ textField: { size: "small" } }}
            />
            <DatePicker
              label="To"
              value={toDate}
              onChange={(newDate) => setToDate(newDate)}
              slotProps={{ textField: { size: "small" } }}
            />
          </Box>

          {/* Table */}
          <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Class Code</strong></TableCell>
                  <TableCell>Total Sessions</TableCell>
                  <TableCell>Students Attended Last Session</TableCell>
                  <TableCell>Last Session Attendance %</TableCell>
                  <TableCell>Last Session</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={20} />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Alert severity="error">{error}</Alert>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No classes found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => {
                    const isArchived = row.isArchived;
                    return (
                      <TableRow key={idx} sx={{ opacity: isArchived ? 0.6 : 1, backgroundColor: isArchived ? "#f9fafb" : "transparent" }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography>{row.class}</Typography>
                            {isArchived && (
                              <Chip label="Archived" size="small" sx={{ backgroundColor: "#fecaca", color: "#991b1b", fontWeight: 600 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{row.totalSessions}</TableCell>
                        <TableCell>{row.lastSessionAttended}</TableCell>
                        <TableCell>{row.lastSessionPercentage}</TableCell>
                        <TableCell>{row.lastSession}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
        <CardActions />
      </Card>
    </LocalizationProvider>
  );
}