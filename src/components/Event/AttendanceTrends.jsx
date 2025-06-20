import React from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useTheme } from "@mui/material/styles";

// Sample data
const dailyData = [
  { date: "Apr 1", attendance: 87, average: 85 },
  { date: "Apr 2", attendance: 85, average: 85 },
  { date: "Apr 3", attendance: 82, average: 85 },
  { date: "Apr 4", attendance: 86, average: 85 },
  { date: "Apr 5", attendance: 88, average: 85 },
  { date: "Apr 6", attendance: 84, average: 85 },
  { date: "Apr 7", attendance: 83, average: 85 },
  { date: "Apr 8", attendance: 89, average: 85 },
  { date: "Apr 9", attendance: 90, average: 85 },
  { date: "Apr 10", attendance: 87, average: 85 },
  { date: "Apr 11", attendance: 86, average: 85 },
  { date: "Apr 12", attendance: 88, average: 85 },
  { date: "Apr 13", attendance: 89, average: 85 },
  { date: "Apr 14", attendance: 84, average: 85 },
];

const yearlyData = [
  { date: "Jan", attendance: 82, average: 85 },
  { date: "Feb", attendance: 84, average: 85 },
  { date: "Mar", attendance: 86, average: 85 },
  { date: "Apr", attendance: 87, average: 85 },
  { date: "May", attendance: 89, average: 85 },
  { date: "Jun", attendance: 85, average: 85 },
  { date: "Jul", attendance: 83, average: 85 },
  { date: "Aug", attendance: 80, average: 85 },
  { date: "Sep", attendance: 88, average: 85 },
  { date: "Oct", attendance: 87, average: 85 },
  { date: "Nov", attendance: 86, average: 85 },
  { date: "Dec", attendance: 84, average: 85 },
];

export default function AttendanceTrends({ isYearly = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const data = isYearly ? yearlyData : dailyData;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? theme.palette.divider : "#eee"}
        />
        <XAxis
          dataKey="date"
          stroke={isDark ? "#ccc" : "#333"}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          stroke={isDark ? "#ccc" : "#333"}
          tick={{ fontSize: 12 }}
          domain={[75, 95]}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? theme.palette.background.paper : "#fff",
            color: isDark ? theme.palette.text.primary : "#333",
            border: `1px solid ${isDark ? theme.palette.divider : "#ddd"}`,
          }}
          formatter={(value) => [`${value}%`, "Attendance"]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="attendance"
          name="Attendance Rate"
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, stroke: theme.palette.primary.main, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="average"
          name="Average"
          stroke={theme.palette.grey[500]}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
