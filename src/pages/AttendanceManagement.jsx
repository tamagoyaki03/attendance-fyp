import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, Typography, Chip } from "@mui/material";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
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
import { FaSearch } from "react-icons/fa";
import AttendanceSession from "../components/Event/AttendanceSession";
// import { StudentAttendanceList } from "@/components/student-attendance-list"
import StudentDetailsCard  from "../components/StudentDetailsCard"
import Sidebar from "../components/Sidebar";
import InputField from "../components/InputField";
import supabase from "../config/supabaseClient";
import  AttendanceStats  from "../components/AttendanceStats"
import Button from "../components/Button";
// import { FlaggedAttendanceList } from "@/components/flagged-attendance-list"

export default function AttendanceManagementPage() {
  const router = useNavigate()
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const classId = searchParams.get("classId");
  const [classes, setClasses] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [sessionEndTime, setSessionEndTime] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [activeTab, setActiveTab] = useState("present")
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [sessionType, setSessionType] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const [addresses, setAddresses] = useState({});
  const [now, setNow] = useState(Date.now());

useEffect(() => {
  if (!sessionActive) return;
  const interval = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(interval);
}, [sessionActive]);

  useEffect(() => {
  const fetchClasses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('classes').select('*');
    if (error) {
      setFetchError('Could not fetch classes');
      setClasses([]);
    } else {
      // Calculate duration in minutes for each class
      const classesWithDuration = (data || []).map(cls => {
        if (cls.start_time && cls.end_time) {
          // Parse as "HH:mm" or "HH:mm:ss"
          const [sh, sm] = cls.start_time.split(':').map(Number);
          const [eh, em] = cls.end_time.split(':').map(Number);
          const start = sh * 60 + sm;
          const end = eh * 60 + em;
          let duration = end - start;
          if (duration < 0) duration += 24 * 60; // handle overnight classes
          return { ...cls, duration };
        }
        return { ...cls, duration: 0 };
      });
      setClasses(classesWithDuration);
      setFetchError(null);
    }
    setIsLoading(false);
  };
  fetchClasses();
}, []);

  useEffect(() => {
    // Fetch addresses for classes with lat/long but no location string
    classes.forEach(async (cls) => {
      if (
        (!cls.location || cls.location.trim() === "") &&
        cls.lat && cls.long &&
        !addresses[cls.id]
      ) {
        const address = await getAddressFromLatLng(cls.lat, cls.long);
        setAddresses((prev) => ({ ...prev, [cls.id]: address }));
      }
    });
  }, [classes, addresses]);

  useEffect(() => {
  if (classId && classes.length > 0) {
    const found = classes.find((cls) => String(cls.id) === String(classId));
    setSelectedClass(found || null);
  } else {
    setSelectedClass(null); // <-- Add this line
  }
}, [classId, classes]);

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

  function formatDuration(start) {
  if (!start) return "0:00";
  const diff = Math.floor((now - start.getTime()) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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
      message: `Attendance session started.`,
      severity: "success",
    })
  } catch (error) {
    setSnackbar({
      open: true,
      message: "Failed to start session.",
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSessionExpire = () => {
   setQrDialogOpen(false);
   setSnackbar({
    open: true,
    message: "QR code expired. Please generate a new QR or finalize the session.",
    severity: "info",
  });
};

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

  async function getAddressFromLatLng(lat, lng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  );
  const data = await response.json();
  return data.display_name || `${lat}, ${lng}`;
}

const filteredClasses = classes.filter(
  (cls) =>
    cls.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.code?.toLowerCase().includes(searchTerm.toLowerCase())
);

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
        <div className="flex h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <AutorenewIcon className="h-8 w-8 animate-spin text-muted-foreground" />
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
        
            <div>
                <Card className="border color-[#e5e7eb] w-full" style={{ background: "#09090b"}}>
                <div className="pb-2 m-[20px] mb-[0px]">
                    <Typography variant="h6" component="div">Select a Class</Typography>
                    <Typography variant="body2" color="text.secondary">Please select a class to manage attendance</Typography>
                </div>
                <CardContent>
                    <div className="space-y-4">
                    <div className="relative">
                        <InputField
                            id="search-classes"
                            placeholder="Search classes..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            icon={<FaSearch className='text-[#ffffff] w-[16px] h-[16px]' />}
                            iconPosition="left"
                            className="flex-1 h-[40px] pl-10 w-full"
                        />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredClasses.map((cls) => (
                            <Card 
                                key={cls.id}
                                className="cursor-pointer hover:bg-muted/50 border mt-[20px]" 
                                style={{ background: "#09090b" }}
                                onClick={() => router(`/attendance-management?classId=${cls.id}`)}
                                >
                                <div className="p-4 m-[15px]">
                                    <h4 className="mb-[0px] text-[18px]">
                                    {cls.code}: {cls.name}
                                    </h4>
                                    {/* Display class schedule */}
                                    <Typography color="text.secondary">
                                    {cls.day && cls.start_time && cls.end_time
                                        ? `${cls.day}, ${cls.start_time.slice(0,5)} - ${cls.end_time.slice(0,5)}`
                                        : "No schedule info"}
                                    </Typography>
                                </div>
                                <CardContent style={{ paddingTop: "5px" }}>
                                    {/* Display class location */}
                                    <div className="flex items-center text-sm" style={{ color: "#a1a1aa" }}>
                                        <LocationOnIcon style={{ color: "#a1a1aa", marginRight: 8, width: 16, height: 16 }} />
                                        {cls.location && cls.location.trim() !== ""
                                        ? cls.location
                                        : (cls.lat && cls.long
                                            ? (addresses[cls.id] || `Lat: ${Number(cls.lat).toFixed(5)}, Long: ${Number(cls.long).toFixed(5)}`)
                                            : "No location info")}
                                    </div>
                                    <div className="flex items-center text-sm mt-1" style={{ color: "#a1a1aa" }}>
                                    <GroupIcon style={{ color: "#a1a1aa", marginRight: 8, width: 16, height: 16 }} />
                                    {(Array.isArray(cls.students) ? cls.students.length : 0)} students
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
    <div className="grid grid-cols-[250px_1fr] gap-[40px] h-screen w-screen">
        <div className="fixed h-screen w-[250px]">
            <Sidebar />
        </div>
      <div className="col-start-2 overflow-y-auto pt-[40px] pr-[40px]">
        <div className="flex flex-row items-start justify-between flex-wrap gap-4 mb-4">
            <div>
            <h2 className="text-3xl font-bold tracking-tight mb-[0px]">
                {selectedClass.code}: {selectedClass.name}
            </h2>
            <p className="text-muted-foreground m-[0px]" style={{ color: "#a1a1aa" }}>
                {selectedClass.day && selectedClass.start_time && selectedClass.end_time
                ? `${selectedClass.day}, ${selectedClass.start_time.slice(0,5)} - ${selectedClass.end_time.slice(0,5)}`
                : "No schedule info"}
            </p>
            <p className="text-muted-foreground mt-[0px]" style={{ color: "#a1a1aa" }}>
                {selectedClass.location && selectedClass.location.trim() !== ""
                ? selectedClass.location
                : (selectedClass.lat && selectedClass.long
                    ? (addresses[selectedClass.id] || `Lat: ${Number(selectedClass.lat).toFixed(5)}, Long: ${Number(selectedClass.long).toFixed(5)}`)
                    : "No location info")}
            </p>
            </div>
            <div className="flex flex-wrap gap-2">
            <Button
                size="small"
                onClick={handleStartSession}
                disabled={sessionActive || isLoading}
                className="gap-2 "
            >
                <QrCodeIcon className="h-4 w-4" />
                Start Attendance
            </Button>
            <Button
                size="small"
                onClick={handleEndSession}
                disabled={!sessionActive || isLoading}
                variant="outline"
                className="gap-2 ml-[8px]"
            >
                <QrCodeIcon className="h-4 w-4" />
                End Attendance
            </Button>
            <Button
                size="small"
                onClick={handleGenerateReport}
                variant="outline"
                className="gap-2 ml-[8px]"
            >
                <DownloadIcon className="h-4 w-4" />
                Generate Report
            </Button>
            </div>
        </div>

      {sessionActive && (
        <Card
            sx={{
            border: '1px solid',
            borderColor: '#4caf50',
            marginTop: '10px',
            backgroundColor: '#09090b',
            }}
        >
            <Box
            sx={{
                backgroundColor: 'rgba(232, 245, 233, 0.1)' ,
                // dark: { backgroundColor: '#1b5e20', opacity: 0.1 },
                p: 2,
            }}
            >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Typography sx={{ color: '#388e3c', dark: { color: '#66bb6a' }, fontWeight: 'bold', fontSize: '1.25rem' }}>
                Active Attendance Session
                </Typography>
                <Chip sx={{ backgroundColor: '#4caf50', color: '#09090b' }} label="Live"/>
            </Box>
            <Typography color="text.secondary" >
                Session started at {sessionStartTime?.toLocaleTimeString()}
            </Typography>
            </Box>

            <CardContent sx={{ p: 2 }}>
            <Box
                sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>
                        Duration: {formatDuration(sessionStartTime)}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>
                    {new Date().toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>
                    Location:{' '}
                    {currentLocation
                        ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
                        : 'Unknown'}
                    </Typography>
                </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonAddAlt1Icon sx={{ fontSize: 20, color: '#4caf50' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>
                    Present: {selectedClass.presentCount} students
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonRemoveIcon sx={{ fontSize: 20, color: 'red' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>
                    Absent: {selectedClass.absentCount} students
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ErrorIcon sx={{ fontSize: 20, color: '#ffbf00' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>
                    Flagged: {selectedClass.flaggedCount} check-ins
                    </Typography>
                </Box>
                </Box>
            </Box>
            </CardContent>
        </Card>
      )}


      <div className="grid gap-4 md:grid-cols-3 w-full mt-[20px]">
        <AttendanceStats classData={selectedClass} />
      </div>

      <Card className="border mt-[20px] mb-[20px]" style={{ background: "#09090b" }}>
        <div className="flex-1 ml-[20px]">
            <h2 className="mb-[0px]">Student Attendance</h2>
            <Typography variant="body2" color="text.secondary">View and manage student attendance for this class</Typography>
        </div>
        <CardContent>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab label={`Present (${selectedClass.presentCount})`} value="present" />
            <Tab label={`Absent (${selectedClass.absentCount})`} value="absent" />
            <Tab label={`Flagged (${selectedClass.flaggedCount})`} value="flagged" />
          </Tabs>
          {/* {activeTab === "present" && (
            <StudentAttendanceList status="present" onSelectStudent={handleSelectStudent} />
          )}
          {activeTab === "absent" && (
            <StudentAttendanceList status="absent" onSelectStudent={handleSelectStudent} />
          )}
          {activeTab === "flagged" && (
            <FlaggedAttendanceList onSelectStudent={handleSelectStudent} />
          )} */}
          <StudentDetailsCard
            student={selectedStudent}
            onClose={handleCloseStudentDetails}
            onMarkPresent={handleMarkPresent}
          />
        </CardContent>
      </Card>

      <AttendanceSession
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        sessionType={sessionType}
        classData={selectedClass}
        location={currentLocation}
        onFinalize={handleFinalizeSession}
        onExpire={handleSessionExpire}
      />
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar}>
        <MuiAlert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
        </MuiAlert>
    </Snackbar>
</div>
    </div>
  )
}