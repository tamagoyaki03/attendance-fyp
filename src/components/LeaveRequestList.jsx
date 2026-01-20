import React, { useState, useEffect } from "react";
 import {
  Box,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Typography,
  TextField,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  IconButton,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from '@mui/icons-material/Visibility';
import supabase from "../config/supabaseClient";
import ViewDetailsButton from "./ViewDetailsButton";

export default function LeaveRequestList({ onChanged }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter] = useState("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const handleViewDetails = (req) => {
    setSelectedRequest(req);
    setIsDetailsOpen(true);
    setRejectionReason("");
    setTabValue(0);
  };

  useEffect(() => {
  const fetchLeaveRequests = async () => {
    setLoading(true);

    // Get logged-in lecturer
    const lecturer = JSON.parse(sessionStorage.getItem("user") || "null");
    if (!lecturer?.id) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Fetch all courses for this lecturer
    const [lectureRes, tutorialRes] = await Promise.all([
      supabase.from("course_lecture").select("id, course_code, course_title").eq("lecturer_id", lecturer.id),
      supabase.from("course_tutorial").select("id, course_code, course_title").eq("lecturer_id", lecturer.id),
    ]);
    const lectureIds = (lectureRes.data || []).map(c => String(c.id));
    const tutorialIds = (tutorialRes.data || []).map(c => String(c.id));
    const courseMap = new Map();
    (lectureRes.data || []).forEach((c) => {
      courseMap.set(String(c.id), c.course_code || c.course_title || "");
    });
    (tutorialRes.data || []).forEach((c) => {
      courseMap.set(String(c.id), c.course_code || c.course_title || "");
    });

    // Fetch leave requests only for courses taught by this lecturer
    let leaveRequests = [];
    if (lectureIds.length + tutorialIds.length > 0) {
      const [leaveLectureRes, leaveTutorialRes] = await Promise.all([
        lectureIds.length > 0 ? supabase.from("leave_requests").select("*").in("course_id", lectureIds) : { data: [] },
        tutorialIds.length > 0 ? supabase.from("leave_requests").select("*").in("course_id", tutorialIds) : { data: [] },
      ]);
      leaveRequests = [
        ...(leaveLectureRes.data || []),
        ...(leaveTutorialRes.data || []),
      ];
    }

    // Fetch users for enrichment
    const usersRes = await supabase.from("users").select("id, name");
    const users = usersRes.data || [];

    if (usersRes.error || lectureRes.error || tutorialRes.error) {
      setSnackbar({ open: true, message: "Error loading data" });
      setLoading(false);
      return;
    }

    const enriched = leaveRequests.map((item) => {
      const user = users.find((u) => u.id === item.user_id);
      return {
        ...item,
        student: {
          name: user?.name || "N/A",
          studentId: user?.student_id || item.user_id.slice(0, 6),
          avatar: user?.name
            ? user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
            : item.user_id.slice(0, 2).toUpperCase(),
        },
        course: courseMap.get(String(item.course_id)) || item.course_id || "N/A",
        requestDate: new Date(item.created_at).toLocaleDateString(),
        startDate: new Date(item.date_time).toLocaleDateString(),
        endDate: new Date(item.date_time).toLocaleDateString(),
        documents: item.evidence_url
          ? [
              {
                id: "1",
                name: "Evidence",
                size: "Unknown size", 
                uploadDate: new Date(item.created_at).toLocaleDateString(),
                url: item.evidence_url,
              },
            ]
          : [],
      };
    });

    // Sort by leave period (date_time) ascending using the original date_time field
    setRequests(enriched.sort((a, b) => new Date(a.date_time) - new Date(b.date_time)));
    setLoading(false);
  };

  fetchLeaveRequests();
}, []);

  const filteredRequests = requests.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  const handleApprove = async (id) => {
    if (approving) return;
    setApproving(true);

    try {
      // Update leave request (LECTURER responsibility)
      const { data, error } = await supabase
        .from("leave_requests")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      console.log("UPDATE RESULT:", { data, error });

      const req = requests.find(r => r.id === id);
      const lecturer = JSON.parse(sessionStorage.getItem("user") || "null");
      if (!req || !lecturer?.id || !req.user_id || !req.date_time) return;

      // Build LOCAL day window
      const leaveDate = new Date(req.date_time);

      const start = new Date(leaveDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const dateOnly = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;

      // Fetch lecturer courses
      const [lecRes, tutRes] = await Promise.all([
        supabase.from("course_lecture").select("id").eq("lecturer_id", lecturer.id),
        supabase.from("course_tutorial").select("id").eq("lecturer_id", lecturer.id),
      ]);

      const lectureIds = (lecRes.data || []).map(c => c.id);
      const tutorialIds = (tutRes.data || []).map(c => c.id);

      // Fetch student enrollments
      const [stuLec, stuTut] = await Promise.all([
        lectureIds.length
          ? supabase.from("enrollment_lecture").select("id, course_id")
              .eq("student_id", req.user_id)
              .in("course_id", lectureIds)
          : { data: [] },
        tutorialIds.length
          ? supabase.from("enrollment_tutorial").select("id, tutorial_id")
              .eq("student_id", req.user_id)
              .in("tutorial_id", tutorialIds)
          : { data: [] }
      ]);

      const lectureEnrollmentId =
        stuLec.data?.find(e => e.course_id === req.course_id)?.id ?? null;

      const tutorialEnrollmentId =
        stuTut.data?.find(e => e.tutorial_id === req.course_id)?.id ?? null;

      const toSqlTimestamp = (d) =>
        d.toISOString().slice(0, 19).replace("T", " ");

      // Find sessions on that LOCAL day
      let sessionQuery = supabase
        .from("attendance_session")
        .select("id, course_lecture_id, course_tutorial_id, date, created_at")
        .eq("date", dateOnly)
        .gte("created_at", toSqlTimestamp(start))
        .lt("created_at", toSqlTimestamp(end));

      if (req.course_id) {
        sessionQuery = sessionQuery.or(
          `course_lecture_id.eq.${req.course_id},course_tutorial_id.eq.${req.course_id}`
        );
      }

      const { data: sessions } = await sessionQuery;

      // Insert excused attendance 
      const local = new Date();
      const fakeUtc = new Date(local.getTime() + 8 * 60 * 60 * 1000);
      const inserts = [];

      if (sessions?.length) {
        for (const s of sessions) {
          if (
            s.course_lecture_id === req.course_id &&
            lectureEnrollmentId
          ) {
            inserts.push({
              session_id: s.id,
              lecture_enrollment_id: lectureEnrollmentId,
              status: "excused",
              created_at: fakeUtc.toISOString(),
              leave_request_id: req.id
            });
          }

          if (
            s.course_tutorial_id === req.course_id &&
            tutorialEnrollmentId
          ) {
            inserts.push({
              session_id: s.id,
              tutorial_enrollment_id: tutorialEnrollmentId,
              status: "excused",
              created_at: fakeUtc.toISOString(),
              leave_request_id: req.id
            });
          }
        }
      }

      // PENDING (no sessions yet)
      if (!sessions?.length) {
        if (lectureEnrollmentId) {
          inserts.push({
            session_id: null,
            lecture_enrollment_id: lectureEnrollmentId,
            status: "excused",
            created_at: fakeUtc.toISOString(),
            leave_request_id: req.id
          });
        }

        if (tutorialEnrollmentId) {
          inserts.push({
            session_id: null,
            tutorial_enrollment_id: tutorialEnrollmentId,
            status: "excused",
            created_at: fakeUtc.toISOString(),
            leave_request_id: req.id
          });
        }
      }

      // Split by type FIRST
      const lectureRows = inserts.filter(r => r.lecture_enrollment_id);
      const tutorialRows = inserts.filter(r => r.tutorial_enrollment_id);

      // ---- PENDING (session_id = null) → INSERT ONLY ----
      const pendingLecture = lectureRows.filter(r => r.session_id === null);
      const pendingTutorial = tutorialRows.filter(r => r.session_id === null);

      if (pendingLecture.length) {
        await supabase.from("attendance_record").insert(pendingLecture);
      }

      if (pendingTutorial.length) {
        await supabase.from("attendance_record").insert(pendingTutorial);
      }

      // ---- SESSION-BASED (session_id exists) → UPSERT ----
      const sessionLecture = lectureRows.filter(r => r.session_id !== null);
      const sessionTutorial = tutorialRows.filter(r => r.session_id !== null);

      if (sessionLecture.length) {
        await supabase.from("attendance_record").upsert(sessionLecture, {
          onConflict: "lecture_enrollment_id,session_id"
        });
      }

      if (sessionTutorial.length) {
        await supabase.from("attendance_record").upsert(sessionTutorial, {
          onConflict: "tutorial_enrollment_id,session_id"
        });
      }

    } finally {
      setApproving(false);
      setRequests(prev =>
        prev.map(r => r.id === id ? { ...r, status: "approved" } : r)
      );
      setSnackbar({ open: true, message: "Leave request approved." });
      setIsDetailsOpen(false);
      onChanged?.();
    }
  };

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) {
      setSnackbar({
        open: true,
        message: "Please provide a reason for rejection.",
      });
      return;
    }

    try {
      const req = requests.find(r => r.id === id);
      if (!req) throw new Error("Leave request not found");

      // Update leave request
      const { error: updateError } = await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // Fetch student contact info
      const { data: userInfo, error: userError } = await supabase
        .from("users")
        .select("email, name, matric_number")
        .eq("id", req.user_id)
        .single();

      if (userError) {
        console.warn("Failed to fetch student info:", userError);
      }

      const lecturer = JSON.parse(sessionStorage.getItem("user") || "null");
      const toEmail = userInfo?.email;
      const studentName = userInfo?.name || "Student";
      const studentId = req.user_id;

      // Send rejection email
      if (toEmail) {
        const courseLabel = req.course || "Course";
        const leaveDate = new Date(req.date_time).toLocaleDateString();

        const html = `
          <div style="font-family: Arial, sans-serif; color:#0f172a;">
            <p>Dear ${studentName},</p>

            <p>
              Your leave request for <strong>${courseLabel}</strong>
              on <strong>${leaveDate}</strong> has been
              <span style="color:#ef4444; font-weight:bold;">rejected</span>.
            </p>

            <p><strong>Lecturer's Reason:</strong></p>
            <p>${rejectionReason.trim()}</p>

            <p>
              If you believe this decision is incorrect, please contact your lecturer.
            </p>

            <br/>
            <p>Regards,<br/>Attendance Management System</p>
          </div>
        `;

        const { error: fnError } = await supabase.functions.invoke(
          "send-absence-email",
          {
            body: {
              emails: [
                {
                  to: toEmail,
                  subject: `Leave Request Rejected - ${courseLabel}`,
                  html,
                  studentId,
                  studentName,
                },
              ],
              lecturerId: lecturer?.id || null,
            },
          }
        );

        if (fnError) {
          setSnackbar({
            open: true,
            message: "Leave rejected, but email failed to send.",
          });
        } else {
          setSnackbar({
            open: true,
            message: "Leave request rejected and email sent to student.",
          });
        }
      } else {
        setSnackbar({
          open: true,
          message: "Leave rejected. No student email found.",
        });
      }

      // Update UI state
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "rejected", rejectionReason }
            : r
        )
      );

      try { onChanged && onChanged(); } catch {}

    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: `Failed to reject leave request: ${err.message}`,
      });
    } finally {
      setIsDetailsOpen(false);
    }
  };

  const handleViewDocument = (doc) => {
    if (doc.url) {
        window.open(doc.url, '_blank', 'noopener,noreferrer');
      } else {
        setSnackbar({
          open: true,
          message: 'Document not available for viewing'
        });
      }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "approved":
        return <Chip label="Approved" color="success" />;
      case "rejected":
        return <Chip label="Rejected" color="error" />;
      case "pending":
        return <Chip label="Pending" color="warning" variant="outlined" />;
      default:
        return <Chip label="Unknown" />;
    }
  };

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
                    Leave Period
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
              {filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">No leave requests found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((r) => (
                  <TableRow
                    key={r.id}
                    sx={{ "&:hover": { backgroundColor: "#f8fafc" } }}
                  >
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography fontWeight="bold" color="text.primary" noWrap>
                        {r.student.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography color="text.primary" noWrap>{r.course}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography color="text.primary">{r.startDate}</Typography>
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

      {selectedRequest && (
        <Dialog open={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Leave Request Details</DialogTitle>
          <DialogContent dividers>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
            >
              <Tab label="Request Details" />
              <Tab
                label={`Supporting Documents (${selectedRequest.documents.length})`}
              />
            </Tabs>

            {tabValue === 0 && (
              <Box mt={2}>
                <Typography><strong>Student:</strong> {selectedRequest.student.name}</Typography>
                <Typography><strong>Course:</strong> {selectedRequest.course}</Typography>
                <Typography><strong>Request Date:</strong> {selectedRequest.requestDate}</Typography>
                <Typography><strong>Leave Date:</strong> {selectedRequest.startDate}</Typography>
                <Box display="flex" alignItems="center" gap={1} mt={1}>
                  <Typography><strong>Status:</strong></Typography>
                  {getStatusChip(selectedRequest.status)}
                </Box>
                <Typography mt={2}><strong>Reason:</strong> {selectedRequest.reason}</Typography>

                {selectedRequest.status === "rejected" && selectedRequest.rejectionReason && (
                  <Box mt={2}>
                    <Typography color="error">
                      <strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}
                    </Typography>
                  </Box>
                )}

                {selectedRequest.status === "pending" && (
                  <Box mt={2}>
                    <TextField
                      label="Rejection Reason (required if rejecting)"
                      multiline
                      fullWidth
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </Box>
                )}
              </Box>
            )}

            {tabValue === 1 && (
              <Box mt={2}>
                {selectedRequest.documents.length === 0 ? (
                  <Typography>No documents uploaded.</Typography>
                ) : (
                  selectedRequest.documents.map((doc) => (
                    <Box
                     key={doc.id}
                     display="flex"
                     justifyContent="space-between"
                     alignItems="center"
                     border={1}
                    borderRadius={1}
                     p={2}
                     mb={1}
                   >
                     <Box>
                       <Typography>{doc.name}</Typography>
                       <Typography variant="caption">
                         {doc.size} • Uploaded on {doc.uploadDate}
                       </Typography>
                     </Box>
                     <Button 
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewDocument(doc)}
                      variant="outlined"
                    >
                      View
                    </Button>
                   </Box>
                 ))
               )}
             </Box>
           )}
         </DialogContent>
         <DialogActions>
           {selectedRequest.status === "pending" ? (
             <>
               <Button onClick={() => setIsDetailsOpen(false)}>Cancel</Button>
               <Button
                 color="error"
                 onClick={() => handleReject(selectedRequest.id)}
               >
                 Reject
               </Button>
               <Button
                  color="success"
                  disabled={approving}
                  onClick={() => handleApprove(selectedRequest.id)}
                >
                  {approving ? "Approving..." : "Approve"}
                </Button>

             </>
           ) : (
             <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
           )}
         </DialogActions>
       </Dialog>
     )}

     <Snackbar
       open={snackbar.open}
       autoHideDuration={4000}
       onClose={() => setSnackbar({ open: false, message: "" })}
       message={snackbar.message}
       action={
         <IconButton
           size="small"
           aria-label="close"
           color="inherit"
           onClick={() => setSnackbar({ open: false, message: "" })}
         >
           <CloseIcon fontSize="small" />
         </IconButton>
       }
     />
    </Box>
  );
}
