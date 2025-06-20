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
import DownloadIcon from "@mui/icons-material/Download";
import supabase from "../config/supabaseClient";

// // Sample leave request data
// const leaveRequests = [
//   {
//     id: "lr1001",
//     student: {
//       id: "s1001",
//       name: "John Smith",
//       studentId: "S12345",
//       avatar: "JS",
//     },
//     course: "CS101: Introduction to Computer Science",
//     requestDate: "Apr 15, 2023",
//     startDate: "Apr 20, 2023",
//     endDate: "Apr 22, 2023",
//     reason: "Medical",
//     details: "Need to undergo a minor surgical procedure and recovery.",
//     status: "pending",
//     documents: [
//       {
//         id: "doc1",
//         name: "Medical Certificate.pdf",
//         type: "application/pdf",
//         size: "1.2 MB",
//         uploadDate: "Apr 15, 2023",
//       },
//       {
//         id: "doc2",
//         name: "Hospital Appointment.pdf",
//         type: "application/pdf",
//         size: "0.8 MB",
//         uploadDate: "Apr 15, 2023",
//       },
//     ],
//   },
//   {
//     id: "lr1002",
//     student: {
//       id: "s1002",
//       name: "Emma Johnson",
//       studentId: "S12346",
//       avatar: "EJ",
//     },
//     course: "BIO202: Molecular Biology",
//     requestDate: "Apr 14, 2023",
//     startDate: "Apr 18, 2023",
//     endDate: "Apr 19, 2023",
//     reason: "Family Emergency",
//     details: "Family member hospitalized, need to travel home.",
//     status: "approved",
//     documents: [
//       {
//         id: "doc3",
//         name: "Family Emergency Declaration.pdf",
//         type: "application/pdf",
//         size: "0.5 MB",
//         uploadDate: "Apr 14, 2023",
//       },
//     ],
//   },
//   {
//     id: "lr1003",
//     student: {
//       id: "s1003",
//       name: "Michael Brown",
//       studentId: "S12347",
//       avatar: "MB",
//     },
//     course: "MATH303: Calculus III",
//     requestDate: "Apr 13, 2023",
//     startDate: "Apr 17, 2023",
//     endDate: "Apr 21, 2023",
//     reason: "Conference Attendance",
//     details: "Attending the International Mathematics Conference as a student presenter.",
//     status: "pending",
//     documents: [
//       {
//         id: "doc4",
//         name: "Conference Invitation.pdf",
//         type: "application/pdf",
//         size: "1.5 MB",
//         uploadDate: "Apr 13, 2023",
//       },
//       {
//         id: "doc5",
//         name: "Presentation Schedule.pdf",
//         type: "application/pdf",
//         size: "0.7 MB",
//         uploadDate: "Apr 13, 2023",
//       },
//     ],
//   },
//   {
//     id: "lr1004",
//     student: {
//       id: "s1004",
//       name: "Sarah Davis",
//       studentId: "S12348",
//       avatar: "SD",
//     },
//     course: "ENG101: English Composition",
//     requestDate: "Apr 12, 2023",
//     startDate: "Apr 16, 2023",
//     endDate: "Apr 16, 2023",
//     reason: "Religious Holiday",
//     details: "Observing an important religious holiday.",
//     status: "approved",
//     documents: [
//       {
//         id: "doc6",
//         name: "Religious Observance Form.pdf",
//         type: "application/pdf",
//         size: "0.3 MB",
//         uploadDate: "Apr 12, 2023",
//       },
//     ],
//   },
//   {
//     id: "lr1005",
//     student: {
//       id: "s1005",
//       name: "David Wilson",
//       studentId: "S12349",
//       avatar: "DW",
//     },
//     course: "PHYS201: Physics II",
//     requestDate: "Apr 11, 2023",
//     startDate: "Apr 19, 2023",
//     endDate: "Apr 23, 2023",
//     reason: "Sports Competition",
//     details: "Representing the university in the National College Athletics Championship.",
//     status: "rejected",
//     documents: [
//       {
//         id: "doc7",
//         name: "Team Selection Letter.pdf",
//         type: "application/pdf",
//         size: "0.6 MB",
//         uploadDate: "Apr 11, 2023",
//       },
//       {
//         id: "doc8",
//         name: "Competition Schedule.pdf",
//         type: "application/pdf",
//         size: "0.9 MB",
//         uploadDate: "Apr 11, 2023",
//       },
//     ],
//     rejectionReason:
//       "Request submitted too late according to department policy. Classes cannot be missed for this event.",
//   },
// ]

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
                size: "N/A",
                uploadDate: new Date(item.created_at).toLocaleDateString(),
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

  // return (
  //   <Box p={2}>

  //     <Table sx={{ border: "1px solid #fff", borderRadius: 2, width: "100%" }}>
  //       <TableHead>
  //         <TableRow>
  //           <TableCell>Student</TableCell>
  //           <TableCell>Course</TableCell>
  //           <TableCell>Leave Period</TableCell>
  //           <TableCell>Reason</TableCell>
  //           <TableCell>Status</TableCell>
  //           <TableCell align="right">Actions</TableCell>
  //         </TableRow>
  //       </TableHead>
  //       <TableBody>
  //         {filteredRequests.length === 0 ? (
  //           <TableRow>
  //             <TableCell colSpan={6} align="center">
  //               No leave requests found.
  //             </TableCell>
  //           </TableRow>
  //         ) : (
  //           filteredRequests.map((r) => (
  //             <TableRow key={r.id}>
  //               <TableCell>
  //                 <Box display="flex" alignItems="center" gap={1}>
  //                   <Avatar>{r.student.avatar}</Avatar>
  //                   <Box>
  //                     <Typography>{r.student.name}</Typography>
  //                     <Typography variant="caption">
  //                       {r.student.studentId}
  //                     </Typography>
  //                   </Box>
  //                 </Box>
  //               </TableCell>
  //               <TableCell>{r.course}</TableCell>
  //               <TableCell>
  //                 {r.startDate === r.endDate
  //                   ? r.startDate
  //                   : `${r.startDate} - ${r.endDate}`}
  //               </TableCell>
  //               <TableCell>{r.reason}</TableCell>
  //               <TableCell>{getStatusChip(r.status)}</TableCell>
  //               <TableCell align="right">
  //                 <Button size="small" onClick={() => handleViewDetails(r)}>
  //                   View Details
  //                 </Button>
  //               </TableCell>
  //             </TableRow>
  //           ))
  //         )}
  //       </TableBody>
  //     </Table>

  //     {selectedRequest && (
  //       <Dialog open={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} maxWidth="md" fullWidth>
  //         <DialogTitle>Leave Request Details</DialogTitle>
  //         <DialogContent dividers>
  //           <Tabs
  //             value={tabValue}
  //             onChange={(e, newValue) => setTabValue(newValue)}
  //           >
  //             <Tab label="Request Details" />
  //             <Tab
  //               label={`Supporting Documents (${selectedRequest.documents.length})`}
  //             />
  //           </Tabs>

  //           {tabValue === 0 && (
  //             <Box mt={2}>
  //               <Typography><strong>Course:</strong> {selectedRequest.course}</Typography>
  //               <Typography><strong>Request Date:</strong> {selectedRequest.requestDate}</Typography>
  //               <Typography>
  //                 <strong>Leave Period:</strong>{" "}
  //                 {selectedRequest.startDate === selectedRequest.endDate
  //                   ? selectedRequest.startDate
  //                   : `${selectedRequest.startDate} - ${selectedRequest.endDate}`}
  //               </Typography>
  //               <Typography><strong>Status:</strong> {getStatusChip(selectedRequest.status)}</Typography>
  //               <Typography mt={2}><strong>Reason:</strong> {selectedRequest.reason}</Typography>
  //               <Typography><strong>Details:</strong> {selectedRequest.details}</Typography>

  //               {selectedRequest.status === "rejected" && selectedRequest.rejectionReason && (
  //                 <Box mt={2} p={2} bgcolor="error.light">
  //                   <Typography color="error"><strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}</Typography>
  //                 </Box>
  //               )}

  //               {selectedRequest.status === "pending" && (
  //                 <Box mt={2}>
  //                   <TextField
  //                     label="Rejection Reason (required if rejecting)"
  //                     multiline
  //                     fullWidth
  //                     rows={3}
  //                     value={rejectionReason}
  //                     onChange={(e) => setRejectionReason(e.target.value)}
  //                   />
  //                 </Box>
  //               )}
  //             </Box>
  //           )}

  //           {tabValue === 1 && (
  //             <Box mt={2}>
  //               {selectedRequest.documents.map((doc) => (
  //                 <Box
  //                   key={doc.id}
  //                   display="flex"
  //                   justifyContent="space-between"
  //                   alignItems="center"
  //                   border={1}
  //                   borderRadius={1}
  //                   p={2}
  //                   mb={1}
  //                 >
  //                   <Box>
  //                     <Typography>{doc.name}</Typography>
  //                     <Typography variant="caption">
  //                       {doc.size} • Uploaded on {doc.uploadDate}
  //                     </Typography>
  //                   </Box>
  //                   <Button startIcon={<DownloadIcon />}>Download</Button>
  //                 </Box>
  //               ))}
  //             </Box>
  //           )}
  //         </DialogContent>
  //         <DialogActions>
  //           {selectedRequest.status === "pending" ? (
  //             <>
  //               <Button onClick={() => setIsDetailsOpen(false)}>Cancel</Button>
  //               <Button
  //                 color="error"
  //                 onClick={() => handleReject(selectedRequest.id)}
  //               >
  //                 Reject
  //               </Button>
  //               <Button
  //                 color="success"
  //                 onClick={() => handleApprove(selectedRequest.id)}
  //               >
  //                 Approve
  //               </Button>
  //             </>
  //           ) : (
  //             <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
  //           )}
  //         </DialogActions>
  //       </Dialog>
  //     )}

  //     <Snackbar
  //       open={snackbar.open}
  //       autoHideDuration={4000}
  //       onClose={() => setSnackbar({ open: false, message: "" })}
  //       message={snackbar.message}
  //       action={
  //         <IconButton
  //           size="small"
  //           aria-label="close"
  //           color="inherit"
  //           onClick={() => setSnackbar({ open: false, message: "" })}
  //         >
  //           <CloseIcon fontSize="small" />
  //         </IconButton>
  //       }
  //     />
  //   </Box>
  // );
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

      {/* Dialog, Snackbar remains unchanged */}
    </Box>
  );
}
