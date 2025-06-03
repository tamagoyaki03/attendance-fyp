import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import Chip from "@mui/material/Chip";

  const fraudData = [
    {
      id: 1,
      student: "John Smith",
      studentId: "S12345",
      course: "CS101",
      date: "Apr 11, 2023",
      time: "10:15 AM",
      type: "Location Mismatch",
      details: "Student location is 2.5km away from lecture hall",
      status: "Open",
  },
  {
    id: 2,
    student: "Emma Johnson",
    studentId: "S12346",
    course: "BIO202",
    date: "Apr 11, 2023",
    time: "11:30 AM",
    type: "Suspicious Pattern",
    details: "Absent for 3 weeks, now present for all classes",
    status: "Open",
  },
  {
    id: 3,
    student: "Michael Brown",
    studentId: "S12347",
    course: "MATH303",
    date: "Apr 11, 2023",
    time: "2:45 PM",
    type: "Early Clock-out",
    details: "Clocked out 30 minutes before class end",
    status: "Open",
  },
  {
    id: 4,
    student: "Sarah Davis",
    studentId: "S12348",
    course: "ENG101",
    date: "Apr 11, 2023",
    time: "9:05 AM",
    type: "Location Mismatch",
    details: "Student location is 1.8km away from lecture hall",
    status: "Open",
  },
  {
    id: 5,
    student: "David Wilson",
    studentId: "S12349",
    course: "PHYS201",
    date: "Apr 11, 2023",
    time: "3:10 PM",
    type: "Multiple Check-ins",
    details: "Multiple devices used for check-in",
    status: "Open"
  },
  {
    id: 6,
    student: "Jennifer Lee",
    studentId: "S12350",
    course: "CHEM101",
    date: "Apr 10, 2023",
    time: "11:20 AM",
    type: "Location Mismatch",
    details: "Student location is 3.1km away from lecture hall",
    status: "Resolved"
  },
  {
    id: 7,
    student: "Robert Taylor",
    studentId: "S12351",
    course: "HIST202",
    date: "Apr 10, 2023",
    time: "1:45 PM",
    type: "Suspicious Pattern",
    details: "Inconsistent attendance pattern detected",
    status: "Resolved"
  },
  {
    id: 8,
    student: "Lisa Anderson",
    studentId: "S12352",
    course: "ART101",
    date: "Apr 10, 2023",
    time: "9:30 AM",
    type: "Early Clock-out",
    details: "Clocked out 25 minutes before class end",
    status: "Resolved"
  },
]

export default function FraudTable() {
  const [alerts, setAlerts] = useState(fraudData);
  const [snackbar, setSnackbar] = useState({ open: false, message: ""});

  const handleResolve = (id) => {
    setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, status: "Resolved" } : alert)))
    setSnackbar({
        title: "Alert resolved",
        description: "The fraud alert has been marked as resolved.",
    })
}

    const handleInvestigate = (id) => {
        setSnackbar({
            title: "Investigation initiated",
            description: "An investigation has been started for this alert.",
        })
    }

  const getStatusBadge = (status) => {
  switch (status) {
    case "Open":
      return (
        <Chip variant="outline" className="border-red-500 text-red-500">
          Open
        </Chip>
      )
    case "Resolved":
      return (
        <Chip variant="outline" className="border-green-500 text-green-500">
          Resolved
        </Chip>
      )
    default:
      return <Badge variant="outline">Unknown</Badge>
  }
}

  return (
    <div className="rounded-md border">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>Course</TableCell>
            <TableCell>Date & Time</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Details</TableCell>
            <TableCell>Status</TableCell>
            <TableCell className="ml-[40px]">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell>
                <div className="font-medium">{alert.student}</div>
                <div className="text-xs text-muted-foreground">{alert.studentId}</div>
              </TableCell>
              <TableCell>{alert.course}</TableCell>
              <TableCell>
                <div>{alert.date}</div>
                <div className="text-xs text-muted-foreground">{alert.time}</div>
              </TableCell>
              <TableCell>{alert.type}</TableCell>
              <TableCell className="max-w-[200px] truncate">{alert.details}</TableCell>
              <TableCell>{getStatusBadge(alert.status)}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleInvestigate(alert.id)}
                    disabled={alert.status === "Resolved"}
                  >
                    Investigate
                  </Button>
                  {alert.status === "Open" && (
                    <Button size="sm" variant="outline" onClick={() => handleResolve(alert.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

