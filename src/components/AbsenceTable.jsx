import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button,
  Chip,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";

const absenceData = [
  {
    id: 1,
    student: "John Smith",
    studentId: "S12345",
    course: "CS101",
    date: "Apr 11, 2023",
    time: "10:15 AM",
    emailSent: true,
    mcSubmitted: false,
    status: "Pending",
  },
  {
    id: 2,
    student: "Emma Johnson",
    studentId: "S12346",
    course: "BIO202",
    date: "Apr 11, 2023",
    time: "11:30 AM",
    emailSent: true,
    mcSubmitted: true,
    status: "Under Review",
  },
  // ...add the rest of your absenceData
];

export default function AbsenceTable() {
  const [absences, setAbsences] = useState(absenceData);
  const [selectedRows, setSelectedRows] = useState([]);

  const handleSelectAll = (checked) => {
    setSelectedRows(checked ? absences.map((a) => a.id) : []);
  };

  const handleSelectRow = (id, checked) => {
    setSelectedRows((prev) =>
      checked ? [...prev, id] : prev.filter((rowId) => rowId !== id)
    );
  };

  const handleSendReminder = (id) => {
    toast.success("Reminder sent to student.");
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "Approved":
        return <Chip label={status} color="success" size="small" />;
      case "Rejected":
        return <Chip label={status} color="error" size="small" />;
      case "Under Review":
        return (
          <Chip
            label={status}
            size="small"
            variant="outlined"
            sx={{ borderColor: "#f59e0b", color: "#f59e0b" }}
          />
        );
      case "Pending":
        return <Chip label={status} color="warning" size="small" />;
      default:
        return <Chip label={status} variant="outlined" size="small" />;
    }
  };

  return (
    <TableContainer component={Paper} sx={{ mt: 2, background: "#09090b", border: "1px solid #fff", borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
            <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>Course</TableCell>
            <TableCell>Date & Time</TableCell>
            <TableCell>Email Status</TableCell>
            <TableCell>MC Status</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {absences.map((absence) => (
            <TableRow key={absence.id}>

              <TableCell>
                <Typography fontWeight="bold">{absence.student}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {absence.studentId}
                </Typography>
              </TableCell>
              <TableCell>{absence.course}</TableCell>
              <TableCell>
                <div>{absence.date}</div>
                <Typography variant="caption" color="text.secondary">
                  {absence.time}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={absence.emailSent ? "Sent" : "Not Sent"}
                  size="small"
                  variant="outlined"
                  color={absence.emailSent ? "success" : "error"}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={absence.mcSubmitted ? "Submitted" : "Not Submitted"}
                  size="small"
                  variant="outlined"
                  color={absence.mcSubmitted ? "success" : "error"}
                />
              </TableCell>
              <TableCell>{getStatusChip(absence.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
