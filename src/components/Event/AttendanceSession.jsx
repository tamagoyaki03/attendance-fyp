import React, { useState, useEffect, Suspense} from "react";
import {QRCodeSVG} from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  DialogContentText,
  Chip,
  Box,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import QrCodeIcon from "@mui/icons-material/QrCode";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import Button from "../Button";

export default function AttendanceSession({
  open,
  onOpenChange,
  sessionType,
  classData,
  onFinalize,
  onExpire, 
}) {
  const [qrValue, setQrValue] = useState("");
  const URL = `https://your-app.com/checkin?classId=123&token=abc`; // Replace with actual URL generation logic
  const [countdown, setCountdown] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);

  // Generate a QR code when the dialog opens
  useEffect(() => {
    if (open && sessionType && location && classData) {
      const qrData = {
        classId: classData.id,
        className: classData.name,
        timestamp: currentTime.toISOString(),
        location: {
          lat: location.lat,
          lng: location.lng,
          radius: 50,
        },
        type: sessionType,
        token:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        validUntil: new Date(Date.now() + 300 * 1000).toISOString(),
      };

      setQrValue(JSON.stringify(qrData));
      setCountdown(300);
      setIsExpired(false);
    }
    // eslint-disable-next-line
  }, [open, sessionType, location, classData, currentTime]);

  useEffect(() => {
  if (classData) {
    console.log("classData:", classData);
  }
}, [classData]);

// Get current location when dialog opens
  useEffect(() => {
    if (open) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setLocation(null);
        }
      );
      setCurrentTime(new Date());
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open || isExpired) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          if (onExpire) onExpire(); // <-- notify parent
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, sessionType, location, classData]);

  const handleRefreshQR = () => {
  const qrData = {
    classId: classData.id,
    className: classData.name,
    timestamp: new Date().toISOString(),
    location: {
      lat: location.lat,
      lng: location.lng,
      radius: 50,
    },
    type: sessionType,
    token:
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15),
    validUntil: new Date(Date.now() + 300 * 1000).toISOString(),
  };
  setQrValue(JSON.stringify(qrData));
  setCountdown(300);
  setIsExpired(false);
};


  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!open || !classData || !location || typeof location.lat !== "number" || typeof location.lng !== "number") {
  return null;
}

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" 
      PaperProps={{
        sx: {
          background: "#09090b",
          color: "#fff",
          borderRadius: 2,
          border: "1px solid #ffffff",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
        },
      }}>
      <DialogTitle style={{paddingBottom: 0}}>
        {sessionType === "start" ? "Start Attendance Session" : "End Attendance Session"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {sessionType === "start"
            ? "Display this QR code for students to scan and check in."
            : "Display this QR code for students to scan and check out."}
        </DialogContentText>
        <Box display="flex" flexDirection="column" alignItems="center" py={4}>
          <Box position="relative">
            {isExpired ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height={300}
                width={300}
                border={1}
                borderRadius={2}
                borderStyle="dashed"
                borderColor="grey.400"
              >
                <QrCodeIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography color="" align="center">
                  QR Code expired
                </Typography>
                <Button onClick={handleRefreshQR} variant="outlined" sx={{ mt: 2 }}>
                  Generate New QR Code
                </Button>
              </Box>
            ) : (
              <>
                <Box
                  overflow="hidden"
                  border={1}
                  borderRadius={2}
                  borderColor="grey.400"
                  mb={2}
                >
                {/* <Suspense fallback={<div>Loading QR...</div>}> */}
                    <QRCodeSVG
                        value={typeof qrValue === "string" ? qrValue : ""} 
                        size={300}
                        bgColor="#fff"
                        fgColor="#000"
                        level="H"
                        includeMargin={false}
                />
                {/* </Suspense> */}
                </Box>
                <Chip
                  label={
                    <Box display="flex" alignItems="center">
                      <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      Expires in {formatTime(countdown)}
                    </Box>
                  }
                  color={countdown < 60 ? "error" : "primary"}
                  sx={{
                    position: "absolute",
                    top: -16,
                    right: 0,
                  }}
                />
              </>
            )}
          </Box>
          <Box width="100%" mt={3}>
            <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Class:</Typography>
                <Typography>
                    {classData?.code || "Unknown"} {classData?.name || "Unknown"}
                </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">Session Type:</Typography>
              <Chip
                label={sessionType === "start" ? "Check-in" : "Check-out"}
                variant="outlined"
                color={sessionType === "start" ? "success" : "warning"}
                sx={{ fontWeight: "bold" }}
              />
            </Box>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">Location:</Typography>
              <Box display="flex" alignItems="center">
                <LocationOnIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                <Typography variant="caption">
                {location && typeof location.lat === "number" && typeof location.lng === "number"
                    ? `${Number(location.lat).toFixed(6)}, ${Number(location.lng).toFixed(6)}`
                    : "Unknown"}
                </Typography>
              </Box>
            </Box>
            <Box display="flex" justifyContent="space-between">
                <Typography color="text.secondary">Time:</Typography>
                <Typography>
                {currentTime ? currentTime.toLocaleTimeString() : "Unknown"}
                </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        {sessionType === "start" ? (
            <Button onClick={() => onOpenChange(false)} variant="contained" color="primary">
            Continue Session
            </Button>
        ) : (
            <Button onClick={onFinalize} variant="contained" color="primary">
            Finalize Session
            </Button>
        )}
    </DialogActions>
    </Dialog>
  );
}