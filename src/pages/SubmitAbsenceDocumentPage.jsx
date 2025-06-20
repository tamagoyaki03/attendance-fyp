import React, { useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  TextField,
  Typography,
  InputLabel,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { useTheme } from "@mui/material/styles"
import { toast } from "react-toastify"

export default function SubmitAbsenceDocumentPage() {
  const [studentId, setStudentId] = useState("")
  const [absenceDate, setAbsenceDate] = useState(null)
  const [reason, setReason] = useState("")
  const [documentFile, setDocumentFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!studentId || !absenceDate || !reason || !documentFile) {
      toast.error("Please fill in all required fields and attach a document.")
      setIsSubmitting(false)
      return
    }

    console.log("Submitting absence document:", {
      studentId,
      absenceDate: absenceDate.toISOString().split("T")[0],
      reason,
      documentFileName: documentFile.name,
      documentFileSize: documentFile.size,
    })

    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast.success("Your absence document has been submitted.")

    setStudentId("")
    setAbsenceDate(null)
    setReason("")
    setDocumentFile(null)
    setIsSubmitting(false)
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#09090b",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 4,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 600, bgcolor: "#09090b", color: "#fff", border:1 }}>
        <CardHeader
          title="Submit Absence Document"
          subheader="Please fill out the form below to submit your absence document."
          subheaderTypographyProps={{ color: "#a1a1aa" }}
        />
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={3}>
              <TextField
                fullWidth
                label="Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                InputProps={{ sx: { color: "#fafafa" } }}
                InputLabelProps={{ sx: { color: "#a1a1aa" } }}
              />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Absence Date"
                  value={absenceDate}
                  onChange={(newValue) => setAbsenceDate(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      required
                      InputProps={{ sx: { color: "#fafafa" } }}
                      InputLabelProps={{ sx: { color: "#a1a1aa" } }}
                    />
                  )}
                />
              </LocalizationProvider>
              <TextField
                fullWidth
                label="Reason for Absence"
                value={reason}
                multiline
                rows={4}
                onChange={(e) => setReason(e.target.value)}
                required
                InputProps={{ sx: { color: "#fafafa" } }}
                InputLabelProps={{ sx: { color: "#a1a1aa" } }}
              />
              <Box>
                <InputLabel sx={{ mb: 1, color: "#a1a1aa" }}>Upload Document</InputLabel>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  style={{ color: "#fafafa" }}
                />
                {documentFile && (
                  <Typography variant="body2" color="#a1a1aa" mt={1}>
                    Selected file: {documentFile.name} ({Math.round(documentFile.size / 1024)} KB)
                  </Typography>
                )}
              </Box>
            </Box>
            <CardActions sx={{ mt: 4 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isSubmitting}
                sx={{ color: "#09090b", backgroundColor: "#fafafa", "&:hover": { backgroundColor: "#e4e4e7" } }}
              >
                {isSubmitting ? "Submitting..." : "Submit Document"}
              </Button>
            </CardActions>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
