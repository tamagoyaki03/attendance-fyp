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
  CircularProgress,
  Alert,
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
import ViewDetailsButton from "../ViewDetailsButton";
import { getDetailedAttendanceStats, calculateAttendanceRate } from "../../utils/attendanceUtils";

export default function ClassAttendance({ classes }) {
  const [expanded, setExpanded] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [classesData, setClassesData] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const getDayName = (dayNumber) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNumber] || "";
  };

  const formatTime = (time) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  const isClassActive = (cls) => {
    if (!cls) return false; // Safety check for undefined/null
    const endDate = cls.lecture_end_date || cls.tutorial_end_date;
    if (!endDate) return true;
    const classEndDate = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return classEndDate >= today;
  };

  const isClassStartedThisWeek = (classSchedule) => {
    const now = new Date();
    const currentDay = now.getDay();
    const classDay = classSchedule.day_of_week;
    
    // If class is today or has already passed this week
    return currentDay >= classDay;
  };

  // Load initial class data with real attendance rates
  useEffect(() => {
    const loadClassData = async () => {
      if (!classes || classes.length === 0) {
        setClassesData([]);
        setIsInitialLoading(false);
        return;
      }

      try {
        const classDataWithStats = await Promise.all(
          classes.map(async (lecture) => {
            const attendanceRate = await calculateAttendanceRate(
              lecture.id,
              lecture.type || "Lecture"
            );

            // Get correct time fields based on class type
            const startTime = lecture.type === "Tutorial" 
              ? formatTime(lecture.tutorial_start_time)
              : formatTime(lecture.lecture_start_time);
            const endTime = lecture.type === "Tutorial"
              ? formatTime(lecture.tutorial_end_time)
              : formatTime(lecture.lecture_end_time);
            const dayName = getDayName(lecture.day_of_week);
            const timeDisplay = startTime && endTime ? `${startTime} - ${endTime}` : "";
            const scheduleDisplay = dayName && timeDisplay ? `${dayName}, ${timeDisplay}` : dayName || timeDisplay || "";

            // Get correct location field based on class type
            const location = lecture.type === "Tutorial" 
              ? lecture.tutorial_location 
              : lecture.lecture_location;

            return {
              id: lecture.id,
              code: lecture.course_code,
              name: lecture.course_title,
              lecturer: lecture.users?.name || "N/A",
              time: scheduleDisplay,
              location: location,
              totalStudents: attendanceRate.totalStudents,
              totalSessions: attendanceRate.totalSessions,
              attendanceRate: Math.round(attendanceRate.attendanceRate * 10) / 10,
              type: lecture.type || "Lecture",
            };
          })
        );

        setClassesData(classDataWithStats);
      } catch {
        setClassesData([]);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadClassData();
  }, [classes]);

  const toggleExpand = async (classItem) => {
    if (expanded?.id === classItem?.id) {
      setExpanded(null);
    } else {
      setExpanded(classItem);

      if (!attendanceData[classItem.id]) {
        setLoadingStates((prev) => ({ ...prev, [classItem.id]: true }));

        try {
          const detailedStats = await getDetailedAttendanceStats(
            classItem.id,
            classItem.type
          );
          
          setAttendanceData((prev) => ({
            ...prev,
            [classItem.id]: detailedStats,
          }));
        } catch {
          // Error already handled by component state
        } finally {
          setLoadingStates((prev) => ({ ...prev, [classItem.id]: false }));
        }
      }
    }
  };

  if (isInitialLoading) {
    return (
      <Box p={2} textAlign="center">
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading classes...
        </Typography>
      </Box>
    );
  }

  if (!classesData || classesData.length === 0) {
    return (
      <Box p={2}>
        <Typography color="text.secondary">No classes found for your account.</Typography>
      </Box>
    );
  }

  // Separate active and archived classes
  const activeClasses = classesData.filter(item => {
    const classObj = classes.find(c => c.id === item.id);
    return classObj && isClassActive(classObj);
  });
  const archivedClasses = classesData.filter(item => {
    const classObj = classes.find(c => c.id === item.id);
    return classObj && !isClassActive(classObj);
  });

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {activeClasses.map((item) => {
        const attendanceDetails = attendanceData[item.id];
        const isLoading = loadingStates[item.id];
        const isExpanded = expanded?.id === item?.id;
        
        const getAttendanceColor = (rate) => {
          if (rate >= 80) return "success";
          if (rate >= 60) return "warning";
          return "error";
        };

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
              onClick={() => toggleExpand(item)}
              sx={{
                cursor: "pointer",
                px: 3,
                py: 2,
                "&:hover": { background: "#f8fafc" },
              }}
              title={
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                        {item.code}: {item.name}
                      </Typography>
                      <Chip 
                        label={item.type} 
                        size="small" 
                        sx={{ 
                          height: "20px",
                          fontSize: "0.7rem",
                          backgroundColor: item.type === "Lecture" ? "#dbeafe" : "#fce7f3",
                          color: item.type === "Lecture" ? "#0c4a6e" : "#831843",
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {item.lecturer} • {item.time}
                    </Typography>
                  </Box>

                  <Box display="flex" gap={1} alignItems="center">
                    <Chip
                      label={`${item.attendanceRate}%`}
                      color={getAttendanceColor(item.attendanceRate)}
                      size="small"
                      sx={{ minWidth: "70px" }}
                    />
                    {isExpanded ? (
                      <ArrowDropUp sx={{ color: "#64748b" }} />
                    ) : (
                      <ArrowDropDown sx={{ color: "#64748b" }} />
                    )}
                  </Box>
                </Box>
              }
            />

            <Collapse in={isExpanded}>
              <Divider />
              <CardContent sx={{ pt: 3 }}>
                {isLoading ? (
                  <Box textAlign="center" py={3}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Loading attendance details...
                    </Typography>
                  </Box>
                ) : attendanceDetails ? (
                  <Box>
                    {/* Week Header */}
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: "#0f172a" }}>
                      This Week's Statistics
                    </Typography>

                    {/* Check if class has started this week */}
                    {!isClassStartedThisWeek(item) ? (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        This class has not started yet this week.
                      </Alert>
                    ) : null}

                    {/* Overview Stats */}
                    <Box
                      display="grid"
                      gridTemplateColumns={{ xs: "1fr 1fr", sm: "1fr 1fr 1fr 1fr" }}
                      gap={2}
                      mb={3}
                    >
                      <Box sx={{ p: 2, backgroundColor: "#f8fafc", borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Total Students
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {attendanceDetails.totalStudents}
                        </Typography>
                      </Box>

                      <Box sx={{ p: 2, backgroundColor: "#f0fdf4", borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Present
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="h6" fontWeight="bold" sx={{ color: "#22c55e" }}>
                            {attendanceDetails.presentCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({attendanceDetails.totalStudents > 0 
                              ? Math.round((attendanceDetails.presentCount / attendanceDetails.totalStudents) * 100)
                              : 0}%)
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ p: 2, backgroundColor: "#fffbeb", borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Flagged
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: "#f59e0b" }}>
                          {attendanceDetails.flaggedCount || 0}
                        </Typography>
                      </Box>

                      <Box sx={{ p: 2, backgroundColor: "#fef2f2", borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Absent
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: "#ef4444" }}>
                          {attendanceDetails.absentCount}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Attendance Rate Progress */}
                    <Box mb={3}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Overall Attendance Rate
                        </Typography>
                        <Chip
                          label={`${attendanceDetails.attendanceRate}%`}
                          color={getAttendanceColor(attendanceDetails.attendanceRate)}
                          size="small"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={attendanceDetails.attendanceRate}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#e2e8f0",
                          "& .MuiLinearProgress-bar": {
                            backgroundColor:
                              attendanceDetails.attendanceRate >= 80
                                ? "#22c55e"
                                : attendanceDetails.attendanceRate >= 60
                                ? "#f59e0b"
                                : "#ef4444",
                          },
                        }}
                      />
                    </Box>

                    {/* Session Info */}
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: "#f8fafc",
                        borderRadius: 1,
                        mb: 3,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Total Sessions Held
                      </Typography>
                      <Chip label={attendanceDetails.totalOverallSessions} />
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="info">
                    No attendance data available for this class yet.
                  </Alert>
                )}
              </CardContent>
            </Collapse>
          </Card>
        );
      })}

      {archivedClasses.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" fontWeight="bold" mb={2} color="text.secondary">
            Archived Classes
          </Typography>
          {archivedClasses.map((item) => (
            <Card
              className="border"
              key={item.id}
              sx={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                borderRadius: 1,
                opacity: 0.6,
                mb: 2,
              }}
            >
              <CardHeader
                sx={{
                  px: 3,
                  py: 2,
                }}
                title={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                          {item.code}: {item.name}
                        </Typography>
                        <Chip label="Archived" size="small" variant="outlined" sx={{ borderColor: "#fecaca", color: "#991b1b" }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {item.lecturer} • {item.time}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}