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
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  Book as BookIcon,
} from "@mui/icons-material";
import supabase from "../../config/supabaseClient";

export default function StudentView() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

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
          studentId: user.student_id || user.id,
          name: user.name || user.email,
          email: user.email,
          year: user.year || "-",
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
                  <TableCell>Year</TableCell>
                  <TableCell>Classes</TableCell>
                  <TableCell>Status</TableCell>
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
                    <TableCell>{student.year}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}