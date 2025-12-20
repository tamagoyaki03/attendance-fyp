import React, { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableContainer, TableRow, Paper,
  Button, TextField, InputAdornment, Chip, Box, Typography,
  FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { 
  Search as SearchIcon, 
  Flag as FlagIcon, 
  EventNote as ExcuseIcon 
} from "@mui/icons-material";
import ViewDetailsButton from "./ViewDetailsButton";

export default function StudentAttendanceList({ classData, onSelectStudent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tabValue, setTabValue] = useState(0); 
  
  // Get students from classData (passed from parent)
  const students = classData?.students || [];

  const filteredStudents = students.filter(student => {
    const studentName = student.name || '';
    const studentEmail = student.email || '';
    const studentId = student.student_id || '';
    const studentStatus = student.status || '';

    const matchesSearch = searchTerm === '' || 
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentId.toString().toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      studentStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return <Chip label="Present" color="success" size="small" />;
      case "tardy":
        return <Chip label="Tardy" color="warning" size="small" />;
      case "absent":
        return <Chip label="Absent" variant="outlined" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  return (
    <div>
      <Box mb={2} display="flex" gap={2}>
        <TextField
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="present">Present</MenuItem>
            <MenuItem value="absent">Absent</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "none" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student Name</TableCell>
              <TableCell>Student ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Check-in Time</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

        <TableBody>
          {filteredStudents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={tabValue === 0 ? 5 : 6} style={{ height: 96, textAlign: "center" }}>
                {tabValue === 1 ? "No excused students found." : 
                tabValue === 2 ? "No flagged students found." : 
                "No students found matching your criteria."}
              </TableCell>
            </TableRow>
          ) : (
            filteredStudents.map((student, index) => (
              <TableRow key={student.id || index}>
                <TableCell>
                  <Typography fontWeight={500}>{student.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {student.email}
                  </Typography>
                </TableCell>
                <TableCell>{student.student_id}</TableCell>
                <TableCell>{getStatusBadge(student.status, student)}</TableCell>
                <TableCell>
                  {student.checkInTime ? new Date(student.checkInTime).toLocaleTimeString() : "N/A"}
                </TableCell>
                
                {/* Excuse Reason Column (only show in Excused tab) */}
                {tabValue === 1 && (
                  <TableCell>
                    <Typography variant="body2">
                      {student.excuse_reason || "Medical excuse"}
                    </Typography>
                  </TableCell>
                )}
                
                {/* Flag Reason Column (only show in Flagged tab) */}
                {tabValue === 2 && (
                  <TableCell>
                    <Typography variant="body2" color="error">
                      {student.flag_reason || "Attendance pattern concern"}
                    </Typography>
                  </TableCell>
                )}
                
                <TableCell align="right">
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    {/* Show different actions based on current tab and student status */}
                    {tabValue === 0 && (
                      <>
                        {!(student.isExcused || student.excuse_reason) && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="info"
                            onClick={() => handleExcuseStudent(student)}
                            startIcon={<ExcuseIcon />}
                          >
                            Excuse
                          </Button>
                        )}
                        {!(student.isFlagged || student.flag_reason) && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="warning"
                            onClick={() => handleFlagStudent(student)}
                            startIcon={<FlagIcon />}
                          >
                            Flag
                          </Button>
                        )}
                      </>
                    )}   
                    <ViewDetailsButton onClick={() => onSelectStudent(student)} />
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}