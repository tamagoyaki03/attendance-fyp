import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";

export default function OnlineAttendanceDialog({ open, onClose, onProceed }) {
  const [recordingLink, setRecordingLink] = useState("");
  const [quizContent, setQuizContent] = useState("{\n  \"question\": \"\",\n  \"options\": [],\n  \"answer\": \"\"\n}");
  const [minWatchTime, setMinWatchTime] = useState("");
  const [error, setError] = useState("");

  const allFilled = recordingLink.trim() && quizContent.trim() && minWatchTime.trim();

  const handleProceed = () => {
    if (!allFilled) {
      setError("All fields are required.");
      return;
    }
    setError("");
    onProceed({ recordingLink, quizContent, minWatchTime });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ background: "#fff" }}>
        Online Attendance
      </DialogTitle>

      <DialogContent
        sx={{
          backgroundColor: "#ffffff",
          color: "text.primary",
          borderRadius: 1,
          p: 3,
        }}
      >
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Add online recording link and quiz content in JSON format.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <TextField
            label="Recording Link"
            variant="outlined"
            fullWidth
            required
            value={recordingLink}
            onChange={(e) => setRecordingLink(e.target.value)}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#fff",
                "& fieldset": { borderColor: "#e6edf3" },
                "&:hover fieldset": { borderColor: "#cbd5e1" },
                "&.Mui-focused fieldset": { borderColor: "#0f172a" },
              },
            }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <TextField
            label="Minimum Watch Time (minutes)"
            variant="outlined"
            fullWidth
            required
            type="number"
            value={minWatchTime}
            onChange={(e) => setMinWatchTime(e.target.value)}
            size="small"
            placeholder="e.g., 30"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#fff",
                "& fieldset": { borderColor: "#e6edf3" },
                "&:hover fieldset": { borderColor: "#cbd5e1" },
                "&.Mui-focused fieldset": { borderColor: "#0f172a" },
              },
            }}
          />
        </Box>

        <Box>
          <TextField
            label="Quiz Content (JSON)"
            variant="outlined"
            fullWidth
            required
            multiline
            minRows={4}
            value={quizContent}
            onChange={(e) => setQuizContent(e.target.value)}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#fff",
                "& fieldset": { borderColor: "#e6edf3" },
                "&:hover fieldset": { borderColor: "#cbd5e1" },
                "&.Mui-focused fieldset": { borderColor: "#0f172a" },
              },
            }}
          />
        </Box>
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, background: "#fff" }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderColor: "#e6edf3", color: "#0f172a", textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          onClick={handleProceed}
          variant="contained"
          disabled={!allFilled}
          sx={{ backgroundColor: "#0f172a", color: "#fff", textTransform: "none", "&:hover": { backgroundColor: "#0b1320" } }}
        >
          Proceed
        </Button>
      </DialogActions>
    </Dialog>
  );
}