import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Divider,
  Box,
  Tabs,
  Tab,
  Chip,
  CardActions,
  IconButton,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import DownloadIcon from "@mui/icons-material/Download";
import RoomIcon from "@mui/icons-material/Room";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const attendanceHistory = [
  { date: "Apr 12, 2023", status: "present", checkInTime: "10:02 AM", checkOutTime: "11:28 AM" },
  { date: "Apr 10, 2023", status: "present", checkInTime: "10:05 AM", checkOutTime: "11:30 AM" },
  { date: "Apr 7, 2023", status: "tardy", checkInTime: "10:15 AM", checkOutTime: "11:30 AM" },
  { date: "Apr 5, 2023", status: "present", checkInTime: "10:01 AM", checkOutTime: "11:29 AM" },
  { date: "Apr 3, 2023", status: "absent", checkInTime: null, checkOutTime: null },
];

export default function StudentDetailsCard({ student, onClose, onMarkPresent }) {
  const [activeTab, setActiveTab] = useState(0);

  const handleGenerateReport = () => {
    setTimeout(() => {
      console.log(`Downloading attendance report for ${student?.name}...`);
    }, 1000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return <Chip label="Present" color="success" />;
      case "tardy":
        return <Chip label="Tardy" color="warning" />;
      case "absent":
        return <Chip label="Absent" color="error" variant="outlined" />;
      default:
        return null;
    }
  };

  const getAttendanceRate = () => {
    const total = attendanceHistory.length;
    const present = attendanceHistory.filter((a) => a.status === "present" || a.status === "tardy").length;
    return Math.round((present / total) * 100);
  };

  if (!student) {
    return (
      <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
        <CardContent>
          <Typography variant="h6">No student selected</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", mt: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box minWidth={0}>
            <Typography variant="h6" fontWeight="bold" noWrap>{student.name}</Typography>
            <Typography variant="body2" color="text.secondary">ID: {student.studentId}</Typography>
            <Box mt={1}>{getStatusBadge(student.status)}</Box>
          </Box>

          <Box textAlign="right" minWidth="180px">
            {student.status !== "absent" && (
              <>
                <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end">
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body2">{student.checkInTime}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1} justifyContent="flex-end" mt={1}>
                  <RoomIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {student.checkInLocation ? `${student.checkInLocation.lat.toFixed(4)}, ${student.checkInLocation.lng.toFixed(4)}` : "No location"}
                  </Typography>
                </Box>
              </>
            )}
            <Box display="flex" alignItems="center" gap={1} mt={1} justifyContent="flex-end">
              <CalendarTodayIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {student.status === "absent" ? `Last attended: ${student.lastAttendance || "N/A"}` : "Today"}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Attendance Details" />
          <Tab label="Attendance History" />
        </Tabs>

        {activeTab === 0 && (
          <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }} gap={2}>
            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Attendance Rate</Typography>
                <Typography variant="h4" fontWeight="bold">{getAttendanceRate()}%</Typography>
                <Typography variant="caption" color="text.secondary">Last 30 days</Typography>
              </CardContent>
            </Card>

            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Tardiness</Typography>
                <Typography variant="h4" fontWeight="bold">{attendanceHistory.filter((a) => a.status === "tardy").length}</Typography>
                <Typography variant="caption" color="text.secondary">Late check-ins</Typography>
              </CardContent>
            </Card>

            <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }} style={{ gridColumn: "1 / -1" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {student.status === "tardy"
                    ? "Student has been late multiple times this month. Consider sending a reminder about attendance policy."
                    : student.status === "absent"
                      ? "Student has missed multiple classes. Follow up required."
                      : "No special notes for this student."}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Date</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Check-in</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Check-out</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map((record, index) => (
                  <tr key={index}>
                    <td style={{ padding: 8 }}>{record.date}</td>
                    <td style={{ padding: 8 }}>{getStatusBadge(record.status)}</td>
                    <td style={{ padding: 8 }}>{record.checkInTime || "—"}</td>
                    <td style={{ padding: 8 }}>{record.checkOutTime || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, py: 2, borderTop: "1px solid #e6edf3" }}>
        <Button variant="outlined" onClick={onClose}>Close</Button>
        <Box ml="auto" display="flex" gap={1}>
          <Button variant="outlined" onClick={handleGenerateReport} startIcon={<DownloadIcon />}>Generate Report</Button>
          <Button onClick={() => console.log("Download") } startIcon={<DownloadIcon />}>Download</Button>
        </Box>
      </CardActions>
    </Card>
  );
}