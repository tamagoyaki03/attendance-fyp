import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@mui/material/styles";
import { CircularProgress, Box, Typography } from "@mui/material";
import supabase from "../../config/supabaseClient";

const COLORS = ["#2563eb", "#8b5cf6", "#ec4899", "#f59e0b", "#9ca3af"];

// Normalize reason text to standard categories
const normalizeReason = (reason) => {
  if (!reason) return "Other";
  
  const lowerReason = reason.toLowerCase().trim();
  
  // Medical Issue keywords
  if (
    lowerReason.includes("sick") ||
    lowerReason.includes("illness") ||
    lowerReason.includes("doctor") ||
    lowerReason.includes("hospital") ||
    lowerReason.includes("medical") ||
    lowerReason.includes("health")
  ) {
    return "Medical Issue";
  }
  
  // Family Emergency keywords
  if (
    lowerReason.includes("family") ||
    lowerReason.includes("emergency") ||
    lowerReason.includes("grandparent") ||
    lowerReason.includes("grandmother") ||
    lowerReason.includes("grandfather") ||
    lowerReason.includes("parent") ||
    lowerReason.includes("relative") ||
    lowerReason.includes("visit grandparent") ||
    lowerReason.includes("kampung")
  ) {
    return "Family Emergency";
  }
  
  // Academic/Educational keywords
  if (
    lowerReason.includes("exchange program") ||
    lowerReason.includes("industrial visit") ||
    lowerReason.includes("academic") ||
    lowerReason.includes("university") ||
    lowerReason.includes("seminar") ||
    lowerReason.includes("conference")
  ) {
    return "Academic";
  }
  
  // Religious/Meditation keywords
  if (
    lowerReason.includes("ordination") ||
    lowerReason.includes("meditation") ||
    lowerReason.includes("religious") ||
    lowerReason.includes("temple") ||
    lowerReason.includes("mosque") ||
    lowerReason.includes("church") ||
    lowerReason.includes("prayer")
  ) {
    return "Religious";
  }
  
  // Personal Leave (default for generic personal reasons)
  if (
    lowerReason.includes("personal") ||
    lowerReason.includes("private") ||
    lowerReason.includes("personal matter")
  ) {
    return "Personal Leave";
  }
  
  // Default to Other for anything not matched
  return "Other";
};

export default function TopAbsenceReasons({ timeRange = "30days" }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [absenceData, setAbsenceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAbsenceReasons = async () => {
      setLoading(true);
      try {
        // Fetch MC submissions with reasons
        const { data: mcData, error: mcError } = await supabase
          .from("mc_submissions")
          .select("id, reason, created_at");

        // Fetch leave requests with reasons
        const { data: leaveData, error: leaveError } = await supabase
          .from("leave_requests")
          .select("id, reason, created_at");

        if (mcError) {
        }
        if (leaveError) {
        }

        // Collect all reasons from both MC submissions and leave requests
        const reasonCounts = {};
        
        // Count MC submission reasons
        (mcData || []).forEach((mc) => {
          const reason = normalizeReason(mc.reason);
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        // Count leave request reasons
        (leaveData || []).forEach((leave) => {
          const reason = normalizeReason(leave.reason);
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        // Convert to array and sort by count
        const reasonArray = Object.entries(reasonCounts)
          .map(([name, count]) => ({ name, value: count }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5

        // Calculate percentages
        const total = reasonArray.reduce((sum, r) => sum + r.value, 0);
        const absenceDataWithColors = reasonArray.map((r, idx) => ({
          name: r.name,
          value: total > 0 ? Math.round((r.value / total) * 100) : 0,
          count: r.value,
          color: COLORS[idx] || "#9ca3af",
        }));

        setAbsenceData(absenceDataWithColors);
      } catch (error) {
        setAbsenceData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAbsenceReasons();
  }, [timeRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (absenceData.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={400} gap={2}>
        <Typography variant="body1" color="text.secondary">
          No absence data available
        </Typography>
        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ maxWidth: "300px" }}>
          Check the browser console for debug information. Absence reasons will appear here once MC submissions or leave requests are approved.
        </Typography>
      </Box>
    );
  }

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
