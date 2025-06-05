import React from "react";
import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export default function AttendanceStats({ classData }) {
  return (
    <div className="flex gap-4 w-full">
      <Card className="flex-1 border " style={{background: "#09090b"}}>
        <CardHeader
          title={
            <Typography fontSize={16} color="white">
              Total Students
            </Typography>
          }
          action={<GroupIcon sx={{ fontSize: 20, color: "text.secondary" }} />}
          sx={{ pb: 1 }}
        />
        <CardContent>
          <Typography variant="h5" fontWeight="bold">{classData.students.length}</Typography>
          <Typography variant="caption" color="text.secondary">
            Enrolled in this class
          </Typography>
        </CardContent>
      </Card>

      <Card className="flex-1 border ml-[20px]" style={{background: "#09090b"}}>
        <CardHeader
          title={
            <Typography fontSize={16} color="white">
              Present Today
            </Typography>
          }
          action={<CheckCircleIcon sx={{ fontSize: 20, color: "text.secondary" }} />}
          sx={{ pb: 1 }}
        />
        <CardContent>
          <Typography variant="h5">{classData.presentCount}</Typography>
          <Typography variant="caption" color="text.secondary">
            {classData.totalStudents
              ? Math.round((classData.presentCount / classData.totalStudents) * 100)
              : 0}
            % attendance rate
          </Typography>
        </CardContent>
      </Card>

      <Card className="flex-1 border ml-[20px]" style={{background: "#09090b"}}>
        <CardHeader
          title={
            <Typography fontSize={16} color="white">
              Absent Today
            </Typography>
          }
          action={<CancelIcon sx={{ fontSize: 20, color: "text.secondary" }} />}
          sx={{ pb: 1 }}
        />
        <CardContent>
          <Typography variant="h5">{classData.absentCount}</Typography>
          <Typography variant="caption" color="text.secondary">
            {classData.totalStudents
              ? Math.round((classData.absentCount / classData.totalStudents) * 100)
              : 0}
            % absence rate
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}