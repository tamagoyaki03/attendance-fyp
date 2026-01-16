import React, { useState, useEffect } from "react";
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
import { format, subDays, eachDayOfInterval, startOfYear } from "date-fns";
import { CircularProgress, Box, Typography } from "@mui/material";
import supabase from "../../config/supabaseClient";

export default function FraudDetectionChart({ timeRange = "30days" }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [fraudData, setFraudData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFraudData = async () => {
      setLoading(true);
      try {
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
        // Get all days in the interval
        const days = eachDayOfInterval({ start: startDate, end: today });
        // Query fraud_detection_alerts table for alerts in the date range
        const { data, error } = await supabase
          .from('fraud_detection_alerts')
          .select('created_at')
          .gte('created_at', format(startDate, 'yyyy-MM-dd'));
        if (error) {
          throw error;
        }
        // Count fraud attempts per day
        const attemptsByDate = {};
        (data || []).forEach(alert => {
          const dateStr = format(new Date(alert.created_at), 'MMM d');
          attemptsByDate[dateStr] = (attemptsByDate[dateStr] || 0) + 1;
        });
        const chartData = days.map(day => ({
          date: format(day, 'MMM d'),
          attempts: attemptsByDate[format(day, 'MMM d')] || 0
        }));
        setFraudData(chartData);
      } catch (error) {
        setFraudData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFraudData();
  }, [timeRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

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
