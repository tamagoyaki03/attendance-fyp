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

            return {
              id: lecture.id,
              code: lecture.course_code,
              name: lecture.course_title,
              lecturer: lecture.users?.name || "N/A",
              time: `${lecture.lecture_start_time} - ${lecture.lecture_end_time}`,
              location: lecture.lecture_location,
              totalStudents: attendanceRate.totalStudents,
              totalSessions: attendanceRate.totalSessions,
              attendanceRate: Math.round(attendanceRate.attendanceRate * 10) / 10,
              type: lecture.type || "Lecture",
            };
          })
        );

        setClassesData(classDataWithStats);
      } catch (error) {
        console.error("Error loading class data:", error);
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
        } catch (error) {
          console.error("Error fetching detailed attendance data:", error);
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

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {classesData.map((item) => {
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
                    <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                      {item.code}: {item.name}
                    </Typography>
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
                          Late
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: "#f59e0b" }}>
                          {attendanceDetails.lateCount}
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
                      <Chip label={attendanceDetails.totalSessions} />
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
    </Box>
  );
}