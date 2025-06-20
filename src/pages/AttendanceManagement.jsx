import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, Typography, Chip } from "@mui/material";
import { v4 as uuidv4 } from "uuid"; 
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DownloadIcon from "@mui/icons-material/Download";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import GroupIcon from "@mui/icons-material/Group";
import ErrorIcon from "@mui/icons-material/Error";
import { FaSearch } from "react-icons/fa";
import AttendanceSession from "../components/Event/AttendanceSession";
import StudentAttendanceList from "../components/StudentAttendanceList";
import StudentDetailsCard  from "../components/StudentDetailsCard"
import Sidebar from "../components/Sidebar";
import InputField from "../components/InputField";
import supabase from "../config/supabaseClient";
import AttendanceStats  from "../components/AttendanceStats"
import Button from "../components/Button";
import FlaggedAttendanceList from "../components/FlaggedAttendanceList"

const DAY_NUMBER_TO_NAME = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday"
};

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
  const [classAttendance, setClassAttendance] = useState(null);
  const [currentAttendanceId, setCurrentAttendanceId] = useState(null);
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  const userRole = user.role || "Lecturer";
  const userName = user.name || "Charlie Tan";
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [currentSessionPassword, setCurrentSessionPassword] = useState(null);

  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  // Fetch from course_lecture instead of classes
  useEffect(() => {
  const fetchClasses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('course_lecture').select('*');
    if (error) {
      setFetchError('Could not fetch classes');
      setClasses([]);
    } else {
      // Filter classes for lecturer: only show classes where lecturer matches userName
      let filtered = data || [];
      if (userRole !== "Administrator") {
        filtered = filtered.filter(cls => cls.lecturer_id === user.id);
      }
      // Calculate duration in minutes for each class and convert day_of_week
      const classesWithDuration = filtered.map(cls => {
        // Convert day_of_week number to string
        let dayOfWeekStr = cls.day_of_week;
        if (typeof dayOfWeekStr === "number" && DAY_NUMBER_TO_NAME[dayOfWeekStr]) {
          dayOfWeekStr = DAY_NUMBER_TO_NAME[dayOfWeekStr];
        }
        if (cls.lecture_start_time && cls.lecture_end_time) {
          const [sh, sm] = cls.lecture_start_time.split(':').map(Number);
          const [eh, em] = cls.lecture_end_time.split(':').map(Number);
          const start = sh * 60 + sm;
          const end = eh * 60 + em;
          let duration = end - start;
          if (duration < 0) duration += 24 * 60;
          return { ...cls, duration, day_of_week: dayOfWeekStr };
        }
        return { ...cls, duration: 0, day_of_week: dayOfWeekStr };
      });
      setClasses(classesWithDuration);
      setFetchError(null);
    }
    setIsLoading(false);
  };
  fetchClasses();
}, [userRole, userName, user.id]);

const [presentCount, setPresentCount] = useState(0);
const [absentCount, setAbsentCount] = useState(0);

useEffect(() => {
  if (!currentAttendanceId) return;
  let intervalId;
  const fetchCounts = async () => {
    // Get all enrollments for this class
    const { data: session, error: sessionError } = await supabase
      .from("attendance_session")
      .select("id, course_lecture_id")
      .eq("id", currentAttendanceId)
      .single();
    if (sessionError || !session) return;

    const { data: enrollments } = await supabase
      .from("enrollment_lecture")
      .select("id")
      .eq("course_id", session.course_lecture_id);

    const { data: attendanceRecords } = await supabase
      .from("attendance_record")
      .select("lecture_enrollment_id, status")
      .eq("session_id", session.id);

    // Map enrollment id to attendance status
    const presentStatuses = "present";
    let present = 0;
    let absent = 0;
    enrollments.forEach((enroll) => {
      const record = attendanceRecords.find(
        (rec) => rec.lecture_enrollment_id === enroll.id && presentStatuses.includes(rec.status)
      );
      if (record) present += 1;
      else absent += 1;
    });
    setPresentCount(present);
    setAbsentCount(absent);
  };
  fetchCounts();
  intervalId = setInterval(fetchCounts, 5000); // Poll every 5 seconds
  return () => clearInterval(intervalId);
}, [currentAttendanceId]);

