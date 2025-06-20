import React, { useState } from "react"
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
} from "@mui/material"
import FileTextIcon from "@mui/icons-material/Description"
import DownloadIcon from "@mui/icons-material/Download"

export default function ReportGenerator() {
  const [reportType, setReportType] = useState("class")
  const [identifier, setIdentifier] = useState("")
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  const showToast = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity })
  }

  const handleGenerateReport = () => {
    if (!identifier) {
      showToast(`Please enter an identifier for the ${reportType} report.`, "error")
      return
    }
    showToast(`Simulated report generated for ${reportType}: ${identifier}.`)
    console.log(`Generating report for ${reportType}: ${identifier}`)
  }

  const handleDownloadReport = () => {
    if (!identifier) {
      showToast(`Please enter an identifier for the ${reportType} report to download.`, "error")
      return
    }
    showToast(`Simulated download of report for ${reportType}: ${identifier}.`)
    console.log(`Downloading report for ${reportType}: ${identifier}`)
  }

  return (
    <>
      <Card sx={{background:"#09090b", border:1}}>
        <CardHeader
          title={<Typography variant="h6" fontWeight="bold">Generate Custom Reports</Typography>}
          subheader="Generate and download detailed reports by attendance session, class, or student."
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
            />
          </Box>

          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              startIcon={<FileTextIcon />}
              onClick={handleGenerateReport}
            >
              Generate Report
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadReport}
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
  )
}
