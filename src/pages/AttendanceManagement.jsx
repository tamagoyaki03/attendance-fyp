import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, Typography, Chip, TextField, InputAdornment } from "@mui/material";
import { v4 as uuidv4 } from "uuid"; 
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import DownloadIcon from "@mui/icons-material/Download";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import GroupIcon from "@mui/icons-material/Group";
import { FaSearch } from "react-icons/fa";
import AttendanceSession from "../components/Event/AttendanceSession";
import StudentAttendanceList from "../components/StudentAttendanceList";
import StudentDetailsCard  from "../components/StudentDetailsCard"
import Sidebar from "../components/Sidebar";
import supabase from "../config/supabaseClient";
import AttendanceStats  from "../components/AttendanceStats"
import Button from "../components/Button";
import FlaggedAttendanceList from "../components/FlaggedAttendanceList"
import AttendanceIssues from "../components/Event/AttendanceIssues";
import ChooseModeDialog from "./Dialogs/chooseModeDialog";
import OnlineAttendanceDialog from "./Dialogs/onlineAttendanceDialog";

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
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [currentSessionPassword, setCurrentSessionPassword] = useState(null);

  const [chooseModeDialogOpen, setChooseModeDialogOpen] = useState(false);
  const [onlineDialogOpen, setOnlineDialogOpen] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState(null); // "Online" or "Physical" 
  const [requireQrToEnd, setRequireQrToEnd] = useState(false);
  const [attendanceAdded, setAttendanceAdded] = useState(false);

  const handleOnlineProceed = async ({ recordingLink, quizContent }) => {
  setOnlineDialogOpen(false);
  setIsLoading(true);

  // Save attendance session WITHOUT QR code
  try {
    const { data, error } = await supabase
      .from('attendance_session')
      .insert([{
        course_lecture_id: selectedClass.id,
        latitude: null,
        longitude: null,
        recording_url: recordingLink,
        quiz_questions: quizContent
      }])
      .select()
      .single();

    if (error) throw error;
    setCurrentAttendanceId(data.id);
    setClassAttendance(data);
    setSnackbar({
      open: true,
      message: "Online attendance session started.",
      severity: "success",
    });
    // Do NOT open QR dialog for online mode
  } catch (error) {
    setSnackbar({
      open: true,
      message: "Failed to start online session.",
      severity: "error",
    });
  } finally {
    setIsLoading(false);
    setCurrentAttendanceId(data.id);
  }
};

  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user.id) return;
      const { data, error } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", user.id)
        .single();
      if (!error && data) {
        setUserRole(data.role);
        setUserName(data.name);
      }
    };
    fetchUserInfo();
  }, [user.id]);

  useEffect(() => {
  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      // Fetch both lectures and tutorials
      const [lectureRes, tutorialRes] = await Promise.all([
        supabase.from('course_lecture').select('*'),
        supabase.from('course_tutorial').select('*')
      ]);

      if (lectureRes.error) throw lectureRes.error;
      if (tutorialRes.error) throw tutorialRes.error;

      // Combine both datasets
      const lectures = (lectureRes.data || []).map(cls => ({ ...cls, type: "Lecture" }));
      const tutorials = (tutorialRes.data || []).map(cls => ({ ...cls, type: "Tutorial" }));
      let combined = [...lectures, ...tutorials];

      // Filter classes for lecturer: only show classes where lecturer matches
      if (userRole !== "admin") {
        combined = combined.filter(cls => cls.lecturer_id === user.id);
      }

      // Calculate duration and normalize day_of_week
      const classesWithDuration = combined.map(cls => {
        let dayOfWeekStr = cls.day_of_week;
        if (typeof dayOfWeekStr === "number" && DAY_NUMBER_TO_NAME[dayOfWeekStr]) {
          dayOfWeekStr = DAY_NUMBER_TO_NAME[dayOfWeekStr];
        }

        const startTime = cls.type === "Lecture" ? cls.lecture_start_time : cls.tutorial_start_time;
        const endTime = cls.type === "Lecture" ? cls.lecture_end_time : cls.tutorial_end_time;
        const startDate = cls.type === "Lecture" ? cls.lecture_start_date : cls.tutorial_start_date;
        const endDate = cls.type === "Lecture" ? cls.lecture_end_date : cls.tutorial_end_date;
        const location = cls.type === "Lecture" ? cls.lecture_location : cls.tutorial_location;

        if (startTime && endTime) {
          const [sh, sm] = startTime.split(':').map(Number);
          const [eh, em] = endTime.split(':').map(Number);
          const start = sh * 60 + sm;
          const end = eh * 60 + em;
          let duration = end - start;
          if (duration < 0) duration += 24 * 60;
            return { ...cls, duration, day_of_week: dayOfWeekStr, startTime, endTime, startDate, endDate, location };
        }
        return { ...cls, duration: 0, day_of_week: dayOfWeekStr, startTime, endTime, startDate, endDate, location };
      });

      setClasses(classesWithDuration);
      setFetchError(null);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setFetchError('Could not fetch classes');
      setClasses([]);
    }
    setIsLoading(false);
  };
  fetchClasses();
}, [userRole, user.id]);

