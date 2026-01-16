import { Search, AccessTime, LocationOn, Report, Flag as FlagIcon, Close as CloseIcon } from "@mui/icons-material"
import React, { useState, useMemo } from "react"
import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material"
import ViewDetailsButton from "./ViewDetailsButton"
import supabase from "../config/supabaseClient";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

export default function FlaggedAttendanceList({ students = [], session, sessionInfo = {}, onRefresh, handleMarkPresent: parentHandleMarkPresent }) {
  // Haversine formula for distance in km
  function haversineDistance(lat1, lon1, lat2, lon2) {
    function toRad(x) { return x * Math.PI / 180; }
    if ([lat1, lon1, lat2, lon2].some(v => v == null || isNaN(Number(v)))) return null;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Helper to extract check-in and class location, and compute distance
  function getLocationAnalysis(selectedStudent, sessionInfo, session) {
    // Get check-in lat/lng
    let checkLat = null, checkLng = null;
    if (selectedStudent.attendance_record && selectedStudent.attendance_record.latitude != null && selectedStudent.attendance_record.longitude != null) {
      checkLat = Number(selectedStudent.attendance_record.latitude);
      checkLng = Number(selectedStudent.attendance_record.longitude);
    } else if (selectedStudent.checkInLocation && selectedStudent.checkInLocation.lat != null && selectedStudent.checkInLocation.lng != null) {
      checkLat = Number(selectedStudent.checkInLocation.lat);
      checkLng = Number(selectedStudent.checkInLocation.lng);
    } else if (selectedStudent.latitude != null && selectedStudent.longitude != null) {
      checkLat = Number(selectedStudent.latitude);
      checkLng = Number(selectedStudent.longitude);
    } else if (selectedStudent.lat != null && selectedStudent.lng != null) {
      checkLat = Number(selectedStudent.lat);
      checkLng = Number(selectedStudent.lng);
    } else if (selectedStudent.location && Array.isArray(selectedStudent.location) && selectedStudent.location.length === 2) {
      checkLat = Number(selectedStudent.location[0]);
      checkLng = Number(selectedStudent.location[1]);
    }
    // Get class lat/lng from sessionInfo, session, or classLocation/class_location, or selectedStudent.classLocation/class_location
    let classLat = null, classLng = null;
    if (sessionInfo && sessionInfo.class_latitude != null && sessionInfo.class_longitude != null) {
      classLat = Number(sessionInfo.class_latitude);
      classLng = Number(sessionInfo.class_longitude);
    } else if (session && session.class_latitude != null && session.class_longitude != null) {
      classLat = Number(session.class_latitude);
      classLng = Number(session.class_longitude);
    } else if (session && session.location && Array.isArray(session.location) && session.location.length === 2) {
      classLat = Number(session.location[0]);
      classLng = Number(session.location[1]);
    } else if (session && session.classLocation && session.classLocation.latitude != null && session.classLocation.longitude != null) {
      classLat = Number(session.classLocation.latitude);
      classLng = Number(session.classLocation.longitude);
    } else if (session && session.class_location && session.class_location.latitude != null && session.class_location.longitude != null) {
      classLat = Number(session.class_location.latitude);
      classLng = Number(session.class_location.longitude);
    } else if (selectedStudent.classLocation && selectedStudent.classLocation.latitude != null && selectedStudent.classLocation.longitude != null) {
      classLat = Number(selectedStudent.classLocation.latitude);
      classLng = Number(selectedStudent.classLocation.longitude);
    } else if (selectedStudent.class_location && selectedStudent.class_location.latitude != null && selectedStudent.class_location.longitude != null) {
      classLat = Number(selectedStudent.class_location.latitude);
      classLng = Number(selectedStudent.class_location.longitude);
    }
    if (checkLat != null && checkLng != null && classLat != null && classLng != null) {
      const distance = haversineDistance(checkLat, checkLng, classLat, classLng);
      // Use same threshold as fraud detection (0.1 km)
      const isWithinRange = distance <= 0.1;
      return {
        distance,
        isWithinRange,
        studentLat: checkLat,
        studentLon: checkLng,
        classLat,
        classLon: classLng
      };
    }
    return null;
  }
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [actionSnack, setActionSnack] = useState({ open: false, message: "", severity: "success" });
  const user = useMemo(() => {
    const cached = sessionStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  }, []);

  // No search, just use students directly
  const filteredStudents = students;


  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
    setActiveTab(0); // Reset to first tab
    fetchAttendanceHistory(student); // Fetch history when opening details
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedStudent(null);
    setAttendanceHistory([]);
  };

  // Fetch attendance history for selected student
  const fetchAttendanceHistory = async (student) => {
    if (!student?.enrollmentId) {
      setAttendanceHistory([]);
      return;
    }

    setIsLoadingHistory(true);
    try {
      // Determine the correct enrollment field based on session type
      const isLecture = session?.type === "Lecture";
      const attendanceField = isLecture ? "lecture_enrollment_id" : "tutorial_enrollment_id";
      const startDate = session?.startDate || session?.lecture_start_date || session?.tutorial_start_date;
      const endDate = session?.endDate || session?.lecture_end_date || session?.tutorial_end_date;
    
      // Get all sessions for this class
      let sessionsQuery = supabase
        .from("attendance_session")
        .select("id, created_at, date")
        .eq(isLecture ? 'course_lecture_id' : 'course_tutorial_id', session.id);
        
      if (startDate) {
        sessionsQuery = sessionsQuery.gte('created_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        sessionsQuery = sessionsQuery.lte('created_at', new Date(endDate).toISOString());
      }

      sessionsQuery = sessionsQuery.order('created_at', { ascending: false }).limit(20);

      const { data: sessions, error: sessionsError } = await sessionsQuery;

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setAttendanceHistory([]);
        setIsLoadingHistory(false);
        return;
      }

      // Get attendance records for this student
      const sessionIds = sessions.map(s => s.id);
      const { data: records, error: recordsError } = await supabase
        .from("attendance_record")
        .select("*")
        .eq(attendanceField, student.enrollmentId)
        .in('session_id', sessionIds);

      if (recordsError) throw recordsError;

      // Get leave/absence requests
      const { data: leaveRequests, error: leaveError } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", student.student_id)
        .eq("status", "approved");

      if (leaveError) 
      // Format date
      const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      };

      // Check if excused
      const isExcused = (sessionDate) => {
        if (!leaveRequests || leaveRequests.length === 0) return false;
        const date = new Date(sessionDate);
        return leaveRequests.some(leave => {
          const startDate = new Date(leave.start_date);
          const endDate = new Date(leave.end_date);
          return date >= startDate && date <= endDate;
        });
      };

      // Create history for all sessions
      const formattedHistory = sessions.map(session => {
        const sessionDate = session.date || session.created_at;
        const attendanceRecord = records?.find(r => r.session_id === session.id);
        
        if (attendanceRecord) {
          return {
            date: formatDate(sessionDate),
            status: attendanceRecord.status,
            checkInTime: attendanceRecord.created_at,
            sessionId: session.id,
            flagReason: attendanceRecord.flag_reason
          };
        }
        
        if (isExcused(sessionDate)) {
          return {
            date: formatDate(sessionDate),
            status: "excused",
            checkInTime: null,
            sessionId: session.id,
            flagReason: null
          };
        }
        
        return {
          date: formatDate(sessionDate),
          status: "absent",
          checkInTime: null,
          sessionId: session.id,
          flagReason: null
        };
      });

      setAttendanceHistory(formattedHistory);
    } catch (error) {
      setAttendanceHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleEmailStudent = async () => {
    if (!selectedStudent) return;
    const student = {
      email: selectedStudent.email || selectedStudent.student_email,
      name: selectedStudent.name,
      id: selectedStudent.student_id || selectedStudent.id,
      matric_number: selectedStudent.matric_number || selectedStudent.studentId
    };
    if (!student.email) {
      setActionSnack({ open: true, message: "No student email available.", severity: "warning" });
      return;
    }
    const courseLabel = session?.code || session?.course_code || "Course";
    const studentName = student.name || student.matric_number || "Student";
    const flagReason = selectedStudent.flag_reason || selectedStudent.flagReason || "Attendance flagged";
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; color:#0f172a;">
        <p>Dear ${studentName},</p>
        <p>Your attendance for <strong>${courseLabel}</strong> has been flagged.</p>
        <p><strong>Reason:</strong> ${flagReason}</p>
        <p>Please contact your lecturer to clarify this matter.</p>
        <br/>
        <p>Regards,<br/>Attendance Management System</p>
      </div>
    `;
    try {
      const { error } = await supabase.functions.invoke('send-absence-email', {
        body: {
          emails: [{
            to: student.email,
            subject: `Attendance Alert - ${courseLabel}`,
            html: bodyHtml,
            studentId: student.id,
            studentName,
          }],
          lecturerId: user?.id || null,
        },
      });
      if (error) {
        setActionSnack({ open: true, message: 'Email failed to send.', severity: 'error' });
      } else {
        setActionSnack({ open: true, message: 'Email sent to student.', severity: 'success' });
      }
    } catch (e) {
      setActionSnack({ open: true, message: 'Email failed to send.', severity: 'error' });
    }
  };

  const handleMarkFraud = async () => {
    if (!selectedStudent) return;
    const attendanceId = selectedStudent.attendance_id || selectedStudent.id || (selectedStudent.attendance_record && selectedStudent.attendance_record.id);
    if (!attendanceId) {
      setActionSnack({ open: true, message: 'Attendance record ID not found.', severity: 'error' });
      return;
    }
    const { error } = await supabase
      .from('attendance_record')
      .update({ status: 'fraud' })
      .eq('id', attendanceId);
    if (error) {
      setActionSnack({ open: true, message: 'Failed to update: ' + error.message, severity: 'error' });
      return;
    }
    setActionSnack({ open: true, message: 'Attendance marked as fraud.', severity: 'success' });
    if (onRefresh) await onRefresh();
    handleCloseDetails();
  };

  const handleMarkPresent = async () => {
    if (!selectedStudent) return;
    
    // Get student ID - try all possible fields
    const studentId = selectedStudent.student_id || selectedStudent.userId || selectedStudent.user_id || selectedStudent.id;
    const sessionId = sessionInfo?.sessionId;
    
    
    // First, check what fraud alerts exist for this student
    const { data: existingAlerts, error: checkError } = await supabase
      .from('fraud_detection_alerts')
      .select('*')
      .eq('user_id', studentId);
    
    // Also check by session
    const { data: sessionAlerts, error: sessionError } = await supabase
      .from('fraud_detection_alerts')
      .select('*')
      .eq('session_id', sessionId);
    
    // Check if both conditions match
    const { data: bothMatch, error: bothError } = await supabase
      .from('fraud_detection_alerts')
      .select('*')
      .eq('user_id', studentId)
      .eq('session_id', sessionId);
    
    // If parent handleMarkPresent is provided, use it (for consistent logic with absent tab)
    if (typeof parentHandleMarkPresent === 'function') {
      await parentHandleMarkPresent(selectedStudent.matric_number || selectedStudent.studentId || selectedStudent.id);
      
      // Update fraud alert status to 'resolved' instead of deleting (for fraud analysis)
      if (bothMatch && bothMatch.length > 0) {
        const alertIds = bothMatch.map(alert => alert.id);
        const { data, error } = await supabase
          .from('fraud_detection_alerts')
          .update({ status: 'resolved' })
          .in('id', alertIds)
          .select();
        if (data && data.length > 0) {
        } else {
        }
      } else {
      }
      
      if (onRefresh) await onRefresh();
      handleCloseDetails();
      return;
    }
    // Fallback: direct update (legacy)
    const attendanceId = selectedStudent.attendance_id || selectedStudent.id || (selectedStudent.attendance_record && selectedStudent.attendance_record.id);
    if (!attendanceId) {
      alert('Attendance record ID not found.');
      return;
    }
    const { error } = await supabase
      .from('attendance_record')
      .update({ status: 'present', marked_manually: true })
      .eq('id', attendanceId);
    if (error) {
      alert('Failed to update attendance: ' + error.message);
      return;
    }
    
    // Update fraud alert status to 'resolved' instead of deleting (for fraud analysis)
    if (bothMatch && bothMatch.length > 0) {
      const alertIds = bothMatch.map(alert => alert.id);
      const { data, error: updateError } = await supabase
        .from('fraud_detection_alerts')
        .update({ status: 'resolved' })
        .in('id', alertIds)
        .select();
      if (data && data.length > 0) {
      } else {
      }
    } else {
    }
    
    selectedStudent.status = 'present';
    selectedStudent.marked_manually = true;
    if (onRefresh) onRefresh();
    handleCloseDetails();
  };

  return (
    <div style={{ padding: 24 }}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Student</strong></TableCell>
              <TableCell><strong>Flag Reason</strong></TableCell>
              <TableCell><strong>Check-in Time</strong></TableCell>
              <TableCell><strong>Latitude</strong></TableCell>
              <TableCell><strong>Longitude</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No flagged attendance found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => {
                // Consistent check-in time: always show as raw string, remove timezone info
                let checkInTime = student.checkInTime || student.check_in_time || '';
                if (typeof checkInTime === 'string') {
                  if (checkInTime.includes('T')) {
                    // e.g. 2025-12-20T08:30:00.000Z or 2025-12-20T08:30:00+00:00
                    let timePart = checkInTime.split('T')[1] || '';
                    timePart = timePart.split('.')[0] || timePart;
                    timePart = timePart.replace('+00:00', '').replace('Z', '');
                    checkInTime = timePart;
                  } else {
                    checkInTime = checkInTime.replace('+00:00', '').replace('Z', '');
                  }
                }
                // Robust flag reason
                const flagReason = student.flag_reason || student.flagReason || '-';
                // Robust lat/lng (try all possible sources, fallback to string/number conversion)
                let lat = 'N/A', lng = 'N/A';
                if (student.attendance_record && student.attendance_record.latitude != null && student.attendance_record.longitude != null) {
                  lat = Number(student.attendance_record.latitude).toFixed(4);
                  lng = Number(student.attendance_record.longitude).toFixed(4);
                } else if (student.checkInLocation && student.checkInLocation.lat != null && student.checkInLocation.lng != null) {
                  lat = Number(student.checkInLocation.lat).toFixed(4);
                  lng = Number(student.checkInLocation.lng).toFixed(4);
                } else if (student.latitude != null && student.longitude != null) {
                  lat = Number(student.latitude).toFixed(4);
                  lng = Number(student.longitude).toFixed(4);
                } else if (student.lat != null && student.lng != null) {
                  lat = Number(student.lat).toFixed(4);
                  lng = Number(student.lng).toFixed(4);
                }
                // Status chip: always orange and 'Flagged'
                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Typography variant="body1">{student.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.studentId || student.matric_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {flagReason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {checkInTime}
                    </TableCell>
                    <TableCell>
                      {lat}
                    </TableCell>
                    <TableCell>
                      {lng}
                    </TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" style={{ borderRadius: 16, textTransform: 'capitalize', color: '#ff9800', borderColor: '#ff9800', background: 'rgba(255,152,0,0.08)' }}>
                        Flagged
                      </Button>
                    </TableCell>
                    <TableCell align="right">
                      <ViewDetailsButton onClick={() => handleViewDetails(student)} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Dialog for flagged student */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        {selectedStudent && (
          <>
            <DialogTitle sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', background: '#f9fafb' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                  <FlagIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight="bold">Flagged Student Details</Typography>
                </Box>
                <IconButton onClick={handleCloseDetails} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ px: 3, py: 2 }}>
              {/* Wrap all DialogContent children in a single parent <Box> to ensure only one root */}
              <Box>
                {/* Header Info */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box minWidth={0}>
                    <Typography variant="h6" fontWeight="bold" noWrap>{selectedStudent.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Student ID: {selectedStudent.matric_number || selectedStudent.studentId}
                    </Typography>
                    <Box mt={1}>
                      <Button size="small" variant="outlined" color="warning" startIcon={<FlagIcon />}>Flagged</Button>
                    </Box>
                  </Box>
                  <Box textAlign="right" minWidth="180px">
                    <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                      <AccessTime color="action" fontSize="small" />
                      <Typography variant="body2">
                        {(() => {
                          let t = selectedStudent.checkInTime || selectedStudent.check_in_time || '';
                          if (typeof t === 'string' && t) {
                            if (t.includes('T')) {
                              const d = new Date(t);
                              if (!isNaN(d)) {
                                return d.toLocaleString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit', 
                                  second: '2-digit', 
                                  hour12: true, 
                                  timeZone: 'UTC' 
                                }) + ' UTC';
                              }
                            } else {
                              return t.replace('+00:00', '').replace('Z', '');
                            }
                          }
                          return t || '-';
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                {/* Tabs for Details/History */}
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                  <Tab label="Attendance Details" />
                  <Tab label="Attendance History" />
                </Tabs>
                
                {/* Tab 0: Attendance Details */}
                {activeTab === 0 && (
                  <>
                    {/* Flag Reason */}
                    <Box display="flex" alignItems="flex-start" gap={1} mb={2}>
                      <Report color="error" fontSize="small" sx={{ mt: 0.5 }} />
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        <b>Flag Reason:</b> {selectedStudent.flag_reason || selectedStudent.flagReason}
                      </Typography>
                    </Box>
                {/* Location Analysis Section */}
                <Box mb={3}>
                  <Box sx={{ background: '#f0f7fa', borderRadius: 2, p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      <b>Location Analysis</b>
                    </Typography>
                    {(() => {
                      const locationInfo = getLocationAnalysis(selectedStudent, sessionInfo, session);
                      if (locationInfo) {
                        return (
                          <>
                            <Box mb={2}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <LocationOn color={locationInfo.isWithinRange ? 'success' : 'warning'} fontSize="small" />
                                <Typography variant="body2">
                                  Distance from class location: <b>{locationInfo.distance.toFixed(2)} km</b>
                                  {locationInfo.isWithinRange
                                    ? " (Within acceptable range)"
                                    : " (Outside typical range)"}
                                </Typography>
                              </Box>
                            </Box>
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Student Location</Typography>
                                <Typography variant="body2">Lat: {locationInfo.studentLat.toFixed(6)}</Typography>
                                <Typography variant="body2">Lon: {locationInfo.studentLon.toFixed(6)}</Typography>
                              </Box>
                              <Box>
                                <Typography variant="body2" color="text.secondary">Class Location</Typography>
                                <Typography variant="body2">Lat: {locationInfo.classLat.toFixed(6)}</Typography>
                                <Typography variant="body2">Lon: {locationInfo.classLon.toFixed(6)}</Typography>
                              </Box>
                            </Box>
                          </>
                        );
                      } else {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            Location data not available for this attendance record.
                          </Typography>
                        );
                      }
                    })()}
                  </Box>
                </Box>
                {/* Time Analysis Section */}
                <Box mb={2}>
                  <Box sx={{ background: '#fff7e6', borderRadius: 2, p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      <b>Time Analysis (Fraud Detection)</b>
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <AccessTime fontSize="small" color="primary" />
                      <Typography variant="body2">
                        <b>Session Start:</b> {(() => {
                          const raw = sessionInfo && sessionInfo.start_time;
                          if (!raw) return '-';
                          const d = new Date(raw);
                          return isNaN(d) ? '-' : d.toLocaleTimeString();
                        })()}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <AccessTime fontSize="small" color="action" />
                      <Typography variant="body2"><b>Check-in Time:</b> {(() => {
                        let t = selectedStudent.checkInTime || selectedStudent.check_in_time || '';
                        if (typeof t === 'string' && t) {
                          // If ISO string, format to show only time in UTC
                          if (t.includes('T')) {
                            const d = new Date(t);
                            if (!isNaN(d)) {
                              return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' });
                            }
                          } else {
                            // If just time string, show as is
                            return t.replace('+00:00', '').replace('Z', '');
                          }
                        }
                        return t || '-';
                      })()}</Typography>
                    </Box>
                    {/* Difference in minutes */}
                    <Box display="flex" alignItems="center" gap={1}>
                      <Report color="error" fontSize="small" />
                      <Typography variant="body2">
                        <b>Difference:</b> {(() => {
                          let sessionRaw = sessionInfo && sessionInfo.start_time;
                          let checkInRaw = selectedStudent?.checkInTime || selectedStudent?.check_in_time;
                          if (!sessionRaw || !checkInRaw) return '-';
                          
                          // FIX: Replace +00:00 with +08:00 in check-in time (it's stored in UTC but should be Malaysia time)
                          if (typeof checkInRaw === 'string' && checkInRaw.includes('+00:00')) {
                            checkInRaw = checkInRaw.replace('+00:00', '+08:00');
                          }
                          
                          let sessionStart, checkIn;
                          try {
                            // Parse sessionStart robustly: if ISO, use as is; if just time, use same day as checkInRaw
                            if (typeof sessionRaw === 'string' && sessionRaw.includes('T')) {
                              sessionStart = new Date(sessionRaw);
                            } else if (typeof sessionRaw === 'string') {
                              // If just time string, use date from checkInRaw or today
                              let dateStr = null;
                              if (typeof checkInRaw === 'string' && checkInRaw.includes('T')) {
                                dateStr = checkInRaw.split('T')[0];
                              } else {
                                // fallback to today
                                const today = new Date();
                                dateStr = today.toISOString().split('T')[0];
                              }
                              sessionStart = new Date(`${dateStr}T${sessionRaw}+08:00`);
                            } else {
                              sessionStart = new Date(sessionRaw);
                            }
                            if (typeof checkInRaw === 'string' && checkInRaw.includes('T')) {
                              checkIn = new Date(checkInRaw);
                            } else if (typeof checkInRaw === 'string') {
                              // If just time string, parse as UTC+8 (KL) on same day as sessionStart
                              const sessionDate = sessionStart.toISOString().split('T')[0];
                              checkIn = new Date(`${sessionDate}T${checkInRaw}+08:00`);
                            } else {
                              checkIn = new Date(checkInRaw);
                            }
                            if (isNaN(sessionStart) || isNaN(checkIn)) return '-';
                            // Calculate difference in minutes
                            const diffMs = checkIn.getTime() - sessionStart.getTime();
                            const diffMin = Math.round(diffMs / 60000);
                            return `${diffMin} min${Math.abs(diffMin) !== 1 ? 's' : ''}`;
                          } catch (e) {
                            return '-';
                          }
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                  </>
                )}
                
                {/* Tab 1: Attendance History */}
                {activeTab === 1 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>Attendance History</Typography>
                    {isLoadingHistory ? (
                      <Box textAlign="center" py={4}>
                        <Typography variant="body2" color="text.secondary">
                          Loading attendance history...
                        </Typography>
                      </Box>
                    ) : attendanceHistory.length === 0 ? (
                      <Box textAlign="center" py={4}>
                        <Typography variant="body2" color="text.secondary">
                          No attendance history found.
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><b>Date</b></TableCell>
                              <TableCell><b>Status</b></TableCell>
                              <TableCell><b>Check-in Time</b></TableCell>
                              <TableCell><b>Notes</b></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {attendanceHistory.map((record, index) => {
                              const statusColor = 
                                record.status === 'present' ? 'success' :
                                record.status === 'flagged' ? 'warning' :
                                record.status === 'excused' ? 'info' : 'error';
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell>{record.date}</TableCell>
                                  <TableCell>
                                    <Button 
                                      size="small" 
                                      variant="outlined" 
                                      color={statusColor}
                                      sx={{ textTransform: 'capitalize', minWidth: 80 }}
                                    >
                                      {record.status}
                                    </Button>
                                  </TableCell>
                                  <TableCell>
                                    {record.checkInTime ? (() => {
                                      const timestamp = record.checkInTime;
                                      if (typeof timestamp === 'string' && timestamp.includes('T')) {
                                        const timePart = timestamp.split('T')[1];
                                        return timePart.split('.')[0].replace('Z', '').replace('+00:00', '');
                                      }
                                      return timestamp;
                                    })() : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {record.flagReason || '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Box display="flex" gap={1}>
                <Button variant="outlined" onClick={handleEmailStudent}>Email Student</Button>
              </Box>
              <Box display="flex" gap={1}>
                <Button onClick={handleMarkFraud} variant="outlined" color="warning">Mark Fraud</Button>
                <Button onClick={handleMarkPresent} variant="contained" color="success">Mark as Present</Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar for action feedback */}
      <Snackbar
        open={actionSnack.open}
        autoHideDuration={4000}
        onClose={() => setActionSnack({ ...actionSnack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setActionSnack({ ...actionSnack, open: false })}
          severity={actionSnack.severity}
          sx={{ width: '100%' }}
        >
          {actionSnack.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
