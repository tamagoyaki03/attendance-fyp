import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

export default function ChooseModeDialog({ open, onClose, onChoose }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ background: "#fff" }}>
        Choose Attendance Mode
      </DialogTitle>

      <DialogContent sx={{ background: "#ffffff", p: 3}}>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Please select the attendance mode for this session.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, background: "#fff" }}>
        <Button
          onClick={() => onChoose("Online")}
          variant="outlined"
          sx={{
            color: "#0f172a",
            borderColor: "#e6edf3",
            textTransform: "none",
            mr: 1,
          }}
        >
          Online
        </Button>

        <Button
          onClick={() => onChoose("Physical")}
          variant="contained"
          sx={{
            color: "#fff",
            backgroundColor: "#0f172a",
            textTransform: "none",
            "&:hover": { backgroundColor: "#0b1320" },
            mr: 1,
          }}
        >
          Physical
        </Button>

        <Button onClick={onClose} variant="text" sx={{ color: "text.secondary", textTransform: "none" }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}