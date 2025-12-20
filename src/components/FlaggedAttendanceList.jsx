import React, { useState } from "react"
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import { Search, AccessTime, LocationOn, Report } from "@mui/icons-material"
import ViewDetailsButton from "./ViewDetailsButton"

const flaggedAttendance = [
  {
    id: "s1003",
    name: "Michael Brown",
    studentId: "S12347",
    checkInTime: "10:12 AM",
    checkInLocation: { lat: 37.7749, lng: -122.4194 },
    status: "tardy",
    flagReason: "Late check-in (12 minutes)",
    avatar: "MB",
  },
  {
    id: "s1005",
    name: "David Wilson",
    studentId: "S12349",
    checkInTime: "10:15 AM",
    checkInLocation: { lat: 37.7749, lng: -122.4194 },
    status: "tardy",
    flagReason: "Late check-in (15 minutes)",
    avatar: "DW",
  },
  {
    id: "s1011",
    name: "Thomas Johnson",
    studentId: "S12355",
    checkInTime: "10:03 AM",
    checkInLocation: { lat: 37.765, lng: -122.432 },
    status: "suspicious",
    flagReason: "Location mismatch (0.8 km from classroom)",
    avatar: "TJ",
  },
  {
    id: "s1012",
    name: "Emily Clark",
    studentId: "S12356",
    checkInTime: "10:05 AM",
    checkInLocation: { lat: 37.7749, lng: -122.4194 },
    status: "suspicious",
    flagReason: "Multiple device check-ins detected",
    avatar: "EC",
  },
]

export default function FlaggedAttendanceList({ onSelectStudent }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStudents = flaggedAttendance.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.flagReason.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getFlagColor = (status) => {
    switch (status) {
      case "tardy":
        return "warning"
      case "suspicious":
        return "error"
      default:
        return "default"
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search flagged attendance..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        style={{ marginBottom: 24 }}
      />

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Student</strong></TableCell>
              <TableCell><strong>Flag Reason</strong></TableCell>
              <TableCell><strong>Check-in Time</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No flagged attendance found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar>{student.avatar}</Avatar>
                      <div>
                        <Typography variant="body1">{student.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.studentId}
                        </Typography>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <Report color="error" fontSize="small" style={{ marginRight: 4 }} />
                      <Typography variant="body2">{student.flagReason}</Typography>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <AccessTime fontSize="small" style={{ marginRight: 4 }} />
                      {student.checkInTime}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#888" }}>
                      <LocationOn fontSize="small" style={{ marginRight: 4 }} />
                      {student.checkInLocation.lat.toFixed(4)}, {student.checkInLocation.lng.toFixed(4)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      badgeContent={student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      color={getFlagColor(student.status)}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <ViewDetailsButton onClick={() => handleSelectStudent(student)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
