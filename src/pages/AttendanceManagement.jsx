import { sendAbsenceEmailsAfterLectureEnd } from "../utils/sendAbsenceAfterLectureEnd";
import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom";
import { Alert, AlertTitle, Chip, Card, CardContent, Typography, TextField, InputAdornment } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventNoteIcon from "@mui/icons-material/EventNote";
import FlagIcon from "@mui/icons-material/Flag";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Toast from "../components/Toast";
import { v4 as uuidv4 } from "uuid";
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
import ViewDetailsButton from "../components/ViewDetailsButton";
import * as XLSX from 'xlsx';
import Loading from "../components/Loading";

const DAY_NUMBER_TO_NAME = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday", 
};

export default function AttendanceManagementPage() {
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  const router = useNavigate()
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const classId = searchParams.get("classId");
  const [classes, setClasses] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [activeTab, setActiveTab] = useState("present")
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [sessionType, setSessionType] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [addresses, setAddresses] = useState({});
  const [classAttendance, setClassAttendance] = useState(null);
  const [currentAttendanceId, setCurrentAttendanceId] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [currentSessionPassword, setCurrentSessionPassword] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [chooseModeDialogOpen, setChooseModeDialogOpen] = useState(false);
  const [onlineDialogOpen, setOnlineDialogOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [attendanceMode, setAttendanceMode] = useState(null);
  const [requireQrToEnd, setRequireQrToEnd] = useState(false);
  const [todayAttendanceStatus, setTodayAttendanceStatus] = useState(null);
  const [todayAttendanceData, setTodayAttendanceData] = useState({ present: [], absent: [] });
  const [canStartAttendance, setCanStartAttendance] = useState(false);
  const [timeValidationMessage, setTimeValidationMessage] = useState('');
  const [hasWeeklySession, setHasWeeklySession] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (selectedClass) {
        checkTodayAttendance();
        fetchTodayAttendanceData(currentAttendanceId);
      }
    };
    window.addEventListener('attendance-updated', handler);
    return () => window.removeEventListener('attendance-updated', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, currentAttendanceId]);
  // Send absence emails after lecture_end_time is reached
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => {
      sendAbsenceEmailsAfterLectureEnd(user.id);
    }, 60 * 1000); // check every 1 minute
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleOnlineProceed = async ({ recordingLink, quizContent, minWatchTime }) => {
  setOnlineDialogOpen(false);
  setIsLoading(true);

  try {
    const insertData = {
      latitude: null,
      longitude: null,
      recording_url: recordingLink,
      quiz_questions: quizContent,
      min_watch_time: minWatchTime ? parseInt(minWatchTime) : null,
      course_lecture_id: null,
      course_tutorial_id: null,
      date: new Date().toISOString().split('T')[0], 
    };

    // Set the appropriate ID field based on class type
    if (selectedClass.type === "Tutorial") {
      insertData.course_tutorial_id = selectedClass.id;
    } else {
      insertData.course_lecture_id = selectedClass.id;
    }
    const { data, error } = await supabase
      .from('attendance_session')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    setCurrentAttendanceId(data.id);
    setClassAttendance(data);
    setSessionActive(true);
    setSessionStartTime(new Date());

    // Force refresh of attendance status and UI
    await checkTodayAttendance();
    await fetchTodayAttendanceData(data.id);
    setTodayAttendanceStatus('taken');
    setCanStartAttendance(false);

    setSnackbar({
      open: true,
      message: "Online attendance session started.",
      severity: "success",
    });
    // Dispatch event for real-time updates in StudentAttendanceList and other listeners
    window.dispatchEvent(new CustomEvent('attendance-updated', {
      detail: { sessionId: data.id }
    }));
  } catch {
    setSnackbar({
      open: true,
      message: "Failed to start online session.",
      severity: "error",
    });
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => setSessionStartTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user.id) return;
      const { data } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", user.id)
        .single();
      if (data) {
        setUserRole(data.role);
      }
    };
    fetchUserInfo();
  }, [user.id]);

  useEffect(() => {
    if (selectedClass) {
      checkTodayAttendance();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);


  useEffect(() => {
    if (selectedClass) {
      checkTodayAttendance();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

 // Function to check if attendance was already taken today
 const checkTodayAttendance = async () => {
  if (!selectedClass) return;

  setIsLoading(true);
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // First, check if there's an attendance session for today specifically
    const { data: todaySessions, error: todayError } = await supabase
      .from("attendance_session")
      .select("*")
      .eq(selectedClass.type === "Tutorial" ? 'course_tutorial_id' : 'course_lecture_id', selectedClass.id)
      .eq('date', today)
      .order('created_at', { ascending: false });

    if (todayError) throw todayError;

    if (todaySessions && todaySessions.length > 0) {
      const session = todaySessions[0]; // Get the latest session
      setCurrentAttendanceId(session.id);

      // Check if session is still active (no end_time means session hasn't been finalized)
      // Sessions created with start_time but no end_time are considered active
      const now = new Date();
      const sessionEndTime = session.end_time ? new Date(session.end_time) : null;
      const isSessionActive = !sessionEndTime || sessionEndTime > now;

      // If a session exists today, mark as taken
      setTodayAttendanceStatus('taken');
      setSessionActive(isSessionActive); // true if session is still ongoing
      setCanStartAttendance(false);
      setTimeValidationMessage('Attendance has been taken for today');

      // Fetch attendance data using this session
      await fetchTodayAttendanceData(session.id);
    } else {
      // No session today
      setTodayAttendanceStatus('not_taken');
      setCurrentAttendanceId(null);
      
      // Fetch any session from this week and display that data
      await fetchTodayAttendanceData(); // No session ID = look for week's session
      
      // Validate timing with 'not_taken' status passed directly
      // This ensures validation uses the correct status immediately
      if (selectedClass.startTime && selectedClass.endTime) {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.toTimeString().slice(0, 5);
        const classDay = selectedClass.day_of_week;
        const startTime = selectedClass.startTime;
        const endTime = selectedClass.endTime;

        let expectedJsDay = typeof classDay === 'number' ? classDay % 7 : 0;
        if (typeof classDay !== 'number') {
          const dayMap = { "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6 };
          expectedJsDay = dayMap[classDay] ?? 0;
        }

        const isCorrectDay = currentDay === expectedJsDay;
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const [currentHour, currentMin] = currentTime.split(':').map(Number);

        const classStartMinutes = startHour * 60 + startMin; // Start at exact class time
        const classEndMinutes = endHour * 60 + endMin; // Exact end time
        const classEndMinutesMinus20 = classEndMinutes - 20; // 20 min before end
        const currentMinutes = currentHour * 60 + currentMin;

        // Allow starting attendance only during class time (from start until 20 min before end)
        const isCorrectTime = currentMinutes >= classStartMinutes && currentMinutes < classEndMinutesMinus20;
        const canStart = isCorrectDay && isCorrectTime;

        setCanStartAttendance(canStart);
        
        if (!isCorrectDay) {
          const dayName = DAY_NUMBER_TO_NAME[classDay] || 'Unknown';
          setTimeValidationMessage(`Today is not the scheduled day for this class. This class is scheduled for ${dayName}.`);
        } else if (!isCorrectTime) {
          if (currentMinutes < classStartMinutes) {
            setTimeValidationMessage(`Too early. Attendance can start at ${startTime.slice(0, 5)} (class start time).`);
          } else if (currentMinutes >= classEndMinutes) {
            // Class has completely ended
            setTimeValidationMessage(`Class has ended. Cannot start attendance after ${endTime.slice(0, 5)}.`);
          } else if (currentMinutes >= classEndMinutesMinus20) {
            const cutoffTime = new Date();
            cutoffTime.setHours(Math.floor(classEndMinutesMinus20 / 60), classEndMinutesMinus20 % 60);
            setTimeValidationMessage(`Too late. Attendance stopped at ${cutoffTime.toTimeString().slice(0, 5)} (20 minutes before class end).`);
          }
        } else {
          setTimeValidationMessage('Ready to start attendance');
        }
      }
    }
  } catch {
    setTodayAttendanceStatus('not_taken');
    setCanStartAttendance(false);
    setTimeValidationMessage('Error loading class data');
    await fetchTodayAttendanceData();
  } finally {
    setIsLoading(false);
  }
};

 // Function to fetch today's attendance data
 const fetchTodayAttendanceData = async (sessionId = null) => {
  if (!selectedClass) return;

  try {
    // Get current week's date range (Monday to Sunday)
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(now);
    monday.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1)); // Get Monday
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Get all enrolled students with their enrollment IDs
    const enrollmentTable = selectedClass.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
    const enrollmentField = selectedClass.type === "Tutorial" ? "tutorial_id" : "course_id";

    const { data: enrollments, error: enrollError } = await supabase
      .from(enrollmentTable)
      .select(`
        id,
        student_id,
        users (
          id,
          name,
          email,
          matric_number
        )
      `)
      .eq(enrollmentField, selectedClass.id);

    if (enrollError) throw enrollError;

    // Find any attendance session from this week for this class
    let weekSession = null;
    
    if (sessionId) {
      // If specific session ID provided, use it
      const { data: session, error: sessionError } = await supabase
        .from("attendance_session")
        .select("*")
        .eq("id", sessionId)
        .single();
      
      if (!sessionError && session) {
        weekSession = session;
      }
    } else {
      // Otherwise, look for any session this week
      const { data: weekSessions, error: weekSessionError } = await supabase
        .from("attendance_session")
        .select("*")
        .eq(selectedClass.type === "Tutorial" ? 'course_tutorial_id' : 'course_lecture_id', selectedClass.id)
        .gte('created_at', monday.toISOString())
        .lte('created_at', sunday.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!weekSessionError && weekSessions && weekSessions.length > 0) {
        weekSession = weekSessions[0];
        // Only update currentAttendanceId if not already set (don't override active session)
        if (!currentAttendanceId) {
          setCurrentAttendanceId(weekSession.id);
        }
      }
    }

    if (!weekSession) {
      // No session found for this week, show all students as not marked
      setHasWeeklySession(false);
      const studentsWithStatus = enrollments.map(enrollment => ({
        ...enrollment.users,
        student_id: enrollment.student_id,
        enrollmentId: enrollment.id,
        status: 'not_marked'
      }));

      setTodayAttendanceData({
        present: [],
        absent: studentsWithStatus
      });
      return;
    }

    setHasWeeklySession(true);

    // Get attendance records for this week's session, including flag_reason
    const attendanceField = selectedClass.type === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";
    // Defensive: Only query if weekSession.id is defined
    let attendanceRecords = [];
    let attendanceError = null;
    if (weekSession && weekSession.id) {
      const result = await supabase
        .from("attendance_record")
        .select(`${attendanceField}, status, created_at, marked_manually, flag_reason, latitude, longitude`)
        .eq("session_id", weekSession.id);
      attendanceRecords = result.data;
      attendanceError = result.error;
    }
    if (attendanceError) throw attendanceError;

    if (attendanceError) throw attendanceError;


    // Fetch class location from course_lecture or course_tutorial
    let classLocation = null;
    try {
      if (selectedClass.type === "Tutorial") {
        const { data, error } = await supabase
          .from("course_tutorial")
          .select("latitude, longitude, tutorial_location")
          .eq("id", selectedClass.id)
          .single();
        if (!error && data) {
          classLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            location: data.tutorial_location
          };
        }
      } else {
        const { data, error } = await supabase
          .from("course_lecture")
          .select("latitude, longitude, lecture_location")
          .eq("id", selectedClass.id)
          .single();
        if (!error && data) {
          classLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            location: data.lecture_location
          };
        }
      }
    } catch {
      classLocation = null;
    }

    // Categorize students based on week's attendance

    const presentStudents = [];
    const absentStudents = [];
    const excusedStudents = [];
    const flaggedStudents = [];
    const allStudents = [];

    enrollments.forEach(enrollment => {
      const student = {
        ...enrollment.users,
        student_id: enrollment.student_id,
        matric_number: enrollment.users?.matric_number,
        enrollmentId: enrollment.id,
        lecture_enrollment_id: selectedClass.type === "Lecture" ? enrollment.id : undefined,
        tutorial_enrollment_id: selectedClass.type === "Tutorial" ? enrollment.id : undefined
      };
      // Find attendance record using enrollment ID
      const attendanceRecord = attendanceRecords.find(
        record => record[attendanceField] === enrollment.id
      );
      let status = 'absent';
      let checkInTime = undefined;
      let marked_manually = undefined;
      let flag_reason = undefined;
      let latitude = undefined;
      let longitude = undefined;
      if (attendanceRecord) {
        status = attendanceRecord.status;
        checkInTime = attendanceRecord.created_at;
        marked_manually = attendanceRecord.marked_manually;
        flag_reason = attendanceRecord.flag_reason;
        if (typeof attendanceRecord.latitude === 'number') latitude = attendanceRecord.latitude;
        if (typeof attendanceRecord.longitude === 'number') longitude = attendanceRecord.longitude;
      }
      const studentObj = {
        ...student,
        status,
        checkInTime,
        marked_manually,
        flag_reason,
        latitude,
        longitude,
        sessionDate: weekSession.created_at
      };
      allStudents.push(studentObj);
      
      // Categorize by status - flagged is a separate status
      if (status === 'flagged') {
        // Flagged students go to flagged tab only
        flaggedStudents.push({ ...studentObj, classLocation });
      } else if (status === 'present') {
        presentStudents.push({ ...studentObj });
      } else if (status === 'excused') {
        excusedStudents.push({ ...studentObj });
      } else {
        // Status is 'absent' or undefined
        absentStudents.push({ ...studentObj });
      }
    });

    setTodayAttendanceData({
      present: presentStudents,
      absent: absentStudents,
      excused: excusedStudents,
      flagged: flaggedStudents,
      all: allStudents
    });

    // Update counts
    setPresentCount(presentStudents.length);
    setAbsentCount(absentStudents.length);

  } catch {
    setTodayAttendanceData({ present: [], absent: [] });
  }
};

// Render attendance status and data
const renderTodayAttendanceStatus = () => {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <AutorenewIcon className="animate-spin" sx={{ mr: 1 }} />
        <Typography>Checking today's attendance...</Typography>
      </Box>
    );
  }

  const renderAttendanceStatsSection = () => (
    <Box mb={3}>
      <AttendanceStats
        classData={{ 
          ...selectedClass, 
          students: enrolledStudents 
        }}
        presentCount={presentCount}
        absentCount={absentCount}
        excusedCount={enrolledStudents.filter(s => s.isExcused || s.excuse_reason).length}
        flaggedCount={enrolledStudents.filter(s => s.isFlagged || s.flag_reason).length}
      />
    </Box>
  );

  if (todayAttendanceStatus === 'taken') {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>Attendance Already Taken</AlertTitle>
          Attendance has already been completed for today. You cannot start a new session.
        </Alert>
        
        {/* Show AttendanceStats for completed sessions */}
        {renderAttendanceStatsSection()}
        
        {/* Show attendance list */}
        {renderAttendanceList()}
      </Box>
    );
  }

  // For 'not_taken' status
  return (
    <Box>
      {!canStartAttendance && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>Cannot Start Attendance</AlertTitle>
          {timeValidationMessage}
        </Alert>
      )}
      
      {canStartAttendance && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>Ready to Start</AlertTitle>
          You can now start taking attendance for this class.
        </Alert>
      )}
      
      {/* Show AttendanceStats even when not taken */}
      {renderAttendanceStatsSection()}
      
      <Box textAlign="center" py={4}>
        <AccessTimeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No attendance taken today
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Class: {selectedClass.course_code} - {selectedClass.course_title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Schedule: {DAY_NUMBER_TO_NAME[selectedClass.day_of_week] || selectedClass.day_of_week}, {selectedClass.startTime?.slice(0, 5)} - {selectedClass.endTime?.slice(0, 5)}
        </Typography>
      </Box>
    </Box>
  );
}; 

