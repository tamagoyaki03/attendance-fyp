import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Collapse,
  LinearProgress,
  Button,
  Chip,
  Grid,
  Divider,
} from "@mui/material";
import {
  ArrowDropDown,
  ArrowDropUp,
  Download,
  Email,
  Info,
  PeopleAlt,
} from "@mui/icons-material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import supabase from "../../config/supabaseClient";

export default function ClassAttendance() {
  const [classesData, setClassesData] = useState([]);
  const [expanded, setExpanded] = useState(null);

  const handleExpand = (id) => {
    setExpanded(expanded === id ? null : id);
  };

  const getProgressColor = (rate) => {
    if (rate >= 80) return "success";
    if (rate >= 70) return "info";
    if (rate >= 60) return "warning";
    return "error";
  };

  useEffect(() => {
    const fetchClasses = async () => {
      const { data: lectures, error } = await supabase
        .from("course_lecture")
        .select(`
          id,
          course_title,
          course_code,
          lecture_start_time,
          lecture_end_time,
          lecture_location,
          lecturer_id,
          users(name),
          enrollment_lecture(id)
        `)
        .eq("is_recurring", true);

      if (error) {
        console.error("Error fetching class data:", error);
        return;
      }

      // Format data
      const formatted = lectures.map((lecture) => {
        const totalStudents = lecture.enrollment_lecture.length;
        return {
          id: lecture.id,
          code: lecture.course_code,
          name: lecture.course_title,
          lecturer: lecture.users?.name || "N/A",
          time: `${lecture.lecture_start_time} - ${lecture.lecture_end_time}`,
          location: lecture.lecture_location,
          totalStudents,
          presentCount: Math.floor(totalStudents * 0.8), // mock values
          absentCount: Math.floor(totalStudents * 0.2),
          lateCount: Math.floor(totalStudents * 0.1),
          attendanceRate: (totalStudents > 0) ? ((totalStudents * 0.8) / totalStudents * 100).toFixed(1) : 0,
          fraudAlerts: Math.floor(Math.random() * 3), // mock
        };
      });

      setClassesData(formatted);
    };

    fetchClasses();
  }, []);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {classesData.map((item) => (
        <Card className="border" key={item.id} sx={{ bgcolor: "black", color: "#fff", borderRadius: 1 }}>
          <CardHeader
            onClick={() => handleExpand(item.id)}
            sx={{
              cursor: "pointer",
              "&:hover": { bgcolor: "#2c2c2c" },
              px: 3,
              py: 2,
            }}
            title={
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {item.code}: {item.name}
                  </Typography>
                  <Typography variant="caption" color="#aaa">
                    {item.lecturer} • {item.time}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  {item.fraudAlerts > 0 && (
                    <Chip
                      icon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
                      label={`${item.fraudAlerts} Alerts`}
                      color="error"
                      size="small"
                    />
                  )}
                  {item.attendanceRate < 60 && (
                    <Chip
                      label="Low Attendance"
                      variant="outlined"
                      size="small"
                      sx={{ borderColor: "#f59e0b", color: "#f59e0b" }}
                    />
                  )}
                  <Box textAlign="right">
                    <Typography variant="subtitle1">{item.attendanceRate}%</Typography>
                    <Typography variant="caption" color="#aaa">
                      Attendance Rate
                    </Typography>
                  </Box>
                  {expanded === item.id ? (
                    <ArrowDropUp sx={{ color: "#aaa" }} />
                  ) : (
                    <ArrowDropDown sx={{ color: "#aaa" }} />
                  )}
                </Box>
              </Box>
            }
          />
          <Collapse in={expanded === item.id}>
            <CardContent sx={{ bgcolor: "#121212" }}>
              <Divider sx={{ mb: 2, bgcolor: "#333" }} />
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" mb={1}>
                    Attendance Details
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="#aaa">
                        <PeopleAlt fontSize="small" sx={{ mr: 1 }} />
                        Total Students
                      </Typography>
                      <Typography>{item.totalStudents}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="#aaa">
                        <Info fontSize="small" sx={{ mr: 1 }} />
                        Late Check-ins
                      </Typography>
                      <Typography>
                        {item.lateCount} ({((item.lateCount / item.totalStudents) * 100).toFixed(1)}%)
                      </Typography>
                    </Grid>
                  </Grid>

                  <Box mt={2}>
                    <Typography variant="body2">Present</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(item.presentCount / item.totalStudents) * 100}
                      color="success"
                      sx={{ height: 6, borderRadius: 1, mt: 0.5 }}
                    />
                    <Typography variant="caption" color="#aaa">
                      {item.presentCount} (
                      {((item.presentCount / item.totalStudents) * 100).toFixed(1)}%)
                    </Typography>
                  </Box>

                  <Box mt={2}>
                    <Typography variant="body2">Absent</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(item.absentCount / item.totalStudents) * 100}
                      color="error"
                      sx={{ height: 6, borderRadius: 1, mt: 0.5 }}
                    />
                    <Typography variant="caption" color="#aaa">
                      {item.absentCount} (
                      {((item.absentCount / item.totalStudents) * 100).toFixed(1)}%)
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" mb={1}>
                    Class Information
                  </Typography>
                  <Box>
                    <Typography variant="body2" color="#aaa">Location:</Typography>
                    <Typography>{item.location}</Typography>
                    <Typography variant="body2" color="#aaa">Time:</Typography>
                    <Typography>{item.time}</Typography>
                    <Typography variant="body2" color="#aaa">Lecturer:</Typography>
                    <Typography>{item.lecturer}</Typography>
                  </Box>
                  <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Email />}
                      onClick={() => alert("Reminder sent")}
                    >
                      Send Reminders
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => alert("Data exported")}
                    >
                      Export
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      href={`/classes/${item.id}`}
                      startIcon={<Info />}
                    >
                      View Details
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Collapse>
        </Card>
      ))}
    </Box>
  );
}
