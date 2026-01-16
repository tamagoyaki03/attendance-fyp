import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Snackbar,
  Alert,
  Box,
  Paper,
  CircularProgress,
} from "@mui/material";
import MailIcon from "@mui/icons-material/Mail";
import EditIcon from "@mui/icons-material/Edit";
import supabase from "../config/supabaseClient";

export default function FraudReportsTab() {
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const { data: issues, error } = await supabase
          .from("attendance_issues")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setRows(issues || []);

        const userIds = [...new Set((issues || []).map((i) => i.user_id))];
        if (userIds.length) {
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
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const handleUpdateAttendance = async (rowId, studentName) => {
    try {
      await supabase.from("attendance_issues").update({ status: "resolved" }).eq("id", rowId);
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, status: "resolved" } : r)));
      setSnackbar({ open: true, message: `Marked resolved for ${studentName}.`, severity: "success" });
    } catch {
      setSnackbar({ open: true, message: err.message || "Failed to update", severity: "error" });
    }
  };

  return (
    <>
      <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
        <CardHeader
          sx={{ pb: 0 }}
          title={<Typography variant="h6" fontWeight="bold" color="text.primary">Fraud Detections</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">List of suspicious attendance records.</Typography>}
        />
        <CardContent>
          <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Student Name</strong></TableCell>
                  <TableCell>Class</TableCell>
                  <TableCell>Fraud Type</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={20} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No fraud alerts found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{usersMap[row.user_id]?.name || "Unknown"}</TableCell>
                      <TableCell>{row.course_code || row.session_id || "-"}</TableCell>
                      <TableCell>{row.issue_type}</TableCell>
                      <TableCell>{row.created_at?.replace("T", " ")?.slice(0, 16) || "-"}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status || "Flagged"}
                          color={(row.status || "").toLowerCase() === "resolved" ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" justifyContent="flex-end" gap={1}>
                          {((row.status || "").toLowerCase() !== "resolved") && (
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleUpdateAttendance(row.id, usersMap[row.user_id]?.name || "student")}
                              sx={{
                                backgroundColor: "#ffffff",
                                color: "#0f172a",
                                textTransform: "none",
                                "&:hover": { backgroundColor: "#f3f4f6" },
                              }}
                            >
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
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
