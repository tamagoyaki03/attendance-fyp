import React, { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableContainer, TableRow, Paper,
  Button, TextField, InputAdornment, Chip, CircularProgress, Box, Typography
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import supabase from "../config/supabaseClient";

export default function StudentAttendanceList({
  statusFilter = "all",
  onSelectStudent,
  classAttendanceId
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error,   setError]       = useState(null);

const fetchStudents = useCallback(async () => {
    if (!classAttendanceId) return;

    try {
      setLoading(true);
      setError(null);

      /* ── 1. attendance_session row ─────────────────────────────────── */
      const { data: session, error: sessionError } = await supabase
        .from("attendance_session")
        .select("id, course_lecture_id")
        .eq("id", classAttendanceId)
        .single();

      if (sessionError || !session) throw new Error("Session not found");

      /* ── 2. enrolled students for that lecture course ──────────────── */
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollment_lecture")
        .select(`
          id,
          student_id,
          users ( id, name )
        `)
        .eq("course_id", session.course_lecture_id);

      if (enrollError) throw enrollError;

      /* ── 3. attendance records for THIS session ────────────────────── */
      const { data: attendanceRecords, error: arError } = await supabase
        .from("attendance_record")
        .select("*")
        .eq("session_id", session.id);

      if (arError) throw arError;

      /* ── 4. map the latest record per enrollment ───────────────────── */
      const recordsMap = new Map();
      attendanceRecords?.forEach((record) => {
        recordsMap.set(record.lecture_enrollment_id, record);
        }
      );

      const mappedStudents = enrollments.map((enroll) => {
      const record = recordsMap.get(enroll.id); // enroll.id is lecture_enrollment_id

      return {
        id: enroll.id,
        studentId: enroll.student_id,
        name: enroll.users?.name ?? "Unknown",
        status: record?.status ?? "absent", // fallback if not found
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
    const interval = setInterval(fetchStudents, 10000); // Poll every 5 seconds
  return () => clearInterval(interval);
  }, [fetchStudents]);

  useEffect(() => {
    if (!classAttendanceId) return;

    // listen only to rows belonging to THIS session
    const channel = supabase
      .channel(`attendance-record-${classAttendanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",                    // INSERT | UPDATE | DELETE
          schema: "public",
          table: "attendance_record",
          filter: `session_id=eq.${classAttendanceId}`,
        },
        () => fetchStudents()            // re‑query whenever anything changes
      )
      .subscribe();

    // housekeeping
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classAttendanceId, fetchStudents]);

  // Filter by search query and statusFilter
  const filteredStudents = students.filter(
  (student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "present" && (student.status === "present")) ||
      (statusFilter === "absent" && student.status === "absent") ||
      (statusFilter === "excused" && student.status === "excused") ||
      (statusFilter === "flagged" && student.status === "flagged");

    return matchesSearch && matchesStatus;
  }
);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
        <TextField
          fullWidth
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </div>

      <TableContainer component={Paper} className="border" sx={{ background: '#09090b', color: '#fff' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#fff' }}>Student Name</TableCell>
              <TableCell sx={{ color: '#fff' }}>Student ID</TableCell>
              <TableCell sx={{ color: '#fff' }}>Status</TableCell>
              <TableCell sx={{ color: '#fff' }}>Check-in Time</TableCell>
              <TableCell align="right" sx={{ color: '#fff' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} style={{ height: '96px', textAlign: 'center', color: '#fff' }}> {/* Updated colspan */}
                  No students found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell sx={{ color: '#fff' }}>
                    <div style={{ fontWeight: 500 }}>{student.name}</div>
                  </TableCell>
                  <TableCell sx={{ color: '#fff' }}>{student.studentId}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{getStatusBadge(student.status)}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>
                    {student.checkInTime ? new Date(student.checkInTime).toLocaleTimeString() : "N/A"}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#fff' }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onSelectStudent(student)}
                      sx={{ color: '#fff' }}
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
    </div>
  );
}