useEffect(() => {
  if (!selectedClass) {
    setEnrolledStudents([]);
    return;
  }
  let isMounted = true;
  const fetchEnrolled = async () => {
    const { data, error } = await supabase
      .from("enrollment_lecture")
      .select("student_id")
      .eq("course_id", selectedClass.id);
    if (isMounted) setEnrolledStudents(data ? data.map(e => e.student_id) : []);
  };
  fetchEnrolled();
  return () => { isMounted = false; };
}, [selectedClass]);

  useEffect(() => {
    // Fetch addresses for classes with lat/long but no location string
    classes.forEach(async (cls) => {
      if (
        (!cls.lecture_location || cls.lecture_location.trim() === "") &&
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
      setSelectedClass(null);
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

  function ClassCardWithEnrollmentCount({ cls, addresses, onClick }) {
  const [totalStudents, setTotalStudents] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    const fetchEnrollment = async () => {
      const { data, error } = await supabase
        .from("enrollment_lecture")
        .select("id")
        .eq("course_id", cls.id);
      if (isMounted) setTotalStudents(data ? data.length : 0);
    };
    fetchEnrollment();
    return () => { isMounted = false; };
  }, [cls.id]);

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 border mt-[20px]"
      style={{ background: "#09090b" }}
      onClick={onClick}
    >
      <div className="p-4 m-[15px]">
        <h4 className="mb-[0px] text-[18px]">
          {cls.course_code}: {cls.course_title}
        </h4>
        <Typography color="text.secondary">
          {cls.day_of_week && cls.lecture_start_time && cls.lecture_end_time
            ? `${cls.day_of_week}, ${cls.lecture_start_time.slice(0, 5)} - ${cls.lecture_end_time.slice(0, 5)}`
            : "No schedule info"}
        </Typography>
      </div>
      <CardContent style={{ paddingTop: "5px" }}>
        <div className="flex items-center text-sm" style={{ color: "#a1a1aa" }}>
          <LocationOnIcon style={{ color: "#a1a1aa", marginRight: 8, width: 16, height: 16 }} />
          {cls.lecture_location && cls.lecture_location.trim() !== ""
            ? cls.lecture_location
            : (cls.lat && cls.long
              ? (addresses[cls.id] || `Lat: ${Number(cls.lat).toFixed(5)}, Long: ${Number(cls.long).toFixed(5)}`)
              : "No location info")}
        </div>
        <div className="flex items-center text-sm mt-2" style={{ color: "#a1a1aa" }}>
          <GroupIcon style={{ color: "#a1a1aa", marginRight: 8, width: 16, height: 16 }} />
          {totalStudents === null ? "Loading students..." : `${totalStudents} enrolled students`}
        </div>
      </CardContent>
    </Card>
  );
}

  // 1. Start session: insert new row and store its id (attendance_session table)
  const handleStartSession = async () => {
    setIsLoading(true)
    setSessionActive(true);
    setSessionStartTime(new Date());
    localStorage.setItem("attendanceSession", JSON.stringify({
      sessionActive: true,
      sessionStartTime: new Date().toISOString(),
      selectedClassId: selectedClass.id
    }));
    try {
      const position = await getCurrentLocation()
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      setCurrentLocation(location)
      setSessionType("start")
      setQrDialogOpen(true)
      setSnackbar({
        open: true,
        message: `Attendance session started.`,
        severity: "success",
      })
      // Generate the special password
      const specialPassword = uuidv4();

      // Create new attendance session row
      const { data, error } = await supabase
        .from('attendance_session')
        .insert([{
          course_lecture_id: selectedClass.id,
          latitude: location.lat,
          longitude: location.lng,
          attendance_password: specialPassword
          // add other fields if needed
        }])
        .select()
        .single();
      if (error) throw error;
      setCurrentAttendanceId(data.id); // store the new session's id
      setClassAttendance(data);
      setCurrentSessionPassword(specialPassword);
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

  // 2. Fetch attendance data by session id (attendance_session table)
  useEffect(() => {
    if (!currentAttendanceId) return;
    const fetchClassAttendance = async () => {
      const { data, error } = await supabase
        .from("attendance_session")
        .select("*")
        .eq("id", currentAttendanceId)
        .single();
      if (!error) setClassAttendance(data);
      else setClassAttendance(null);
    };
    fetchClassAttendance();
    // Optionally poll for updates
    const interval = setInterval(fetchClassAttendance, 5000);
    return () => clearInterval(interval);
  }, [currentAttendanceId]);

  // Optionally, poll for updates to the session's students list
  // useEffect(() => {
  //   if (!selectedClass) return;
  //   const interval = setInterval(() => {
  //     if (!currentAttendanceId) return;
  //     supabase
  //       .from("attendance_session")
  //       .select("students")
  //       .eq("id", currentAttendanceId)
  //       .single()
  //       .then(({ data, error }) => {
  //         if (!error) setClassAttendance(data);
  //       });
  //   }, 5000);
  //   return () => clearInterval(interval);
  // }, [selectedClass, currentAttendanceId]);

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
    localStorage.removeItem("attendanceSession");
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
      cls.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.course_code?.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <ClassCardWithEnrollmentCount
                      key={cls.id}
                      cls={cls}
                      addresses={addresses}
                      onClick={() => router(`/attendance-management?classId=${cls.id}`)}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
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
                {selectedClass.course_code}: {selectedClass.course_title}
            </h2>
            <p className="text-muted-foreground m-[0px]" style={{ color: "#a1a1aa" }}>
                {selectedClass.day_of_week && selectedClass.lecture_start_time && selectedClass.lecture_end_time
                ? `${selectedClass.day_of_week}, ${selectedClass.lecture_start_time.slice(0,5)} - ${selectedClass.lecture_end_time.slice(0,5)}`
                : "No schedule info"}
            </p>
            <p className="text-muted-foreground mt-[0px]" style={{ color: "#a1a1aa" }}>
                {selectedClass.lecture_location && selectedClass.lecture_location.trim() !== ""
                ? selectedClass.lecture_location
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

      {sessionActive && classAttendance && (
        <Card
            sx={{
            border: '1px solid',
            borderColor: '#4caf50',
            marginTop: '10px',
            backgroundColor: '#09090b',
            }}
        >
            <Box sx={{backgroundColor: 'rgba(232, 245, 233, 0.1)' ,p: 2,}}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Typography sx={{ color: '#388e3c', fontWeight: 'bold', fontSize: '1.25rem' }}>
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
                    Present: {presentCount} students
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonRemoveIcon sx={{ fontSize: 20, color: '#ff0000' }} />
                    <Typography sx={{ fontSize: '0.875rem' }}>
                    Absent: {absentCount} students
                    </Typography>
                </Box>
                </Box>
            </Box>
            </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3 w-full mt-[20px]">
        <AttendanceStats
          classData={{ ...selectedClass, students: enrolledStudents }}
          classAttendance={classAttendance}
          presentCount={presentCount}
          absentCount={absentCount}
        />
      </div>

      <Card className="border mt-[20px] mb-[20px]" style={{ background: "#09090b" }}>
        <div className="flex-1 ml-[20px]">
            <h2 className="mb-[0px]">Student Attendance</h2>
            <Typography variant="body2" color="text.secondary">View and manage student attendance for this class</Typography>
        </div>
        <CardContent>
          {!selectedStudent && (
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label={`Present (${presentCount})`} value="present"/>
              <Tab label={`Absent (${absentCount})`} value="absent"/>
              <Tab label={`Excused (${Array.isArray(classAttendance?.students) ? classAttendance.students.length : 0})`} value="excused"/>
              <Tab label={`Flagged (${Array.isArray(classAttendance?.students) ? classAttendance.students.length : 0})`} value="flagged"/>
            </Tabs>
          )}
          {!selectedStudent ? (
            <>
              <StudentAttendanceList
                statusFilter={activeTab}
                onSelectStudent={handleSelectStudent}
                classAttendanceId={currentAttendanceId}
              />
            </>
          ) : (
            <StudentDetailsCard
              student={selectedStudent}
              onClose={handleCloseStudentDetails}
              onMarkPresent={handleMarkPresent}
            />
          )}
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
        sessionPassword={currentSessionPassword} 
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