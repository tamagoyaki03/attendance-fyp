import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Box,
} from "@mui/material";
import FileTextIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import Toast from "../Toast";
import supabase from "../../config/supabaseClient";

export default function ReportGenerator() {
  const [reportType, setReportType] = useState("class");
  const [identifier, setIdentifier] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [downloading, setDownloading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [reportData, setReportData] = useState(null);

  const showToast = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const toCsv = (rows) => {
    if (!rows || rows.length === 0) return "";
    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );
    const lines = [headers.join(",")];
    rows.forEach((row) => {
      lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
    });
    return lines.join("\n");
  };

  const buildCsvForReport = (type, data) => {
    if (!data) return "";

    const sections = [];

    if (type === "session") {
      sections.push("Session");
      sections.push(toCsv([data.session]));
      sections.push("");
      sections.push("Attendance Records");
      sections.push(toCsv(data.records || []));
    } else if (type === "class") {
      sections.push("Class");
      sections.push(toCsv([data.course]));
      sections.push("");

      // Pivot: rows = students, columns = sessions (date), values = status
      const sessions = (data.sessions || []).slice().sort((a, b) => {
        const ad = a.date || a.start_time || a.id;
        const bd = b.date || b.start_time || b.id;
        return ad > bd ? 1 : ad < bd ? -1 : 0;
      });

      const enrollmentIdField = data.isLecture ? "lecture_enrollment_id" : "tutorial_enrollment_id";
      const statusByKey = new Map();
      (data.records || []).forEach((r) => {
        const key = `${r.session_id}-${r[enrollmentIdField]}`;
        statusByKey.set(key, r.status || "");
      });



      const rows = (data.enrollments || []).map((en) => {
        const name = en.users?.name || en.student_id;
        const matricNumber = en.users?.matric_number || '';
        const row = { Student: name, 'Matric Number': matricNumber };
        sessions.forEach((s) => {
          const key = `${s.id}-${en.id}`;
          row[s.date || s.start_time || s.id] = statusByKey.get(key) || "absent";
        });
        return row;
      });

      sections.push("Attendance Pivot");
      sections.push(toCsv(rows));
    } else if (type === "student") {
      sections.push(`Student: ${data.studentName || (data.studentIds || []).join(";")}`);
      sections.push("");

      // Pivot by course code (lecture/tutorial combined): rows = course code, columns = session date, values = status
      const courseMap = new Map(); // courseCode -> { type: 'lecture'|'tutorial', enrollmentId }
      (data.lectureEnrollments || []).forEach((en) => {
        const code = en.course_id?.course_code || en.course_id?.id || "";
        if (code) courseMap.set(code, { type: "lecture", enrollmentId: en.id });
      });
      (data.tutorialEnrollments || []).forEach((en) => {
        const code = en.tutorial_id?.course_code || en.tutorial_id?.id || "";
        if (code) courseMap.set(code, { type: "tutorial", enrollmentId: en.id });
      });

      // Filter sessions to only those for the student's enrolled courses
      const sessionsById = new Map();
      (data.sessions || []).forEach((s) => {
        if (
          (s.course_lecture_id && [...courseMap.values()].some((c) => c.type === "lecture")) ||
          (s.course_tutorial_id && [...courseMap.values()].some((c) => c.type === "tutorial"))
        ) {
          sessionsById.set(s.id, s);
        }
      });

      const sessionIdsFromRecords = Array.from(
        new Set((data.records || []).map((r) => r.session_id))
      );
      const sortedSessions = sessionIdsFromRecords
        .map((id) => sessionsById.get(id) || { id })
        .sort((a, b) => {
          const ad = a.date || a.start_time || a.id;
          const bd = b.date || b.start_time || b.id;
          return ad > bd ? 1 : ad < bd ? -1 : 0;
        });

      const rows = [];
      courseMap.forEach((info, code) => {
        const row = { Course: code };
        sortedSessions.forEach((s) => {
          const dateLabel = s.date || s.start_time || s.id;
          const rec = (data.records || []).find((r) => {
            const matchSession = r.session_id === s.id;
            if (!matchSession) return false;
            return info.type === "lecture"
              ? r.lecture_enrollment_id === info.enrollmentId
              : r.tutorial_enrollment_id === info.enrollmentId;
          });
          row[dateLabel] = rec?.status || "absent";
        });
        rows.push(row);
      });

      if (rows.length) {
        sections.push("Attendance by Course (Student)");
        sections.push(toCsv(rows));
      }
    }

    return sections.filter(Boolean).join("\n");
  };

  const fetchReportData = async () => {
    if (!identifier) {
      showToast(`Please enter an identifier for the ${reportType} report.`, "error");
      return null;
    }

    const isUuid = (val) => /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/.test(val);

    try {
      switch (reportType) {
        case "session": {
          if (!isUuid(identifier)) {
            throw new Error("Please enter a valid session ID (UUID).");
          }

          const { data: session, error: sessionErr } = await supabase
            .from("attendance_session")
            .select("*")
            .eq("id", identifier)
            .single();
          if (sessionErr) throw sessionErr;

          const { data: records, error: recErr } = await supabase
            .from("attendance_record")
            .select("*")
            .eq("session_id", session.id);
          if (recErr) throw recErr;

          return { session, records };
        }
        case "class": {
          const searchValue = identifier.trim();
          const lectureOrFilters = [
            `course_code.ilike.${searchValue}`,
            `course_title.ilike.%${searchValue}%`,
          ];
          if (isUuid(searchValue)) lectureOrFilters.unshift(`id.eq.${searchValue}`);

          // Try lecture by id/code/title
          const { data: lecture, error: lectureErr } = await supabase
            .from("course_lecture")
            .select("id, course_code, course_title")
            .or(lectureOrFilters.join(","))
            .limit(1)
            .maybeSingle();

          let tutorial = null;
          if (!lecture) {
            const tutorialOrFilters = [
              `course_code.ilike.${searchValue}`,
              `course_title.ilike.%${searchValue}%`,
            ];
            if (isUuid(searchValue)) tutorialOrFilters.unshift(`id.eq.${searchValue}`);

            const { data: tutorialData, error: tutorialErr } = await supabase
              .from("course_tutorial")
              .select("id, course_code, course_title")
              .or(tutorialOrFilters.join(","))
              .limit(1)
              .maybeSingle();

            if (tutorialErr && tutorialErr.code !== "PGRST116") throw tutorialErr;
            tutorial = tutorialData || null;
          } else if (lectureErr && lectureErr.code !== "PGRST116") {
            throw lectureErr;
          }

          const course = lecture || tutorial;
          const sessionField = lecture ? "course_lecture_id" : "course_tutorial_id";
          if (!course) throw new Error("Class not found");

          const { data: sessions, error: sessionsErr } = await supabase
            .from("attendance_session")
            .select("id, date, start_time, end_time")
            .eq(sessionField, course.id);
          if (sessionsErr) throw sessionsErr;

          // Enrollments for the class to map student names
          const enrollmentTable = lecture ? "enrollment_lecture" : "enrollment_tutorial";
          const enrollmentCourseField = lecture ? "course_id" : "tutorial_id";
          const { data: enrollments, error: enrollErr } = await supabase
            .from(enrollmentTable)
            .select("id, student_id, users(name, matric_number)")
            .eq(enrollmentCourseField, course.id);
          if (enrollErr) throw enrollErr;

          const sessionIds = (sessions || []).map((s) => s.id);
          const { data: records, error: recErr } = sessionIds.length
            ? await supabase
                .from("attendance_record")
                .select("*")
                .in("session_id", sessionIds)
            : { data: [], error: null };
          if (recErr) throw recErr;

          return { course, isLecture: Boolean(lecture), sessions, records, enrollments };
        }
        case "student": {
          const searchValue = identifier.trim();

          let studentIds = [];
          if (isUuid(searchValue)) {
            studentIds = [searchValue];
          } else {
            // Find users by name/email case-insensitive
            const { data: users, error: usersErr } = await supabase
              .from("users")
              .select("id")
              .or([
                `name.ilike.%${searchValue}%`,
                `email.ilike.%${searchValue}%`,
              ].join(","));

            if (usersErr) throw usersErr;
            studentIds = (users || []).map((u) => u.id);
          }

          if (!studentIds.length) throw new Error("No student found for that name or ID.");

          const [{ data: lectureEnroll }, { data: tutorialEnroll }, { data: sessions }] = await Promise.all([
            supabase
              .from("enrollment_lecture")
              .select("id, student_id, course_id:course_lecture(id, course_code)")
              .in("student_id", studentIds),
            supabase
              .from("enrollment_tutorial")
                  .select("id, student_id, tutorial_id:course_tutorial(id, course_code)")
              .in("student_id", studentIds),
            supabase
              .from("attendance_session")
              .select("id, date, start_time, end_time"),
          ]);

          const lectureIds = (lectureEnroll || []).map((e) => e.id);
          const tutorialIds = (tutorialEnroll || []).map((e) => e.id);

          const filters = [];
          if (lectureIds.length) filters.push(`lecture_enrollment_id.in.(${lectureIds.join(",")})`);
          if (tutorialIds.length) filters.push(`tutorial_enrollment_id.in.(${tutorialIds.join(",")})`);

          if (!filters.length) throw new Error("No enrollments found for this student.");

          const { data: records, error: recErr } = await supabase
            .from("attendance_record")
            .select("*")
            .or(filters.join(","));
          if (recErr) throw recErr;

          // Fetch student names
          const { data: studentUsers } = await supabase
            .from("users")
            .select("id, name")
            .in("id", studentIds);

          return {
            studentIds,
            studentName: studentUsers?.[0]?.name,
            records,
            lectureEnrollments: lectureEnroll || [],
            tutorialEnrollments: tutorialEnroll || [],
            sessions: sessions || [],
          };
        }
        default:
          throw new Error("Unsupported report type");
      }
    } catch (catchErr) {
      showToast(catchErr.message || "Failed to generate report", "error");
      return null;
    }
  };

  const handleGenerateReport = async () => {
    const data = await fetchReportData();
    if (!data) return;
    setReportData(data);
    showToast(`Report ready for ${reportType}: ${identifier}`);
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const data = reportData || (await fetchReportData());
      if (!data) return;

      const csv = buildCsvForReport(reportType, data);
      if (!csv) {
        showToast("No data to download", "error");
        return;
      }

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}-report-${identifier || "data"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Download started");
    } catch (catchErr) {
      showToast(catchErr.message || "Download failed", "error");
    } finally {
      setDownloading(false);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
    input: { color: "#0f172a" },
  };

  return (
    <>
      <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
        <CardHeader
          sx={{ pb: 0 }}
          title={<Typography variant="h6" fontWeight="bold" color="text.primary">Generate Custom Reports</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">Generate and download detailed reports by class or student.</Typography>}
        />
        <CardContent>
          <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={2} mb={3}>
            <FormControl fullWidth>
              <InputLabel id="report-type-label">Report Type</InputLabel>
              <Select
                labelId="report-type-label"
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value)}
                sx={inputSx}
              >
                <MenuItem value="class">Class</MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Code or Name`}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              sx={inputSx}
            />
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<FileTextIcon />}
              onClick={handleGenerateReport}
              sx={{
                backgroundColor: "#0f172a",
                color: "#fff",
                textTransform: "none",
                "&:hover": { backgroundColor: "#0b1320" },
              }}
            >
              Generate Report
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadReport}
              sx={{
                borderColor: "#e6edf3",
                color: "#0f172a",
                textTransform: "none",
                "&:hover": { backgroundColor: "rgba(15,23,42,0.04)" },
              }}
            >
              Download Report
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Toast
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
        autoHideDuration={3000}
      />
    </>
  );
}