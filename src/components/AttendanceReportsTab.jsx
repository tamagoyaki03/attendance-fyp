import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";

// Dummy data
const attendanceData = [
  { class: "Mathematics I", totalSessions: 20, attended: 18, percentage: "90%", lastSession: "2025-06-10" },
  { class: "Physics II", totalSessions: 15, attended: 12, percentage: "80%", lastSession: "2025-06-09" },
  { class: "Computer Science Fundamentals", totalSessions: 25, attended: 24, percentage: "96%", lastSession: "2025-06-12" },
  { class: "Chemistry Lab", totalSessions: 10, attended: 9, percentage: "90%", lastSession: "2025-06-08" },
]

export default function AttendanceReportsTab() {
  const [fromDate, setFromDate] = useState(new Date(2025, 0, 1))
  const [toDate, setToDate] = useState(new Date())

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card sx={{background:"#09090b"}}>
        <CardHeader
          title={<Typography variant="h6" fontWeight="bold">Attendance Overview</Typography>}
          subheader="Summary of attendance across all classes."
        />
        <CardContent>
          {/* Date Range Pickers */}
          <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
            <DatePicker
              label="From"
            value={fromDate}
            onChange={(newDate) => setFromDate(newDate)}
            slotProps={{ textField: { size: "small" } }}
          />
          <DatePicker
            label="To"
            value={toDate}
            onChange={(newDate) => setToDate(newDate)}
            slotProps={{ textField: { size: "small" } }}
          />
        </Box>

        {/* Table */}
        <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Class Name</strong></TableCell>
                <TableCell>Total Sessions</TableCell>
                <TableCell>Attended Sessions</TableCell>
                <TableCell>Attendance %</TableCell>
                <TableCell>Last Session</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendanceData.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>{row.class}</TableCell>
                  <TableCell>{row.totalSessions}</TableCell>
                  <TableCell>{row.attended}</TableCell>
                  <TableCell>{row.percentage}</TableCell>
                  <TableCell>{format(new Date(row.lastSession), "PPP")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
      <CardActions />
    </Card>
    </LocalizationProvider>
  )
}
