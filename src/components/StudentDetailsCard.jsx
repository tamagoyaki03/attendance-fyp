import React, { useState, useEffect } from "react";
import {
  Alert, AlertTitle, Card, CardContent, CardHeader, Typography, Button, Divider, Box, Tabs, Tab, Chip, CardActions,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DownloadIcon from "@mui/icons-material/Download";
import RoomIcon from "@mui/icons-material/Room";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import QuizIcon from "@mui/icons-material/Quiz";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import TryIcon from "@mui/icons-material/Try";
import FlagIcon from "@mui/icons-material/Flag";
import supabase from "../config/supabaseClient";
import * as XLSX from 'xlsx';

export default function StudentDetailsCard({ student, open, onClose, onMarkPresent, classData }) {
  const [activeTab, setActiveTab] = useState(0);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Fetch attendance history when component opens
  useEffect(() => {
    const fetchAttendanceHistory = async () => {
      if (!student?.enrollmentId || !open) {
        setAttendanceHistory([]);
        return;
      }

      setIsLoadingHistory(true);
      try {
        // Determine the correct enrollment field and table based on class type
        const attendanceField = student.classType === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";
        const startDate = classData?.startDate || classData?.lecture_start_date || classData?.tutorial_start_date;
        const endDate = classData?.endDate || classData?.lecture_end_date || classData?.tutorial_end_date;
      
        // First, get attendance records for this student
       const { data: records, error: recordsError } = await supabase
         .from("attendance_record")
         .select("*")
         .eq(attendanceField, student.enrollmentId)
         .order('created_at', { ascending: false })
         .limit(20); 

       if (recordsError) throw recordsError;

       if (!records || records.length === 0) {
         setAttendanceHistory([]);
         return;
       }
       
       // Get session details for these records
       const sessionIds = records.map(record => record.session_id);
       let sessionsQuery = supabase
         .from("attendance_session")
         .select("id, created_at, date")
         .in('id', sessionIds);
         
       // Filter by class date range if available
       if (startDate) {
         sessionsQuery = sessionsQuery.gte('created_at', new Date(startDate).toISOString());
       }
       if (endDate) {
         sessionsQuery = sessionsQuery.lte('created_at', new Date(endDate).toISOString());
       }

       const { data: sessions, error: sessionsError } = await sessionsQuery;

       if (sessionsError) throw sessionsError;
        
        // Format the records for display
        const formattedHistory = records
          .filter(record => sessions.some(s => s.id === record.session_id)) // Only include records with valid sessions
          .map(record => {
            const session = sessions.find(s => s.id === record.session_id);
            const sessionDate = session ? (session.date || session.created_at) : record.created_at;

            // Format date and check-in time in UTC
            const formatUtcDate = (dateString) => {
              if (!dateString) return "-";
              const date = new Date(dateString);
              return date.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
            };
            const formatUtcTime = (dateString) => {
              if (!dateString) return null;
              const date = new Date(dateString);
              return date.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " UTC";
            };

            return {
              date: formatUtcDate(sessionDate),
              status: record.status,
              checkInTime: formatUtcTime(record.created_at),
              sessionId: record.session_id,
              notes: record.notes
            };
          });

       setAttendanceHistory(formattedHistory);
     } catch (error) {
       console.error("Error fetching attendance history:", error);
       // Set empty array on error
       setAttendanceHistory([]);
     } finally {
       setIsLoadingHistory(false);
     }
   };
   fetchAttendanceHistory();
 }, [student?.enrollmentId, open, student?.classType, classData]);

 if (!student || !open) {
    return null;
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  // Calculate distance if both student and class have coordinates
  const getLocationInfo = () => {
    if (!student.attendanceRecord || !student.classLocation) {
      return null;
    }

    const record = student.attendanceRecord;
    const classLoc = student.classLocation;

    if (record.latitude && record.longitude && classLoc.latitude && classLoc.longitude) {
      const distance = calculateDistance(
        record.latitude,
        record.longitude,
        classLoc.latitude,
        classLoc.longitude
      );

      return {
        studentLat: record.latitude,
        studentLon: record.longitude,
        classLat: classLoc.latitude,
        classLon: classLoc.longitude,
        distance: distance,
        isWithinRange: distance <= 0.1 // Within 100 meters
      };
    }
    return null;
  };
  const locationInfo = getLocationInfo();

  const handleGenerateReport = async () => {
    if (!student || !classData) return;

    setIsGeneratingReport(true);
    try {
      const attendanceField = classData.type === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";

       // Get class start and end dates
     const startDate = classData.startDate || classData.lecture_start_date || classData.tutorial_start_date;
     const endDate = classData.endDate || classData.lecture_end_date || classData.tutorial_end_date;
     
     if (!startDate) {
       throw new Error("Class start date not found");
     }

     let sessionsQuery = supabase
       .from("attendance_session")
       .select("id, created_at, date")
       .eq(classData.type === "Tutorial" ? 'course_tutorial_id' : 'course_lecture_id', classData.id)
       .gte('created_at', new Date(startDate).toISOString());

     // Add end date filter if it exists
     if (endDate) {
       sessionsQuery = sessionsQuery.lte('created_at', new Date(endDate).toISOString());
     }

     sessionsQuery = sessionsQuery.order('created_at', { ascending: true });
     
     const { data: sessions, error: sessionsError } = await sessionsQuery;

     if (sessionsError) throw sessionsError;

     // Get attendance records for this specific student only
     const sessionIds = sessions.map(s => s.id);
     let attendanceRecords = [];
     
     if (sessionIds.length > 0) {
       const { data: records, error: recordsError } = await supabase
         .from("attendance_record")
         .select("*")
         .in('session_id', sessionIds)
         .eq(attendanceField, student.enrollmentId);

       if (recordsError) throw recordsError;
       attendanceRecords = records || [];
     }

     // Create Excel data
     const excelData = [];

     // Add header row for individual student report
     const headerRow = ['Date', 'Day', 'Status', 'Check-in Time', 'Notes'];
     excelData.push(headerRow);

     // Add student info row
     excelData.push(['Student Information']);
     excelData.push(['Name:', student.name]);
     excelData.push(['Student ID:', student.student_id || student.studentId]);
     excelData.push(['Email:', student.email]);
     excelData.push(['Class:', `${classData.course_code} - ${classData.course_title}`]);
     excelData.push(['Class Type:', classData.type]);
     excelData.push(['Class Period:', `${new Date(startDate).toLocaleDateString()} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Ongoing'}`]);
     excelData.push([]); // Empty row for spacing
     excelData.push(['Attendance History']);

     const attendanceHeaderRow = ['Date', 'Day', 'Status', 'Check-in Time'];
     excelData.push(attendanceHeaderRow);

     sessions.forEach(session => {
       const sessionDate = new Date(session.date || session.created_at);
       const attendanceRecord = attendanceRecords.find(
         record => record.session_id === session.id
       );

       const row = [
         sessionDate.toLocaleDateString(),
         sessionDate.toLocaleDateString('en-US', { weekday: 'long' }),
         attendanceRecord ? 
           attendanceRecord.status.charAt(0).toUpperCase() + attendanceRecord.status.slice(1) : 
           'Absent',
         attendanceRecord ? 
           new Date(attendanceRecord.created_at).toLocaleString() : 
           '-',
       ];

       excelData.push(row);
     });

     // Add summary statistics
     const totalSessions = sessions.length;
     const presentSessions = attendanceRecords.filter(r => r.status === 'present').length;
     const attendanceRate = totalSessions > 0 ? ((presentSessions / totalSessions) * 100).toFixed(1) : '0';

     excelData.push([]); // Empty row
     excelData.push(['Summary Statistics']);
     excelData.push(['Total Sessions:', totalSessions]);
     excelData.push(['Sessions Attended:', presentSessions]);
     excelData.push(['Sessions Missed:', totalSessions - presentSessions]);
     excelData.push(['Attendance Rate:', `${attendanceRate}%`]);

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

     // Style the header rows
     const headerStyle = {
       font: { bold: true },
       fill: { fgColor: { rgb: "CCCCCC" } }
     };

     // Apply styles to specific cells (header rows)
     if (ws['A1']) ws['A1'].s = headerStyle;
     if (ws['A9']) ws['A9'].s = headerStyle;
      
      // Find the summary statistics row
      const summaryRowIndex = excelData.findIndex(row => row[0] === 'Summary Statistics');
      if (summaryRowIndex > -1 && ws['A' + (summaryRowIndex + 1)]) {
        ws['A' + (summaryRowIndex + 1)].s = headerStyle;
      }

     // Add worksheet to workbook
     XLSX.utils.book_append_sheet(wb, ws, 'Student Attendance');

     // Generate filename
     const today = new Date();
     const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
     const studentName = (student.name || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
     const filename = `${studentName}_${classData.course_code}_Attendance_${dateStr}.xlsx`;

     // Download file
     XLSX.writeFile(wb, filename);

   } catch (error) {
     console.error("Error generating report:", error);
     alert("Failed to generate report. Please try again.");
   } finally {
     setIsGeneratingReport(false);
   }
};

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return <Chip label="Present" color="success" />;
      case "tardy":
        return <Chip label="Tardy" color="warning" />;
      case "absent":
        return <Chip label="Absent" color="error" variant="outlined" />;
      case "flagged":
        return <Chip label="Flagged" color="error" variant="filled" icon={<FlagIcon />} />;
      default:
        return status ? <Chip label={status} /> : null;
    }
  };

  // Helper to format UTC time
  const formatUtcTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " UTC";
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          background: "#ffffff", 
          border: "1px solid #e2e8f0",
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">
            Student Details
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {!student ? (
          <Typography variant="body1">No student selected</Typography>
        ) : (
          <>
            {/* Student Info Header */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
              <Box minWidth={0}>
                <Typography variant="h6" fontWeight="bold" noWrap>{student.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Matric No: {student.matric_number} • {student.email}
                </Typography>
                <Box mt={1}>{getStatusBadge(student.status)}</Box>
              </Box>

              <Box textAlign="right" minWidth="180px">
                {student.status !== "absent" && student.checkInTime && (
                  <>
                    <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                      <AccessTimeIcon fontSize="small" color="action" />
                      <Typography variant="body2">{formatUtcTime(student.checkInTime)}</Typography>
                    </Box>
                    {student.checkInLocation && (
                      <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end" mt={1}>
                        <RoomIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          Location tracked
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                <Box display="flex" alignItems="center" gap={1} mt={1} justifyContent="flex-end">
                  <CalendarTodayIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {student.status === "absent" ? `Last attended: ${student.lastAttendance || "N/A"}` : "Today"}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
              <Tab label="Attendance Details" />
              <Tab label="Attendance History" />
            </Tabs>

            {/* Rest of your existing tab content... */}
            {activeTab === 0 && (
              <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={2}>
                {student.attendanceRecord ? (
                  <Box>
                    {/* Basic Attendance Info */}
                    <Box mb={3}>
                      <Typography variant="h6" gutterBottom>Current Session Details</Typography>
                      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                        <Box>
                         <Typography variant="body2" color="text.secondary">Check-in Time</Typography>
                         <Typography variant="body1" fontWeight="bold">
                           {formatUtcTime(student.attendanceRecord.created_at)}
                         </Typography>
                       </Box>
                       <Box>
                         <Typography variant="body2" color="text.secondary">Status</Typography>
                         <Box mt={0.5}>
                           {getStatusBadge(student.attendanceRecord.status)}
                         </Box>
                       </Box>
                     </Box>
                   </Box>

                   {/* Physical Class - Location Details */}
                   {!student.isOnlineClass && (
                     <Box mb={3}>
                       <Typography variant="h6" gutterBottom>
                         <LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                         Location Verification
                       </Typography>

                       {locationInfo ? (
                         <Box>
                           <Alert
                             severity={locationInfo.isWithinRange ? "success" : "warning"}
                             sx={{ mb: 2 }}
                           >
                             <AlertTitle>
                               {locationInfo.isWithinRange ? "Location Verified" : "Location Warning"}
                             </AlertTitle>
                             Distance from class location: {locationInfo.distance.toFixed(2)} km
                             {locationInfo.isWithinRange
                               ? " (Within acceptable range)"
                               : " (Outside typical range)"
                             }
                           </Alert>

                           <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                             <Box>
                               <Typography variant="body2" color="text.secondary">Student Location</Typography>
                               <Typography variant="body2">
                                 Lat: {locationInfo.studentLat.toFixed(6)}
                               </Typography>
                               <Typography variant="body2">
                                 Lon: {locationInfo.studentLon.toFixed(6)}
                               </Typography>
                             </Box>
                             <Box>
                               <Typography variant="body2" color="text.secondary">Class Location</Typography>
                               <Typography variant="body2">
                                 Lat: {locationInfo.classLat.toFixed(6)}
                               </Typography>
                               <Typography variant="body2">
                                 Lon: {locationInfo.classLon.toFixed(6)}
                               </Typography>
                             </Box>
                           </Box>
                         </Box>
                       ) : (
                         <Alert severity="info">
                           Location data not available for this attendance record.
                         </Alert>
                       )}
                     </Box>
                   )}

                   {/* Online Class - Verification Data */}
                   {student.isOnlineClass && student.attendanceRecord.verification_data && (
                     <Box mb={3}>
                       <Typography variant="h6" gutterBottom>
                         <QuizIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                         Online Verification Details
                       </Typography>

                       <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2}>
                         <Card variant="outlined">
                           <CardContent sx={{ textAlign: 'center' }}>
                             <TryIcon color="primary" sx={{ fontSize: 32, mb: 1 }} />
                             <Typography variant="h6" fontWeight="bold">
                               {student.attendanceRecord.verification_data.attempts || 0}
                             </Typography>
                             <Typography variant="body2" color="text.secondary">
                               Quiz Attempts
                             </Typography>
                           </CardContent>
                         </Card>

                         <Card variant="outlined">
                           <CardContent sx={{ textAlign: 'center' }}>
                             <QuizIcon color="success" sx={{ fontSize: 32, mb: 1 }} />
                             <Typography variant="h6" fontWeight="bold">
                               {student.attendanceRecord.verification_data.quiz_score || 0}%
                             </Typography>
                             <Typography variant="body2" color="text.secondary">
                               Quiz Score
                             </Typography>
                           </CardContent>
                         </Card>

                         <Card variant="outlined">
                           <CardContent sx={{ textAlign: 'center' }}>
                             <PlayCircleIcon color="info" sx={{ fontSize: 32, mb: 1 }} />
                             <Typography variant="h6" fontWeight="bold">
                               {Math.round((student.attendanceRecord.verification_data.watch_time || 0) / 60)}m
                             </Typography>
                             <Typography variant="body2" color="text.secondary">
                               Watch Time
                             </Typography>
                           </CardContent>
                         </Card>
                       </Box>

                       {student.attendanceRecord.verification_data.quiz_score < 60 && (
                         <Alert severity="warning" sx={{ mt: 2 }}>
                           <AlertTitle>Low Quiz Score</AlertTitle>
                           Student scored below 60% on the attendance verification quiz.
                         </Alert>
                       )}
                     </Box>
                   )}

                   {/* Additional Record Details */}
                   {student.attendanceRecord.notes && (
                     <Box mb={3}>
                       <Typography variant="h6" gutterBottom>Notes</Typography>
                       <Typography variant="body2" sx={{ 
                         p: 2, 
                         bgcolor: 'grey.100', 
                         borderRadius: 1,
                         fontStyle: 'italic'
                       }}>
                         {student.attendanceRecord.notes}
                       </Typography>
                     </Box>
                   )}
                 </Box>
               ) : (
                 <Alert severity="info">
                   <AlertTitle>No Attendance Record</AlertTitle>
                   This student has not checked in for the current session.
                 </Alert>
               )}
              </Box>
            )}

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
                  <Box>
                    {attendanceHistory.map((record, index) => (
                      <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                        <CardContent sx={{ py: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {record.date}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {record.checkInTime ? `Check-in: ${formatUtcTime(record.checkInTime)}` : "No check-in"}
                            </Typography>
                            {record.notes && (
                              <Typography variant="caption" display="block" color="text.secondary">
                               Note: {record.notes}
                             </Typography>
                           )}
                          </Box>
                          <Box>
                            {getStatusBadge(record.status)}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Box display="flex" gap={1}>
          <Button 
            variant="outlined" 
            onClick={handleGenerateReport} 
            startIcon={<DownloadIcon />}
          >
            Generate Report
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}