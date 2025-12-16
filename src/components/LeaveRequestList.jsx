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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Snackbar,
  IconButton,
  InputLabel,
  FormControl,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from '@mui/icons-material/Visibility';
import supabase from "../config/supabaseClient";

export default function LeaveRequestList() {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectionReason, setRejectionReason] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchLeaveRequests = async () => {
    setLoading(true);

    const { data: leaveRequests, error: leaveError } = await supabase
      .from("leave_requests")
      .select("*");

    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, name");

    if (leaveError || userError) {
      console.error("Error fetching leave requests:", leaveError || userError);
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
        course: item.course_id || "N/A",
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

  const handleViewDetails = (req) => {
    setSelectedRequest(req);
    setIsDetailsOpen(true);
    setRejectionReason("");
    setTabValue(0);
  };

  const handleApprove = (id) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
    setSnackbar({ open: true, message: "Leave request approved." });
    setIsDetailsOpen(false);
  };

  const handleReject = (id) => {
    if (!rejectionReason.trim()) {
      setSnackbar({
        open: true,
        message: "Please provide a reason for rejection.",
      });
      return;
    }
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "rejected", rejectionReason } : r
      )
    );
    setSnackbar({ open: true, message: "Leave request rejected." });
    setIsDetailsOpen(false);
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
        <Table sx={{ border: "1px solid #fff", borderRadius: 2, width: "100%" }}>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Leave Period</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No leave requests found.</TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar>{r.student.avatar}</Avatar>
                      <Box>
                        <Typography>{r.student.name}</Typography>
                        <Typography variant="caption">{r.student.studentId}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{r.course}</TableCell>
                  <TableCell>{r.startDate}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>{getStatusChip(r.status)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => handleViewDetails(r)}>View Details</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
                <Typography><strong>Details:</strong> {selectedRequest.details}</Typography>

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