const [presentCount, setPresentCount] = useState(0);
const [absentCount, setAbsentCount] = useState(0);

useEffect(() => {
    if (!currentAttendanceId || !selectedClass?.id) return;
    
    let intervalId;
    const fetchCounts = async () => {
      try {
        const { data: session, error: sessionError } = await supabase
          .from("attendance_session")
          .select("id, course_lecture_id, course_tutorial_id")
          .eq("id", currentAttendanceId)
          .single();

        if (sessionError || !session) return;

        // Determine which ID column has a value
        const courseId = session.course_lecture_id || session.course_tutorial_id;
        if (!courseId) return;

        // Determine table based on class type
        const enrollmentTable = selectedClass.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
        const enrollmentIdField = selectedClass.type === "Tutorial" ? "tutorial_id" : "course_id";

        const { data: enrollments, error: enrollError } = await supabase
          .from(enrollmentTable)
          .select("id")
          .eq(enrollmentIdField, courseId);

        if (enrollError) throw enrollError;

        const { data: attendanceRecords, error: attError } = await supabase
          .from("attendance_record")
          .select("lecture_enrollment_id, tutorial_enrollment_id, status")
          .eq("session_id", session.id);

        if (attError) throw attError;

        // Determine which enrollment field to use
        const enrollmentField = selectedClass.type === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";

        let present = 0;
        let absent = 0;

        if (enrollments && enrollments.length > 0) {
          enrollments.forEach((enroll) => {
            const record = (attendanceRecords || []).find(
              (rec) => rec[enrollmentField] === enroll.id && rec.status === "present"
            );
            if (record) present += 1;
            else absent += 1;
          });
        }

        setPresentCount(present);
        setAbsentCount(absent);
      } catch (error) {
        console.error("Error fetching attendance counts:", error);
      }
    };

    fetchCounts();
    intervalId = setInterval(fetchCounts, 5000);
    return () => clearInterval(intervalId);
  }, [currentAttendanceId, selectedClass?.id, selectedClass?.type, sessionActive]);