// Replace the renderAttendanceList function:
const renderAttendanceList = () => {
  const allStudents = [
    ...(todayAttendanceData.present || []),
    ...(todayAttendanceData.absent || []),
    ...(todayAttendanceData.excused || []),
    ...(todayAttendanceData.flagged || [])
  ];
  const excusedStudents = todayAttendanceData.excused || [];

  if (allStudents.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
        No student data available.
      </Typography>
    );
  }

  return (
    <Box>
      <Tabs 
        value={activeTab} 
        onChange={(event, newValue) => {
          setActiveTab(newValue);
        }} 
        sx={{ 
          mb: 2,
          position: 'relative',
          zIndex: 11,
          '& .MuiTab-root': {
            minHeight: 40,
            padding: '6px 12px',
          }
        }}
      >
        <Tab 
          label={`Present (${(todayAttendanceData.present || []).length})`} 
          value="present"
          icon={<CheckCircleIcon fontSize="small" />}
          iconPosition="start"
        />
        <Tab 
          label={`Absent (${(todayAttendanceData.absent || []).length})`} 
          value="absent"
          icon={<CancelIcon fontSize="small" />}
          iconPosition="start"
        />
        <Tab 
          label={`Excused (${excusedStudents.length})`} 
          value="excused"
          icon={<EventNoteIcon fontSize="small" />}
          iconPosition="start"
        />
        <Tab 
          label={`Flagged (${(todayAttendanceData.flagged || []).length})`} 
          value="flagged"
          icon={<FlagIcon fontSize="small" />}
          iconPosition="start"
        />
      </Tabs>

      <Box>
        {/* Present Tab */}
        {activeTab === 'present' && (
          <Box>
            {(todayAttendanceData.present || []).map((student) => (
              <Card key={student.id} sx={{ mb: 1, border: '1px solid #4caf50' }}>
                <CardContent sx={{ py: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography fontWeight="bold">{student.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.email}
                      </Typography>
                    </Box>
                    <Box textAlign="right" display="flex" alignItems="center" gap={2}>
                      <Box textAlign="center">
                        <Chip label="Present" color="success" size="small" />
                        <Typography variant="caption" display="block">
                          {student.checkInTime ? (student.checkInTime.match(/T(\d{2}:\d{2}:\d{2})/) ? student.checkInTime.match(/T(\d{2}:\d{2}:\d{2})/)[1] : student.checkInTime) : 'N/A'}
                        </Typography>
                      </Box>
                      <ViewDetailsButton onClick={() => handleSelectStudent({
                       ...student,
                       enrollmentId: student.enrollmentId,
                       status: 'present'
                     })} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Absent Tab */}
        {activeTab === 'absent' && (
          <Box>
            {(todayAttendanceData.absent || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                No absent students for this week.
              </Typography>
            ) : (
              <>
              {(todayAttendanceData.absent || []).map((student) => (
                <Card key={student.id} sx={{ mb: 1, border: '1px solid #f44336' }}>
                  <CardContent sx={{ py: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontWeight="bold">{student.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.email}
                        </Typography>
                        {student.sessionDate && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Session Date: {new Date(student.sessionDate).toLocaleDateString()}
                          </Typography>
                        )}
                    </Box>
                    <Box textAlign="right" display="flex" alignItems="center" gap={2}>
                      <Box textAlign="center">
                        <Chip label="Absent" color="error" size="small" />
                        <Typography variant="caption" display="block" color="text.secondary">
                          Not checked in
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        color="success"
                        onClick={() => handleMarkPresent(student.matric_number)}
                      >
                        Mark Present
                      </Button>
                      <ViewDetailsButton onClick={() => handleSelectStudent({
                       ...student,
                       enrollmentId: student.enrollmentId,
                       status: 'absent'
                     })} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
              </>
            )}
          </Box>
        )}

        {/* Excused Tab */}
        {activeTab === 'excused' && (
          <Box>
            {excusedStudents.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                No students have been excused for this session.
              </Typography>
            ) : (
              excusedStudents.map((student) => (
                <Card key={student.id} sx={{ mb: 1, border: '1px solid', borderColor: 'info.main' }}>
                  <CardContent sx={{ py: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography fontWeight="bold">{student.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.email}
                        </Typography>
                        <Typography variant="caption" display="block" color="info.main">
                          Reason: {student.excuse_reason || "Medical excuse"}
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Chip 
                          label="Excused" 
                          color="info" 
                          size="small" 
                          icon={<EventNoteIcon />}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        )}

         {/* Flagged Tab */}
         {activeTab === 'flagged' && (
           (() => {
             // Combine date and start_time if both exist, else fallback to start_time
             let sessionStartTime = classAttendance?.start_time;
             if (classAttendance?.date && classAttendance?.start_time) {
               sessionStartTime = `${classAttendance.date}T${classAttendance.start_time}+08:00`;
             }
             const sessionInfo = { sessionId: currentAttendanceId, start_time: sessionStartTime, date: classAttendance?.date };
             return (
               <FlaggedAttendanceList
                 students={todayAttendanceData.flagged || []}
                 session={selectedClass}
                 sessionInfo={sessionInfo}
                 onRefresh={() => fetchTodayAttendanceData(currentAttendanceId)}
                 handleMarkPresent={handleMarkPresent}
               />
             );
           })()
         )}
      </Box>
    </Box>
  );
};

const handleSelectStudent = async (student) => {
  if (student && student.name) { 
    setIsLoading(true);
    try {
      // Get attendance record for this student and current session
      if (currentAttendanceId && student.enrollmentId) {
        if (!currentAttendanceId || !student.enrollmentId) {
          setSelectedStudent(student);
          setShowStudentDetails(true);
          setIsLoading(false);
          return;
        }
        const attendanceField = selectedClass.type === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";
        
        const { data: attendanceRecord, error: attendanceError } = await supabase
          .from("attendance_record")
          .select("*, latitude, longitude, status, verification_data, session_id")
          .eq("session_id", currentAttendanceId)
          .eq(attendanceField, student.enrollmentId)
          .single();

        if (attendanceError && attendanceError.code !== 'PGRST116') { // PGRST116 = no rows found
          // Error fetching attendance record
        }

        // Get class location data for distance calculation
        const classLocationData = await getClassLocationData();

        // Fetch session start time if attendance record exists
        let sessionStartTime = null;
        if (attendanceRecord?.session_id) {
          try {
            const { data: session, error: sessionError } = await supabase
              .from("attendance_session")
              .select("created_at")
              .eq("id", attendanceRecord.session_id)
              .single();

            if (!sessionError && session?.created_at) {
              // Add 8 hours to convert from UTC to GMT+8 (Asia/Kuala_Lumpur)
              const utcDate = new Date(session.created_at);
              const localDate = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
              sessionStartTime = localDate.toISOString();
            }
          } catch {
            // Error fetching session start time
          }
        }

        // Enhance student object with attendance record data
        const enhancedStudent = {
          ...student,
          attendanceRecord: attendanceRecord || null,
          classLocation: classLocationData,
          classType: selectedClass.type,
          sessionStartTime: sessionStartTime,
          isOnlineClass: selectedClass?.location?.toLowerCase().includes('online') || 
                        selectedClass?.lecture_location?.toLowerCase().includes('online') ||
                        selectedClass?.tutorial_location?.toLowerCase().includes('online')
        };

        setSelectedStudent(enhancedStudent);
      } else {
        setSelectedStudent(student);
      }
      
      setShowStudentDetails(true);
      setIsLoading(false);
    } catch {
      setSelectedStudent(student);
      setShowStudentDetails(true);
      setIsLoading(false);
    }
  }
};

// Helper function to get class location data
const getClassLocationData = async () => {
  try {
    if (selectedClass.type === "Tutorial") {
      const { data, error } = await supabase
        .from("course_tutorial")
        .select("latitude, longitude, tutorial_location")
        .eq("id", selectedClass.id)
        .single();
      
      if (error) throw error;
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        location: data.tutorial_location
      };
    } else {
      const { data, error } = await supabase
        .from("course_lecture")
        .select("latitude, longitude, lecture_location")
        .eq("id", selectedClass.id)
        .single();
      
      if (error) throw error;
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        location: data.lecture_location
      };
    }
  } catch {
    return null;
  }
};

const handleCloseStudentDetails = () => {
  setShowStudentDetails(false);
  setSelectedStudent(null);
};

  const handleStartSession = () => {
   // Prevent starting a new session if one is already active
   if (sessionActive) {
     setSnackbar({
       open: true,
       message: "Attendance session is already in progress.",
       severity: "error"
     });
     return;
   }

   if (todayAttendanceStatus === 'taken') {
     setSnackbar({
       open: true,
       message: "Attendance has already been taken for today.",
       severity: "error"
     });
     return;
   }

   if (!canStartAttendance) {
     setSnackbar({
       open: true,
       message: timeValidationMessage,
       severity: "error"
     });
     return;
   }
   
   const isOnlineClass = selectedClass?.location?.toLowerCase().includes('online') || 
                       selectedClass?.lecture_location?.toLowerCase().includes('online') ||
                       selectedClass?.tutorial_location?.toLowerCase().includes('online');

  if (isOnlineClass) {
    // Directly open online attendance dialog for online classes
    setAttendanceMode("Online");
    setOnlineDialogOpen(true);
  } else {
    // Show mode selection dialog for physical/hybrid classes
    setChooseModeDialogOpen(true);
  }
};

  useEffect(() => {
  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      // Single optimized query for lectures with enrollment count
       let lectureQuery = supabase
         .from('course_lecture')
         .select(`
           *,
           enrollment_lecture(id)
         `);

       let tutorialQuery = supabase
         .from('course_tutorial')
         .select(`
           *,
           enrollment_tutorial(id)
         `);

       // Filter for non-admin users
       if (userRole !== "admin") {
         lectureQuery = lectureQuery.eq("lecturer_id", user.id);
         tutorialQuery = tutorialQuery.eq("lecturer_id", user.id);
       }

       const [lectureRes, tutorialRes] = await Promise.all([
         lectureQuery,
         tutorialQuery
       ]);

      if (lectureRes.error) throw lectureRes.error;
      if (tutorialRes.error) throw tutorialRes.error;

       // Combine with enrollment counts
       const lectures = (lectureRes.data || []).map(cls => ({ 
         ...cls, 
         type: "Lecture",
         enrollmentCount: cls.enrollment_lecture?.length || 0
       }));
       const tutorials = (tutorialRes.data || []).map(cls => ({ 
         ...cls,
         type: "Tutorial",
         enrollmentCount: cls.enrollment_tutorial?.length || 0
       }));
      let combined = [...lectures, ...tutorials];

      // Calculate duration and normalize day_of_week
      const classesWithDuration = combined.map(cls => {
  let dayOfWeekStr = cls.day_of_week;
  if (typeof dayOfWeekStr === "number" && DAY_NUMBER_TO_NAME[dayOfWeekStr]) {
    dayOfWeekStr = DAY_NUMBER_TO_NAME[dayOfWeekStr];
  }

  // Fix the time field mapping
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
    return { 
      ...cls, 
      duration, 
      day_of_week: cls.day_of_week, // Keep original numeric value
      startTime, 
      endTime, 
      startDate, 
      endDate, 
      location 
    };
  }
  return { 
    ...cls, 
    duration: 0, 
    day_of_week: cls.day_of_week, // Keep original numeric value
    startTime, 
    endTime, 
    startDate, 
    endDate, 
    location 
  };
});

      setClasses(classesWithDuration);
      setFetchError(null);
    } catch {
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
      const attendanceField = selectedClass.type === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";

      // Get all enrollments for this class
      const { data: enrollments, error: enrollError } = await supabase
        .from(enrollmentTable)
        .select("id")
        .eq(enrollmentIdField, courseId);

      if (enrollError) throw enrollError;

      // Get attendance records using correct enrollment field
      const { data: attendanceRecords, error: attError } = await supabase
        .from("attendance_record")
        .select(`${attendanceField}, status`)
        .eq("session_id", session.id);

      if (attError) throw attError;

      let present = 0;
      let absent = 0;

      if (enrollments && enrollments.length > 0) {
        enrollments.forEach((enroll) => {
          const record = (attendanceRecords || []).find(
            (rec) => rec[attendanceField] === enroll.id && rec.status === "present"
          );
          if (record) present += 1;
          else absent += 1;
        });
      }

      setPresentCount(present);
      setAbsentCount(absent);
    } catch {
      // Error fetching counts handled silently
    }
  };

  fetchCounts();

  // Set up real-time subscription for attendance changes
  const attendanceSubscription = supabase
    .channel(`attendance-${currentAttendanceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance_record',
        filter: `session_id=eq.${currentAttendanceId}`
      },
      () => {
        // Refresh counts and attendance list with slight delay to ensure DB is updated
        setTimeout(() => {
          fetchCounts();
          fetchTodayAttendanceData(currentAttendanceId);
        }, 100);
      }
    )
    .subscribe();

  return () => {
    attendanceSubscription.unsubscribe();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .select(`
        id,
        student_id,
        users (
          id,
          name,
          email
        )
      `)
      .eq(enrollmentIdField, selectedClass.id);
      
    if (isMounted && !error && data) {
      const students = data.map(enrollment => ({
        ...enrollment.users,
        student_id: enrollment.student_id,
        enrollmentId: enrollment.id,
        enrollmentType: selectedClass.type.toLowerCase()
      }));
      setEnrolledStudents(students);
    } else if (isMounted) {
      setEnrolledStudents([]);
    }
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

  function ClassCardWithEnrollmentCount({ cls, addresses, onClick }) {
    const [totalStudents, setTotalStudents] = React.useState(null);
    const [isClassActive, setIsClassActive] = React.useState(false);
    const [isClassArchived, setIsClassArchived] = React.useState(false);

    React.useEffect(() => {
      let isMounted = true;
      const fetchEnrollment = async () => {
        const enrollmentTable = cls.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
        const enrollIdField = cls.type === "Tutorial" ? "tutorial_id" : "course_id";

        const { data } = await supabase
          .from(enrollmentTable)
          .select("id")
          .eq(enrollIdField, cls.id);
        if (isMounted) setTotalStudents(data ? data.length : 0);
      };
      fetchEnrollment();
      return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cls.id]);

    // Check if class is archived (end_date has passed)
    React.useEffect(() => {
      const endDate = cls.type === "Lecture" ? cls.lecture_end_date : cls.tutorial_end_date;
      if (endDate) {
        const classEndDate = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setIsClassArchived(classEndDate < today);
      } else {
        setIsClassArchived(false);
      }
    }, [cls]);

    // Check if class is currently active (same day and within time range)
    React.useEffect(() => {
      const checkIfActive = () => {
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        const classDay = cls.day_of_week;
        const startTime = cls.type === "Tutorial" ? cls.tutorial_start_time : cls.lecture_start_time;
        const endTime = cls.type === "Tutorial" ? cls.tutorial_end_time : cls.lecture_end_time;

        // Check if today is the class day
        const isCorrectDay = currentDay === classDay;

        // Check if current time is within class time
        let isCorrectTime = false;
        if (startTime && endTime && isCorrectDay) {
          isCorrectTime = currentTime >= startTime.slice(0, 5) && currentTime <= endTime.slice(0, 5);
        }

        setIsClassActive(isCorrectDay && isCorrectTime);
      };

      checkIfActive();
      // Update every minute to check if class is still active
      const interval = setInterval(checkIfActive, 60000);
      return () => clearInterval(interval);
    }, [cls]);

    const startTime = cls.type === "Tutorial" ? cls.tutorial_start_time : cls.lecture_start_time;
    const endTime = cls.type === "Tutorial" ? cls.tutorial_end_time : cls.lecture_end_time;
    const location = cls.type === "Tutorial" ? cls.tutorial_location : cls.lecture_location;

    return (
      <Card
        onClick={isClassArchived ? undefined : onClick}
        sx={{
          cursor: isClassArchived ? "not-allowed" : "pointer",
          mb: 2,
          background: isClassArchived ? "#f9fafb" : isClassActive ? "#dcfce7" : "#ffffff",
          border: isClassArchived ? "1px solid #d1d5db" : isClassActive ? "2px solid #22c55e" : "1px solid #e2e8f0",
          boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
          opacity: isClassArchived ? 0.6 : 1,
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                {cls.course_code}: {cls.course_title}
              </Typography>
              {isClassArchived && (
                <Chip 
                  label="Archived" 
                  size="small" 
                  sx={{ 
                    backgroundColor: "#fecaca", 
                    color: "#991b1b", 
                    fontWeight: 600,
                    height: "24px",
                  }}
                />
              )}
            </Box>
            <Chip
              label={cls.type || "Lecture"}
              size="small"
              sx={{
                backgroundColor: cls.type === "Lecture" ? "#dbeafe" : "#fce7f3",
                color: cls.type === "Lecture" ? "#0c4a6e" : "#831843",
                fontWeight: 600,
                height: "24px",
              }}
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            {cls.day_of_week && startTime && endTime
              ? `${DAY_NUMBER_TO_NAME[cls.day_of_week] || cls.day_of_week}, ${cls.startTime.slice(0, 5)} - ${cls.endTime.slice(0, 5)}`
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

const handleChooseMode = async (mode) => {
  setAttendanceMode(mode);
  setChooseModeDialogOpen(false);
  if (mode === "Physical") {
      const classLocation = await getClassLocationData();
      await QRSession(mode, classLocation); 
  } else if (mode === "Online") {
    setOnlineDialogOpen(true);
  }
};

  // QR session: insert new row and store its id (attendance_session table)
  const QRSession = async (mode) => {
    if (!selectedClass.id) {
      alert("Invalid class selected");
      return;
    }

    const isTutorial = selectedClass.type === "Tutorial";
    
    // For lectures, verify required time fields exist
    if (!isTutorial) {
      if (!selectedClass.lecture_start_time || !selectedClass.lecture_end_time) {
        alert("This lecture is missing required time information. Please update the class details first.");
        return;
      }
    } else {
      if (!selectedClass.tutorial_start_time || !selectedClass.tutorial_end_time) {
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
        location = arguments[1] || { lat: null, lng: null };
        setCurrentLocation(location);
      } else {
        location = { lat: null, lng: null };
        setCurrentLocation(null);
      }

      // Create attendance session payload - let created_at use database default (now())
      // Set date and start_time for today's session tracking
      const now = new Date();
      const localDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
      const currentDate = localDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentTime = localDate.toTimeString().split(' ')[0]; // HH:MM:SS
      
      const insertData = {
        latitude: location.lat,
        longitude: location.lng,
        attendance_password: specialPassword,
        course_lecture_id: null,
        course_tutorial_id: null,
        date: currentDate,
        start_time: currentTime,
      };

      // Determine type and set ONLY the correct column
      const isTutorial = selectedClass.type === "Tutorial";
      
      if (isTutorial) {
        insertData.course_tutorial_id = selectedClass.id;
      } else {
        insertData.course_lecture_id = selectedClass.id;
      }

      // Insert session - ONLY into attendance_session table
      const { data, error } = await supabase
        .from('attendance_session')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCurrentAttendanceId(data.id);
      setCurrentSessionPassword(specialPassword);
      setSessionType("start");
      setQrDialogOpen(true);

      // Mark attendance as taken for today to prevent duplicate sessions
      setTodayAttendanceStatus('taken');
      setCanStartAttendance(false);

      setSnackbar({
        open: true,
        message: `Attendance session started (${mode}).`,
        severity: "success",
      });
    } catch (error) {
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
    // Optionally poll for updates if sessionActive
    let interval = null;
    if (sessionActive) {
      interval = setInterval(fetchClassAttendance, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [currentAttendanceId, sessionActive]);

  const handleFinalizeSession = async () => {
    setSessionActive(false)
    setQrDialogOpen(false)
    localStorage.removeItem("attendanceSession");

    // Refresh attendance data to update UI
    await checkTodayAttendance();
    await fetchTodayAttendanceData();
  }

  // Handle QR dialog close - just close the dialog, keep session active
  const handleQrDialogClose = () => {
    setQrDialogOpen(false);
    // Don't change sessionActive - the session is still running
  };

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

  const handleMarkPresent = async (studentId) => {
    if (!currentAttendanceId) {
      setSnackbar({
        open: true,
        message: "No active attendance session found.",
        severity: "error"
      });
      return;
    }

    try {
      // Try to find the student in all lists using all possible ID fields
      const matchFn = s => (
        s.matric_number === studentId ||
        s.studentId === studentId ||
        s.id === studentId ||
        (typeof studentId === 'number' && s.id === Number(studentId))
      );
      let student = null;
      if (todayAttendanceData.absent) {
        student = todayAttendanceData.absent.find(matchFn);
      }
      if (!student && todayAttendanceData.flagged) {
        student = todayAttendanceData.flagged.find(matchFn);
      }
      if (!student && todayAttendanceData.present) {
        student = todayAttendanceData.present.find(matchFn);
      }
      if (!student && todayAttendanceData.all) {
        student = todayAttendanceData.all.find(matchFn);
      }
      if (!student && enrolledStudents) {
        student = enrolledStudents.find(matchFn);
      }
      if (!student) {
        throw new Error("Student not found in class list");
      }

      const attendanceField = selectedClass.type === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";
      const enrollmentId = student.enrollmentId || student.enrollment_id;

      // Find the existing attendance record for this student and session
      // Defensive: Only query if both enrollmentId and currentAttendanceId are defined
      let attendanceRecords = [];
      let attendanceError = null;
      if (enrollmentId && currentAttendanceId) {
        const result = await supabase
          .from("attendance_record")
          .select("id")
          .eq(attendanceField, enrollmentId)
          .eq("session_id", currentAttendanceId);
        attendanceRecords = result.data;
        attendanceError = result.error;
      }

      if (attendanceError || !attendanceRecords || attendanceRecords.length === 0) {
        // If student is in absent list, allow upsert (create new record)
        const isAbsent = todayAttendanceData.absent && todayAttendanceData.absent.some(s => s.matric_number === student.matric_number);
        if (isAbsent) {
          // Set created_at to local time in Asia/Kuala_Lumpur
          const now = new Date();
          const localTime = now.toLocaleString('sv-SE', { timeZone: 'Asia/Kuala_Lumpur', hour12: false });
          const createdAt = localTime.replace(' ', 'T');
          if (enrollmentId && currentAttendanceId) {
            const { error: upsertError } = await supabase
              .from("attendance_record")
              .upsert({
                [attendanceField]: enrollmentId,
                session_id: currentAttendanceId,
                status: 'present',
                marked_manually: true,
                created_at: createdAt
              });
            if (upsertError) throw upsertError;
          } else {
            setSnackbar({ open: true, message: 'Missing enrollment or session ID', severity: 'error' });
            throw new Error('Missing enrollment or session ID');
          }
        } else {
          setSnackbar({ open: true, message: 'Attendance record not found', severity: 'error' });
          throw new Error('Attendance record not found');
        }
      } else {
        const attendanceId = attendanceRecords[0].id;
        // Update the attendance record to present and marked_manually
        const { error } = await supabase
          .from("attendance_record")
          .update({ status: 'present', marked_manually: true })
          .eq("id", attendanceId);
        if (error) throw error;
      }

      // Refresh the attendance data
      await fetchTodayAttendanceData(currentAttendanceId);

      // Dispatch event for real-time updates in StudentAttendanceList
      window.dispatchEvent(new CustomEvent('attendance-updated', { 
        detail: { sessionId: currentAttendanceId, studentId } 
      }));

      setSnackbar({
        open: true,
        message: `${student.name || 'Student'} has been manually marked as present (manual).`,
        severity: "success"
      });

    } catch {
      setSnackbar({
        open: true,
        message: "Failed to mark student as present. Please try again.",
        severity: "error"
      });
    }
  };

  const handleGenerateClassReport = async () => {
  if (!selectedClass) return;
  
  try {
    // Same logic as in StudentDetailsCard but for the entire class
    const enrollmentTable = selectedClass.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
    const enrollmentField = selectedClass.type === "Tutorial" ? "tutorial_id" : "course_id";
    const attendanceField = selectedClass.type === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";
    
    // Get all students enrolled in this class
    const { data: enrollments, error: enrollError } = await supabase
      .from(enrollmentTable)
      .select(`
        id,
        student_id,
        users (
          id,
          name,
          email,
          matric_number
        )
      `)
      .eq(enrollmentField, selectedClass.id);

    if (enrollError) throw enrollError;

    // Get attendance records for CURRENT SESSION ONLY
   const { data: attendanceRecords, error: recordsError } = await supabase
     .from("attendance_record")
     .select("*")
     .eq('session_id', currentAttendanceId);

   if (recordsError) throw recordsError;

   // Get current session details
   const { data: currentSession, error: sessionError } = await supabase
     .from("attendance_session")
     .select("id, created_at, date")
     .eq("id", currentAttendanceId)
     .single();

   if (sessionError) throw sessionError;

    // Create Excel data
    const excelData = [];

    // Add class info
   const sessionDate = new Date(currentSession.date || currentSession.created_at).toLocaleDateString();
   excelData.push(['Class Attendance Report']);
   excelData.push(['Class:', `${selectedClass.course_code} - ${selectedClass.course_title}`]);
   excelData.push(['Session Date:', sessionDate]);
   excelData.push(['Generated:', new Date().toLocaleString()]);
   excelData.push([]); // Empty row
   // Add header row for current session only
   const headerRow = ['Student Name', 'Student ID', 'Email', 'Status', 'Check-in Time'];
   excelData.push(headerRow);

    // Add student data rows
    enrollments.forEach(enrollment => {
      const student = enrollment.users;
      const row = [
        student.name,
        student.matric_number,
        student.email
      ];

      const attendanceRecord = (attendanceRecords || []).find(
        record => record[attendanceField] === enrollment.id
      );

      if (attendanceRecord) {
        row.push(attendanceRecord.status.charAt(0).toUpperCase() + attendanceRecord.status.slice(1));
        row.push(attendanceRecord.created_at); // Use raw datetime directly
      } else {
        row.push('Absent');
        row.push('-');
      }

      excelData.push(row);
    });

    // Add summary
   const presentCount = (attendanceRecords || []).filter(r => r.status === 'present').length;
   const totalStudents = enrollments.length;
   
   excelData.push([]); // Empty row
   excelData.push(['Summary']);
   excelData.push(['Total Students:', totalStudents]);
   excelData.push(['Present:', presentCount]);
   excelData.push(['Absent:', totalStudents - presentCount]);
   excelData.push(['Attendance Rate:', `${totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0}%`]);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Auto-size columns
    const colWidths = [];
    excelData.forEach(row => {
      row.forEach((cell, i) => {
        const cellLength = cell ? cell.toString().length : 0;
        colWidths[i] = Math.max(colWidths[i] || 0, cellLength);
      });
    });
    ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w + 2, 50) }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Current Session');

    // Generate filename
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const filename = `${selectedClass.course_code}_Session_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

  } catch {
    setSnackbar({
      open: true,
      message: "Failed to generate class report. Please try again.",
      severity: "error",
    });
  }
};

  async function getAddressFromLatLng(lat, lng) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    const data = await response.json();
    return data.display_name || `${lat}, ${lng}`;
  }

  // Helper function to check if a class is archived
  const isClassArchivedFunc = (cls) => {
    const endDate = cls.type === "Lecture" ? cls.lecture_end_date : cls.tutorial_end_date;
    if (!endDate) return false;
    const classEndDate = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return classEndDate < today;
  };

  // Helper function to check if a class is currently active
  const isClassCurrentlyActive = (cls) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    const classDay = cls.day_of_week;
    const startTime = cls.startTime;
    const endTime = cls.endTime;

    if (!startTime || !endTime) return false;

    // Convert class day to JS day format if needed
    let expectedJsDay = typeof classDay === 'number' ? classDay : 
                       classDay === 'Monday' ? 1 : classDay === 'Tuesday' ? 2 :
                       classDay === 'Wednesday' ? 3 : classDay === 'Thursday' ? 4 :
                       classDay === 'Friday' ? 5 : classDay === 'Saturday' ? 6 : 0;

    // Check if today is the correct day and time is within class time
    return currentDay === expectedJsDay && currentTime >= startTime.slice(0, 5) && currentTime <= endTime.slice(0, 5);
  };

  const filteredClasses = classes
    .filter(
      (cls) =>
        cls.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.course_code?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // First, check if archived - archived classes go to bottom
      const aArchived = isClassArchivedFunc(a);
      const bArchived = isClassArchivedFunc(b);
      
      if (aArchived !== bArchived) {
        return aArchived ? 1 : -1;
      }
      
      // Second, prioritize active classes (happening now)
      const aIsActive = isClassCurrentlyActive(a);
      const bIsActive = isClassCurrentlyActive(b);
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
      
      // If both active or both inactive, sort by day then time
      const aDayNum = typeof a.day_of_week === 'number' ? a.day_of_week : 0;
      const bDayNum = typeof b.day_of_week === 'number' ? b.day_of_week : 0;
      
      if (aDayNum !== bDayNum) {
        return aDayNum - bDayNum;
      }
      
      // If same day, sort by time
      const aTime = a.startTime || '';
      const bTime = b.startTime || '';
      return aTime.localeCompare(bTime);
    });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionActive, sessionStartTime, selectedClass])

  if (isLoading && !selectedClass) {
    return (
      <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
        <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
          <Sidebar />
        </div>

        <main
          data-has-sidebar
          className="p-[40px] max-h-screen overflow-y-auto"
          style={{ minHeight: "100vh", marginLeft: "var(--sidebar-width, 250px)", transition: "margin-left 0.3s ease-in-out" }}
        >
          <div>
            <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left" style={{ color: "#0f172a", marginBottom: 0 }}>
              Attendance Management
            </h2>
            <p className="text-[14px]" style={{ color: "#374151" }}>
              View and manage attendance sessions, students and reports
            </p>
          </div>

          <Loading message="Loading class data..." fullScreen />
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

        <main
          data-has-sidebar
          className="p-[40px] max-h-screen overflow-y-auto"
          style={{ minHeight: "100vh", marginLeft: "var(--sidebar-width, 250px)", transition: "margin-left 0.3s ease-in-out" }}
        >
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
        data-has-sidebar
        className="p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh", marginLeft: "var(--sidebar-width, 250px)", transition: "margin-left 0.3s ease-in-out" }}
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
                disabled={sessionActive || isLoading || todayAttendanceStatus === 'taken'}
                className="gap-2 "
              >
                <QrCodeIcon className="h-4 w-4" />
                {todayAttendanceStatus === 'taken' ? 'Attendance Taken' : 
                !canStartAttendance ? 'Cannot Start' : 'Start Attendance'}
              </Button>
              


              <Button
                size="small"
                onClick={handleGenerateClassReport}
                variant="outline"
                className="gap-2 ml-[8px]"
                disabled={!hasWeeklySession}
              >
                <DownloadIcon className="h-4 w-4" />
                Download Report
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
               ? `${DAY_NUMBER_TO_NAME[selectedClass.day_of_week] || selectedClass.day_of_week}, ${selectedClass.startTime.slice(0, 5)} - ${selectedClass.endTime.slice(0, 5)}`
               : "No schedule information"}
             {" • "}
             {selectedClass.location || "No location"}
           </Typography>
         </Box>
       )}

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
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Today's Attendance Status
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>

                {/* Call the attendance status rendering function */}
                {renderTodayAttendanceStatus()}
              </CardContent>
            </Card>

            {selectedClass && (
              <Box mt={3}>
                <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Class Attendance List
                    </Typography>
                    <StudentAttendanceList
                      classData={selectedClass}
                      sessionId={currentAttendanceId}
                      onSelectStudent={handleSelectStudent}
                      onFlagged={() => fetchTodayAttendanceData(currentAttendanceId)}
                    />
                  </CardContent>
                </Card>
              </Box>
            )}

            <StudentDetailsCard
              student={selectedStudent}
              classData={selectedClass}
              open={showStudentDetails}
              onClose={handleCloseStudentDetails}
              onMarkPresent={() => handleMarkPresent(selectedStudent?.student_id)}
            />
            <AttendanceIssues selectedClass={selectedClass} />
          </Box>
        )}

        <AttendanceSession
          open={qrDialogOpen}
          onClose={handleQrDialogClose}
          sessionType={sessionType}
          classData={selectedClass}
          location={currentLocation}
          onFinalize={handleFinalizeSession}
          onExpire={handleSessionExpire}
          sessionPassword={currentSessionPassword}
          sessionId={currentAttendanceId}
          requireQrToEnd={requireQrToEnd}
          setRequireQrToEnd={setRequireQrToEnd}
          duration={30} 
          isActive={sessionActive}
        />

        <Toast
          open={snackbar.open}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
          severity={snackbar.severity}
          autoHideDuration={4000}
        />

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