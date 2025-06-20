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
  useTheme
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
    <div className="bg-[#121212] min-h-screen w-screen">
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>
      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
        {/* Section Header */}
        <div>
          <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left text-[#fafafa] mb-[0px]">
            Analytics
          </h2>
          <div className="flex justify-between items-center mb-[10px]">
            <p className="text-[14px] font-inter font-normal leading-[17px] text-left text-[#a1a1aa]">
              Comprehensive analytics and insights for attendance management
            </p>
            <div className="flex gap-2">
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                size="small"
                sx={{ minWidth: 150, background: "#18181b", color: "#fafafa" }}
                MenuProps={{
                  PaperProps: {
                    sx: { background: "#18181b", color: "#fafafa" },
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
                <IconButton onClick={refreshData} disabled={isLoading} sx={{ color: "#fafafa" }}>
                  <Refresh className={isLoading ? "animate-spin" : ""} />
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-[10px]">
          {[
            {
              title: "Average Attendance Rate",
              value: "87.3%",
              icon: <BarChart />,
              change: "+2.5%",
              trend: <TrendingUp />,
              trendColor: "#22c55e",
            },
            {
              title: "Chronic Absenteeism",
              value: "8.2%",
              icon: <CalendarToday />,
              change: "+0.7%",
              trend: <TrendingUp />,
              trendColor: "#ef4444",
            },
            {
              title: "Late Check-ins",
              value: "12.4%",
              icon: <AccessTime />,
              change: "-1.2%",
              trend: <TrendingDown />,
              trendColor: "#22c55e",
            },
            {
              title: "Fraud Attempts",
              value: "1.8%",
              icon: <WarningAmber />,
              change: "-0.3%",
              trend: <TrendingDown />,
              trendColor: "#22c55e",
            },
          ].map((card, i) => (
            <Card key={i} className="border" style={{ background: "#09090b", color: "#fafafa" }}>
              <CardHeader
                title={<Typography variant="subtitle2">{card.title}</Typography>}
                avatar={<Box color="#a1a1aa">{card.icon}</Box>}
              />
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h5">{card.value}</Typography>
                  <Typography variant="body2" sx={{ color: card.trendColor }}>
                    {card.trend} {card.change}
                  </Typography>
                </Box>
                <Typography variant="caption" color="#a1a1aa">
                  Compared to previous period
                </Typography>
              </CardContent>
            </Card>
          ))}
        </div>

        <Box mt={2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
              <Card className="border" style={{ background: "#09090b", color: "#fafafa"}}>
                <CardHeader title="Attendance Trends" subheader="Daily attendance rates over time" />
                <AttendanceTrends />
              </Card>
              <Card className="border" style={{ background: "#09090b", color: "#fafafa"}}>
                <CardHeader title="Top Absence Reasons" subheader="Most common reasons for absences" />
                <TopAbsenceReasons />
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[20px]">
              <Card className="border" style={{ background: "#09090b", color: "#fafafa" }}>
                <CardHeader title="Fraud Detection Analysis" subheader="Detected fraud patterns and trends" />
                <FraudDetectionChart />
              </Card>
              <Card className="border" style={{ background: "#09090b", color: "#fafafa" }}>
                <CardHeader title="Fraud by Method" />
                <CardContent sx={{ height: 300, pt: 2 }}>
                <Box display="flex" flexDirection="column" gap={3}>
                    {fraudItems.map((item) => (
                    <Box key={item.label} display="flex" flexDirection="column" gap={1}>
                        <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="medium">
                            {item.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {`${item.value}%`}
                        </Typography>
                        </Box>
                        <LinearProgress
                        variant="determinate"
                        value={item.value}
                        sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: theme.palette.grey[300],
                            '& .MuiLinearProgress-bar': {
                            backgroundColor: item.color,
                            },
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