import React, { useState, useEffect } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Typography, Avatar, Chip, TextField, Tabs, Tab, IconButton
} from "@mui/material";
import { Info, Download, CheckCircle, Cancel } from "@mui/icons-material";
import supabase from "../../config/supabaseClient";

export default function AttendanceIssues() {
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [tab, setTab] = useState(0);
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const { data: issuesData, error: issuesError } = await supabase.from("attendance_issues").select("*");
      if (issuesError) return;
      setIssues(issuesData || []);
      const userIds = [...new Set((issuesData || []).map((i) => i.user_id))];
      if (userIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, name").in("id", userIds);
        const map = {};
        (users || []).forEach((u) => (map[u.id] = u));
        setUsersMap(map);
      }
    };
    fetchData();
  }, []);

  const filteredIssues = issues.filter((issue) => statusFilter === "all" || issue.status === statusFilter);

  const handleViewDetails = (issue) => {
    setSelectedIssue(issue);
    setResolutionNotes(issue.resolutionNotes || "");
    setDialogOpen(true);
  };

  const handleUpdateStatus = (id, newStatus) => {
    if (newStatus === "resolved" && !resolutionNotes.trim()) {
      alert("Please provide resolution notes to resolve the issue.");
      return;
    }
    setIssues((prev) => prev.map((issue) => (issue.id === id ? { ...issue, status: newStatus, resolutionNotes: resolutionNotes.trim() } : issue)));
    setDialogOpen(false);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "resolved":
        return <Chip label="Resolved" color="success" />;
      case "irresolvable":
        return <Chip label="Irresolvable" color="error" />;
      case "pending":
        return <Chip label="Pending" variant="outlined" color="warning" />;
      default:
        return <Chip label="Unknown" />;
    }
  };

  return (
    <Box p={3} sx={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 1, mt: 3 }}>
      <Typography variant="h6" mb={2}>Attendance Issues</Typography>

      <TableContainer component={Paper} sx={{ background: "#ffffff", border: "1px solid #e6edf3" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Issue Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredIssues.map((issue) => (
              <TableRow key={issue.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar>{(usersMap[issue.user_id]?.name && usersMap[issue.user_id].name[0]) || "?"}</Avatar>
                    <Box>
                      <Typography>{usersMap[issue.user_id]?.name || "Unknown"}</Typography>
                      <Typography variant="caption" color="text.secondary">{issue.studentId || issue.user_id}</Typography>
                    </Box>
                  </Box>
                </TableCell>

                <TableCell>
                  <div>{issue.created_at?.split("T")[0]}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{issue.created_at?.split("T")[1]?.slice(0, 8)}</div>
                </TableCell>

                <TableCell>{issue.issue_type}</TableCell>
                <TableCell>{getStatusChip(issue.status)}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => handleViewDetails(issue)}>View Details</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={isDialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Attendance Issue Details</DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <>
              <Tabs value={tab} onChange={(e, val) => setTab(val)} sx={{ mb: 2 }}>
                <Tab label="Issue Details" />
                <Tab label={`Documents (${selectedIssue.documents?.length || 0})`} />
              </Tabs>

              {tab === 0 && (
                <Box>
                  <Typography gutterBottom><strong>Date & Time:</strong> {selectedIssue.issueDate} at {selectedIssue.issueTime}</Typography>
                  <Typography gutterBottom><strong>Issue Type:</strong> {selectedIssue.issueType}</Typography>
                  <Typography gutterBottom><strong>Description:</strong> {selectedIssue.description}</Typography>
                  <Typography gutterBottom><strong>Status:</strong> {getStatusChip(selectedIssue.status)}</Typography>

                  {selectedIssue.status === "pending" && (
                    <TextField label="Resolution Notes" fullWidth multiline rows={4} margin="normal" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
                  )}

                  {(selectedIssue.status === "resolved" || selectedIssue.status === "irresolvable") && selectedIssue.resolutionNotes && (
                    <Box mt={2}>
                      <Chip icon={<Info />} label="Resolution Notes" />
                      <Typography variant="body2" mt={1}>{selectedIssue.resolutionNotes}</Typography>
                    </Box>
                  )}
                </Box>
              )}

              {tab === 1 && (
                <Box>
                  {(selectedIssue.documents?.length || 0) === 0 ? (
                    <Typography>No supporting documents provided.</Typography>
                  ) : (
                    selectedIssue.documents.map((doc) => (
                      <Box key={doc.id} display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Box>
                          <Typography>{doc.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{doc.size} • Uploaded on {doc.uploadDate}</Typography>
                        </Box>
                        <IconButton><Download /></IconButton>
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          {selectedIssue?.status === "pending" ? (
            <>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button color="error" onClick={() => handleUpdateStatus(selectedIssue.id, "irresolvable")} startIcon={<Cancel />}>Mark Irresolvable</Button>
              <Button color="success" onClick={() => handleUpdateStatus(selectedIssue.id, "resolved")} startIcon={<CheckCircle />}>Mark Resolved</Button>
            </>
          ) : (
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}