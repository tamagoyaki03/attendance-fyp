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
import RoomIcon from "@mui/icons-material/Room";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

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
  const [activeTab, setActiveTab] = useState(0);

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
      <Card className="mt-[10px] border" sx={{ background: "#09090b", color: "#ffffff" }}>
        <CardContent>
          <Typography variant="h6">No student selected</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-[20px] border" sx={{ background: "#09090b", color: "#ffffff" }}>
      <CardContent className="space-y-4">
        <div>
          <h2 className="mt-[0px] mb-[0px]" style={{ color: "#ffffff" }}>Student Details</h2>
          <div className="flex flex-row justify-between gap-8 items-center">
            {/* Left: Student details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold mb-[0px]">{student.name}</h3>
              <p className="text-sm mt-[0px]" style={{ color: "#A0A0AA" }}>ID: {student.studentId}</p>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(student.status)}
                {student.status === "absent" && (
                  <Button size="sm" variant="outline" onClick={() => onMarkPresent(student.studentId)}>
                    <CheckCircleIcon className="mr-1 h-4 w-4" />
                    Mark as Present
                  </Button>
                )}
              </div>
            </div>
            {/* Right: Check-in/location info */}
            <div className="space-y-1 text-sm min-w-[220px]">
              {student.status !== "absent" && (
                <>
                  <div className="flex items-center">
                    <AccessTimeIcon className="mr-[5px]" style={{ color: "#A0A0AA", height: "16px" }}/>
                    Check-in: {student.checkInTime}
                  </div>
                  <div className="flex items-center">
                    <RoomIcon className="mr-[5px]" style={{ color: "#A0A0AA", height: "16px" }} />
                    Location: {student.checkInLocation?.lat.toFixed(4)}, {student.checkInLocation?.lng.toFixed(4)}
                  </div>
                </>
              )}
              <div className="flex items-center">
                <CalendarTodayIcon className="mr-[5px]" style={{ color: "#A0A0AA", height: "16px" }} />
                {student.status === "absent" ? `Last attended: ${student.lastAttendance}` : "Today"}
              </div>
            </div>
          </div>
        </div>

        <Divider/>

        {/* <Tabs defaultValue="details" onValueChange={setActiveTab} value={activeTab}> */}
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="Attendance Details" />
            <Tab label="Attendance History" />
          </Tabs>

          {activeTab === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="mt-[10px] mr-[10px] border" sx={{ background: "#09090b", color: "#ffffff" }}>
                  <div className="p-4 pb-2">
                    <Typography variant="h6" component="div" sx={{margin: "10px"}}>Attendance Rate</Typography>
                  </div>
                  <div className="m-[10px]">
                    <div className="text-2xl" style={{fontWeight: "bold", fontSize: "30px"}}>{getAttendanceRate()}%</div>
                    <p className="text-xs" style={{ color: "#A0A0AA" }}>Last 30 days</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-green-500" style={{ width: `${getAttendanceRate()}%` }}></div>
                    </div>
                  </div>
                </Card>

                <Card className="mt-[10px] border" sx={{ background: "#09090b", color: "#ffffff" }}>
                  <div className="p-4 pb-2">
                    <Typography variant="h6" component="div" sx={{margin: "10px"}}>Tardiness</Typography>
                  </div>
                  <div className="m-[10px]">
                    <div className="text-2xl" style={{fontWeight: "bold", fontSize: "30px"}}>
                      {attendanceHistory.filter((a) => a.status === "tardy").length}
                    </div>
                    <p className="text-xs" style={{ color: "#A0A0AA" }}>Late check-ins</p>
                  </div>
                </Card>
              </div>

              <Card className="mt-[10px] border" sx={{ background: "#09090b", color: "#ffffff" }}>
                <div className="p-4 pb-2">
                  <Typography variant="h6" component="div" sx={{margin: "10px"}}>Notes</Typography>
                </div>
                <div className="m-[10px]">
                  <p className="text-sm" style={{ color: "#A0A0AA" }}>
                    {student.status === "tardy"
                      ? "Student has been late multiple times this month. Consider sending a reminder about attendance policy."
                      : student.status === "absent"
                        ? "Student has missed multiple classes. Follow up required."
                        : "No special notes for this student."}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 1 && (
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
          )}
        {/* </Tabs> */}
      </CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2} borderTop="1px solid #eee">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateReport}>
            <DownloadIcon className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button
            onClick={() => {
              console.log(`Downloading attendance report for ${student.name}...`)
            }}
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </Box>
    </Card>
  )
}