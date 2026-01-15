import React from "react";
import { Snackbar, Alert } from "@mui/material";

/**
 * Standardized toast/snackbar component
 * @param {boolean} open - Whether the toast is visible
 * @param {function} onClose - Callback when toast is closed
 * @param {string} message - Toast message
 * @param {string} severity - Type: "error", "warning", "info", "success" (default: "info")
 * @param {number} autoHideDuration - Duration before auto-hide in ms (default: 4000)
 * @param {string} position - Position: "top-center", "top-right", "bottom-center", "bottom-right" (default: "bottom-center")
 */
export default function Toast({
  open,
  onClose,
  message,
  severity = "info",
  autoHideDuration = 4000,
  position = "bottom-center",
}) {
  const getAnchorOrigin = () => {
    switch (position) {
      case "top-center":
        return { vertical: "top", horizontal: "center" };
      case "top-right":
        return { vertical: "top", horizontal: "right" };
      case "bottom-right":
        return { vertical: "bottom", horizontal: "right" };
      case "bottom-center":
      default:
        return { vertical: "bottom", horizontal: "center" };
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={getAnchorOrigin()}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{
          width: "100%",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          "& .MuiAlert-icon": {
            fontSize: 24,
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
