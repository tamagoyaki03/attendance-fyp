import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Tabs,
  Tab,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Download,
  Refresh,
  TrendingUp,
  TrendingDown,
  Mail,
  CalendarToday,
  AccessTime,
  FilterList,
  BarChart,
  PieChart,
  ShowChart,
  WarningAmber,
} from "@mui/icons-material";
import { Search as SearchIcon } from "@mui/icons-material";
import { format, subDays, startOfYear } from "date-fns";
import Sidebar from "../components/Sidebar";
import AttendanceTrends from "../components/Event/AttendanceTrends";
import supabase from "../config/supabaseClient";
import TopAbsenceReasons from "../components/Event/TopAbsenceReason";
import FraudDetectionChart from "../components/Event/FraudDetectionChart";
import { calculateAttendanceMetrics } from "../utils/analyticsUtils";

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30days");
  const [kpiData, setKpiData] = useState({
    avgAttendanceRate: 0,
    chronicAbsenteeism: 0,
    excusedRate: 0,
    fraudAttempts: 0,
    prevAttendanceRate: 0,
    prevAbsenteeism: 0,
    prevExcusedRate: 0,
    prevFraudAttempts: 0,
  });
  const [fraudByMethod, setFraudByMethod] = useState([]);

  const user = useMemo(() => {
    const cached = sessionStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  }, []);

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    let startDate;
    switch (timeRange) {
      case "7days":
        startDate = subDays(today, 7);
        break;
      case "30days":
        startDate = subDays(today, 30);
        break;
      case "90days":
        startDate = subDays(today, 90);
        break;
      case "year":
        startDate = startOfYear(today);
        break;
      default:
        startDate = subDays(today, 30);
    }
    // Always compare to previous 30 days (month)
    const prevStart = subDays(today, 60);
    const prevEnd = subDays(today, 30);
    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(today, "yyyy-MM-dd"),
      prevStart: format(prevStart, "yyyy-MM-dd"),
      prevEnd: format(prevEnd, "yyyy-MM-dd"),
    };
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const dates = getDateRange();

      // Use the new analytics utility for current period
      const currentMetrics = await calculateAttendanceMetrics(dates.start, dates.end);
      
      // Use the new analytics utility for previous period
      const prevMetrics = await calculateAttendanceMetrics(dates.prevStart, dates.prevEnd);

      // Calculate percentages for current period
      const avgAttendanceRate = currentMetrics.totalPossible > 0 
        ? Math.round((currentMetrics.presentCount / currentMetrics.totalPossible) * 100) 
        : 0;
      const chronicAbsenteeism = currentMetrics.totalPossible > 0 
        ? Math.round((currentMetrics.absentCount / currentMetrics.totalPossible) * 100) 
        : 0;
      const excusedRate = currentMetrics.totalPossible > 0 
        ? Math.round((currentMetrics.excusedCount / currentMetrics.totalPossible) * 100) 
        : 0;

      // Calculate percentages for previous period
      const prevAttendanceRate = prevMetrics.totalPossible > 0 
        ? Math.round((prevMetrics.presentCount / prevMetrics.totalPossible) * 100) 
        : 0;
      const prevAbsenteeism = prevMetrics.totalPossible > 0 
        ? Math.round((prevMetrics.absentCount / prevMetrics.totalPossible) * 100) 
        : 0;
      const prevExcusedRate = prevMetrics.totalPossible > 0 
        ? Math.round((prevMetrics.excusedCount / prevMetrics.totalPossible) * 100) 
        : 0;

      // Fraud attempts - fetch from fraud_detection_alerts table (only open/unresolved)
      const dateRange = getDateRange();
      
      console.log('Analytics: Fetching fraud data with date range:', dateRange);
      
      const { data: fraudData, error: fraudError } = await supabase
        .from("fraud_detection_alerts")
        .select("id, created_at, status")
        .gte("created_at", dateRange.start);

      console.log('Analytics: Fraud data query result:', { 
        fraudData, 
        fraudError, 
        count: fraudData?.length,
        dateRangeStart: dateRange.start 
      });

      const fraudAttempts = fraudData?.length || 0;

      // Previous period fraud attempts (before current time range)
      const { data: prevFraudData } = await supabase
        .from("fraud_detection_alerts")
        .select("id")
        .lt("created_at", dateRange.start);

      const prevFraudAttempts = prevFraudData?.length || 0;

      setKpiData({
        avgAttendanceRate,
        chronicAbsenteeism,
        excusedRate,
        fraudAttempts,
        prevAttendanceRate,
        prevAbsenteeism,
        prevExcusedRate,
        prevFraudAttempts,
      });

      // Fetch fraud by method data
      const { data: fraudByMethodData } = await supabase
        .from("fraud_detection_alerts")
        .select("description")
        .gte("created_at", dateRange.start);

      if (fraudByMethodData && fraudByMethodData.length > 0) {
        const fraudCounts = {};
        fraudByMethodData.forEach(alert => {
          const desc = alert.description || "";
          
          // Check what anomalies are present
          const hasLocation = desc.includes("Far from class");
          const hasTime = desc.includes("Late for Check In") || desc.includes("Early Check In");
          
          let category;
          if (hasLocation && hasTime) {
            category = "Location + Time Anomaly";
          } else if (hasLocation) {
            category = "Location Anomaly";
          } else if (hasTime) {
            category = "Time Anomaly";
          } else {
            category = "Other";
          }
          
          fraudCounts[category] = (fraudCounts[category] || 0) + 1;
        });
        
        const total = fraudByMethodData.length;
        const fraudItems = Object.entries(fraudCounts)
          .map(([method, count]) => ({
            label: method,
            value: Math.round((count / total) * 100),
            color: method === "Location + Time Anomaly" ? "#dc2626" : 
                   method === "Location Anomaly" ? "#ef4444" : 
                   method === "Time Anomaly" ? "#f59e0b" : "#6b7280",
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5
        setFraudByMethod(fraudItems);
      } else {
        setFraudByMethod([]);
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, timeRange]);

  useEffect(() => {
    // Fetch fraud data by method
    // TODO: Replace with actual fraud detection table when ready
    // For now, using placeholder data
    // const mockFraudData = [
    //   { label: "Location Spoofing", value: 42, color: "#ef4444" },
    //   { label: "QR Code Sharing", value: 28, color: "#f59e0b" },
    //   { label: "Proxy Attendance", value: 15, color: "#3b82f6" },
    //   { label: "Device Manipulation", value: 10, color: "#8b5cf6" },
    //   { label: "Other", value: 5, color: "#6b7280" },
    // ];
    // setFraudItems(mockFraudData);
  }, [timeRange]);

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main
        data-has-sidebar
        className="p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh", marginLeft: "var(--sidebar-width, 250px)", transition: "margin-left 0.3s ease-in-out" }}
      >
        <div>
          <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left" style={{ color: "#0f172a", marginBottom: 0 }}>
            Analytics
          </h2>
          <div className="flex justify-between items-center">
            <p className="text-[14px] font-inter font-normal leading-[17px] text-left" style={{ color: "#374151" }}>
              Comprehensive analytics and insights for attendance management
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                size="small"
                sx={{
                  minWidth: 150,
                  backgroundColor: "#ffffff",
                  border: "1px solid #e6edf3",
                }}
                MenuProps={{
                  PaperProps: {
                    sx: { background: "#ffffff" },
                  },
                }}
              >
                <MenuItem value="7days">Last 7 Days</MenuItem>
                <MenuItem value="30days">Last 30 Days</MenuItem>
                <MenuItem value="90days">Last 90 Days</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>

              <Tooltip title="Refresh">
                <IconButton onClick={fetchAnalyticsData} disabled={isLoading} sx={{ color: "#0f172a" }}>
                  <Refresh className={isLoading ? "animate-spin" : ""} />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* KPI Cards (white cards, Overview style) */}
        <div className="grid grid-cols-4 gap-[10px] mt-6">
          {isLoading ? (
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </div>
          ) : (
            [
              {
                title: "Average Attendance Rate",
                value: `${kpiData.avgAttendanceRate}%`,
                icon: <BarChart />,
                change: kpiData.avgAttendanceRate - kpiData.prevAttendanceRate,
              },
              {
                title: "Absent Rate",
                value: `${kpiData.chronicAbsenteeism}%`,
                icon: <CalendarToday />,
                change: kpiData.chronicAbsenteeism - kpiData.prevAbsenteeism,
              },
              {
                title: "Excused Rate",
                value: `${kpiData.excusedRate}%`,
                icon: <AccessTime />,
                change: kpiData.excusedRate - kpiData.prevExcusedRate,
              },
              {
                title: "Fraud Attempts",
                value: `${kpiData.fraudAttempts}`,
                icon: <WarningAmber />,
                change: kpiData.fraudAttempts - kpiData.prevFraudAttempts,
              },
            ].map((card, i) => {
              const isPositive = card.change >= 0;
              const trendColor = i === 0 || (i === 2 && !isPositive) || (i === 3 && !isPositive) ? "#22c55e" : "#ef4444";
              const TrendIcon = isPositive ? TrendingUp : TrendingDown;

              return (
                <Card
                  key={i}
                  sx={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                  }}
                >
                  <CardHeader
                    title={<Typography variant="subtitle2" color="text.secondary">{card.title}</Typography>}
                    avatar={<Box color="text.secondary">{card.icon}</Box>}
                  />
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} justifyContent="space-between">
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {card.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Compared to previous period
                        </Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography
                          variant="body2"
                          sx={{ color: trendColor, display: "flex", alignItems: "center", gap: 0.5 }}
                        >
                          <TrendIcon fontSize="small" />
                          {Math.abs(card.change) > 0 ? `${isPositive ? "+" : ""}${card.change}%` : "No change"}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Box mt={2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader title="Attendance Trends" subheader="Daily attendance rates over time" />
              <CardContent>
                <AttendanceTrends timeRange={timeRange} />
              </CardContent>
            </Card>

            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader title="Top Absence Reasons" subheader="Most common reasons for absences" />
              <CardContent>
                <TopAbsenceReasons timeRange={timeRange} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[20px]">
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader title="Fraud Detection Analysis" subheader="Detected fraud patterns and trends" />
              <CardContent>
                <FraudDetectionChart timeRange={timeRange} />
              </CardContent>
            </Card>
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader title="Fraud by Method" subheader="Distribution of fraud detection types" />
              <CardContent sx={{ height: 300, pt: 2 }}>
                {fraudByMethod.length > 0 ? (
                  <Box display="flex" flexDirection="column" gap={3}>
                    {fraudByMethod.map((item) => (
                      <Box key={item.label} display="flex" flexDirection="column" gap={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" fontWeight="medium">{item.label}</Typography>
                          <Typography variant="body2" color="text.secondary">{`${item.value}%`}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={item.value}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: "#e5e7eb",
                            '& .MuiLinearProgress-bar': { backgroundColor: item.color },
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No fraud detected in this period</Typography>
                )}
              </CardContent>
            </Card>
          </div>
        </Box>
      </main>
    </div>
 );
}