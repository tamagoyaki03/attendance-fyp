import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Button,
  Typography,
  Box,
} from "@mui/material";
import Chip from "@mui/material/Chip";
import supabase from "../config/supabaseClient";

export default function FraudTable({ searchTerm = "" }) {
  const [alerts, setAlerts] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      // Fetch from new fraud_detection_alerts table
      const { data: alerts, error: alertsError } = await supabase
        .from("fraud_detection_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (alertsError) {
        console.error("Error fetching fraud detection alerts:", alertsError.message);
        return;
      }

      setAlerts(alerts || []);

      const userIds = [...new Set((alerts || []).map((a) => a.user_id))];

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, name")
          .in("id", userIds);

        if (!usersError && users) {
          const map = {};
          users.forEach((u) => (map[u.id] = u));
          setUsersMap(map);
        }
      }
    };

    fetchData();
  }, []);

  const term = (searchTerm || "").toLowerCase();
  const filteredData = alerts.filter((row) =>
    term
      ? (row.alert_type ?? "").toLowerCase().includes(term) ||
        (row.description ?? "").toLowerCase().includes(term) ||
        (row.course_code ?? "").toLowerCase().includes(term)
      : true
  );

  const handleResolve = async (id) => {
    await supabase
      .from("fraud_detection_alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);

    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "resolved" } : a))
    );
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "open":
        return <Chip label="Open" color="error" variant="outlined" size="small" />;
      case "reviewed":
        return <Chip label="Reviewed" variant="outlined" sx={{ borderColor: "#f59e0b", color: "#b45309" }} size="small" />;
      case "resolved":
        return <Chip label="Resolved" color="success" variant="outlined" size="small" />;
      default:
        return <Chip label={status || "Unknown"} size="small" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const s = (severity || "medium").toLowerCase();
    switch (s) {
      case "high":
        return <Chip label="High" color="error" size="small" />;
      case "medium":
        return <Chip label="Medium" color="warning" size="small" />;
      case "low":
        return <Chip label="Low" color="success" size="small" />;
      default:
        return <Chip label={severity || "Unknown"} size="small" />;
    }
  };

  return (
    <TableContainer
      component={Paper}
      sx={{
        background: "#ffffff",
        border: "1px solid #e6edf3",
        boxShadow: "none",
        borderRadius: 1,
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Student</TableCell>
            <TableCell>Course / Session</TableCell>
            <TableCell>Date & Time</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Details</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                No fraud alerts found.
              </TableCell>
            </TableRow>
          ) : (
            filteredData.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>
                  <Typography fontWeight={500}>
                    {usersMap[alert.user_id]?.name || "Unknown"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.user_id}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Typography>{alert.course_code || alert.session_id || "-"}</Typography>
                </TableCell>

                <TableCell>
                  <Box>
                    <Typography>{alert.created_at?.split("T")[0] ?? "-"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.created_at?.split("T")[1]?.slice(0, 8) ?? "-"}
                    </Typography>
                  </Box>
                </TableCell>

                <TableCell>{alert.issue_type}</TableCell>

                <TableCell sx={{ maxWidth: 300 }}>
                  <Typography variant="body2" noWrap>
                    {alert.description}
                  </Typography>
                </TableCell>

                <TableCell>{getStatusBadge(alert.status)}</TableCell>

                <TableCell align="right">
                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    {["open", "pending"].includes((alert.status || "").toLowerCase()) && (
                      <Button size="small" variant="contained" onClick={() => handleResolve(alert.id)}>
                        Resolve
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}