import React, { useState, useEffect } from "react";
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
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, startOfYear } from "date-fns";
import { CircularProgress, Box } from "@mui/material";
import supabase from "../../config/supabaseClient";

export default function AttendanceTrends({ timeRange = "30days" }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendanceTrends = async () => {
      setLoading(true);
      try {
        const today = new Date();
        let startDate;
        let isMonthly = false;

        switch (timeRange) {
          case "7days":
            startDate = subDays(today, 7);
            break;
          case "30days":
            startDate = subDays(today, 30);
            break;
          case "90days":
            startDate = subDays(today, 90);
            isMonthly = true;
            break;
          case "year":
            startDate = startOfYear(today);
            isMonthly = true;
            break;
          default:
            startDate = subDays(today, 30);
        }

        // Fetch all sessions in range with course info
        const { data: sessionsData } = await supabase
          .from("attendance_session")
          .select("id, date, course_lecture_id, course_tutorial_id")
          .gte("date", format(startDate, "yyyy-MM-dd"))
          .lte("date", format(today, "yyyy-MM-dd"))
          .order("date", { ascending: true });

        const sessions = sessionsData || [];
        const sessionIds = sessions.map((s) => s.id);

        // Fetch attendance records
        let attendanceRecords = [];
        if (sessionIds.length > 0) {
          const { data: recordsData } = await supabase
            .from("attendance_record")
            .select("id, status, session_id")
            .in("session_id", sessionIds);
          attendanceRecords = recordsData || [];
        }

        // Fetch enrollments for each course to calculate total possible attendance
        const courseEnrollments = {};
        
        // Get lecture enrollments
        for (const session of sessions) {
          if (session.course_lecture_id && !courseEnrollments[`lecture_${session.course_lecture_id}`]) {
            const { data: enrollments } = await supabase
              .from("enrollment_lecture")
              .select("id")
              .eq("course_id", session.course_lecture_id);
            courseEnrollments[`lecture_${session.course_lecture_id}`] = (enrollments || []).length;
          }
          if (session.course_tutorial_id && !courseEnrollments[`tutorial_${session.course_tutorial_id}`]) {
            const { data: enrollments } = await supabase
              .from("enrollment_tutorial")
              .select("id")
              .eq("tutorial_id", session.course_tutorial_id);
            courseEnrollments[`tutorial_${session.course_tutorial_id}`] = (enrollments || []).length;
          }
        }

        // Group by date or month
        let chartData = [];
        if (isMonthly) {
          // Monthly grouping
          const months = eachMonthOfInterval({ start: startDate, end: today });
          chartData = months.map((month) => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const monthSessions = sessions.filter((s) => {
              const sessionDate = new Date(s.date);
              return sessionDate >= monthStart && sessionDate <= monthEnd;
            });
            const monthSessionIds = monthSessions.map((s) => s.id);
            const monthRecords = attendanceRecords.filter((r) => monthSessionIds.includes(r.session_id));
            const presentCount = monthRecords.filter((r) => r.status === "present").length;
            
            // Calculate total possible attendance for this month
            let totalPossible = 0;
            monthSessions.forEach(session => {
              if (session.course_lecture_id) {
                totalPossible += courseEnrollments[`lecture_${session.course_lecture_id}`] || 0;
              }
              if (session.course_tutorial_id) {
                totalPossible += courseEnrollments[`tutorial_${session.course_tutorial_id}`] || 0;
              }
            });
            
            const rate = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;

            return {
              date: format(month, "MMM"),
              attendance: rate,
            };
          });
        } else {
          // Daily grouping
          const days = eachDayOfInterval({ start: startDate, end: today });
          chartData = days.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const daySessions = sessions.filter((s) => s.date === dayStr);
            const daySessionIds = daySessions.map((s) => s.id);
            const dayRecords = attendanceRecords.filter((r) => daySessionIds.includes(r.session_id));
            const presentCount = dayRecords.filter((r) => r.status === "present").length;
            
            // Calculate total possible attendance for this day
            let totalPossible = 0;
            daySessions.forEach(session => {
              if (session.course_lecture_id) {
                totalPossible += courseEnrollments[`lecture_${session.course_lecture_id}`] || 0;
              }
              if (session.course_tutorial_id) {
                totalPossible += courseEnrollments[`tutorial_${session.course_tutorial_id}`] || 0;
              }
            });
            
            const rate = totalPossible > 0 ? Math.round((presentCount / totalPossible) * 100) : 0;

            return {
              date: format(day, "MMM d"),
              attendance: rate,
            };
          });
        }

        setData(chartData);
      } catch (error) {
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceTrends();
  }, [timeRange]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        No data available
      </Box>
    );
  }

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
          domain={[0, 100]}
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
      </LineChart>
    </ResponsiveContainer>
  );
}
