import React, { useState, useEffect, useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Button,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import ReportIcon from "@mui/icons-material/Report";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import Chip from "@mui/material/Chip";
import supabase from "../config/supabaseClient";

export default function FraudTable({ searchTerm = "" }) {
  const [alerts, setAlerts] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [courseCodeMap, setCourseCodeMap] = useState({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [sessionInfoMap, setSessionInfoMap] = useState({});
  const [actionSnack, setActionSnack] = useState({ open: false, message: "", severity: "success" });
  const user = useMemo(() => {
    const cached = sessionStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  }, []);

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedAlert(null);
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch from fraud_detection_alerts table, join attendance_record
      const { data: alerts, error: alertsError } = await supabase
        .from("fraud_detection_alerts")
        .select("*, attendance_record(*)")
        .order("created_at", { ascending: false });

      if (alertsError) {
        console.error("Error fetching fraud detection alerts:", alertsError.message);
        return;
      }

      setAlerts(alerts || []);

      const userIds = [...new Set((alerts || []).map((a) => a.user_id))];

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, name, matric_number, email")
          .in("id", userIds);

        if (!usersError && users) {
          const map = {};
          users.forEach((u) => (map[u.id] = u));
          setUsersMap(map);
        }
      }

      // Fetch course_code for alerts with session_id if course_code is missing
      let sessionIds = [...new Set((alerts || []).filter(a => !a.course_code && a.session_id).map(a => a.session_id))];
      // Filter out invalid IDs
      sessionIds = sessionIds.filter(id => typeof id === 'string' && id.trim().length > 0);
      console.log('FraudTable: sessionIds for attendance_session query:', sessionIds);
      if (sessionIds.length > 0) {
        // Get sessions
        let sessions, sessionsError;
        if (sessionIds.length === 1) {
          ({ data: sessions, error: sessionsError } = await supabase
            .from('attendance_session')
            .select('id, course_lecture_id, course_tutorial_id, start_time')
            .eq('id', sessionIds[0])
          );
        } else {
          ({ data: sessions, error: sessionsError } = await supabase
            .from('attendance_session')
            .select('id, course_lecture_id, course_tutorial_id, start_time')
            .in('id', sessionIds)
          );
        }
        if (sessionsError) {
          console.error('Supabase attendance_session query error:', sessionsError, 'sessionIds:', sessionIds);
        }
        if (!sessionsError && sessions) {
          // Map session_id to course_lecture_id or course_tutorial_id
          const lectureIds = sessions.map(s => s.course_lecture_id).filter(Boolean);
          const tutorialIds = sessions.map(s => s.course_tutorial_id).filter(Boolean);
          // Get course_code and lat/lng from course_lecture
          let lectureMap = {};
          if (lectureIds.length > 0) {
            const { data: lectures } = await supabase
              .from('course_lecture')
              .select('id, course_code, latitude, longitude')
              .in('id', lectureIds);
            if (lectures) {
              lectures.forEach(l => { lectureMap[l.id] = { course_code: l.course_code, latitude: l.latitude, longitude: l.longitude }; });
            }
          }
          // Get course_code and lat/lng from course_tutorial
          let tutorialMap = {};
          if (tutorialIds.length > 0) {
            const { data: tutorials } = await supabase
              .from('course_tutorial')
              .select('id, course_code, latitude, longitude')
              .in('id', tutorialIds);
            if (tutorials) {
              tutorials.forEach(t => { tutorialMap[t.id] = { course_code: t.course_code, latitude: t.latitude, longitude: t.longitude }; });   
            }
          }
          // Map session_id to course_code and class location
          const sessionToCourseCode = {};
          const sessionInfoMap = {};
          sessions.forEach(s => {
            let class_latitude = null, class_longitude = null, course_code = null;
            if (s.course_lecture_id && lectureMap[s.course_lecture_id]) {
              course_code = lectureMap[s.course_lecture_id].course_code;
              class_latitude = lectureMap[s.course_lecture_id].latitude;
              class_longitude = lectureMap[s.course_lecture_id].longitude;
            } else if (s.course_tutorial_id && tutorialMap[s.course_tutorial_id]) {
              course_code = tutorialMap[s.course_tutorial_id].course_code;
              class_latitude = tutorialMap[s.course_tutorial_id].latitude;
              class_longitude = tutorialMap[s.course_tutorial_id].longitude;
            }
            // Always store start_time, even if no lat/lng
            sessionToCourseCode[s.id] = course_code;
            sessionInfoMap[s.id] = {
              ...s,
              class_latitude,
              class_longitude,
              start_time: s.start_time
            };
          });
          setCourseCodeMap(sessionToCourseCode);
          setSessionInfoMap(sessionInfoMap);
        }
      }
    };

    fetchData();
  }, []);

  const term = (searchTerm || "").toLowerCase();
  const filteredData = alerts.filter((row) =>
    term
      ? (row.alert_type ?? "").toLowerCase().includes(term) ||
        (row.description ?? "").toLowerCase().includes(term) ||
        (row.course_code ?? "").toLowerCase().includes(term)
      : true
  );

  const handleUpdateAttendance = async (newStatus) => {
    if (!selectedAlert?.attendance_record?.id) {
      setActionSnack({ open: true, message: "No attendance record linked to this alert.", severity: "warning" });
      return;
    }
    const recordId = selectedAlert.attendance_record.id;
    const { error } = await supabase
      .from("attendance_record")
      .update({ status: newStatus })
      .eq("id", recordId);
    if (error) {
      console.error("Update attendance error", error);
      setActionSnack({ open: true, message: "Failed to update attendance.", severity: "error" });
      return;
    }
    setAlerts((prev) => prev.map((a) => a.id === selectedAlert.id ? { ...a, attendance_record: { ...a.attendance_record, status: newStatus } } : a));
    setSelectedAlert((prev) => prev ? { ...prev, attendance_record: { ...prev.attendance_record, status: newStatus } } : prev);
    setActionSnack({ open: true, message: `Attendance updated to ${newStatus}.`, severity: "success" });
  };

  const handleEmailStudent = async () => {
    if (!selectedAlert) return;
    const student = usersMap[selectedAlert.user_id];
    if (!student?.email) {
      setActionSnack({ open: true, message: "No student email available.", severity: "warning" });
      return;
    }
    const courseLabel = selectedAlert.course_code || (selectedAlert.session_id && courseCodeMap[selectedAlert.session_id]) || "Course";
    const studentName = student.name || student.matric_number || "Student";
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; color:#0f172a;">
        <p>Dear ${studentName},</p>
        <p>Your attendance for <strong>${courseLabel}</strong> has been flagged for potential fraud.</p>
        <p><strong>Alert:</strong> ${selectedAlert.alert_type || "Attendance check"}</p>
        <p><strong>Details:</strong> ${selectedAlert.description || "No description"}</p>
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
        console.error('Email function error:', error);
        setActionSnack({ open: true, message: 'Email failed to send.', severity: 'error' });
      } else {
        setActionSnack({ open: true, message: 'Email sent to student.', severity: 'success' });
      }
    } catch (e) {
      console.error('Invoke email function failed:', e);
      setActionSnack({ open: true, message: 'Email failed to send.', severity: 'error' });
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "open":
        return <Chip label="Open" color="error" variant="outlined" size="small" />;
      case "reviewed":
        return <Chip label="Reviewed" variant="outlined" sx={{ borderColor: "#f59e0b", color: "#b45309" }} size="small" />;
      case "resolved":
        return <Chip label="Resolved" color="success" variant="outlined" size="small" />;
      default:
        return <Chip label={status || "Unknown"} size="small" />;
    }
  };

  // Remove getSeverityBadge and its accidental code fragment

  // Main render
  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          background: "#ffffff",
          border: "1px solid #e6edf3",
          boxShadow: "none",
          borderRadius: 1,
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Course Code</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                  No fraud alerts found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Typography fontWeight={500}>
                      {usersMap[alert.user_id]?.name || "Unknown"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {usersMap[alert.user_id]?.matric_number || alert.user_id}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography>
                      {alert.course_code
                        ? alert.course_code
                        : (alert.session_id && courseCodeMap[alert.session_id])
                          ? courseCodeMap[alert.session_id]
                          : "-"}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box>
                      <Typography>
                        {(() => {
                          if (!alert.created_at) return "-";
                          const d = new Date(alert.created_at);
                          if (isNaN(d)) return alert.created_at;
                          return d.toLocaleString();
                        })()}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" noWrap>
                      {alert.description}
                    </Typography>
                  </TableCell>

                  <TableCell>{getStatusBadge(alert.status)}</TableCell>

                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end" gap={1}>
                      <Button size="small" variant="outlined" onClick={() => handleViewDetails(alert)}>
                        View Details
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Details Dialog for fraud alert */}
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        {selectedAlert && (
          <>
            <DialogTitle sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', background: '#f9fafb' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                  <ReportIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight="bold">Fraud Alert Details</Typography>
                </Box>
                <IconButton onClick={handleCloseDetails} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ px: 3, py: 2 }}>
              <Box>
                {/* Student Info */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box minWidth={0}>
                    <Typography variant="h6" fontWeight="bold" noWrap>{usersMap[selectedAlert.user_id]?.name || "Unknown"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Student ID: {usersMap[selectedAlert.user_id]?.matric_number || selectedAlert.user_id}
                    </Typography>
                    <Box mt={1}>
                      {getStatusBadge(selectedAlert.status)}
                    </Box>
                  </Box>
                  <Box textAlign="right" minWidth="180px">
                    <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                      <AccessTimeIcon color="action" fontSize="small" />
                      <Typography variant="body2">
                        {(() => {
                          if (!selectedAlert.created_at) return "-";
                          const d = new Date(selectedAlert.created_at);
                          if (isNaN(d)) return selectedAlert.created_at;
                          return d.toLocaleString();
                        })()}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mt={1} justifyContent="flex-end">
                      <Typography variant="body2">
                        <b>Course:</b> {selectedAlert.course_code
                          ? selectedAlert.course_code
                          : (selectedAlert.session_id && courseCodeMap[selectedAlert.session_id])
                            ? courseCodeMap[selectedAlert.session_id]
                            : "-"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                {/* Alert Details */}
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <ReportIcon color="error" fontSize="small" />
                  <Typography variant="body1"><b>Alert Type:</b> {selectedAlert.alert_type || '-'}</Typography>
                </Box>
                <Box mb={2}>
                  <Typography variant="body2"><b>Description:</b> {selectedAlert.description || '-'}</Typography>
                </Box>
                {/* Location Analysis Section */}
                <Box mb={3}>
                  <Box sx={{ background: '#f0f7fa', borderRadius: 2, p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      <b>Location Analysis</b>
                    </Typography>
                        {(() => {
                          const session = selectedAlert.session_id && sessionInfoMap[selectedAlert.session_id];
                          let classLat = session && session.class_latitude;
                          let classLng = session && session.class_longitude;
                          let checkLat = null, checkLng = null;
                          if (selectedAlert.attendance_record && selectedAlert.attendance_record.latitude != null && selectedAlert.attendance_record.longitude != null) {
                            checkLat = Number(selectedAlert.attendance_record.latitude);
                            checkLng = Number(selectedAlert.attendance_record.longitude);
                          } else if (selectedAlert.latitude != null && selectedAlert.longitude != null) {
                            checkLat = Number(selectedAlert.latitude);
                            checkLng = Number(selectedAlert.longitude);
                          } else if (selectedAlert.lat != null && selectedAlert.lng != null) {
                            checkLat = Number(selectedAlert.lat);
                            checkLng = Number(selectedAlert.lng);
                          }
                          classLat = (classLat === '' || classLat === undefined || classLat === null) ? null : Number(classLat);
                          classLng = (classLng === '' || classLng === undefined || classLng === null) ? null : Number(classLng);
                          checkLat = (checkLat === '' || checkLat === undefined || checkLat === null) ? null : Number(checkLat);
                          checkLng = (checkLng === '' || checkLng === undefined || checkLng === null) ? null : Number(checkLng);
                          if ([classLat, classLng, checkLat, checkLng].some(v => v == null || isNaN(v))) {
                            return <Typography variant="body2" color="text.secondary">Location data not available for this attendance record.</Typography>;
                          }
                          const distance = haversineDistance(checkLat, checkLng, classLat, classLng);
                          const isWithinRange = distance <= 0.5;
                          // Use LocationOn for class, MyLocation for check-in
                          return <>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              {/* Class Location icon */}
                              <span style={{ display: 'flex', alignItems: 'center' }}><svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" style={{ color: '#1976d2' }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span>
                              <Typography variant="body2">
                                <b>Class Location:</b> {`${classLat.toFixed(4)}, ${classLng.toFixed(4)}`}
                              </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              {/* Check-in Location icon */}
                              <span style={{ display: 'flex', alignItems: 'center' }}><svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20" style={{ color: '#43a047' }}><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg></span>
                              <Typography variant="body2">
                                <b>Check-in Location:</b> {`${checkLat.toFixed(4)}, ${checkLng.toFixed(4)}`}
                              </Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                              <ReportIcon color="error" fontSize="small" />
                              <Typography variant="body2">
                                <b>Distance:</b> {distance.toFixed(2)} km ({isWithinRange ? 'Within' : 'Outside'} typical range)
                              </Typography>
                            </Box>
                          </>;
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
                            <AccessTimeIcon fontSize="small" color="primary" />
                            <Typography variant="body2">
                              <b>Session Start:</b> {(() => {
                                const session = selectedAlert.session_id && sessionInfoMap[selectedAlert.session_id];
                                const raw = session && session.start_time;
                                if (!raw) return '-';
                                return raw;
                              })()}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography variant="body2"><b>Check-in Time:</b> {(() => {
                              // Always use attendance_record.check_in_time for difference if present
                              let checkInRaw = (selectedAlert.attendance_record && selectedAlert.attendance_record.check_in_time) || selectedAlert.created_at;
                              if (!checkInRaw) return '-';
                              if (typeof checkInRaw === 'string' && checkInRaw) {
                                if (checkInRaw.includes('T')) {
                                  const d = new Date(checkInRaw);
                                  if (!isNaN(d)) {
                                    // Try Asia/Kuala_Lumpur, fallback to UTC
                                    try {
                                      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kuala_Lumpur' });
                                    } catch {
                                      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' });
                                    }
                                  }
                                } else {
                                  // If just time string, treat as UTC+8 (KL) and display as is
                                  return checkInRaw.replace('+00:00', '').replace('Z', '');
                                }
                              }
                              return checkInRaw || '-';
                            })()}</Typography>
                          </Box>
                          {/* Difference in minutes */}
                          <Box display="flex" alignItems="center" gap={1}>
                            <ReportIcon color="error" fontSize="small" />
                            <Typography variant="body2">
                              <b>Difference:</b> {(() => {
                                const session = selectedAlert.session_id && sessionInfoMap[selectedAlert.session_id];
                                let sessionRaw = session && session.start_time;
                                let checkInRaw = (selectedAlert.attendance_record && selectedAlert.attendance_record.check_in_time) || selectedAlert.created_at;
                                if (!sessionRaw || !checkInRaw) return '-';
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
                                  // Debug: log parsed times
                                  console.log('FraudTable: sessionStart', sessionStart, 'checkIn', checkIn);
                                  if (isNaN(sessionStart) || isNaN(checkIn)) return '-';
                                  // Calculate difference in minutes
                                  const diffMs = checkIn.getTime() - sessionStart.getTime();
                                  const diffMin = Math.round(diffMs / 60000);
                                  return `${diffMin} min${Math.abs(diffMin) !== 1 ? 's' : ''}`;
                                  } catch {
                                    console.error('FraudTable: error calculating time difference', { sessionRaw, checkInRaw });
                                  return '-';
                                }
                              })()}
                            </Typography>
                          </Box>
                  </Box>
                </Box>
                {selectedAlert.status && selectedAlert.status.toLowerCase() === 'resolved' && selectedAlert.resolved_at && (
                  <Box mb={2}>
                    <Typography variant="body2" color="success.main"><b>Resolved At:</b> {(() => {
                      const d = new Date(selectedAlert.resolved_at);
                      return isNaN(d) ? selectedAlert.resolved_at : d.toLocaleString();
                    })()}</Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Box display="flex" gap={1}>
                <Button variant="outlined" onClick={handleEmailStudent}>Email Student</Button>
              </Box>
              <Box display="flex" gap={1}>
                <Button variant="outlined" color="warning" onClick={() => handleUpdateAttendance('fraud')}>
                  Mark Fraud
                </Button>
                {selectedAlert.status && ["open", "pending"].includes(selectedAlert.status.toLowerCase()) && (
                  <Button onClick={() => handleUpdateAttendance('present')} variant="contained" color="success">Mark Present</Button>
                )}
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={actionSnack.open}
        autoHideDuration={3000}
        onClose={() => setActionSnack({ ...actionSnack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={actionSnack.severity} onClose={() => setActionSnack({ ...actionSnack, open: false })}>
          {actionSnack.message}
        </Alert>
      </Snackbar>
    </>
  );
}