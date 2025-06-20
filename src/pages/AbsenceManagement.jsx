import React, { useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  InputAdornment,
  Snackbar,
  Alert,
  MenuItem,
} from "@mui/material";
import {
  Mail,
  FilterList,
  Search,
  FileCopy,
  Cancel,
  ContentPaste,
} from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import MCSubmissions from "../components/MCSubmission"
import LeaveRequestList from "../components/LeaveRequestList";
import AbsenceTable from "../components/AbsenceTable";

export default function AbsenceManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleUpdateTemplate = () => {
    setSnackbar({ open: true, message: "Email settings updated successfully.", severity: "success" });
  };

  const handleTabChange = (_e, newValue) => setActiveTab(newValue);

  return (
    <div className="bg-[#121212] min-h-screen w-screen">
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>
      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
        {/* Section Header */}
        <Typography variant="h5" color="#fafafa" fontWeight="bold">Absence Management</Typography>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "#e5e7eb", mt: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
            <Tab label={<Box display="flex" alignItems="center"><Cancel fontSize="small" sx={{ mr: 1 }} /> Absences</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><FileCopy fontSize="small" sx={{ mr: 1 }} /> MC Submissions</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><ContentPaste fontSize="small" sx={{ mr: 1 }} /> Leave Requests</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><Mail fontSize="small" sx={{ mr: 1 }} /> Email Settings</Box>} />
          </Tabs>
        </Box>

        {/* Absences Tab */}
        {activeTab === 0 && (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-[10px] mt-[20px]">
            {[
                { title: "Total Absences", value: 372, subtitle: "Today's absence count" },
                { title: "Emails Sent", value: 372, subtitle: "100% of absences" },
                { title: "MC Submitted", value: 128, subtitle: "34.4% of absences" },
                { title: "Pending Review", value: 87, subtitle: "23.4% of absences" },
            ].map((item, idx) => (
                <Card key={idx} className="border" style={{ background: "#09090b", color: "#fff" }}>
                <CardHeader title={<Typography variant="h6" fontWeight="bold">{item.title}</Typography>} />
                <CardContent sx={{ pt: 0 }}>
                    <Typography variant="h5" fontWeight="bold">{item.value}</Typography>
                    <Typography variant="body2" color="#a0a0aa">{item.subtitle}</Typography>
                </CardContent>
                </Card>
            ))}
            </div>

            {/* Absence Records Section */}
            <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "black" }}>
            <CardHeader sx={{ pb: 0 }}
                title={
                <Typography variant="h6" fontWeight="bold" >
                    Absence Records
                </Typography>
                }
                subheader={
                <Typography variant="body2" color="textSecondary">
                    Manage and track student absences
                </Typography>
                }
            />

            <CardContent>
                {/* Search*/}
                <div className="flex items-center gap-4 w-full mb-[10px]">
                <TextField
                    variant="outlined"
                    placeholder="Search students..."
                    InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                        <Search fontSize="small" />
                        </InputAdornment>
                    ),
                    }}
                    size="small"
                    sx={{ borderRadius: 1, flex: 1 }}
                />
                </div>

                <AbsenceTable />
            </CardContent>
            </Card>
        </>
        )}

        {/* MC Submissions Tab */}
        {activeTab === 1 && (
            <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "black" }}>
            <CardHeader sx={{ pb: 0 }}
                title={
                <Typography variant="h6" fontWeight="bold" >
                    Medical Certificate & Absence Letter Submissions
                </Typography>
                }
                subheader={
                <Typography variant="body2" color="textSecondary">
                    Review and approve student absence documentation
                </Typography>
                }
            />
            <MCSubmissions />
        </Card>
    )}

        {/* Leave Requests Tab */}
        {activeTab === 2 && (
            <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "black" }}>
            <CardHeader sx={{ pb: 0 }}
                title={
                <Typography variant="h6" fontWeight="bold" >
                    Leave Requests
                </Typography>
                }
                subheader={
                <Typography variant="body2" color="textSecondary">
                    Review and manage student leave requests
                </Typography>
                }
            />
            <LeaveRequestList />
        </Card>
        )}

        {/* Email Settings Tab */}
        {activeTab === 3 && (
          <div className="border border-[#e5e7eb] rounded-[6px] mt-[10px] p-[20px]">
            <Typography variant="h6" color="#fff" fontWeight="bold">
              Email Notification Settings
            </Typography>
            <Typography variant="body2" color="#a0a0aa" mb={2}>
              Configure automated absence email notifications
            </Typography>
            <TextField
              select
              fullWidth
              label="Email Timing"
              defaultValue="immediate"
              margin="normal"
            >
              <MenuItem value="immediate">Immediate (After class)</MenuItem>
              <MenuItem value="daily">Daily Summary</MenuItem>
              <MenuItem value="weekly">Weekly Summary</MenuItem>
            </TextField>
            <TextField
              select
              fullWidth
              label="Reminder Frequency"
              defaultValue="3days"
              margin="normal"
            >
              <MenuItem value="none">No Reminders</MenuItem>
              <MenuItem value="1day">Every Day</MenuItem>
              <MenuItem value="3days">Every 3 Days</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
            </TextField>
            <Box mt={2}>
              <Typography variant="body2" gutterBottom>Email Template</Typography>
              <textarea
                rows={10}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #e5e7eb", background: "black", color: "#fff" }}
                defaultValue={`Dear [Student Name],

                We have noticed that you were absent from [Course Name] on [Absence Date].

                According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. Please submit your documentation within 7 days of this notice through the student portal.

                If you have any questions or need assistance, please contact the Student Affairs Office.

                Thank you,
                [University Name] Attendance Management System`}
              />
            </Box>
            <TextField
              fullWidth
              margin="normal"
              label="CC Emails"
              defaultValue="studentaffairs@university.edu, academicoffice@university.edu"
            />
            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 2, background: "#fff", color: "black" }}
              onClick={handleUpdateTemplate}
            >
              Update Email Settings
            </Button>
          </div>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </main>
    </div>
  );
}
