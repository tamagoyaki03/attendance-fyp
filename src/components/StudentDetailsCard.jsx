import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Tabs,
  Tab,
  Typography,
  Button,
  Divider,
  Box,
  IconButton,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DownloadIcon from "@mui/icons-material/Download";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/Error";

// Sample attendance history
const attendanceHistory = [
  {
    date: "Apr 12, 2023",
    status: "present",
    checkInTime: "10:02 AM",
    checkOutTime: "11:28 AM",
  },
  {
    date: "Apr 10, 2023",
    status: "present",
    checkInTime: "10:05 AM",
    checkOutTime: "11:30 AM",
  },
  {
    date: "Apr 7, 2023",
    status: "tardy",
    checkInTime: "10:15 AM",
    checkOutTime: "11:30 AM",
  },
  {
    date: "Apr 5, 2023",
    status: "present",
    checkInTime: "10:01 AM",
    checkOutTime: "11:29 AM",
  },
  {
    date: "Apr 3, 2023",
    status: "absent",
    checkInTime: null,
    checkOutTime: null,
  },
]

export default function StudentDetailsCard({ student, onClose, onMarkPresent }) {
  const [activeTab, setActiveTab] = useState("details")

  const handleGenerateReport = () => {


    setTimeout(() => {
      console.log(`Downloading attendance report for ${student.name}...`)

    }, 1000)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "on-time":
      case "present":
        return <Badge className="bg-green-500">Present</Badge>
      case "tardy":
        return <Badge className="bg-amber-500">Tardy</Badge>
      case "absent":
        return (
          <Badge variant="outline" className="text-red-500 border-red-500">
            Absent
          </Badge>
        )
      default:
        return null
    }
  }

  const getAttendanceRate = () => {
    const total = attendanceHistory.length
    const present = attendanceHistory.filter((a) => a.status === "present" || a.status === "tardy").length
    return Math.round((present / total) * 100)
  }

  if (!student) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6">No student selected</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <h2>Student Details</h2>
          <Typography>View and manage student attendance</Typography>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <CloseIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* <Avatar className="h-16 w-16">
            <AvatarImage src={`/placeholder.svg?height=64&width=64&text=${student.avatar}`} />
            <AvatarFallback>{student.avatar}</AvatarFallback>
          </Avatar> */}

          <div className="space-y-1 flex-1">
            <h3 className="text-xl font-semibold">{student.name}</h3>
            <p className="text-sm text-muted-foreground">ID: {student.studentId}</p>

            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(student.status)}

              {student.status === "absent" && (
                <Button size="sm" variant="outline" onClick={() => onMarkPresent(student.studentId)}>
                  <UserCheck className="mr-1 h-4 w-4" />
                  Mark as Present
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1 text-sm">
            {student.status !== "absent" && (
              <>
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                  Check-in: {student.checkInTime}
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-1 h-4 w-4 text-muted-foreground" />
                  Location: {student.checkInLocation?.lat.toFixed(4)}, {student.checkInLocation?.lng.toFixed(4)}
                </div>
              </>
            )}
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
              {student.status === "absent" ? `Last attended: ${student.lastAttendance}` : "Today"}
            </div>
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="details" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="details">Attendance Details</TabsTrigger>
            <TabsTrigger value="history">Attendance History</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <h2 className="text-sm font-medium">Attendance Rate</h2>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">{getAttendanceRate()}%</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${getAttendanceRate()}%` }}></div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-4 pb-2">
                    <h2 className="text-sm font-medium">Tardiness</h2>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold">
                      {attendanceHistory.filter((a) => a.status === "tardy").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Late check-ins</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="p-4 pb-2">
                  <h2 className="text-sm font-medium">Notes</h2>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground">
                    {student.status === "tardy"
                      ? "Student has been late multiple times this month. Consider sending a reminder about attendance policy."
                      : student.status === "absent"
                        ? "Student has missed multiple classes. Follow up required."
                        : "No special notes for this student."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Date</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">Check-in</th>
                    <th className="p-2 text-left font-medium">Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{record.date}</td>
                      <td className="p-2">{getStatusBadge(record.status)}</td>
                      <td className="p-2">{record.checkInTime || "—"}</td>
                      <td className="p-2">{record.checkOutTime || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateReport}>
            <Download className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button
            onClick={() => {
              console.log(`Downloading attendance report for ${student.name}...`)
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}