useEffect(() => {
  if (!selectedClass) {
    setEnrolledStudents([]);
    return;
  }
  let isMounted = true;
  const fetchEnrolled = async () => {
    const enrollmentTable = selectedClass.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
    const enrollmentIdField = selectedClass.type === "Tutorial" ? "tutorial_id" : "course_id";

    const { data, error } = await supabase
      .from(enrollmentTable)
      .select("student_id")
      .eq(enrollmentIdField, selectedClass.id);
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
        const enrollmentTable = cls.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
        const enrollIdField = cls.type === "Tutorial" ? "tutorial_id" : "course_id";

        const { data, error } = await supabase
          .from(enrollmentTable)
          .select("id")
          .eq(enrollIdField, cls.id);
        if (isMounted) setTotalStudents(data ? data.length : 0);
      };
      fetchEnrollment();
      return () => { isMounted = false; };
    }, [cls.id]);

    const startTime = cls.type === "Tutorial" ? cls.tutorial_start_time : cls.lecture_start_time;
    const endTime = cls.type === "Tutorial" ? cls.tutorial_end_time : cls.lecture_end_time;
    const location = cls.type === "Tutorial" ? cls.tutorial_location : cls.lecture_location;

    return (
      <Card
        onClick={onClick}
        sx={{
          cursor: "pointer",
          mb: 2,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
            {cls.course_code}: {cls.course_title}
          </Typography>

          <Typography
              variant="caption"
              sx={{
                backgroundColor: cls.type === "Lecture" ? "#dbeafe" : "#fce7f3",
                color: cls.type === "Lecture" ? "#0c4a6e" : "#831843",
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontWeight: 600,
                whiteSpace: "nowrap",
                ml: 1,
              }}
            >
              {cls.type || "Lecture"}
            </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {cls.day_of_week && startTime && endTime
              ? `${cls.day_of_week}, ${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`
              : "No schedule info"}
          </Typography>

          <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
            <LocationOnIcon sx={{ mr: 1, fontSize: 16, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {location && location.trim() !== ""
                ? location
                : (cls.lat && cls.long
                  ? (addresses[cls.id] || `Lat: ${Number(cls.lat).toFixed(5)}, Long: ${Number(cls.long).toFixed(5)}`)
                  : "No location info")}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" sx={{ mt: 1 }}>
            <GroupIcon sx={{ mr: 1, fontSize: 16, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {totalStudents === null ? "Loading students..." : `${totalStudents} enrolled students`}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

const handleStartSession = () => {
  setChooseModeDialogOpen(true);
};

const handleChooseMode = async (mode) => {
  setAttendanceMode(mode);
  setChooseModeDialogOpen(false);
  if (mode === "Physical") {
    await QRSession(mode); // Directly start QR session
  } else if (mode === "Online") {
    setOnlineDialogOpen(true);
  }
};

  // QR session: insert new row and store its id (attendance_session table)
  const QRSession = async (mode) => {
    console.log("Starting QRSession with mode:", mode);
    console.log("Selected class:", selectedClass);
    
    if (!selectedClass.id) {
      alert("Invalid class selected");
      return;
    }

    const isTutorial = selectedClass.type === "Tutorial";
    
    // For lectures, verify required time fields exist
    if (!isTutorial) {
      if (!selectedClass.lecture_start_time || !selectedClass.lecture_end_time) {
        console.error("Lecture missing required time fields:", selectedClass);
        alert("This lecture is missing required time information. Please update the class details first.");
        return;
      }
    } else {
      if (!selectedClass.tutorial_start_time || !selectedClass.tutorial_end_time) {
        console.error("Tutorial missing required time fields:", selectedClass);
        alert("This tutorial is missing required time information. Please update the class details first.");
        return;
      }
    }
    
    setIsLoading(true);
    setSessionActive(true);
    setSessionStartTime(new Date());
    const specialPassword = uuidv4();
    
    localStorage.setItem("attendanceSession", JSON.stringify({
      sessionActive: true,
      sessionStartTime: new Date().toISOString(),
      selectedClassId: selectedClass.id,
      attendanceMode: mode,
    }));

    try {
      let location = null;
      if (mode === "Physical") {
        const position = await getCurrentLocation();
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);
      } else {
        location = { lat: null, lng: null };
        setCurrentLocation(null);
      }

      // Create attendance session payload - explicitly set both columns
      const insertData = {
        latitude: location.lat,
        longitude: location.lng,
        attendance_password: specialPassword,
        course_lecture_id: null,
        course_tutorial_id: null,
      };

      // Determine type and set ONLY the correct column
      const isTutorial = selectedClass.type === "Tutorial";
      
      if (isTutorial) {
        insertData.course_tutorial_id = selectedClass.id;
      } else {
        insertData.course_lecture_id = selectedClass.id;
      }

      console.log("Inserting attendance_session with data:", insertData);

      // Insert session - ONLY into attendance_session table
      const { data, error } = await supabase
        .from('attendance_session')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      console.log("Session created successfully:", data);

      setCurrentAttendanceId(data.id);
      setCurrentSessionPassword(specialPassword);
      setSessionType("start");
      
      // Open the QR dialog
      setQrDialogOpen(true);

      setSnackbar({
        open: true,
        message: `Attendance session started (${mode}).`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error in QRSession:", error);
      setSnackbar({
        open: true,
        message: "Failed to start session. " + error.message,
        severity: "error",
      });
      setSessionActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch attendance data by session id (attendance_session table)
  useEffect(() => {
    if (!currentAttendanceId || !sessionActive)  return;
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
  }, [currentAttendanceId, sessionActive]);

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
    if (requireQrToEnd) {
      const pw = uuidv4();
      setCurrentSessionPassword(pw);

      // Determine correct column name based on class type
      const isTutorial = selectedClass.type === "Tutorial";

      const insertData = {
        latitude: currentLocation?.lat,
        longitude: currentLocation?.lng,
        attendance_password: pw,
        course_lecture_id: null,
        course_tutorial_id: null,
      };

      if (isTutorial) {
        insertData.course_tutorial_id = selectedClass.id;
      } else {
        insertData.course_lecture_id = selectedClass.id;
      }

      const { data: endSessionData, error: endSessionError } = await supabase
        .from("attendance_session")
        .insert([insertData])
        .select()
        .single();

      if (endSessionError) {
        console.error("Failed to create end session:", endSessionError);
        alert("Failed to end session. Please try again.");
        return;
      }

      setCurrentAttendanceId(endSessionData.id);
      setSessionType("end");
      setQrDialogOpen(true);
    } else {
      handleFinalizeSession();
    }
  };

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
      <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
        <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
          <Sidebar />
        </div>

        <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
          <div>
            <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left" style={{ color: "#0f172a", marginBottom: 0 }}>
              Attendance Management
            </h2>
            <p className="text-[14px]" style={{ color: "#374151" }}>
              View and manage attendance sessions, students and reports
            </p>
          </div>

          <div className="flex items-center justify-center" style={{ height: "60vh" }}>
            <div className="flex flex-col items-center gap-2">
              <AutorenewIcon className="h-8 w-8 animate-spin text-muted-foreground" />
              <Typography color="text.secondary">Loading class data...</Typography>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
        <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
          <Sidebar />
        </div>

        <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
          <div>
            <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left" style={{ color: "#0f172a", marginBottom: 0 }}>
              Attendance Management
            </h2>
            <p className="text-[14px]" style={{ color: "#374151" }}>
              Select a class to manage attendance
            </p>
          </div>

          <Box mt={3}>
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold">Select a Class</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Please select a class to manage attendance</Typography>

                <Box mb={2}>
                  <TextField
                    id="search-classes"
                    placeholder="Search classes..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    size="small"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FaSearch style={{ color: "#64748b", width: 16, height: 16 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      backgroundColor: "#ffffff",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#0f172a" },
                    }}
                  />
                </Box>

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
              </CardContent>
            </Card>
          </Box>
        </main>
      </div>
    );
  }

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main
        className="ml-[250px] p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh" }}
      >
        <div>
          <h2
            className="text-[24px] font-inter font-semibold leading-[30px] text-left"
            style={{ color: "#0f172a", marginBottom: 0 }}
          >
            Attendance Management
          </h2>
          <div className="flex justify-between items-center">
            <p
              className="text-[14px] font-inter font-normal leading-[17px] text-left"
              style={{ color: "#374151" }}
            >
              View and manage attendance sessions, students and reports
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                onClick={handleStartSession}
                disabled={sessionActive || isLoading}
                className="gap-2 "
              >
                <QrCodeIcon className="h-4 w-4" />
                Start Attendance
              </Button>
              
              {sessionActive && requireQrToEnd && (
                <Button
                  size="small"
                  onClick={handleEndSession}
                  disabled={isLoading}
                  variant="outline"
                  className="gap-2"
                >
                  <QrCodeIcon className="h-4 w-4" />
                  End Attendance
                </Button>
              )}

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
        </div>

       {selectedClass && (
         <Box mt={2} mb={2}>
           <Typography variant="h6" fontWeight="bold">
             {selectedClass.course_code}: {selectedClass.course_title}
           </Typography>
           <Typography variant="body2" color="text.secondary">
             {selectedClass.day_of_week && selectedClass.startTime && selectedClass.endTime
               ? `${selectedClass.day_of_week}, ${selectedClass.startTime.slice(0, 5)} - ${selectedClass.endTime.slice(0, 5)}`
               : "No schedule information"}
             {" • "}
             {selectedClass.location || "No location"}
           </Typography>
         </Box>
       )}

        <Box my={3}>
          <Card sx={{ p: 2, background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
            <Typography variant="body2" color="text.secondary">
              Live sessions: {sessionActive ? "1 active" : "No active sessions"}
            </Typography>
          </Card>
        </Box>

        {!selectedClass && (
          <div className="grid grid-cols-3 gap-[20px] mt-6">
           <Card
             className="border"
             sx={{
               background: "#ffffff",
               border: "1px solid #e2e8f0",
               boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
             }}
           >
             <CardContent>
               <Typography variant="subtitle2" color="text.secondary">
                 Active Session
               </Typography>
               <Typography variant="h5" fontWeight="bold">
                 {sessionActive ? "Running" : "None"}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 {sessionActive ? `Started ${sessionStartTime?.toLocaleTimeString()}` : "Start a session to track attendance"}
               </Typography>
             </CardContent>
           </Card>
 
           <Card
             className="border"
             sx={{
               background: "#ffffff",
               border: "1px solid #e2e8f0",
               boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
             }}
           >
             <CardContent>
               <Typography variant="subtitle2" color="text.secondary">
                 Present
               </Typography>
               <Typography variant="h5" fontWeight="bold">
                 {presentCount}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 Students marked present
               </Typography>
             </CardContent>
           </Card>
 
           <Card
             className="border"
             sx={{
               background: "#ffffff",
               border: "1px solid #e2e8f0",
               boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
             }}
           >
             <CardContent>
               <Typography variant="subtitle2" color="text.secondary">
                 Absent
               </Typography>
               <Typography variant="h5" fontWeight="bold">
                 {absentCount}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 Students currently absent
               </Typography>
             </CardContent>
           </Card>
          </div>
        )}

        {!selectedClass && (
          <>
            <Box display="flex" alignItems="center" mb={3} mt={3}>
              <TextField
                id="search-classes-overview"
                placeholder="Search classes or code"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FaSearch style={{ color: "#64748b", width: 16, height: 16 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  backgroundColor: "#ffffff",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
                }}
              />
            </Box>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredClasses.map((cls) => (
                <div key={cls.id}>
                  <div onClick={() => router(`/attendance-management?classId=${cls.id}`)}>
                    <Card
                      className="cursor-pointer border"
                      sx={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                        mb: 2,
                      }}
                    >
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                          {cls.course_code}: {cls.course_title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {cls.day_of_week ? `${cls.day_of_week}` : "No schedule info"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {cls.location || (cls.lat && cls.long ? `${Number(cls.lat).toFixed(4)}, ${Number(cls.long).toFixed(4)}` : "No location")}
                        </Typography>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedClass && (
          <Box mt={4}>
            {sessionActive && classAttendance && (
              <Card sx={{ mt: 2, background: "#ffffff", border: "1px solid #e2e8f0" }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Active Attendance Session</Typography>
                  <Typography>{sessionStartTime?.toLocaleTimeString()}</Typography>
                </CardContent>
              </Card>
            )}

            <Box mt={2}>
              <AttendanceStats
                classData={{ ...selectedClass, students: enrolledStudents }}
                classAttendance={classAttendance}
                presentCount={presentCount}
                absentCount={absentCount}
              />
            </Box>

            <Box mt={2}>
              {!selectedStudent && (
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                  <Tab label={`Present (${presentCount})`} value="present" />
                  <Tab label={`Absent (${absentCount})`} value="absent" />
                  <Tab label={`Excused (${Array.isArray(classAttendance?.students) ? classAttendance.students.length : 0})`} value="excused" />
                  <Tab label={`Flagged (${Array.isArray(classAttendance?.students) ? classAttendance.students.length : 0})`} value="flagged" />
                </Tabs>
              )}

              {!selectedStudent ? (
                <StudentAttendanceList
                  statusFilter={activeTab}
                  onSelectStudent={handleSelectStudent}
                  classAttendanceId={currentAttendanceId}
                />
              ) : (
                <StudentDetailsCard
                  student={selectedStudent}
                  onClose={() => setSelectedStudent(null)}
                  onMarkPresent={handleMarkPresent}
                />
              )}
            </Box>
          </Box>
        )}

        <AttendanceIssues />

        <AttendanceSession
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          sessionType={sessionType}
          classData={selectedClass}
          location={currentLocation}
          onFinalize={handleFinalizeSession}
          onExpire={handleSessionExpire}
          sessionPassword={currentSessionPassword}
          sessionId={currentAttendanceId}
          requireQrToEnd={requireQrToEnd}
          setRequireQrToEnd={setRequireQrToEnd}
        />

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <MuiAlert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </MuiAlert>
        </Snackbar>

        <ChooseModeDialog
          open={chooseModeDialogOpen}
          onClose={() => setChooseModeDialogOpen(false)}
          onChoose={handleChooseMode}
        />

        <OnlineAttendanceDialog
          open={onlineDialogOpen}
          onClose={() => setOnlineDialogOpen(false)}
          onProceed={handleOnlineProceed}
        />
      </main>
    </div>
  );
}