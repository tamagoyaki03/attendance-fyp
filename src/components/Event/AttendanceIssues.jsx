import React, { useState, useEffect } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Typography, Avatar, Chip, TextField, Tabs, Tab, IconButton
} from "@mui/material";
import { Info, Download, CheckCircle, Cancel } from "@mui/icons-material";
import supabase from "../../config/supabaseClient";

export default function AttendanceIssues({ selectedClass }) {
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [tab, setTab] = useState(0);
  const [usersMap, setUsersMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedClass) {
        setIssues([]);
        return;
      }

      try {
        // First, get all enrollments for the selected class to get enrollment IDs
        const enrollmentTable = selectedClass.type === "Tutorial" ? "enrollment_tutorial" : "enrollment_lecture";
        const enrollmentField = selectedClass.type === "Tutorial" ? "tutorial_id" : "course_id";

        const { data: enrollments, error: enrollError } = await supabase
          .from(enrollmentTable)
          .select("id, student_id")
          .eq(enrollmentField, selectedClass.id);

        if (enrollError) throw enrollError;

        if (!enrollments || enrollments.length === 0) {
          setIssues([]);
          return;
        }

        // Get enrollment IDs for this class
        const enrollmentIds = enrollments.map(e => e.id);
        
        // Determine which enrollment field to filter by in attendance_issues table
        const issueEnrollmentField = selectedClass.type === "Tutorial" 
          ? "enrollment_tutorial_id" 
          : "enrollment_lecture_id";

        // Get attendance issues that match the enrollment IDs
        const { data: issuesData, error: issuesError } = await supabase
          .from("attendance_issues")
          .select("*")
          .in(issueEnrollmentField, enrollmentIds);

        if (issuesError) throw issuesError;

        setIssues(issuesData || []);

        // Get user information for the students who have issues
        if (issuesData && issuesData.length > 0) {
          const userIds = [...new Set(
            issuesData
            .map((i) => i.user_id)
            .filter((id) => id && id !== null && id !== undefined && id.trim !== '')
        )];
          
          if (userIds.length > 0) {
            const { data: users, error: usersError } = await supabase
              .from("users")
              .select("id, name, email")
              .in("id", userIds);

            if (usersError) {
              console.error("Error fetching users:", usersError);
            } else {
              const map = {};
              (users || []).forEach((u) => (map[u.id] = u));
              setUsersMap(map);
            }
          } else {
            setUsersMap({});
          }
        }

      } catch (error) {
        console.error("Error in fetchData:", error);
        setIssues([]);
      }
    };

    fetchData();
  }, [selectedClass?.id, selectedClass?.type]);

  const filteredIssues = issues.filter((issue) => 
    statusFilter === "all" || issue.status === statusFilter
  );

  const handleViewDetails = (issue) => {
    setSelectedIssue(issue);
    setResolutionNotes(issue.resolution_notes || "");
    setDialogOpen(true);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (newStatus === "resolved" && !resolutionNotes.trim()) {
      alert("Please provide resolution notes to resolve the issue.");
      return;
    }

    try {
      // Update in database
      const { error } = await supabase
        .from("attendance_issues")
        .update({ 
          status: newStatus, 
          resolution_notes: resolutionNotes.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setIssues((prev) => prev.map((issue) => 
        issue.id === id 
          ? { 
              ...issue, 
              status: newStatus, 
              resolution_notes: resolutionNotes.trim(),
              updated_at: new Date().toISOString()
            } 
          : issue
      ));
      
      setDialogOpen(false);
    } catch (error) {
      console.error("Error updating issue status:", error);
      alert("Failed to update issue status. Please try again.");
    }
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "resolved":
        return <Chip label="Resolved" color="success" size="small" />;
      case "irresolvable":
        return <Chip label="Irresolvable" color="error" size="small" />;
      case "pending":
        return <Chip label="Pending" variant="outlined" color="warning" size="small" />;
      default:
        return <Chip label="Unknown" size="small" />;
    }
  };

  // Don't render if no class is selected
  if (!selectedClass) {
    return null;
  }

  return (
    <Box p={3} sx={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 1, mt: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Attendance Issues - {selectedClass.course_code}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {filteredIssues.length} issue(s) found
        </Typography>
      </Box>
      
      {filteredIssues.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="text.secondary">
            {issues.length === 0 
              ? "No attendance issues found for this class." 
              : "No issues match the current filter."
            }
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ background: "#ffffff", border: "1px solid #e6edf3" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Issue Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredIssues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                        {(usersMap[issue.user_id]?.name && usersMap[issue.user_id].name[0]) || "?"}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {usersMap[issue.user_id]?.name || "Unknown"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {usersMap[issue.user_id]?.email || issue.user_id}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {new Date(issue.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(issue.created_at).toLocaleTimeString()}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">{issue.issue_type}</Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }}>
                      {issue.description?.length > 50 
                        ? `${issue.description.substring(0, 50)}...` 
                        : issue.description
                      }
                    </Typography>
                  </TableCell>

                  <TableCell>{getStatusChip(issue.status)}</TableCell>

                  <TableCell align="right">
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => handleViewDetails(issue)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={isDialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Attendance Issue Details</DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <>
              <Tabs value={tab} onChange={(e, val) => setTab(val)} sx={{ mb: 2 }}>
                <Tab label="Issue Details" />
                <Tab label="Evidence" />
              </Tabs>

              {tab === 0 && (
                <Box>
                  <Typography gutterBottom>
                    <strong>Student:</strong> {usersMap[selectedIssue.user_id]?.name || "Unknown"}
                  </Typography>
                  <Typography gutterBottom>
                    <strong>Email:</strong> {usersMap[selectedIssue.user_id]?.email || "N/A"}
                  </Typography>
                  <Typography gutterBottom>
                    <strong>Date & Time:</strong> {new Date(selectedIssue.created_at).toLocaleString()}
                  </Typography>
                  <Typography gutterBottom>
                    <strong>Issue Type:</strong> {selectedIssue.issue_type}
                  </Typography>
                  <Typography gutterBottom>
                    <strong>Description:</strong> {selectedIssue.description}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography component="span">
                      <strong>Status:</strong>
                    </Typography>
                    {getStatusChip(selectedIssue.status)}
                  </Box>

                  {selectedIssue.status === "pending" && (
                    <TextField 
                      label="Resolution Notes" 
                      fullWidth 
                      multiline 
                      rows={4} 
                      margin="normal" 
                      value={resolutionNotes} 
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter notes about how this issue was resolved..."
                    />
                  )}

                  {selectedIssue.resolution_notes && (
                    <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                      <Typography variant="subtitle2" gutterBottom>
                        <Info sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Resolution Notes
                      </Typography>
                      <Typography variant="body2">{selectedIssue.resolution_notes}</Typography>
                      {selectedIssue.updated_at && (
                        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                          Last updated: {new Date(selectedIssue.updated_at).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}

              {tab === 1 && (
                <Box>
                  {selectedIssue.evidence_url ? (
                    <Box>
                      <Typography gutterBottom>Evidence provided:</Typography>
                      <Button 
                        variant="outlined" 
                        startIcon={<Download />}
                        href={selectedIssue.evidence_url}
                        target="_blank"
                      >
                        View Evidence
                      </Button>
                    </Box>
                  ) : (
                    <Typography>No evidence provided for this issue.</Typography>
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
              <Button 
                color="error" 
                onClick={() => handleUpdateStatus(selectedIssue.id, "irresolvable")} 
                startIcon={<Cancel />}
              >
                Mark Irresolvable
              </Button>
              <Button 
                color="success" 
                onClick={() => handleUpdateStatus(selectedIssue.id, "resolved")} 
                startIcon={<CheckCircle />}
              >
                Mark Resolved
              </Button>
            </>
          ) : (
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}