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
        let lectureQuery = supabase.from("course_lecture").select("id, course_code, course_title");
        let tutorialQuery = supabase.from("course_tutorial").select("id, course_code, course_title");
        
        if (user.role !== "admin") {
          lectureQuery = lectureQuery.eq("lecturer_id", user.id);
          tutorialQuery = tutorialQuery.eq("lecturer_id", user.id);
        }

        const [lectureRes, tutorialRes] = await Promise.all([lectureQuery, tutorialQuery]);

        if (lectureRes.error) throw lectureRes.error;
        if (tutorialRes.error) throw tutorialRes.error;

        const courseItems = [
          ...(lectureRes.data || []).map((c) => ({ ...c, classType: "Lecture" })),
          ...(tutorialRes.data || []).map((c) => ({ ...c, classType: "Tutorial" })),
        ];

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
            const sessionIds = (sessionsInRange || []).map((s) => s.id);

            // Enrolled students count
            const { data: enrollments } = await supabase
              .from(enrollmentTable)
              .select("id")
              .eq(courseIdField, course.id);
            const totalStudents = (enrollments || []).length;

            // Attendance records in this range
            let presentCount = 0;
            if (sessionIds.length > 0) {
              const { data: recordsInRange } = await supabase
                .from("attendance_record")
                .select("status")
                .in("session_id", sessionIds);
              presentCount = (recordsInRange || []).filter((r) => r.status === "present").length;
            }

            const totalPossible = totalStudents * sessionsInRangeCount;
            const attendancePercentage = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;
            const lastSessionDate = sessionsInRange?.[0]?.date || sessionsInRange?.[0]?.created_at || null;

            return {
              class: course.course_code || course.course_title,
              totalSessions: sessionsInRangeCount,
              // Average attended sessions per student in range
              attended: totalStudents > 0 ? Math.round(presentCount / totalStudents) : 0,
              percentage: `${attendancePercentage}%`,
              lastSession: lastSessionDate ? format(new Date(lastSessionDate), "PPP") : "-",
            };
          })
        );

        setRows(summaries);
      } catch (err) {
        console.error("Error loading attendance reports", err);
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
                  <TableCell><strong>Class Name</strong></TableCell>
                  <TableCell>Total Sessions</TableCell>
                  <TableCell>Attended Sessions</TableCell>
                  <TableCell>Attendance %</TableCell>
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
                  rows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.class}</TableCell>
                      <TableCell>{row.totalSessions}</TableCell>
                      <TableCell>{row.attended}</TableCell>
                      <TableCell>{row.percentage}</TableCell>
                      <TableCell>{row.lastSession}</TableCell>
                    </TableRow>
                  ))
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