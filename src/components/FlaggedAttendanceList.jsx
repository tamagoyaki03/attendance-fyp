import { Search, AccessTime, LocationOn, Report, Flag as FlagIcon, Close as CloseIcon } from "@mui/icons-material"
import React, { useState } from "react"
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
      const isWithinRange = distance <= 0.5;
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

  // No search, just use students directly
  const filteredStudents = students;


  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedStudent(null);
  };

  const handleMarkPresent = async () => {
    if (!selectedStudent) return;
    // If parent handleMarkPresent is provided, use it (for consistent logic with absent tab)
    if (typeof parentHandleMarkPresent === 'function') {
      await parentHandleMarkPresent(selectedStudent.matric_number || selectedStudent.studentId || selectedStudent.id);
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
                      {flagReason}
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
                          if (typeof t === 'string') {
                            if (t.includes('T')) {/* Lines 290-293 omitted */} else {/* Lines 294-295 omitted */}
                          }
                          return t || '-';
                        })()}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mt={1} justifyContent="flex-end">
                      <LocationOn color="primary" fontSize="small" />
                      <Typography variant="body2">
                        {(() => {
                          if (selectedStudent.attendance_record && selectedStudent.attendance_record.latitude != null) {
                            return `${Number(selectedStudent.attendance_record.latitude).toFixed(4)}, ${Number(selectedStudent.attendance_record.longitude).toFixed(4)}`;
                          } else if (selectedStudent.checkInLocation && selectedStudent.checkInLocation.lat != null) {/* Lines 308-309 omitted */} else
                          return 'N/A';
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                {/* Tabs for Details/History (future extensibility) */}
                <Tabs value={0} sx={{ mb: 2 }}>
                  <Tab label="Attendance Details" />
                </Tabs>
                {/* Flag Reason */}
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Report color="error" fontSize="small" />
                  <Typography variant="body1"><b>Flag Reason:</b> {selectedStudent.flag_reason || selectedStudent.flagReason}</Typography>
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
                          const sessionRaw = sessionInfo && sessionInfo.start_time;
                          let checkInRaw = selectedStudent?.checkInTime || selectedStudent?.check_in_time;
                          if (!sessionRaw || !checkInRaw) return '-';
                          let sessionStart, checkIn;
                          try {
                            // Parse sessionStart robustly: if ISO, use as is; if just time, use date from checkInRaw or today
                            if (typeof sessionRaw === 'string' && sessionRaw.includes('T')) {
                              sessionStart = new Date(sessionRaw);
                            } else if (typeof sessionRaw === 'string') {
                              let dateStr = null;
                              if (typeof checkInRaw === 'string' && checkInRaw.includes('T')) {
                                dateStr = checkInRaw.split('T')[0];
                              } else {
                                const today = new Date();
                                dateStr = today.toISOString().split('T')[0];
                              }
                              sessionStart = new Date(`${dateStr}T${sessionRaw}+08:00`);
                            } else {
                              sessionStart = new Date(sessionRaw);
                            }
                            let usedNextDay = false;
                            if (typeof checkInRaw === 'string' && checkInRaw.includes('T')) {
                              checkIn = new Date(checkInRaw);
                            } else if (typeof checkInRaw === 'string') {
                              const sessionDate = sessionStart.toISOString().split('T')[0];
                              checkIn = new Date(`${sessionDate}T${checkInRaw}+08:00`);
                              // If check-in time is less than session start time, assume next day
                              if (checkIn < sessionStart) {
                                checkIn = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
                                usedNextDay = true;
                              }
                            } else {
                              checkIn = new Date(checkInRaw);
                            }
                            // Debug: log parsed times
                            // eslint-disable-next-line no-console
                            console.log('FlaggedAttendanceList: sessionStart', sessionStart, 'checkIn', checkIn, 'usedNextDay', usedNextDay);
                            if (isNaN(sessionStart) || isNaN(checkIn)) return '-';
                            const diffMs = checkIn.getTime() - sessionStart.getTime();
                            const diffMin = Math.round(diffMs / 60000);
                            return `${diffMin} min${Math.abs(diffMin) !== 1 ? 's' : ''}`;
                          } catch (e) {
                            // eslint-disable-next-line no-console
                            console.error('FlaggedAttendanceList: error calculating time difference', e, { sessionRaw, checkInRaw });
                            return '-';
                          }
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end' }}>
              <Button onClick={handleCloseDetails} variant="outlined">Close</Button>
              <Button onClick={handleMarkPresent} variant="contained" color="success">Mark as Present</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}
