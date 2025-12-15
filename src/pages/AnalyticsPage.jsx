import React, { useState } from "react";
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
  useTheme,
  TextField,
  InputAdornment,
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
import Sidebar from "../components/Sidebar";
import AttendanceTrends from "../components/Event/AttendanceTrends";
import TopAbsenceReasons from "../components/Event/TopAbsenceReason";
import FraudDetectionChart from "../components/Event/FraudDetectionChart";

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("30days");
  const [tab, setTab] = useState(0);
  const theme = useTheme();

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const fraudItems = [
  { label: "Location Spoofing", value: 42, color: "#ef4444" }, // red-500
  { label: "QR Code Sharing", value: 28, color: "#f59e0b" },   // amber-500
  { label: "Proxy Attendance", value: 15, color: "#3b82f6" },  // blue-500
  { label: "Device Manipulation", value: 10, color: "#8b5cf6" }, // purple-500
  { label: "Other", value: 5, color: "#6b7280" },               // gray-500
];

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
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
                <IconButton onClick={refreshData} disabled={isLoading} sx={{ color: "#0f172a" }}>
                  <Refresh className={isLoading ? "animate-spin" : ""} />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* KPI Cards (white cards, Overview style) */}
        <div className="grid grid-cols-4 gap-[10px] mt-6">
          {[
            { title: "Average Attendance Rate", value: "87.3%", icon: <BarChart />, change: "+2.5%", trend: <TrendingUp />, trendColor: "#22c55e" },
            { title: "Chronic Absenteeism", value: "8.2%", icon: <CalendarToday />, change: "+0.7%", trend: <TrendingUp />, trendColor: "#ef4444" },
            { title: "Late Check-ins", value: "12.4%", icon: <AccessTime />, change: "-1.2%", trend: <TrendingDown />, trendColor: "#22c55e" },
            { title: "Fraud Attempts", value: "1.8%", icon: <WarningAmber />, change: "-0.3%", trend: <TrendingDown />, trendColor: "#22c55e" },
          ].map((card, i) => (
            <Card key={i} sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
              <CardHeader
                title={<Typography variant="subtitle2" color="text.secondary">{card.title}</Typography>}
                avatar={<Box color="text.secondary">{card.icon}</Box>}
              />
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} justifyContent="space-between">
                  <Box>
                    <Typography variant="h5" fontWeight="bold">{card.value}</Typography>
                    <Typography variant="caption" color="text.secondary">Compared to previous period</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2" sx={{ color: card.trendColor, display: "flex", alignItems: "center", gap: 0.5 }}>
                      {card.trend} {card.change}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </div>

        <Box mt={2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader title="Attendance Trends" subheader="Daily attendance rates over time" />
              <CardContent>
                <AttendanceTrends />
              </CardContent>
            </Card>

            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader title="Top Absence Reasons" subheader="Most common reasons for absences" />
              <CardContent>
                <TopAbsenceReasons />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[20px]">
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader title="Fraud Detection Analysis" subheader="Detected fraud patterns and trends" />
              <CardContent>
                <FraudDetectionChart />
              </CardContent>
            </Card>

            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader title="Fraud by Method" />
              <CardContent sx={{ height: 300, pt: 2 }}>
                <Box display="flex" flexDirection="column" gap={3}>
                  {fraudItems.map((item) => (
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
                          backgroundColor: theme.palette.grey[300],
                          '& .MuiLinearProgress-bar': { backgroundColor: item.color },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </div>
        </Box>
      </main>
    </div>
 );
}