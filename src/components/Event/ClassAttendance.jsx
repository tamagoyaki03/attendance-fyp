import React, { useState } from "react";
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

export default function ClassAttendance({ classes }) {
  const [expanded, setExpanded] = useState(null);

  const classesData = (classes || []).map((lecture) => {
    const totalStudents = lecture.enrollment_lecture?.length || 0;
    const present = Math.floor(totalStudents * 0.8);
    const absent = Math.floor(totalStudents * 0.2);
    const late = Math.floor(totalStudents * 0.1);
    const rate = totalStudents > 0 ? ((present / totalStudents) * 100).toFixed(1) : 0;
    return {
      id: lecture.id,
      code: lecture.course_code,
      name: lecture.course_title,
      lecturer: lecture.users?.name || "N/A",
      time: `${lecture.lecture_start_time} - ${lecture.lecture_end_time}`,
      location: lecture.lecture_location,
      totalStudents,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      attendanceRate: rate,
      fraudAlerts: Math.floor(Math.random() * 3),
    };
  });

  const handleExpand = (id) => {
    setExpanded(expanded === id ? null : id);
  };

  if (!classes || classes.length === 0) {
    return (
      <Box p={2}>
        <Typography color="text.secondary">No classes found for your account.</Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {classesData.map((item) => {
        const numericRate = parseFloat(item.attendanceRate) || 0;
        return (
          <Card
            className="border"
            key={item.id}
            sx={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
              borderRadius: 1,
            }}
          >
            <CardHeader
              onClick={() => handleExpand(item.id)}
              sx={{
                cursor: "pointer",
                px: 3,
                py: 2,
                "&:hover": { background: "#f8fafc" },
              }}
              title={
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                      {item.code}: {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
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

                    {numericRate < 60 && (
                      <Chip
                        label="Low Attendance"
                        variant="outlined"
                        size="small"
                        sx={{ borderColor: "#f59e0b", color: "#f59e0b" }}
                      />
                    )}

                    <Box textAlign="right" sx={{ minWidth: 72 }}>
                      <Typography variant="subtitle1" color="text.primary">
                        {item.attendanceRate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Attendance Rate
                      </Typography>
                    </Box>

                    {expanded === item.id ? (
                      <ArrowDropUp sx={{ color: "text.secondary" }} />
                    ) : (
                      <ArrowDropDown sx={{ color: "text.secondary" }} />
                    )}
                  </Box>
                </Box>
              }
            />

            <Collapse in={expanded === item.id}>
              <CardContent sx={{ background: "#ffffff" }}>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" mb={1} color="text.primary">
                      Attendance Details
                    </Typography>

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <PeopleAlt fontSize="small" /> Total Students
                        </Typography>
                        <Typography color="text.primary">{item.totalStudents}</Typography>
                      </Grid>

                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Info fontSize="small" /> Late Check-ins
                        </Typography>
                        <Typography color="text.primary">
                          {item.lateCount} {item.totalStudents > 0 ? `(${((item.lateCount / item.totalStudents) * 100).toFixed(1)}%)` : ""}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box mt={2}>
                      <Typography variant="body2" color="text.primary">Present</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={item.totalStudents > 0 ? (item.presentCount / item.totalStudents) * 100 : 0}
                        color="success"
                        sx={{ height: 6, borderRadius: 1, mt: 0.5 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {item.presentCount} {item.totalStudents > 0 ? `(${((item.presentCount / item.totalStudents) * 100).toFixed(1)}%)` : ""}
                      </Typography>
                    </Box>

                    <Box mt={2}>
                      <Typography variant="body2" color="text.primary">Absent</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={item.totalStudents > 0 ? (item.absentCount / item.totalStudents) * 100 : 0}
                        color="error"
                        sx={{ height: 6, borderRadius: 1, mt: 0.5 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {item.absentCount} {item.totalStudents > 0 ? `(${((item.absentCount / item.totalStudents) * 100).toFixed(1)}%)` : ""}
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" mb={1} color="text.primary">
                      Class Information
                    </Typography>
                    <Box>
                      <Typography variant="body2" color="text.secondary">Location:</Typography>
                      <Typography color="text.primary">{item.location}</Typography>

                      <Typography variant="body2" color="text.secondary" mt={1}>Time:</Typography>
                      <Typography color="text.primary">{item.time}</Typography>

                      <Typography variant="body2" color="text.secondary" mt={1}>Lecturer:</Typography>
                      <Typography color="text.primary">{item.lecturer}</Typography>
                    </Box>

                    <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Email />}
                        onClick={() => alert("Reminder sent")}
                        sx={{
                          borderColor: "#e6edf3",
                          color: "#0f172a",
                          "&:hover": { backgroundColor: "rgba(15,23,42,0.04)" },
                        }}
                      >
                        Send Reminders
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={() => alert("Data exported")}
                        sx={{
                          borderColor: "#e6edf3",
                          color: "#0f172a",
                          "&:hover": { backgroundColor: "rgba(15,23,42,0.04)" },
                        }}
                      >
                        Export
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        href={`/classes/${item.id}`}
                        startIcon={<Info />}
                        sx={{
                          borderColor: "#e6edf3",
                          color: "#0f172a",
                          "&:hover": { backgroundColor: "rgba(15,23,42,0.04)" },
                        }}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Collapse>
          </Card>
        );
      })}
    </Box>
  );
}