import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardActions, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Input from "@mui/material/Input";
import Badge from "@mui/material/Badge";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import GroupIcon from "@mui/icons-material/Group";
import ErrorIcon from "@mui/icons-material/Error";
import CancelIcon from "@mui/icons-material/Cancel";
// import { AttendanceSessionQR } from "@/components/attendance-session-qr"
// import { StudentAttendanceList } from "@/components/student-attendance-list"
import StudentDetailsCard  from "../components/StudentDetailsCard"
import Sidebar from "../components/Sidebar";
// import { AttendanceStats } from "@/components/attendance-stats"
// import { FlaggedAttendanceList } from "@/components/flagged-attendance-list"

export default function AttendanceManagementPage() {
  const router = useNavigate()
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const classId = searchParams.get("classId");

  const [selectedClass, setSelectedClass] = useState(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [sessionEndTime, setSessionEndTime] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("present")
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [sessionType, setSessionType] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

  // Sample class data
  const classData = {
    id: "cs101-spring23",
    code: "CS101",
    name: "Introduction to Computer Science",
    schedule: "Mon, Wed, Fri 10:00 - 11:30",
    location: "Building A, Room 101",
    duration: 90,
    lecturer: "Dr. Jane Smith",
    totalStudents: 45,
    presentCount: 38,
    absentCount: 7,
    tardyCount: 3,
    flaggedCount: 2,
  }

  useEffect(() => {
    const classId = searchParams.get("classId")
    if (classId) {
      setIsLoading(true)
      setTimeout(() => {
        setSelectedClass(classData)
        setIsLoading(false)
      }, 500)
    }
  }, [searchParams])

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      })
    })
  }

  const handleStartSession = async () => {
    setIsLoading(true)
    try {
      const position = await getCurrentLocation()
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      setCurrentLocation(location)
      setSessionStartTime(new Date())
      setSessionActive(true)
      setSessionType("start")
      setQrDialogOpen(true)
      setSnackbar({
        open: true,
        message: `Attendance session started. Location captured: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        severity: "success",
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to start session. Could not access your location.",
        severity: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndSession = async () => {
    setIsLoading(true)
    try {
      const position = await getCurrentLocation()
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      setCurrentLocation(location)
      setSessionEndTime(new Date())
      setSessionType("end")
      setQrDialogOpen(true)
      setSnackbar({
        open: true,
        message: `Attendance session ended. Location captured: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
        severity: "success",
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to end session. Could not access your location.",
        severity: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinalizeSession = () => {
    setSessionActive(false)
    setQrDialogOpen(false)
    setSnackbar({
      open: true,
      message: "Attendance session finalized. All attendance records have been saved to the database.",
      severity: "success",
    })
  }

  const handleSelectStudent = (student) => setSelectedStudent(student)
  const handleCloseStudentDetails = () => setSelectedStudent(null)
  const handleMarkPresent = (studentId) => {
    setSnackbar({
      open: true,
      message: `Student ID: ${studentId} has been manually marked as present.`,
      severity: "success",
    })
    setSelectedStudent(null)
  }

  const handleGenerateReport = () => {
    setSnackbar({
      open: true,
      message: "The attendance report has been generated and is ready for download.",
      severity: "success",
    })
    setTimeout(() => {
      setSnackbar({
        open: true,
        message: "The attendance report has been downloaded.",
        severity: "success",
      })
    }, 1500)
  }

  useEffect(() => {
    if (sessionActive && sessionStartTime && selectedClass) {
      const durationMs = selectedClass.duration * 60 * 1000
      const endTime = new Date(sessionStartTime.getTime() + durationMs)
      const timeUntilEnd = endTime.getTime() - Date.now()
      if (timeUntilEnd <= 0) {
        handleFinalizeSession()
        setSnackbar({
          open: true,
          message: `Session ended automatically. The class duration (${selectedClass.duration} minutes) has expired.`,
          severity: "info",
        })
        return
      }
      const timerId = setTimeout(() => {
        handleFinalizeSession()
        setSnackbar({
          open: true,
          message: `Session ended automatically. The class duration (${selectedClass.duration} minutes) has expired.`,
          severity: "info",
        })
      }, timeUntilEnd)
      return () => clearTimeout(timerId)
    }
  }, [sessionActive, sessionStartTime, selectedClass])

  if (isLoading && !selectedClass) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Attendance Management</h2>
        </div>
        <div className="flex h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading class data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!selectedClass) {
    return (
      <div className="grid grid-cols-[250px_1fr] gap-[40px] h-screen w-screen">
        <div className="fixed h-screen w-[250px]">
            <Sidebar />
        </div>
        <div className="col-start-2 overflow-y-auto p-8 pt-[40px] pr-[40px]">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Attendance Management</h2>
            </div>
        
            <div className="grid gap-[40px] grid-cols-2">
                <Card className="border color-[#e5e7eb]" style={{ background: "#09090b" }}>
                <div>
                    <Typography>Select a Class</Typography>
                    <Typography>Please select a class to manage attendance</Typography>
                </div>
                <CardContent>
                    <div className="space-y-4">
                    <div className="relative">
                        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search classes..." className="pl-8" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[classData].map((cls) => (
                        <Card
                            key={cls.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => router.push(`/attendance-management?classId=${cls.id}`)}
                        >
                            <div className="p-4">
                            <Typography className="text-lg">
                                {cls.code}: {cls.name}
                            </Typography>
                            <Typography>{cls.schedule}</Typography>
                            </div>
                            <CardContent className="p-4 pt-0">
                            <div className="flex items-center text-sm text-muted-foreground">
                                <LocationOnIcon className="mr-1 h-4 w-4" />
                                {cls.location}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <GroupIcon className="mr-1 h-4 w-4" />
                                {cls.totalStudents} students
                            </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                    </div>
                </CardContent>
                </Card>
            </div>
        </div>
    </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {selectedClass.code}: {selectedClass.name}
          </h2>
          <p className="text-muted-foreground">
            {selectedClass.schedule} | {selectedClass.location}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleStartSession} disabled={sessionActive || isLoading} className="gap-2">
            <QrCIcon className="h-4 w-4" />
            Start Attendance
          </Button>
          <Button onClick={handleEndSession} disabled={!sessionActive || isLoading} variant="outline" className="gap-2">
            <QrCodeIcon className="h-4 w-4" />
            End Attendance
          </Button>
          <Button onClick={handleGenerateReport} variant="outline" className="gap-2">
            <DownloadIcon className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {sessionActive && (
        <Card className="border-green-500 dark:border-green-700">
          <div className="bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <Typography className="text-green-700 dark:text-green-400">Active Attendance Session</Typography>
              <Badge className="bg-green-500">Live</Badge>
            </div>
            <Typography>Session started at {sessionStartTime?.toLocaleTimeString()}</Typography>
          </div>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AccessTimeIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Duration: {sessionStartTime ? Math.floor((Date.now() - sessionStartTime.getTime()) / 60000) : 0}{" "}
                    minutes
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarTodayIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <LocationOnIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Location:{" "}
                    {currentLocation
                      ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
                      : "Unknown"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <PersonAddAlt1Icon className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Present: {selectedClass.presentCount} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <PersonRemoveIcon className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Absent: {selectedClass.absentCount} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <ErrorIcon className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Flagged: {selectedClass.flaggedCount} check-ins</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <AttendanceStats classData={selectedClass} />
      </div>

      <Card>
        <div>
            <Typography variant="h6">Student Attendance</Typography>
            <Typography variant="body2">View and manage student attendance for this class</Typography>
        </div>
        <CardContent>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label={`Present (${selectedClass.presentCount})`} value="present" />
            <Tab label={`Absent (${selectedClass.absentCount})`} value="absent" />
            <Tab label={`Flagged (${selectedClass.flaggedCount})`} value="flagged" />
          </Tabs>
          {activeTab === "present" && (
            <StudentAttendanceList status="present" onSelectStudent={handleSelectStudent} />
          )}
          {activeTab === "absent" && (
            <StudentAttendanceList status="absent" onSelectStudent={handleSelectStudent} />
          )}
          {activeTab === "flagged" && (
            <FlaggedAttendanceList onSelectStudent={handleSelectStudent} />
          )}
          <StudentDetailsCard
            student={selectedStudent}
            onClose={handleCloseStudentDetails}
            onMarkPresent={handleMarkPresent}
          />
        </CardContent>
      </Card>

      <AttendanceSessionQR
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        sessionType={sessionType}
        classData={selectedClass}
        location={currentLocation}
        onFinalize={handleFinalizeSession}
      />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}>
        <MuiAlert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
        </MuiAlert>
    </Snackbar>
    </div>
  )
}