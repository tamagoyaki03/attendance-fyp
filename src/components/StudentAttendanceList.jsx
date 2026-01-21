import React, { useState } from "react";
import supabase from "../config/supabaseClient";
import {
  Table, TableBody, TableCell, TableHead, TableContainer, TableRow, Paper,
  Button, TextField, InputAdornment, Chip, Box, Typography,
  FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import { 
  Search as SearchIcon, 
  Flag as FlagIcon, 
  EventNote as ExcuseIcon 
} from "@mui/icons-material";
import ViewDetailsButton from "./ViewDetailsButton";

// Helper: format ISO string as UTC time (HH:mm:ss)
// Helper: format ISO string as local time (HH:mm:ss)
// Extracts HH:mm:ss from ISO string (no conversion)
function extractTime(isoString) {
  if (!isoString) return "N/A";
  // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ
  const match = isoString.match(/T(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : isoString;
}

export default function StudentAttendanceList({ classData, onSelectStudent, onFlagged }) {
  const [flagReasonDialog, setFlagReasonDialog] = useState({ open: false, student: null });
  const [flagReasonInput, setFlagReasonInput] = useState("");
  const [flagError, setFlagError] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen for attendance updates
  React.useEffect(() => {
    const handleAttendanceUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('attendance-updated', handleAttendanceUpdate);
    return () => window.removeEventListener('attendance-updated', handleAttendanceUpdate);
  }, []);

  // Fetch all enrolled students and their attendance_record on mount or when classData changes
  React.useEffect(() => {
    async function fetchEnrolledAndAttendance() {
      if (!classData || !classData.id || !classData.type) {
        return;
      }
      
      const enrollmentTable = classData.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
      const enrollmentField = classData.type === "Tutorial" ? "tutorial_id" : "course_id";
      const attendanceField = classData.type === "Tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";

      // Fetch enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from(enrollmentTable)
        .select(`id, student_id, users ( id, name, email, matric_number )`)
        .eq(enrollmentField, classData.id);
      if (enrollError || !enrollments) return;

      // Find ALL sessions for this class this week
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const { data: weekSessions, error: weekSessionError } = await supabase
        .from("attendance_session")
        .select("id")
        .eq(classData.type === "Tutorial" ? 'course_tutorial_id' : 'course_lecture_id', classData.id)
        .gte('created_at', monday.toISOString())
        .lte('created_at', sunday.toISOString());

      if (weekSessionError || !weekSessions || weekSessions.length === 0) {
        setEnrolledStudents(enrollments.map(e => ({
          ...e.users,
          student_id: e.student_id,
          enrollmentId: e.id,
          lecture_enrollment_id: classData.type === "Lecture" ? e.id : undefined,
          tutorial_enrollment_id: classData.type === "Tutorial" ? e.id : undefined,
          status: undefined,
          checkInTime: undefined,
          marked_manually: undefined,
          attendance_id: undefined
        })));
        return;
      }

      // Get ALL attendance records for ALL sessions this week (not just one session)
      const sessionIds = weekSessions.map(s => s.id);
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_record')
        .select(`id, status, created_at, marked_manually, ${attendanceField}, session_id, flag_reason`)
        .in('session_id', sessionIds);
      
      if (attendanceError) {
        return;
      }

      // Merge attendance info into enrolled students
      const merged = enrollments.map(e => {
        // Find attendance record for this enrollment (from ANY session this week)
        const attn = attendanceRecords?.find(r => r[attendanceField] === e.id);
        return {
          ...e.users,
          student_id: e.student_id,
          enrollmentId: e.id,
          lecture_enrollment_id: classData.type === "Lecture" ? e.id : undefined,
          tutorial_enrollment_id: classData.type === "Tutorial" ? e.id : undefined,
          status: attn ? attn.status : undefined,
          checkInTime: attn ? attn.created_at : undefined,
          marked_manually: attn ? attn.marked_manually : undefined,
          attendance_id: attn ? attn.id : undefined,
          flag_reason: attn ? attn.flag_reason : undefined
        };
      });
      setEnrolledStudents(merged);
    }
    fetchEnrolledAndAttendance();
  }, [classData, refreshTrigger]);

  // Use enrolledStudents directly - they already have the correct status from attendance_record
  // Don't merge with classData.all as it may contain stale data that overwrites the correct status
  let mergedStudents = enrolledStudents;

  // Filter by search and status
  let filteredStudents = mergedStudents.filter(student => {
    const studentName = student.name || '';
    const studentEmail = student.email || '';
    const studentId = student.matric_number || '';
    const matchesSearch = searchTerm === '' || 
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentId.toString().toLowerCase().includes(searchTerm.toLowerCase());
    // Status filter: 'all', 'present', 'absent'
    if (statusFilter === 'all') {
      return matchesSearch;
    } else if (statusFilter === 'present') {
      return matchesSearch && student.status === 'present';
    } else if (statusFilter === 'absent') {
      // Treat undefined/null/empty status as absent
      return matchesSearch && (student.status === 'absent' || student.status === undefined || student.status === null || student.status === '');
    }
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    if (status === undefined || status === null || status === "") {
      // No attendance record: treat as absent
      return <Chip label="Absent" variant="outlined" color="error" size="small" />;
    }
    switch (status) {
      case "present":
        return <Chip label="Present" color="success" size="small" />;
      case "tardy":
        return <Chip label="Tardy" color="warning" size="small" />;
      case "absent":
        return <Chip label="Absent" variant="outlined" color="error" size="small" />;
      case "excused":
        return <Chip label="Excused" color="info" size="small" icon={<ExcuseIcon />} />;
      case "flagged":
        return <Chip label="Flagged" color="error" size="small" icon={<FlagIcon />} />;
      default:
        // Capitalize first letter for any other status
        return <Chip label={String(status).charAt(0).toUpperCase() + String(status).slice(1)} size="small" />;
    }
  };

  // Open dialog to enter flag reason
  const handleFlagStudent = (student) => {
    setFlagReasonInput("");
    setFlagReasonDialog({ open: true, student });
  };

  // const handleConfirmFlag = async () => {
  //   setFlagError("");
  //   const student = flagReasonDialog.student;
  //   setFlagReasonDialog({ open: false, student: null });
  //   if (!student) return;


  //   // Debug: print student object and possible identifiers
  //   let attendanceId = student.attendance_id;
  //   let sessionId = student.session_id;
  //   if (!sessionId && classData && classData.session_id) {
  //     sessionId = classData.session_id;
  //   }

  //   // If attendance_id is not present, try to fetch it from the database
  //   if (!attendanceId && sessionId) {
  //     // Use the correct enrollment field based on class type
  //     let filter = {};
  //     if (classData?.type === "Lecture" && student.lecture_enrollment_id) {
  //       filter = { lecture_enrollment_id: student.lecture_enrollment_id };
  //     } else if (classData?.type === "Tutorial" && student.tutorial_enrollment_id) {
  //       filter = { tutorial_enrollment_id: student.tutorial_enrollment_id };
  //     }
  //     if (Object.keys(filter).length > 0) {
  //       const { data, error } = await supabase
  //         .from('attendance_record')
  //         .select('id')
  //         .match({ ...filter, session_id: sessionId })
  //         .maybeSingle();
  //       if (!error && data && data.id) {
  //         attendanceId = data.id;
  //       }
  //     }
  //   }

  //   // Update attendance_record status to 'flagged' and set flag_reason for this student in this session
  //   let updateError = null;
  //   if (attendanceId) {
  //     const { error } = await supabase
  //       .from('attendance_record')
  //       .update({ status: 'flagged', flag_reason: flagReasonInput || 'Flagged by admin' })
  //       .eq('id', attendanceId);
  //     if (error) updateError = error;
  //   } else {
  //     updateError = 'Missing attendance identifier';
  //   }

  //   if (updateError) {
  //     setFlagError('Failed to update attendance status: ' + (updateError.message || updateError));
  //     return;
  //   }

  //   // Try to retrieve userId
  //   const userId = student.student_id || student.id;
  //   // Try to get attendance_record_id for this flag
  //   let attendanceRecordId = attendanceId;
  //   if (!attendanceRecordId && student.attendance_record && student.attendance_record.id) {
  //     attendanceRecordId = student.attendance_record.id;
  //   }
  //   if (userId && sessionId) {
  //     await supabase
  //       .from('fraud_detection_alerts')
  //       .insert({
  //         user_id: userId,
  //         session_id: sessionId,
  //         attendance_record_id: attendanceRecordId || null,
  //         alert_type: 'Flagged',
  //         description: flagReasonInput || 'Flagged by admin',
  //         status: 'open',
  //         severity: 'medium',
  //         created_at: new Date().toISOString(),
  //       });
  //     // Ask parent to refresh data so flagged list updates
  //     if (onFlagged) onFlagged();
  //   } else {
  //     setFlagError('Cannot flag: missing session ID for this student.');
  //   }
  //   setFlagReasonDialog({ open: false, student: null });
  //   setFlagReasonInput('');
  // };

  return (
    <div>
      {/* Flag Reason Dialog */}
      {flagError && (
        <Box mb={2}>
          <Typography color="error" variant="body2">{flagError}</Typography>
        </Box>
      )}
      {flagReasonDialog.open && (
        <Box position="fixed" top={0} left={0} width="100vw" height="100vh" zIndex={1300} display="flex" alignItems="center" justifyContent="center" bgcolor="rgba(0,0,0,0.3)">
          <Paper sx={{ p: 3, minWidth: 320 }}>
            <Typography variant="h6" gutterBottom>Flag Student</Typography>
            <Typography variant="body2" gutterBottom>Enter a reason for flagging this student:</Typography>
            <TextField
              autoFocus
              fullWidth
              multiline
              minRows={2}
              value={flagReasonInput}
              onChange={e => setFlagReasonInput(e.target.value)}
              placeholder="Reason for flagging..."
              sx={{ mb: 2 }}
            />
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button onClick={() => setFlagReasonDialog({ open: false, student: null })} variant="outlined">Cancel</Button>
              {/* <Button onClick={handleConfirmFlag} variant="contained" disabled={!flagReasonInput.trim()}>Flag</Button> */}
            </Box>
          </Paper>
        </Box>
      )}
      <Box mb={2} display="flex" gap={2}>
        <TextField
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="present">Present</MenuItem>
            <MenuItem value="absent">Absent</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "none" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student Name</TableCell>
              <TableCell>Student ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Check-in Time</TableCell>
              <TableCell>Marked Manually</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

        <TableBody>
          {filteredStudents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} style={{ height: 96, textAlign: "center" }}>
                No students found matching your criteria.
              </TableCell>
            </TableRow>
          ) : (
            filteredStudents.map((student, index) => (
              <TableRow key={student.id || index}>
                <TableCell>
                  <Typography fontWeight={500}>{student.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {student.email}
                  </Typography>
                </TableCell>
                <TableCell>{student.matric_number}</TableCell>
                <TableCell>{getStatusBadge(student.status, student)}</TableCell>
                <TableCell>
                  {student.checkInTime ? extractTime(student.checkInTime) : "N/A"}
                </TableCell>
                <TableCell>
                  {student.marked_manually === true ? "Yes" : student.marked_manually === false ? "No" : "-"}
                </TableCell>
                <TableCell align="right">
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    {(!student.isFlagged && !student.flag_reason) && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        onClick={() => handleFlagStudent(student)}
                        startIcon={<FlagIcon />}
                      >
                        Flag
                      </Button>
                    )}
                    <ViewDetailsButton onClick={() => onSelectStudent(student)} />
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}