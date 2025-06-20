import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import Chip from "@mui/material/Chip";
import supabase from "../config/supabaseClient";

export default function FraudTable( {searchTerm }) {
  const [alerts, setAlerts] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: ""});
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
  const fetchData = async () => {
    // 1. Fetch attendance issues
    const { data: issues, error: issuesError } = await supabase
      .from("attendance_issues")
      .select("*");

    if (issuesError) {
      console.error("Error fetching attendance issues:", issuesError.message);
      return;
    }

    setAlerts(issues || []);

    // 2. Get unique user_ids
    const userIds = [...new Set((issues || []).map((i) => i.user_id))];

    // 3. Fetch from auth.users
    const { data: users, error: usersError } = await supabase
      .from("users") // this works because RLS is OFF on auth.users
      .select("id, name") // you can also try `full_name` if you have it
      .in("id", userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError.message);
      return;
    }

    // 4. Build a map of user_id -> user
    const userMap = {};
    (users || []).forEach((u) => {
      userMap[u.id] = u;
    });

    setUsersMap(userMap);
  };

  fetchData();
}, []);

const term = searchTerm.toLowerCase();
  const filteredData = alerts.filter((row) =>
    term
      ? (row.issue_type ?? "").toLowerCase().includes(term) ||
        (row.description ?? "").toLowerCase().includes(term)
      : true
  );

  const handleResolve = async (id) => {
    // Update status in DB
    await supabase
      .from("attendance_issues")
      .update({ status: "Resolved" })
      .eq("id", id);

    setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, status: "Resolved" } : alert)));
    setSnackbar({
      title: "Alert resolved",
      description: "The fraud alert has been marked as resolved.",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
      return (
        <Chip variant="outlined" sx={{borderColor: "#ffeb3b", color:"#ffeb3b"}} label="Pending" />
      )
      case "open":
        return (
          <Chip variant="outline" className="border-red-500 text-red-500">
            Open
          </Chip>
        )
      case "resolved":
        return (
          <Chip variant="outline" sx={{color:"#008000", backgroundColor: "transparent"}} label="Resolved" />
        )
      default:
        return <Chip variant="outline">Unknown</Chip>
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>Course</TableCell>
            <TableCell>Date & Time</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Details</TableCell>
            <TableCell>Status</TableCell>
            <TableCell className="ml-[40px]">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredData.map((alerts) => (
            <TableRow key={alerts.id}>
              <TableCell>
                <div className="font-medium">{usersMap[alerts.user_id]?.name || "Unknown"}</div>
              </TableCell>
              <TableCell>{alerts.session_id}</TableCell>
              <TableCell>
                <div>{alerts.created_at?.split("T")[0]}</div>
                <div className="text-xs text-muted-foreground">{alerts.created_at?.split("T")[1]?.slice(0, 8)}</div>
              </TableCell>
              <TableCell>{alerts.issue_type}</TableCell>
              <TableCell className="max-w-[200px] truncate">{alerts.description}</TableCell>
              <TableCell>{getStatusBadge(alerts.status)}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  {["open", "pending"].includes(alerts.status) && (
                    <Button size="small" variant="outlined" onClick={() => handleResolve(alert.id)}>
                      Resolve
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

