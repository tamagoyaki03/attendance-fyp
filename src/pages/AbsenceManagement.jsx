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
  Search,
  FileCopy,
  Cancel,
  ContentPaste,
} from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import MCSubmissions from "../components/MCSubmission";
import LeaveRequestList from "../components/LeaveRequestList";
import AbsenceTable from "../components/AbsenceTable";

export default function AbsenceManagement() {
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const handleUpdateTemplate = () => {
    setSnackbar({ open: true, message: "Email settings updated successfully.", severity: "success" });
  };
  const handleTabChange = (_e, newValue) => setActiveTab(newValue);

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
    input: { color: "#0f172a" },
  };

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
        <div>
          <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left" style={{ color: "#0f172a", marginBottom: 0 }}>
            Absence Management
          </h2>
          <div className="flex justify-between items-center">
            <p className="text-[14px] font-inter font-normal leading-[17px] text-left" style={{ color: "#374151" }}>
              Manage absences, MC submissions and leave requests
            </p>
          </div>
        </div>

        <Box sx={{ borderBottom: 1, borderColor: "#e5e7eb", mt: 1}}>
          <Tabs value={activeTab} onChange={handleTabChange} textColor="primary" indicatorColor="primary">
            <Tab label={<Box display="flex" alignItems="center"><Cancel fontSize="small" sx={{ mr: 1 }} /> Absences</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><FileCopy fontSize="small" sx={{ mr: 1 }} /> MC Submissions</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><ContentPaste fontSize="small" sx={{ mr: 1 }} /> Leave Requests</Box>} />
            <Tab label={<Box display="flex" alignItems="center"><Mail fontSize="small" sx={{ mr: 1 }} /> Email Settings</Box>} />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <>
            <div className="grid grid-cols-4 gap-[10px] mt-[20px]">
              {[
                { title: "Total Absences", value: 372, subtitle: "Today's absence count" },
                { title: "Emails Sent", value: 372, subtitle: "100% of absences" },
                { title: "MC Submitted", value: 128, subtitle: "34.4% of absences" },
                { title: "Pending Review", value: 87, subtitle: "23.4% of absences" },
              ].map((item, idx) => (
                <Card key={idx} className="border" sx={{ background: "#ffffff", color: "#0f172a", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
                  <CardHeader title={<Typography variant="h6" fontWeight="bold">{item.title}</Typography>} />
                  <CardContent sx={{ pt: 0 }}>
                    <Typography variant="h5" fontWeight="bold" color="text.primary">{item.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.subtitle}</Typography>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <CardHeader sx={{ pb: 0 }}
                title={<Typography variant="h6" fontWeight="bold">Absence Records</Typography>}
                subheader={<Typography variant="body2" color="text.secondary">Manage and track student absences</Typography>}
              />

              <CardContent>
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
                    sx={{ borderRadius: 1, flex: 1, ...inputSx }}
                  />
                </div>

                <AbsenceTable />
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 1 && (
          <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <CardHeader sx={{ pb: 0 }}
              title={<Typography variant="h6" fontWeight="bold" color="text.primary">Medical Certificate & Absence Letter Submissions</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Review and approve student absence documentation</Typography>}
            />
            <CardContent>
              <MCSubmissions />
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
            <CardHeader sx={{ pb: 0 }}
              title={<Typography variant="h6" fontWeight="bold">Leave Requests</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Review and manage student leave requests</Typography>}
            />
            <LeaveRequestList />
          </Card>
        )}

        {activeTab === 3 && (
          <Card className="mt-[10px] border rounded-[6px]" sx={{ background: "#ffffff", border: "1px solid #e2e8f0", p: 2 }}>
            <CardHeader
              title={<Typography variant="h6" color="text.primary" fontWeight="bold">Email Notification Settings</Typography>}
              subheader={<Typography variant="body2" color="text.secondary">Configure automated absence email notifications</Typography>}
            />
            <CardContent>
              <TextField select fullWidth label="Email Timing" defaultValue="immediate" margin="normal">
                <MenuItem value="immediate">Immediate (After class)</MenuItem>
                <MenuItem value="daily">Daily Summary</MenuItem>
                <MenuItem value="weekly">Weekly Summary</MenuItem>
              </TextField>

              <TextField select fullWidth label="Reminder Frequency" defaultValue="3days" margin="normal">
                <MenuItem value="none">No Reminders</MenuItem>
                <MenuItem value="1day">Every Day</MenuItem>
                <MenuItem value="3days">Every 3 Days</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
              </TextField>

              <Box mt={2}>
                <Typography variant="body2" gutterBottom>Email Template</Typography>
                <textarea
                  rows={10}
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #e5e7eb", background: "#ffffff", color: "#0f172a" }}
                  defaultValue={`Dear [Student Name],

We have noticed that you were absent from [Course Name] on [Absence Date].

According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. Please submit your documentation within 7 days of this notice through the student portal.

If you have any questions or need assistance, please contact the Student Affairs Office.

Thank you,
[University Name] Attendance Management System`}
                />
              </Box>

              <TextField fullWidth margin="normal" label="CC Emails" defaultValue="studentaffairs@university.edu, academicoffice@university.edu" />

              <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={handleUpdateTemplate}>
                Update Email Settings
              </Button>
            </CardContent>
          </Card>
        )}

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </main>
    </div>
  );
}