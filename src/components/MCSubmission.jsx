import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Box,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Paper,
  CircularProgress,
  TextField
} from "@mui/material";
import {
  Visibility,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import supabase from "../config/supabaseClient";
import ViewDetailsButton from "./ViewDetailsButton";

export default function MCSubmissions({ onChanged }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString();
  };

  const formatDateTime = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleString();
  };

  const displayStatus = (raw) => {
    switch (raw) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "pending_review":
      default:
        return "Under Review";
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(sessionStorage.getItem("user") || "null");
        if (!user?.id) {
          setSubmissions([]);
          setLoading(false);
          return;
        }

        // 1) Fetch lecturer's lecture and tutorial course IDs
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

        const lectureIds = lectureRes.data?.map(c => c.id) || [];
        const tutorialIds = tutorialRes.data?.map(c => c.id) || [];
        const courseMeta = {};
        lectureRes.data?.forEach(c => { courseMeta[`L-${c.id}`] = { code: c.course_code, title: c.course_title }; });
        tutorialRes.data?.forEach(c => { courseMeta[`T-${c.id}`] = { code: c.course_code, title: c.course_title }; });

        if (lectureIds.length === 0 && tutorialIds.length === 0) {
          setSubmissions([]);
          setLoading(false);
          return;
        }

        // 2) Fetch sessions for those courses
        const orFilters = [];
        if (lectureIds.length > 0) orFilters.push(`course_lecture_id.in.(${lectureIds.join(',')})`);
        if (tutorialIds.length > 0) orFilters.push(`course_tutorial_id.in.(${tutorialIds.join(',')})`);

        let sessionQuery = supabase
          .from("attendance_session")
          .select("id, course_lecture_id, course_tutorial_id, date");
        if (orFilters.length > 0) sessionQuery = sessionQuery.or(orFilters.join(','));
        const { data: sessions, error: sessionsError } = await sessionQuery;
        if (sessionsError) throw sessionsError;

        if (!sessions || sessions.length === 0) {
          setSubmissions([]);
          setLoading(false);
          return;
        }

        const sessionIds = sessions.map(s => s.id);
        const sessionLookup = new Map(
          sessions.map(s => [s.id, {
            type: s.course_lecture_id ? 'L' : 'T',
            courseId: s.course_lecture_id || s.course_tutorial_id,
            date: s.date
          }])
        );

        // 3) Fetch MC submissions for those sessions
        const { data: mcRows, error: mcError } = await supabase
          .from("mc_submissions")
          .select("id, student_id, session_id, absence_date, reason, status, submitted_at, document_url")
          .in("session_id", sessionIds);
        if (mcError) throw mcError;

        // 4) Build enrollment name lookup to resolve student names per course
        let allEnrollments = [];
        if (lectureIds.length > 0) {
          const { data: lecEnroll, error: lecEnrollErr } = await supabase
            .from("enrollment_lecture")
            .select("student_id, course_id, users(name)")
            .in("course_id", lectureIds);
          if (lecEnrollErr) throw lecEnrollErr;
          allEnrollments = [
            ...allEnrollments,
            ...(lecEnroll || []).map(e => ({ key: `L-${e.course_id}-${e.student_id}`, name: e.users?.name || null }))
          ];
        }
        if (tutorialIds.length > 0) {
          const { data: tutEnroll, error: tutEnrollErr } = await supabase
            .from("enrollment_tutorial")
            .select("student_id, tutorial_id, users(name)")
            .in("tutorial_id", tutorialIds);
          if (tutEnrollErr) throw tutEnrollErr;
          allEnrollments = [
            ...allEnrollments,
            ...(tutEnroll || []).map(e => ({ key: `T-${e.tutorial_id}-${e.student_id}`, name: e.users?.name || null }))
          ];
        }
        const nameMap = new Map(allEnrollments.map(e => [e.key, e.name]));

        // 5) Transform rows for table
        const rows = (mcRows || []).map(r => {
          const sess = sessionLookup.get(r.session_id);
          const courseKey = sess ? `${sess.type}-${sess.courseId}` : null;
          const courseInfo = courseKey ? courseMeta[courseKey] : null;
          const nameKey = sess ? `${sess.type}-${sess.courseId}-${r.student_id}` : null;
          const studentName = nameKey ? (nameMap.get(nameKey) || null) : null;
          return {
            id: r.id,
            student: studentName || r.student_id,
            studentId: r.student_id,
            course: courseInfo?.code || courseInfo?.title || "Course",
            date: formatDate(r.absence_date || sess?.date),
            submissionDate: formatDateTime(r.submitted_at),
            reason: r.reason || "",
            status: displayStatus(r.status),
            documentUrl: r.document_url || null,
            _rawStatus: r.status,
            sessionId: r.session_id,
            enrollmentType: sess?.type === 'L' ? 'lecture' : 'tutorial',
            courseId: sess?.courseId || null
          };
        });

        setSubmissions(rows);
      } catch (err) {
        console.error("Error loading MC submissions:", err);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleApprove = async (id) => {
    try {
      // Get the submission details to extract session_id and student_id
      const submission = submissions.find(s => s.id === id);
      if (!submission) {
        console.error('Submission not found');
        setSnackbar({ open: true, message: "Submission not found", severity: "error" });
        return;
      }

      // Update mc_submissions status to approved
      const { error: updateError } = await supabase
        .from('mc_submissions')
        .update({ status: 'approved' })
        .eq('id', id);
      if (updateError) {
        console.error('Update error:', updateError);
        const errorMsg = updateError.message || updateError.code || 'Unknown error';
        console.error('Full error details:', JSON.stringify(updateError));
        throw new Error(`Failed to update mc_submissions: ${errorMsg}`);
      }

      console.log('MC submission approved successfully');

      // Extract enrollment info from submission
      const sessionId = submission.sessionId;
      const studentId = submission.studentId;
      const isLecture = submission.enrollmentType === 'lecture';
      let enrollmentId = null;
      let enrollmentDebug = {};
      if (isLecture) {
        const { data: enrollment, error: enrollError } = await supabase
          .from('enrollment_lecture')
          .select('id')
          .eq('student_id', studentId)
          .eq('course_id', submission.courseId)
          .single();
        enrollmentDebug = { type: 'lecture', studentId, courseId: submission.courseId, result: enrollment, error: enrollError };
        if (enrollError) console.warn('Lecture enrollment fetch error:', enrollError, enrollmentDebug);
        enrollmentId = enrollment?.id;
      } else {
        const { data: enrollment, error: enrollError } = await supabase
          .from('enrollment_tutorial')
          .select('id')
          .eq('student_id', studentId)
          .eq('tutorial_id', submission.courseId)
          .single();
        enrollmentDebug = { type: 'tutorial', studentId, tutorialId: submission.courseId, result: enrollment, error: enrollError };
        if (enrollError) console.warn('Tutorial enrollment fetch error:', enrollError, enrollmentDebug);
        enrollmentId = enrollment?.id;
      }

      // Insert or update attendance_record with "excused" status if enrollment found
      if (enrollmentId) {
        // Get current date and time in Asia/Kuala_Lumpur (GMT+8)
        const now = new Date();
        const localDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
        const pad = (n) => n.toString().padStart(2, '0');
        const year = localDate.getFullYear();
        const month = pad(localDate.getMonth() + 1);
        const day = pad(localDate.getDate());
        const hour = pad(localDate.getHours());
        const minute = pad(localDate.getMinutes());
        const second = pad(localDate.getSeconds());
        const createdAt = `${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`;

        // Build attendance_record filter
        let attendanceFilter = { session_id: sessionId };
        if (isLecture) {
          attendanceFilter.lecture_enrollment_id = enrollmentId;
        } else {
          attendanceFilter.tutorial_enrollment_id = enrollmentId;
        }

        // Check if attendance_record already exists
        const { data: existing, error: fetchError } = await supabase
          .from('attendance_record')
          .select('id')
          .match(attendanceFilter)
          .maybeSingle();
        if (fetchError) {
          console.error('Error checking for existing attendance_record:', fetchError, attendanceFilter);
        }

        if (existing && existing.id) {
          // Update existing record to excused
          const { error: updateError } = await supabase
            .from('attendance_record')
            .update({ status: 'excused', created_at: createdAt })
            .eq('id', existing.id);
          if (updateError) {
            console.error('Failed to update attendance_record to excused:', updateError, attendanceFilter);
            setSnackbar({ open: true, message: `Failed to update attendance to excused: ${updateError.message || 'Unknown error'}`, severity: "error" });
          } else {
            console.log('Attendance_record updated to excused:', attendanceFilter);
          }
        } else {
          // Insert new excused record
          const attendanceRecord = {
            session_id: sessionId,
            status: 'excused',
            created_at: createdAt
          };
          if (isLecture) {
            attendanceRecord.lecture_enrollment_id = enrollmentId;
          } else {
            attendanceRecord.tutorial_enrollment_id = enrollmentId;
          }
          const { error: insertError } = await supabase
            .from('attendance_record')
            .insert([attendanceRecord]);
          if (insertError) {
            console.error('Failed to insert attendance_record:', insertError, attendanceRecord);
            setSnackbar({ open: true, message: `Failed to insert excused attendance: ${insertError.message || 'Unknown error'}`, severity: "error" });
          } else {
            console.log('Excused attendance_record inserted:', attendanceRecord);
          }
        }
      } else {
        // Enrollment not found, show warning
        console.warn('No enrollment found for MC approval:', enrollmentDebug);
        setSnackbar({ open: true, message: "No enrollment found for this student in the course. Excused attendance not recorded.", severity: "warning" });
      }

      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Approved" } : s)));
      // Update selected submission if it's the one being approved
      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) => (prev ? { ...prev, status: "Approved" } : null));
      }
      setSnackbar({ open: true, message: "MC submission approved successfully", severity: "success" });

      // Notify parent to refresh Absence tab data and attendance management
      try { onChanged && onChanged(); } catch (e) {}
      // Also trigger a window event for attendance management refresh
      try {
        window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { sessionId, studentId } }));
      } catch (e) {}
    } catch (e) {
      console.error('Approve failed:', e);
      setSnackbar({ open: true, message: `Failed to approve: ${e.message || 'Unknown error'}`, severity: "error" });
    } finally {
      setDialogOpen(false);
    }
  };

  const handleReject = async (id, reasonNote = "") => {
    try {
      const submission = submissions.find(s => s.id === id);
      if (!submission) {
        console.error('Submission not found');
        setSnackbar({ open: true, message: "Submission not found", severity: "error" });
        return;
      }

      // Update mc_submissions status to rejected
      const { error: updateError } = await supabase
        .from('mc_submissions')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (updateError) {
        console.error('Update error:', updateError);
        const errorMsg = updateError.message || updateError.code || 'Unknown error';
        throw new Error(`Failed to update mc_submissions: ${errorMsg}`);
      }

      // Fetch student contact info
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('email, name, matric_number')
        .eq('id', submission.studentId)
        .single();
      if (userError) {
        console.warn('Failed to fetch user info for email:', userError);
      }

      const lecturer = JSON.parse(sessionStorage.getItem('user') || 'null');
      const toEmail = userInfo?.email;
      const studentName = userInfo?.name || submission.student || submission.studentId;
      const studentId = submission.studentId;

      if (toEmail) {
        const courseLabel = submission.course || 'Course';
        const absenceDateLabel = submission.date || new Date().toLocaleDateString();
        const reasonText = submission.reason ? `<p><strong>Submitted Reason:</strong> ${submission.reason}</p>` : '';
        const lecturerReason = reasonNote && reasonNote.trim() ? `<p><strong>Lecturer's Reason:</strong> ${reasonNote.trim()}</p>` : '';

        const html = `
          <div style="font-family: Arial, sans-serif; color:#0f172a;">
            <p>Dear ${studentName},</p>
            <p>Your absence document for <strong>${courseLabel}</strong> on <strong>${absenceDateLabel}</strong> has been <span style="color:#ef4444; font-weight:bold;">rejected</span>.</p>
            ${reasonText}
            ${lecturerReason}
            <p>Please review the submission requirements and resubmit with a valid Medical Certificate (MC) or Absence Letter if applicable.</p>
            <p>If you believe this is a mistake, kindly contact your lecturer or the Student Affairs Office.</p>
            <br/>
            <p>Regards,<br/>Attendance Management System</p>
          </div>
        `;

        try {
          const { error: fnError } = await supabase.functions.invoke('send-absence-email', {
            body: {
              emails: [{
                to: toEmail,
                subject: `Absence Document Rejected - ${courseLabel}`,
                html,
                studentId,
                studentName,
              }],
              lecturerId: lecturer?.id || null,
            },
          });
          if (fnError) {
            console.error('Email function error:', fnError);
            setSnackbar({ open: true, message: 'Document rejected, but email failed to send.', severity: 'warning' });
          } else {
            setSnackbar({ open: true, message: 'Document rejected and email sent to student.', severity: 'success' });
          }
        } catch (e) {
          console.error('Invoke email function failed:', e);
          setSnackbar({ open: true, message: 'Document rejected, but email failed to send.', severity: 'warning' });
        }
      } else {
        setSnackbar({ open: true, message: 'Document rejected. No student email found.', severity: 'warning' });
      }

      // Update local state
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: "Rejected" } : s)));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) => (prev ? { ...prev, status: "Rejected" } : null));
      }

      // Notify parent and broadcast event
      try { onChanged && onChanged(); } catch (_) {}
      try {
        window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { sessionId: submission.sessionId, studentId } }));
      } catch (_) {}

    } catch (e) {
      console.error('Reject failed:', e);
      setSnackbar({ open: true, message: `Failed to reject: ${e.message || 'Unknown error'}`, severity: 'error' });
    } finally {
      setDialogOpen(false);
      setRejectDialogOpen(false);
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "Approved":
        return <Chip label="Approved" color="success" size="small" />;
      case "Rejected":
        return <Chip label="Rejected" color="error" size="small" />;
      case "Under Review":
        return (
          <Chip
            label="Under Review"
            size="small"
            variant="outlined"
            sx={{ borderColor: "#f59e0b", color: "#f59e0b" }}
          />
        );
      default:
        return <Chip label={status} size="small" />;
    }
  };

  const handleViewDetails = async (submission) => {
    setTabValue(0);
    setDialogOpen(true);
    let matric = null;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("matric_number")
        .eq("id", submission.studentId)
        .maybeSingle();
      if (!error && data) {
        matric = data.matric_number || null;
      }
    } catch (_) {}

    setSelectedSubmission({
      ...submission,
      matric_number: matric || submission.matric_number || submission.studentId,
    });
  };

  const rows = submissions;

  return (
    <Box p={2}>
      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            mt: 2,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 2,
            boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
            overflowX: "auto",
            width: "100%",
            boxSizing: "border-box",
            m: 0,
            p: 0,
          }}
        >
          <Table size="small" sx={{ width: "100%" }}>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="subtitle2" color="text.secondary">
                    Student
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" color="text.secondary">
                    Course
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" color="text.secondary">
                    Absence Date
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" color="text.secondary">
                    Submission Date
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" color="text.secondary">
                    Reason
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" color="text.secondary">
                    Actions
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">No MC submissions found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    sx={{ "&:hover": { backgroundColor: "#f8fafc" } }}
                  >
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography fontWeight="bold" color="text.primary" noWrap>
                        {r.student}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography color="text.primary" noWrap>{r.course}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="text.primary">{r.date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="text.primary">{r.submissionDate}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography color="text.primary" noWrap>{r.reason}</Typography>
                    </TableCell>
                    <TableCell>{getStatusChip(r.status)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <ViewDetailsButton onClick={() => handleViewDetails(r)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Review Medical Certificate Submission</DialogTitle>
        <DialogContent dividers>
          {selectedSubmission && (
            <>
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{ mb: 2 }}
              >
                <Tab label="Submission Details" />
                <Tab label="Document" />
              </Tabs>

              {tabValue === 0 && (
                <Box mt={2}>
                  <Typography><strong>Student:</strong> {selectedSubmission.student}</Typography>
                  <Typography><strong>Student ID:</strong> {selectedSubmission.matric_number || selectedSubmission.studentId}</Typography>
                  <Typography><strong>Course:</strong> {selectedSubmission.course}</Typography>
                  <Typography mt={2}><strong>Absence Date:</strong> {selectedSubmission.date}</Typography>
                  <Typography><strong>Submission Date:</strong> {selectedSubmission.submissionDate}</Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    <Typography><strong>Status:</strong></Typography>
                    {getStatusChip(selectedSubmission.status)}
                  </Box>
                  <Typography mt={2}><strong>Reason:</strong> {selectedSubmission.reason}</Typography>
                </Box>
              )}

              {tabValue === 1 && (
                <Box mt={2}>
                  {selectedSubmission?.documentUrl ? (
                    <Box>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        border={1}
                        borderRadius={1}
                        p={2}
                        mb={2}
                        sx={{ borderColor: "#e6edf3" }}
                      >
                        <Box>
                          <Typography fontWeight="bold">Medical Certificate / Absence Letter</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Submitted on {selectedSubmission.submissionDate}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Visibility />}
                          sx={{ borderColor: "#e6edf3", color: "#0f172a" }}
                          component="a"
                          href={selectedSubmission.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Typography color="text.secondary">No document provided.</Typography>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderColor: "#e6edf3", color: "#0f172a" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="outlined"
            startIcon={<Cancel />}
            onClick={() => { setRejectReason(""); setRejectDialogOpen(true); }}
            sx={{ borderColor: "#e6edf3", color: "#ef4444" }}
          >
            Reject
          </Button>
          <Button
            color="success"
            variant="outlined"
            startIcon={<CheckCircle />}
            onClick={() => handleApprove(selectedSubmission?.id)}
            sx={{ borderColor: "#e6edf3", color: "#16a34a" }}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => !rejectSubmitting && setRejectDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reject Absence Document</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Optionally provide a reason to help the student understand the rejection.
          </Typography>
          <TextField
            label="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={rejectSubmitting} variant="outlined" sx={{ borderColor: "#e6edf3", color: "#0f172a" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            startIcon={<Cancel />}
            disabled={rejectSubmitting}
            onClick={async () => {
              if (!selectedSubmission?.id) return;
              try {
                setRejectSubmitting(true);
                await handleReject(selectedSubmission.id, rejectReason);
              } finally {
                setRejectSubmitting(false);
              }
            }}
          >
            {rejectSubmitting ? 'Rejecting…' : 'Confirm Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}