import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
} from "@mui/material";

export default function AbsenceTable({ absences = [], loading = false }) {

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

  const renderBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={5} align="center">
            <Typography variant="body2" color="text.secondary">
              Loading absences...
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    if (!absences || absences.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} align="center">
            <Typography variant="body2" color="text.secondary">
              No absences recorded.
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return absences.map((absence) => (
      <TableRow
        key={absence.id}
        sx={{
          "&:hover": { backgroundColor: "#f8fafc" },
        }}
      >
        <TableCell>
          <Box>
            <Typography fontWeight="bold" color="text.primary">
              {absence.student}
            </Typography>
          </Box>
        </TableCell>

        <TableCell>
          <Typography color="text.primary">{absence.course}</Typography>
        </TableCell>

        <TableCell>
          <div>{absence.date}</div>
          <Typography variant="caption" color="text.secondary">
            {absence.time}
          </Typography>
        </TableCell>

        <TableCell>
          <Chip
            label={absence.mcSubmitted ? "Submitted" : "Not Submitted"}
            size="small"
            variant={absence.mcSubmitted ? "filled" : "outlined"}
            color={absence.mcSubmitted ? "success" : "error"}
          />
        </TableCell>

        <TableCell>{getStatusChip(absence.status)}</TableCell>
      </TableRow>
    ));
  };

  return (
    <TableContainer
      component={Paper}
      sx={{
        mt: 2,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 2,
        boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
      }}
    >
      <Table size="small">
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
                Date & Time
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" color="text.secondary">
                MC Status
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="subtitle2" color="text.secondary">
                Status
              </Typography>
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>{renderBody()}</TableBody>
      </Table>
    </TableContainer>
  );
}