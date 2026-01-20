import React, { useState, useEffect } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Typography, Avatar, Chip, Tabs, Tab, IconButton
} from "@mui/material";
import { Info, Download, CheckCircle, Cancel } from "@mui/icons-material";
import supabase from "../../config/supabaseClient";

export default function AttendanceIssues({ selectedClass }) {
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [statusFilter, setStatusFilter] = useState("all");
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
            } else {
              const map = {};
              (users || []).forEach((u) => (map[u.id] = u));
              setUsersMap(map);
            }
          } else {
            setUsersMap({});
          }
        }

      } catch {
        setIssues([]);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass?.id, selectedClass?.type]);

  const filteredIssues = issues.filter((issue) => 
    statusFilter === "all" || issue.status === statusFilter
  );

  const formatUtcTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const handleViewDetails = (issue) => {
    setSelectedIssue(issue);
    setDialogOpen(true);
  };

  const handleUpdateStatus = async (id) => {
    try {
      const issue = issues.find((i) => i.id === id);
      if (!issue) throw new Error("Issue not found");

      // Mark issue as resolved
      const { error: issueError } = await supabase
        .from("attendance_issues")
        .update({
          status: "resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (issueError) throw issueError;

      // Resolve enrollment → class mapping
      let enrollmentField;
      let enrollmentId;
      let sessionClassColumn;
      let classId;

      if (issue.enrollment_lecture_id) {
        enrollmentField = "lecture_enrollment_id";
        enrollmentId = issue.enrollment_lecture_id;
        sessionClassColumn = "course_lecture_id";

        const { data, error } = await supabase
          .from("enrollment_lecture")
          .select("course_id")
          .eq("id", enrollmentId)
          .single();

        if (error || !data) throw new Error("Failed to resolve lecture enrollment");
        classId = data.course_id;
      } 
      else if (issue.enrollment_tutorial_id) {
        enrollmentField = "tutorial_enrollment_id";
        enrollmentId = issue.enrollment_tutorial_id;
        sessionClassColumn = "course_tutorial_id";

        const { data, error } = await supabase
          .from("enrollment_tutorial")
          .select("tutorial_id")
          .eq("id", enrollmentId)
          .single();

        if (error || !data) throw new Error("Failed to resolve tutorial enrollment");
        classId = data.tutorial_id;
      } 
      else {
        throw new Error("Issue has no enrollment reference");
      }

      // Find MOST RECENT session BEFORE issue was created
      const issueTime = new Date(issue.created_at).toISOString();

      const { data: session, error: sessionError } = await supabase
        .from("attendance_session")
        .select("id, created_at")
        .eq(sessionClassColumn, classId)
        .lte("created_at", issueTime)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError || !session?.id) {
        throw new Error("No matching attendance session found");
      }

      // Upsert attendance_record as PRESENT
      const local = new Date();
      const fakeUtc = new Date(local.getTime() + 8 * 60 * 60 * 1000);
      const { error: recordError } = await supabase
        .from("attendance_record")
        .upsert(
          {
            [enrollmentField]: enrollmentId,
            session_id: session.id,
            status: "present",
            marked_manually: true,
            attendance_issue_id: issue.id,
            created_at: fakeUtc,
          },
          {
            onConflict:
              enrollmentField === "lecture_enrollment_id"
                ? "lecture_enrollment_id,session_id"
                : "tutorial_enrollment_id,session_id",
          }
        );

      if (recordError) throw recordError;

      // Update UI
      setIssues((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: "resolved", updated_at: new Date().toISOString() }
            : i
        )
      );

      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to resolve issue");
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
                      {formatUtcTime(issue.created_at)}
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
                    <strong>Date & Time:</strong> {formatUtcTime(selectedIssue.created_at)}
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
                color="success" 
                onClick={() => handleUpdateStatus(selectedIssue.id)} 
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