import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Chip,
  Grid,
  Box,
} from "@mui/material";
import {
  Visibility,
  Download,
  CheckCircle,
  Cancel,
  InsertDriveFile,
} from "@mui/icons-material";

const submissionData = [
  {
    id: 1,
    student: "Emma Johnson",
    studentId: "S12346",
    course: "BIO202",
    date: "Apr 11, 2023",
    submissionDate: "Apr 11, 2023",
    type: "Medical Certificate",
    reason: "Illness - Fever",
    status: "Under Review",
    documentUrl: "#",
  },
  {
    id: 2,
    student: "Sarah Davis",
    studentId: "S12348",
    course: "ENG101",
    date: "Apr 11, 2023",
    submissionDate: "Apr 11, 2023",
    type: "Medical Certificate",
    reason: "Illness - Migraine",
    status: "Approved",
    documentUrl: "#",
  },
  {
    id: 3,
    student: "Jennifer Lee",
    studentId: "S12350",
    course: "CHEM101",
    date: "Apr 10, 2023",
    submissionDate: "Apr 10, 2023",
    type: "Letter of Absence",
    reason: "Family Emergency",
    status: "Rejected",
    documentUrl: "#",
  },
  {
    id: 4,
    student: "Lisa Anderson",
    studentId: "S12352",
    course: "ART101",
    date: "Apr 10, 2023",
    submissionDate: "Apr 10, 2023",
    type: "Medical Certificate",
    reason: "Illness - Flu",
    status: "Under Review",
    documentUrl: "#",
  },
  {
    id: 5,
    student: "James Wilson",
    studentId: "S12353",
    course: "PHYS101",
    date: "Apr 9, 2023",
    submissionDate: "Apr 10, 2023",
    type: "Letter of Absence",
    reason: "Transportation Issues",
    status: "Under Review",
    documentUrl: "#",
  },
];

export default function MCSubmissions() {
  const [submissions, setSubmissions] = useState(submissionData);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleApprove = (id) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Approved" } : s))
    );
    setDialogOpen(false);
  };

  const handleReject = (id) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "Rejected" } : s))
    );
    setDialogOpen(false);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "Approved":
        return <Chip label="Approved" color="success" />;
      case "Rejected":
        return <Chip label="Rejected" color="error" />;
      case "Under Review":
        return <Chip label="Under Review" sx={{ borderColor: "orange", color: "orange" }} variant="outlined" />;
      default:
        return <Chip label={status} />;
    }
  };

  return (
    <>
      <TableContainer sx={{ background: "#09090b", border: "1px solid #fff", borderRadius: 2, margin: 2, width: "auto" }} component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Absence Date</TableCell>
              <TableCell>Submission Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <strong>{row.student}</strong>
                  <Typography variant="caption" display="block">
                    {row.studentId}
                  </Typography>
                </TableCell>
                <TableCell>{row.course}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.submissionDate}</TableCell>
                <TableCell>
                  <InsertDriveFile fontSize="small" sx={{ verticalAlign: "middle", mr: 1 }} />
                  {row.type}
                </TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell>{getStatusChip(row.status)}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => {
                      setSelectedSubmission(row);
                      setDialogOpen(true);
                    }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Review Absence Documentation</DialogTitle>
        <DialogContent dividers>
          {selectedSubmission && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                {selectedSubmission.student} ({selectedSubmission.studentId}) - {selectedSubmission.course}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">Document Type:</Typography>
                  <Typography>{selectedSubmission.type}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Absence Date:</Typography>
                  <Typography>{selectedSubmission.date}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Submission Date:</Typography>
                  <Typography>{selectedSubmission.submissionDate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Reason:</Typography>
                  <Typography>{selectedSubmission.reason}</Typography>
                </Grid>
              </Grid>

              <Box mt={3} p={2} border="1px solid #ccc" borderRadius={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" fontWeight="bold">
                    Document Preview
                  </Typography>
                  <Button variant="outlined" size="small" startIcon={<Download />}>
                    Download
                  </Button>
                </Box>
                <Box
                  height={200}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bgcolor="#f5f5f5"
                  borderRadius={1}
                >
                  <Box textAlign="center">
                    <InsertDriveFile fontSize="large" />
                    <Typography variant="body2">Document preview would appear here</Typography>
                  </Box>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            color="error"
            variant="outlined"
            startIcon={<Cancel />}
            onClick={() => handleReject(selectedSubmission.id)}
          >
            Reject
          </Button>
          <Button
            color="success"
            variant="outlined"
            startIcon={<CheckCircle />}
            onClick={() => handleApprove(selectedSubmission.id)}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
