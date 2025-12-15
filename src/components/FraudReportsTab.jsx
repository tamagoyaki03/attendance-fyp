import React from "react";
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
  Button,
  Chip,
  Snackbar,
  Alert,
  Box,
  Paper,
} from "@mui/material";
import MailIcon from "@mui/icons-material/Mail";
import EditIcon from "@mui/icons-material/Edit";

export default function FraudReportsTab() {
  const [snackbar, setSnackbar] = React.useState({ open: false, message: "", severity: "success" });

  const handleUpdateAttendance = (name) => {
    setSnackbar({ open: true, message: `Simulated attendance update for ${name}.`, severity: "success" });
  };

  const fraudData = [
    {
      id: "F001",
      studentName: "Alice Johnson",
      class: "Mathematics I",
      type: "Late Check-in",
      timestamp: "2025-06-10 09:15 AM",
      status: "Flagged",
    },
    {
      id: "F002",
      studentName: "Bob Williams",
      class: "Physics II",
      type: "Location Mismatch",
      timestamp: "2025-06-09 10:05 AM",
      status: "Flagged",
    },
    {
      id: "F003",
      studentName: "Charlie Brown",
      class: "Computer Science Fundamentals",
      type: "Late Check-in ",
      timestamp: "2025-06-12 11:00 AM",
      status: "Flagged",
    },
  ];

  return (
    <>
      <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
        <CardHeader
          sx={{ pb: 0 }}
          title={<Typography variant="h6" fontWeight="bold" color="text.primary">Fraud Detections</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">List of suspicious attendance records.</Typography>}
        />
        <CardContent>
          <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Student Name</strong></TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>Fraud Type</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fraudData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.studentName}</TableCell>
                    <TableCell>{row.class}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.timestamp}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        color={row.status === "Tardy" ? "warning" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" justifyContent="flex-end" gap={1}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleUpdateAttendance(row.studentName)}
                          sx={{
                            backgroundColor: "#ffffff",
                            color: "#0f172a",
                            textTransform: "none",
                            "&:hover": { backgroundColor: "#f3f4f6" },
                          }}
                        >
                          Update
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
