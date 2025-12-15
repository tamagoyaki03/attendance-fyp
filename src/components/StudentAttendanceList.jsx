import React, { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableContainer, TableRow, Paper,
  Button, TextField, InputAdornment, Chip, CircularProgress, Box, Typography
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import supabase from "../config/supabaseClient";

export default function StudentAttendanceList({ classData = {} }) {
  const {
    statusFilter = "all",
    onSelectStudent,
    classAttendanceId
  } = classData;

  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error,   setError]       = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!classAttendanceId) return;
    try {
      setLoading(true);
      setError(null);

      const { data: session, error: sessionError } = await supabase
        .from("attendance_session")
        .select("id, course_lecture_id")
        .eq("id", classAttendanceId)
        .single();

      if (sessionError || !session) throw new Error("Session not found");

      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollment_lecture")
        .select(`
          id,
          student_id,
          users ( id, name )
        `)
        .eq("course_id", session.course_lecture_id);

      if (enrollError) throw enrollError;

      const { data: attendanceRecords, error: arError } = await supabase
        .from("attendance_record")
        .select("*")
        .eq("session_id", session.id);

      if (arError) throw arError;

      const recordsMap = new Map();
      attendanceRecords?.forEach((record) => {
        recordsMap.set(record.lecture_enrollment_id, record);
      });

      const mappedStudents = enrollments.map((enroll) => {
        const record = recordsMap.get(enroll.id);
        return {
          id: enroll.id,
          studentId: enroll.student_id,
          name: enroll.users?.name ?? "Unknown",
          status: record?.status ?? "absent",
          checkInTime: record?.created_at ?? null,
          checkInLocation: record?.latitude && record?.longitude
            ? { lat: record.latitude, lng: record.longitude }
            : null,
        };
      });

      setStudents(mappedStudents);
    } catch (err) {
      console.error(err);
      setError("Could not load attendance data.");
    } finally {
      setLoading(false);
    }
  }, [classAttendanceId]);

  useEffect(() => {
    fetchStudents();
    const interval = setInterval(fetchStudents, 10000);
    return () => clearInterval(interval);
  }, [fetchStudents]);

  useEffect(() => {
    if (!classData?.id) return;
    
    let isMounted = true;
    const fetchStudents = async () => {
      try {
        // Determine table and field based on class type
        const enrollmentTable = classData.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
        const enrollIdField = classData.type === "Tutorial" ? "tutorial_id" : "course_id";

        const { data: enrollments, error } = await supabase
          .from(enrollmentTable)
          .select("id, student_id, users(id, name)")
          .eq(enrollIdField, classData.id);

        if (error) throw error;

        if (isMounted) {
          setStudents(enrollments || []);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        if (isMounted) setStudents([]);
      }
    };
    fetchStudents();
    return () => { isMounted = false; };
  }, [classData?.id, classData?.type]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "present" && student.status === "present") ||
      (statusFilter === "absent" && student.status === "absent") ||
      (statusFilter === "excused" && student.status === "excused") ||
      (statusFilter === "flagged" && student.status === "flagged");
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return <Chip label="Present" color="success" size="small" />;
      case "tardy":
        return <Chip label="Tardy" color="warning" size="small" />;
      case "absent":
        return <Chip label="Absent" variant="outlined" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading attendance data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" alignItems="center" mt={1}>
        <TextField
          fullWidth
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
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

      <TableContainer component={Paper} sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "none" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student Name</TableCell>
              <TableCell>Student ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Check-in Time</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} style={{ height: 96, textAlign: "center" }}>
                  No students found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Typography fontWeight={500}>{student.name}</Typography>
                  </TableCell>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell>{getStatusBadge(student.status)}</TableCell>
                  <TableCell>{student.checkInTime ? new Date(student.checkInTime).toLocaleTimeString() : "N/A"}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onSelectStudent(student)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}