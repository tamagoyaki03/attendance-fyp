import React, { useState } from "react"
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
  Paper,
  Box,
} from "@mui/material"
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns"

export default function AbsenceReportsTab() {
  const [fromDate, setFromDate] = useState(new Date(2025, 0, 1))
  const [toDate, setToDate] = useState(new Date())

  const absenceData = [
    { class: "Mathematics I", totalAbsences: 2, excused: 1, unexcused: 1, lastAbsence: "2025-06-05" },
    { class: "Physics II", totalAbsences: 3, excused: 0, unexcused: 3, lastAbsence: "2025-06-07" },
    { class: "Computer Science Fundamentals", totalAbsences: 1, excused: 1, unexcused: 0, lastAbsence: "2025-06-11" },
    { class: "Chemistry Lab", totalAbsences: 1, excused: 0, unexcused: 1, lastAbsence: "2025-06-06" },
  ]

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Card sx={{background:"#09090b"}}>
        <CardHeader
            title={<Typography variant="h6" fontWeight="bold">Absence Overview</Typography>}
            subheader="Summary of absences across all classes."
        />
        <CardContent>
            {/* Date Range */}
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

            {/* Absence Table */}
            <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
            <Table>
                <TableHead>
                <TableRow>
                    <TableCell><strong>Class Name</strong></TableCell>
                    <TableCell>Total Absences</TableCell>
                    <TableCell>Excused</TableCell>
                    <TableCell>Unexcused</TableCell>
                    <TableCell>Last Absence</TableCell>
                </TableRow>
                </TableHead>
                <TableBody>
                {absenceData.map((row, idx) => (
                    <TableRow key={idx}>
                    <TableCell>{row.class}</TableCell>
                    <TableCell>{row.totalAbsences}</TableCell>
                    <TableCell>{row.excused}</TableCell>
                    <TableCell>{row.unexcused}</TableCell>
                    <TableCell>{format(new Date(row.lastAbsence), "PPP")}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </TableContainer>
        </CardContent>
        </Card>
    </LocalizationProvider>
  )
}
