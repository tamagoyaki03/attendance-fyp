import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from "@mui/icons-material";

/**
 * Standardized confirmation dialog component
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onClose - Callback when dialog is closed
 * @param {function} onConfirm - Callback when user confirms
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message/content
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} severity - Type of dialog: "error", "warning", "info", "success" (default: "warning")
 * @param {string} confirmColor - Color of confirm button (default: based on severity)
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  severity = "warning",
  confirmColor,
}) {
  const getIcon = () => {
    switch (severity) {
      case "error":
        return <ErrorIcon sx={{ fontSize: 48, color: "#ef4444" }} />;
      case "warning":
        return <WarningIcon sx={{ fontSize: 48, color: "#f59e0b" }} />;
      case "info":
        return <InfoIcon sx={{ fontSize: 48, color: "#3b82f6" }} />;
      case "success":
        return <SuccessIcon sx={{ fontSize: 48, color: "#22c55e" }} />;
      default:
        return <WarningIcon sx={{ fontSize: 48, color: "#f59e0b" }} />;
    }
  };

  const getConfirmColor = () => {
    if (confirmColor) return confirmColor;
    switch (severity) {
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "info":
        return "primary";
      case "success":
        return "success";
      default:
        return "primary";
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={2}>
          {getIcon()}
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: "#e2e8f0",
            color: "#64748b",
            "&:hover": {
              borderColor: "#cbd5e1",
              backgroundColor: "#f8fafc",
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={getConfirmColor()}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
