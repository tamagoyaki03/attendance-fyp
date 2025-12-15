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
  // ...existing sample data...
  {
    id: 1,
    student: "Emma Johnson",
    studentId: "S12346",
    course: "BIO202",
    date: "Apr 11, 2023",
    submissionDate: "Apr 11, 2023",
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

  return (
    <>
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
        {/* table will fill the container; avoid forcing a large minWidth */}
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
              <TableCell align="right" sx={{ width: 120 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Actions
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {submissions.map((row) => (
              <TableRow
                key={row.id}
                sx={{
                  "&:hover": { backgroundColor: "#f8fafc" },
                }}
              >
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography fontWeight="bold" color="text.primary" noWrap>
                    {row.student}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                    {row.studentId}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 160 }}>
                  <Typography color="text.primary" noWrap>{row.course}</Typography>
                </TableCell>
                <TableCell>
                  <Typography color="text.primary">{row.date}</Typography>
                </TableCell>
                <TableCell>
                  <Typography color="text.primary">{row.submissionDate}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 360 }}>
                  <Typography color="text.primary" noWrap>{row.reason}</Typography>
                </TableCell>
                <TableCell>{getStatusChip(row.status)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => {
                      setSelectedSubmission(row);
                      setDialogOpen(true);
                    }}
                    sx={{
                      borderColor: "#e6edf3",
                      color: "#0f172a",
                      "&:hover": { backgroundColor: "rgba(15,23,42,0.04)" },
                      minWidth: 70,
                      px: 1,
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Review Absence Documentation</DialogTitle>
        <DialogContent dividers sx={{ background: "#fafafa" }}>
          {selectedSubmission && (
            <>
              <Typography variant="subtitle2" gutterBottom>
                {selectedSubmission.student} ({selectedSubmission.studentId}) — {selectedSubmission.course}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">Absence Date:</Typography>
                  <Typography>{selectedSubmission.date}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Submission Date:</Typography>
                  <Typography>{selectedSubmission.submissionDate}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2">Reason:</Typography>
                  <Typography>{selectedSubmission.reason}</Typography>
                </Grid>
              </Grid>

              <Box mt={3} p={2} sx={{ border: "1px solid #e6edf3", borderRadius: 2, background: "#fff" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" fontWeight="bold">
                    Document Preview
                  </Typography>
                  <Button variant="outlined" size="small" startIcon={<Download />} sx={{ borderColor: "#e6edf3", color: "#0f172a" }}>
                    Download
                  </Button>
                </Box>
                <Box
                  height={200}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bgcolor="#f5f7fb"
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderColor: "#e6edf3", color: "#0f172a" }}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="outlined"
            startIcon={<Cancel />}
            onClick={() => handleReject(selectedSubmission?.id)}
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
    </>
  );
}