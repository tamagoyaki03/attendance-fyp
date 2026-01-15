import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  AlertTitle,
  Chip,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";

export default function ConflictDialog({
  open,
  onClose,
  conflicts,
  type = "student", // 'student' or 'lecturer'
  day,
  startTime,
  endTime,
}) {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  const isLecturerConflict = type === "lecturer";
  const conflictType = isLecturerConflict ? "Lecturer" : "Student";
  const timeRange = `${startTime?.substring(0, 5)} - ${endTime?.substring(0, 5)}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: "#ffffff",
          border: "2px solid #f97316",
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ backgroundColor: "#fff7ed", borderBottom: "1px solid #fed7aa" }}>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon sx={{ color: "#f97316" }} />
          <Typography variant="h6" fontWeight="bold" sx={{ color: "#f97316" }}>
            {conflictType} Schedule Conflict Detected
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Scheduling Issue</AlertTitle>
          {isLecturerConflict
            ? `This lecturer already has a class scheduled on ${day} from ${timeRange}.`
            : `These students already have classes scheduled on ${day} from ${timeRange}.`}
        </Alert>

        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
          {isLecturerConflict ? "Conflicting Class:" : "Conflicting Classes:"}
        </Typography>

        {isLecturerConflict ? (
          // Lecturer conflict - single class display
          <Box sx={{ p: 2, backgroundColor: "#f5f5f5", borderRadius: 1, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="start" gap={1}>
              <Box flex={1}>
                <Typography variant="body2" fontWeight="bold">
                  {conflicts.code}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {conflicts.title}
                </Typography>
              </Box>
              <Chip
                label={conflicts.type}
                size="small"
                sx={{
                  backgroundColor: conflicts.type === "Lecture" ? "#dbeafe" : "#fce7f3",
                  color: conflicts.type === "Lecture" ? "#0c4a6e" : "#831843",
                  fontWeight: 600,
                }}
              />
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              {day} • {conflicts.start?.substring(0, 5)} - {conflicts.end?.substring(0, 5)}
            </Typography>
          </Box>
        ) : (
          // Student conflicts - table display
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold" }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Conflict</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conflicts.map((conflict, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {conflict.studentName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <Typography variant="caption">{conflict.conflictingClass}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                        {conflict.conflictingTime}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Alert severity="info" icon={false} sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Recommendation:</strong> {isLecturerConflict
              ? "Assign a different lecturer or change the class time."
              : "Remove these students from the class or choose a different time slot."}
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="error">
          okay
        </Button>
      </DialogActions>
    </Dialog>
  );
}
