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
      console.error("Error fetching leave requests:", usersRes.error || lectureRes.error || tutorialRes.error);
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

    setRequests(enriched);
    setLoading(false);
  };

  fetchLeaveRequests();
}, []);

  const filteredRequests = requests.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  const handleApprove = async (id) => {
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) console.warn("Leave request approve DB error:", error);

      // Also create excused attendance records for sessions on the leave date for this lecturer's courses
      const req = requests.find(r => r.id === id);
      const lecturer = JSON.parse(sessionStorage.getItem("user") || "null");
      if (req && lecturer?.id && req.user_id && req.date_time) {
        const leaveDate = new Date(req.date_time);
        // Build day range [start, end) in ISO for created_at and a date-only string for date column
        const start = new Date(leaveDate);
        start.setHours(0,0,0,0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const startIso = start.toISOString();
        const endIso = end.toISOString();
        const dateOnly = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;

        // Fetch lecturer courses
        const [lecRes, tutRes] = await Promise.all([
          supabase.from("course_lecture").select("id").eq("lecturer_id", lecturer.id),
          supabase.from("course_tutorial").select("id").eq("lecturer_id", lecturer.id)
        ]);
        const lectureIds = (lecRes.data || []).map(c => c.id);
        const tutorialIds = (tutRes.data || []).map(c => c.id);

        if (lectureIds.length + tutorialIds.length > 0) {
          // Sessions matching courses AND falling on the same local day
          let sessionQuery = supabase
            .from("attendance_session")
            .select("id, course_lecture_id, course_tutorial_id, date, created_at");
          const courseOr = [];
          if (lectureIds.length > 0) courseOr.push(`course_lecture_id.in.(${lectureIds.join(',')})`);
          if (tutorialIds.length > 0) courseOr.push(`course_tutorial_id.in.(${tutorialIds.join(',')})`);
          if (courseOr.length > 0) sessionQuery = sessionQuery.or(courseOr.join(','));
          // date column may be populated OR we fallback to created_at range
          sessionQuery = sessionQuery.or(`date.eq.${dateOnly},and(created_at.gte.${startIso},created_at.lt.${endIso})`);
          const { data: sessions, error: sessErr } = await sessionQuery;
          if (!sessErr && Array.isArray(sessions) && sessions.length > 0) {
            // Fetch the student's enrollments for those courses
            const [stuLecEnr, stuTutEnr] = await Promise.all([
              lectureIds.length > 0
                ? supabase.from("enrollment_lecture").select("id, course_id").eq("student_id", req.user_id).in("course_id", lectureIds)
                : Promise.resolve({ data: [] }),
              tutorialIds.length > 0
                ? supabase.from("enrollment_tutorial").select("id, tutorial_id").eq("student_id", req.user_id).in("tutorial_id", tutorialIds)
                : Promise.resolve({ data: [] })
            ]);
            const lecEnrollMap = new Map((stuLecEnr.data || []).map(e => [e.course_id, e.id]));
            const tutEnrollMap = new Map((stuTutEnr.data || []).map(e => [e.tutorial_id, e.id]));

            // Prepare inserts for each matching session
            const inserts = [];
            for (const s of sessions) {
              if (s.course_lecture_id && lecEnrollMap.has(s.course_lecture_id)) {
                inserts.push({
                  session_id: s.id,
                  lecture_enrollment_id: lecEnrollMap.get(s.course_lecture_id),
                  status: "excused",
                  created_at: new Date().toISOString(), // store in UTC
                });
              } else if (s.course_tutorial_id && tutEnrollMap.has(s.course_tutorial_id)) {
                inserts.push({
                  session_id: s.id,
                  tutorial_enrollment_id: tutEnrollMap.get(s.course_tutorial_id),
                  status: "excused",
                  created_at: new Date().toISOString(), // store in UTC
                });
              }
            }
            if (inserts.length > 0) {
              const { error: insErr } = await supabase.from("attendance_record").insert(inserts);
              if (insErr) {
                console.warn("Failed to insert excused attendance for leave:", insErr);
                setSnackbar({ open: true, message: `Failed to add excused attendance: ${insErr.message || 'RLS or validation failed'}` });
              } else {
                setSnackbar({ open: true, message: "Excused attendance recorded." });
              }
            } else {
              // No matching sessions/enrollments found on that date
              setSnackbar({ open: true, message: "No matching sessions/enrollments found for leave date." });
            }
          }
        }
      }
    } catch (e) {
      console.error("Approve leave request failed:", e);
    } finally {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
      );
      setSnackbar({ open: true, message: "Leave request approved." });
      setIsDetailsOpen(false);
      // eslint-disable-next-line no-empty
      try { onChanged && onChanged(); } catch {}
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
      const { error } = await supabase
        .from("leave_requests")
        .update({ status: "rejected", rejection_reason: rejectionReason })
        .eq("id", id);
      if (error) console.warn("Leave request reject DB error:", error);
    } catch (e) {
      console.error("Reject leave request failed:", e);
    } finally {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: "rejected", rejectionReason } : r
        )
      );
      setSnackbar({ open: true, message: "Leave request rejected." });
      setIsDetailsOpen(false);
      // eslint-disable-next-line no-empty
      try { onChanged && onChanged(); } catch {}
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
                  <Box mt={2} p={2} bgcolor="error.light">
                    <Typography color="error"><strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}</Typography>
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
                 onClick={() => handleApprove(selectedRequest.id)}
               >
                 Approve
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
