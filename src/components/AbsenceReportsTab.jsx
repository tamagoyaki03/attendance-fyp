import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
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
import { calculateAttendanceRate } from "../utils/attendanceUtils";

export default function AbsenceReportsTab() {
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

        // Format date range for filtering
        const fromDateStr = format(fromDate, "yyyy-MM-dd");
        const toDateStr = format(toDate, "yyyy-MM-dd");

        // Fetch all sessions for these courses within the date range
        let sessionIds = [];
        if (courseItems.length) {
          const lectureIds = (lectureRes.data || []).map((c) => c.id);
          const tutorialIds = (tutorialRes.data || []).map((c) => c.id);

          const queries = [];
          if (lectureIds.length) {
            queries.push(
              supabase
                .from("attendance_session")
                .select("id")
                .in("course_lecture_id", lectureIds)
                .gte("date", fromDateStr)
                .lte("date", toDateStr)
            );
          }
          if (tutorialIds.length) {
            queries.push(
              supabase
                .from("attendance_session")
                .select("id")
                .in("course_tutorial_id", tutorialIds)
                .gte("date", fromDateStr)
                .lte("date", toDateStr)
            );
          }

          const results = await Promise.all(queries);
          sessionIds = results
            .flatMap((res) => (res.data || []).map((s) => s.id))
            .filter((id, idx, arr) => arr.indexOf(id) === idx); // deduplicate
        }

        let mcSubmissions = [];
        if (sessionIds.length) {
          const { data: mcData, error: mcErr } = await supabase
            .from("mc_submissions")
            .select("id, status, session_id")
            .in("session_id", sessionIds);

          if (mcErr) {
            console.warn("mc_submissions fetch error", mcErr);
          } else {
            mcSubmissions = mcData || [];
          }
        }

        const summaries = await Promise.all(
          courseItems.map(async (course) => {
            const stats = await calculateAttendanceRate(course.id, course.classType);
            const totalPossible = stats.totalPossibleAttendance || (stats.totalStudents || 0) * (stats.totalSessions || 0);
            const totalAbsences = Math.max(totalPossible - (stats.presentCount || 0), 0);

            // Get session IDs for this course
            const sessionField = course.classType === "Lecture" ? "course_lecture_id" : "course_tutorial_id";
            const { data: courseSessions } = await supabase
              .from("attendance_session")
              .select("id")
              .eq(sessionField, course.id);
            const courseSessionIds = (courseSessions || []).map((s) => s.id);

            // Filter MC submissions by this course's sessions
            const excused = (mcSubmissions || []).filter(
              (mc) => courseSessionIds.includes(mc.session_id) && mc.status?.toLowerCase() === "approved"
            ).length;
            const unexcused = Math.max(totalAbsences - excused, 0);

            const { data: latestSession } = await supabase
              .from("attendance_session")
              .select("date, created_at")
              .eq(sessionField, course.id)
              .order("date", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const totalStudents = stats.totalStudents || 0;

            return {
              class: course.course_code || course.course_title,
              totalAbsences,
              excused,
              unexcused,
              totalSessions: stats.totalSessions || 0,
              totalStudents: totalStudents,
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
        console.error("Error loading absence reports", err);
        setError(err.message || "Failed to load absence reports");
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
          title={<Typography variant="h6" fontWeight="bold" color="text.primary">Absence Overview</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">Summary of absences across all classes.</Typography>}
        />
        <CardContent>
          {/* Date Range */}
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

          {/* Absence Table */}
          <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Class Name</strong></TableCell>
                  <TableCell>Total Absences</TableCell>
                  <TableCell>Excused</TableCell>
                  <TableCell>Unexcused</TableCell>
                  <TableCell>Total Sessions</TableCell>
                  <TableCell>Total Students</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={20} />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Alert severity="error">{error}</Alert>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No absences found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <TableRow 
                      key={idx}
                      sx={{
                        opacity: row.isArchived ? 0.6 : 1,
                        backgroundColor: row.isArchived ? '#f9fafb' : 'inherit'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {row.class}
                          {row.isArchived && (
                            <Chip 
                              label="Archived" 
                              size="small"
                              sx={{ 
                                backgroundColor: '#fecaca', 
                                color: '#991b1b',
                                fontWeight: 600,
                                height: 24
                              }} 
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{row.totalAbsences}</TableCell>
                      <TableCell>{typeof row.excused === 'number' ? row.excused : String(row.excused).charAt(0).toUpperCase() + String(row.excused).slice(1)}</TableCell>
                      <TableCell>{row.unexcused}</TableCell>
                      <TableCell>{row.totalSessions}</TableCell>
                      <TableCell>{row.totalStudents}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}