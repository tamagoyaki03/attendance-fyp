import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Snackbar,
  Alert,
  Box,
} from "@mui/material";
import FileTextIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";

export default function ReportGenerator() {
  const [reportType, setReportType] = useState("class");
  const [identifier, setIdentifier] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showToast = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleGenerateReport = () => {
    if (!identifier) {
      showToast(`Please enter an identifier for the ${reportType} report.`, "error");
      return;
    }
    showToast(`Simulated report generated for ${reportType}: ${identifier}.`);
    console.log(`Generating report for ${reportType}: ${identifier}`);
  };

  const handleDownloadReport = () => {
    if (!identifier) {
      showToast(`Please enter an identifier for the ${reportType} report to download.`, "error");
      return;
    }
    showToast(`Simulated download of report for ${reportType}: ${identifier}.`);
    console.log(`Downloading report for ${reportType}: ${identifier}`);
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
    input: { color: "#0f172a" },
  };

  return (
    <>
      <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
        <CardHeader
          sx={{ pb: 0 }}
          title={<Typography variant="h6" fontWeight="bold" color="text.primary">Generate Custom Reports</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">Generate and download detailed reports by attendance session, class, or student.</Typography>}
        />
        <CardContent>
          <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={2} mb={3}>
            <FormControl fullWidth>
              <InputLabel id="report-type-label">Report Type</InputLabel>
              <Select
                labelId="report-type-label"
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value)}
                sx={inputSx}
              >
                <MenuItem value="session">Attendance Session</MenuItem>
                <MenuItem value="class">Class</MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} ID or Name`}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              sx={inputSx}
            />
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<FileTextIcon />}
              onClick={handleGenerateReport}
              sx={{
                backgroundColor: "#0f172a",
                color: "#fff",
                textTransform: "none",
                "&:hover": { backgroundColor: "#0b1320" },
              }}
            >
              Generate Report
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadReport}
              sx={{
                borderColor: "#e6edf3",
                color: "#0f172a",
                textTransform: "none",
                "&:hover": { backgroundColor: "rgba(15,23,42,0.04)" },
              }}
            >
              Download Report
            </Button>
          </Box>
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