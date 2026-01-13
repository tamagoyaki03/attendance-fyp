import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  TextField,
  Menu,
  MenuItem,
  Chip,
  InputAdornment,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  Search as SearchIcon,
  Book as BookIcon,
} from "@mui/icons-material";
import supabase from "../../config/supabaseClient";
import ViewDetailsButton from "../ViewDetailsButton";

export default function StudentView() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [attendanceRate, setAttendanceRate] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [totalSessions, setTotalSessions] = useState(null);

  const getAttendanceColor = (rate) => {
    if (rate >= 80) return "success";
    if (rate >= 60) return "warning";
    return "error";
  };

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);

      // Step 1: Fetch all students
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "student");

      // Step 2: Fetch all enrollment records
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollment_lecture")
        .select("student_id");

      if (!usersError && !enrollmentError && usersData && enrollmentData) {
        const classCountMap = enrollmentData.reduce((acc, row) => {
          acc[row.student_id] = (acc[row.student_id] || 0) + 1;
          return acc;
        }, {});

        const mergedStudents = usersData.map((user) => ({
          id: user.id,
          studentId: user.matric_number || user.student_id || user.id,
          name: user.name || user.email,
          email: user.email,
          enrolledClasses: classCountMap[user.id] || 0,
          status: user.status || "active",
        }));

        setStudents(mergedStudents);
      }

      setLoading(false);
    };

    fetchStudents();
  }, []);

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleViewDetails = async (student) => {
    setSelectedStudent(student);
    setDetailsLoading(true);
    setAttendanceRate(null);
    try {
      // Fetch enrollment IDs for this student (lecture and tutorial)
      const [lecEnrRes, tutEnrRes] = await Promise.all([
        supabase.from("enrollment_lecture").select("id").eq("student_id", student.id),
        supabase.from("enrollment_tutorial").select("id").eq("student_id", student.id),
      ]);
      const lecIds = (lecEnrRes.data || []).map((e) => e.id);
      const tutIds = (tutEnrRes.data || []).map((e) => e.id);

      let records = [];
      if (lecIds.length > 0) {
        const { data: recL } = await supabase
          .from("attendance_record")
          .select("status")
          .in("lecture_enrollment_id", lecIds);
        records = records.concat(recL || []);
      }
      if (tutIds.length > 0) {
        const { data: recT } = await supabase
          .from("attendance_record")
          .select("status")
          .in("tutorial_enrollment_id", tutIds);
        records = records.concat(recT || []);
      }

      const present = records.filter((r) => r?.status === "present").length;
      const absent = records.filter((r) => r?.status === "absent").length;
      const totalConsidered = present + absent;
      const rate = totalConsidered > 0 ? Math.round((present / totalConsidered) * 100) : 0;
      setAttendanceRate(rate);
      setTotalSessions(records.length || null);
    } catch (err) {
      console.warn("Failed to compute attendance rate", err);
      setAttendanceRate(null);
      setTotalSessions(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedStudent(null);
  };

  const filteredStudents = useMemo(() => {
    let filtered = students;
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterStatus !== "all") {
      filtered = filtered.filter((student) => student.status === filterStatus);
    }
    return filtered;
  }, [students, searchTerm, filterStatus]);

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
  };

  return (
    <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Students</Typography>
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl) && !selectedStudent}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { setFilterStatus("all"); handleMenuClose(); }}>All</MenuItem>
            <MenuItem onClick={() => { setFilterStatus("active"); handleMenuClose(); }}>Active</MenuItem>
            <MenuItem onClick={() => { setFilterStatus("inactive"); handleMenuClose(); }}>Inactive</MenuItem>
          </Menu>
        </Box>

        <Box display="flex" gap={2} mb={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            fullWidth
            sx={inputSx}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ background: "#ffffff", border: "1px solid #e6edf3", borderRadius: 1 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Classes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar>{student.name?.charAt(0) || "?"}</Avatar>
                        <Box>
                          <div style={{ fontWeight: 500 }}>{student.name}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{student.email}</div>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BookIcon fontSize="small" />
                        {student.enrolledClasses}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={student.status === "active" ? "Active" : "Inactive"}
                        color={student.status === "active" ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <ViewDetailsButton onClick={() => handleViewDetails(student)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {selectedStudent && (
          <Dialog open={Boolean(selectedStudent)} onClose={handleCloseDetails} fullWidth maxWidth="sm">
            <DialogTitle>Student Details</DialogTitle>
            <DialogContent dividers>
              <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }} gap={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Student ID</Typography>
                  <Typography>{selectedStudent.studentId}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                  <Typography>{selectedStudent.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography>{selectedStudent.email}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Enrolled Classes</Typography>
                  <Typography>{selectedStudent.enrolledClasses}</Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}>
                  <Box mb={1} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary">Overall Attendance Rate</Typography>
                    {!detailsLoading && attendanceRate != null && (
                      <Chip label={`${attendanceRate}%`} color={getAttendanceColor(attendanceRate)} size="small" />
                    )}
                  </Box>
                  {detailsLoading ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">Calculating…</Typography>
                    </Box>
                  ) : (
                    <LinearProgress
                      variant="determinate"
                      value={attendanceRate || 0}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#e2e8f0",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor:
                            attendanceRate >= 80
                              ? "#22c55e"
                              : attendanceRate >= 60
                              ? "#f59e0b"
                              : "#ef4444",
                        },
                      }}
                    />
                  )}
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                  <Chip label={selectedStudent.status === "active" ? "Active" : "Inactive"} color={selectedStudent.status === "active" ? "success" : "default"} size="small" />
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetails}>Close</Button>
            </DialogActions>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}