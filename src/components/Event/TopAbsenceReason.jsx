import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material/styles";

// Sample data
const absenceData = [
  { name: "Medical Issues", value: 42, color: "#2563eb" },
  { name: "Family Emergency", value: 28, color: "#8b5cf6" },
  { name: "Transportation Issues", value: 15, color: "#ec4899" },
  { name: "Other Academic Commitments", value: 10, color: "#f59e0b" },
  { name: "Other", value: 5, color: "#9ca3af" },
];

export default function TopAbsenceReasons() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={absenceData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          dataKey="value"
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
        >
          {absenceData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: isDark ? theme.palette.background.paper : "#fff",
            color: isDark ? theme.palette.text.primary : "#333",
            border: `1px solid ${isDark ? theme.palette.divider : "#ddd"}`,
          }}
          formatter={(value) => [`${value}%`, "Percentage"]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
