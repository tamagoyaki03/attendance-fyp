import React, { useState } from "react";
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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { toast } from "react-toastify";

export default function SubmitAbsenceDocumentPage() {
  const [studentId, setStudentId] = useState("");
  const [absenceDate, setAbsenceDate] = useState(null);
  const [reason, setReason] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      borderRadius: 1,
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
    input: { color: "#0f172a" },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!studentId || !absenceDate || !reason || !documentFile) {
      toast.error("Please fill in all required fields and attach a document.");
      setIsSubmitting(false);
      return;
    }

    // simulate upload / submit
    console.log("Submitting absence document:", {
      studentId,
      absenceDate: absenceDate.toISOString().split("T")[0],
      reason,
      documentFileName: documentFile.name,
      documentFileSize: documentFile.size,
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));

    toast.success("Your absence document has been submitted.");

    setStudentId("");
    setAbsenceDate(null);
    setReason("");
    setDocumentFile(null);
    setIsSubmitting(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#eef2f7",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 4,
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 700,
          bgcolor: "#ffffff",
          color: "#0f172a",
          border: "1px solid #e2e8f0",
          boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
          borderRadius: 2,
        }}
      >
        <CardHeader
          title={<Typography variant="h6" fontWeight="bold">Submit Absence Document</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">Please fill out the form below to submit your absence documentation.</Typography>}
          sx={{ pb: 0, px: 3, pt: 3 }}
        />

        <CardContent>
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                fullWidth
                label="Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                sx={{ ...inputSx }}
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
                      sx={{ ...inputSx }}
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
                sx={{ ...inputSx }}
              />

              <Box>
                <InputLabel sx={{ mb: 1, color: "#64748b" }}>Upload Document</InputLabel>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  style={{
                    color: "#0f172a",
                    background: "#ffffff",
                    border: "1px solid #e6edf3",
                    padding: 8,
                    borderRadius: 6,
                  }}
                />
                {documentFile && (
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Selected file: {documentFile.name} ({Math.round(documentFile.size / 1024)} KB)
                  </Typography>
                )}
              </Box>
            </Box>

            <CardActions sx={{ mt: 3, px: 0 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                sx={{
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#0b1320" },
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Document"}
              </Button>
            </CardActions>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}