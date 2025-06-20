import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material/styles";

// Sample data
const fraudData = [
  { date: "Apr 1", attempts: 12 },
  { date: "Apr 2", attempts: 15, },
  { date: "Apr 3", attempts: 18},
  { date: "Apr 4", attempts: 14},
  { date: "Apr 5", attempts: 10},
  { date: "Apr 6", attempts: 8},
  { date: "Apr 7", attempts: 9},
  { date: "Apr 8", attempts: 11},
  { date: "Apr 9", attempts: 13},
  { date: "Apr 10", attempts: 16 },
  { date: "Apr 11", attempts: 14 },
  { date: "Apr 12", attempts: 12 },
  { date: "Apr 13", attempts: 10 },
  { date: "Apr 14", attempts: 9 },
];

export default function FraudDetectionChart() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart
        data={fraudData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? "#333" : "#eee"}
        />
        <XAxis
          dataKey="date"
          stroke={isDark ? "#888" : "#333"}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          stroke={isDark ? "#888" : "#333"}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? theme.palette.background.paper : "#fff",
            color: isDark ? theme.palette.text.primary : "#333",
            border: `1px solid ${isDark ? theme.palette.divider : "#ddd"}`,
          }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="attempts"
          name="Fraud Attempts"
          stroke="#ef4444"
          fill="#ef4444"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
