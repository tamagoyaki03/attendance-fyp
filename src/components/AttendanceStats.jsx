import React from "react";
import { Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export default function AttendanceStats({ classData, presentCount = 0, absentCount = 0 }) {
  
  // Add loading check
 if (!classData) {
   return (
     <Box display="flex" gap={2} width="100%">
       {[1, 2, 3].map((i) => (
         <Card key={i} sx={{ flex: 1, background: "#ffffff" }}>
           <CardContent>
             <Typography variant="h5">-</Typography>
             <Typography variant="caption">Loading...</Typography>
           </CardContent>
         </Card>
       ))}
     </Box>
   );
 }

  const total = Array.isArray(classData?.students) ? classData.students.length : 0;
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
  const absenceRate = total > 0 ? Math.round((absentCount / total) * 100) : 0;

  const cardSx = {
    flex: 1,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
  };

  return (
    <Box display="flex" gap={2} width="100%">
      <Card sx={cardSx}>
        <CardHeader
          title={<Typography fontSize={14} color="text.secondary">Total Students</Typography>}
          action={<GroupIcon sx={{ fontSize: 20, color: "text.secondary" }} />}
          sx={{ pb: 0 }}
        />
        <CardContent>
          <Typography variant="h5" fontWeight="bold">{total}</Typography>
          <Typography variant="caption" color="text.secondary">Enrolled in this class</Typography>
        </CardContent>
      </Card>

      <Card sx={cardSx}>
        <CardHeader
          title={<Typography fontSize={14} color="text.secondary">Present Today</Typography>}
          action={<CheckCircleIcon sx={{ fontSize: 20, color: "text.secondary" }} />}
          sx={{ pb: 0 }}
        />
        <CardContent>
          <Typography variant="h5" fontWeight="bold">{presentCount}</Typography>
          <Typography variant="caption" color="text.secondary">{attendanceRate}% attendance rate</Typography>
        </CardContent>
      </Card>

      <Card sx={cardSx}>
        <CardHeader
          title={<Typography fontSize={14} color="text.secondary">Absent Today</Typography>}
          action={<CancelIcon sx={{ fontSize: 20, color: "text.secondary" }} />}
          sx={{ pb: 0 }}
        />
        <CardContent>
          <Typography variant="h5" fontWeight="bold">{absentCount}</Typography>
          <Typography variant="caption" color="text.secondary">{absenceRate}% absence rate</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}