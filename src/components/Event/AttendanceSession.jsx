import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  DialogContentText,
  Chip,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import QrCodeIcon from "@mui/icons-material/QrCode";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import Button from "../Button";
import supabase from "../../config/supabaseClient";

async function saveSessionPassword(sessionId, password) {
  if (sessionId && password) {
    await supabase
      .from("attendance_session")
      .update({ attendance_password: password })
      .eq("id", sessionId);
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function AttendanceSession({
  open,
  onOpenChange,
  sessionType,
  classData,
  onFinalize,
  onExpire,
  sessionPassword,
  sessionId,
  requireQrToEnd,
  setRequireQrToEnd,
}) {
  const [qrValue, setQrValue] = useState("");
  const [countdown, setCountdown] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const creatingSession = useRef(false);

  // Generate a QR code when the dialog opens
  useEffect(() => {
    if (
      open &&
      sessionType === "start" &&
      classData &&
      sessionPassword &&
      sessionId &&
      !creatingSession.current
    ) {
      creatingSession.current = true;
      (async () => {
        try {
          // Determine type from classData
          let type = "lecture"; // default fallback
          
          if (classData?.type) {
            type = classData.type.toLowerCase() === "lecture" ? "lecture" : "tutorial";
          } else if (classData?.id) {
            try {
              const { data: lectureData, error: lectureError } = await supabase
                .from("course_lecture")
                .select("id")
                .eq("id", classData.id)
                .single();
              
              if (lectureData && !lectureError) {
                type = "lecture";
              } else {
                const { data: tutorialData, error: tutorialError } = await supabase
                  .from("course_tutorial")
                  .select("id")
                  .eq("id", classData.id)
                  .single();
                
                if (tutorialData && !tutorialError) {
                  type = "tutorial";
                }
              }
            } catch (error) {
              console.warn("Could not determine class type, defaulting to lecture:", error);
            }
          }
          
          const qrString = `${type}|${classData?.id || ""}|${sessionPassword || ""}|${sessionId || ""}`;
          console.log("Generating QR with string:", qrString);
          setQrValue(qrString);
          setCountdown(300);
          setIsExpired(false);

          if (sessionId && sessionPassword) {
            await saveSessionPassword(sessionId, sessionPassword);
          }
        } catch (error) {
          console.error("Error generating QR code:", error);
          const fallbackQrString = `lecture|${classData?.id || ""}|${sessionPassword || ""}|${sessionId || ""}`;
          setQrValue(fallbackQrString);
        } finally {
          creatingSession.current = false;
        }
      })();
    }
  }, [open, sessionType, classData, sessionPassword, sessionId]);

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
        (error) => {
          console.warn("Could not get location:", error);
          setLocation({ lat: 0, lng: 0 }); // Set default so QR still generates
        }
      );
      setCurrentTime(new Date());
    }
  }, [open]);

  // ... rest of useEffects ...

  // Update the render condition - remove location requirement
  if (!open || !classData || !qrValue) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      maxWidth="sm"
      PaperProps={{
        sx: {
          background: "#ffffff",
          color: "text.primary",
          borderRadius: 2,
          border: "1px solid #e2e8f0",
          boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
        },
      }}
    >
      <DialogTitle>
        {sessionType === "start" ? "Start Attendance Session" : "End Attendance Session"}
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {sessionType === "start"
            ? "Display this QR code for students to scan and check in."
            : "Display this QR code for students to scan and check out."}
        </DialogContentText>

        <Box display="flex" flexDirection="column" alignItems="center" py={2}>
          <Box position="relative">
            {isExpired ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height={300} width={300} borderRadius={2} border="1px dashed" borderColor="grey.300">
                <QrCodeIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography align="center">QR Code expired</Typography>
              </Box>
            ) : (
              <>
                <Box border={1} borderRadius={2} borderColor="grey.300" mb={2} overflow="hidden">
                  {qrValue ? (
                    <QRCodeSVG 
                      value={qrValue} 
                      size={300} 
                      bgColor="#ffffff" 
                      fgColor="#000000" 
                      level="H" 
                      includeMargin={false} 
                    />
                  ) : (
                    <Box display="flex" alignItems="center" justifyContent="center" height={300} width={300}>
                      <Typography color="text.secondary">Generating QR code...</Typography>
                    </Box>
                  )}
                </Box>
                <Chip
                  label={<Box display="flex" alignItems="center"><AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} />Expires in {formatTime(countdown)}</Box>}
                  color={countdown < 60 ? "error" : "success"}
                  sx={{ position: "absolute", top: -12, right: 0 }}
                />
              </>
            )}
          </Box>

          <Box width="100%" mt={3}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">Class:</Typography>
              <Typography>{classData?.course_code || "Unknown"} {classData?.course_title || ""}</Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography color="text.secondary">Session Type:</Typography>
              <Chip label={sessionType === "start" ? "Check-in" : "Check-out"} variant="outlined" color={sessionType === "start" ? "success" : "warning"} />
            </Box>

            {location && (
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Location:</Typography>
                <Box display="flex" alignItems="center">
                  <LocationOnIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} />
                  <Typography variant="caption">{`${Number(location.lat).toFixed(6)}, ${Number(location.lng).toFixed(6)}`}</Typography>
                </Box>
              </Box>
            )}

            <Box display="flex" justifyContent="space-between">
              <Typography color="text.secondary">Time:</Typography>
              <Typography>{currentTime ? currentTime.toLocaleTimeString() : "Unknown"}</Typography>
            </Box>
          </Box>
        </Box>

        {sessionType === "start" && (
          <FormControlLabel
            control={<Checkbox checked={requireQrToEnd} onChange={(e) => setRequireQrToEnd(e.target.checked)} />}
            label="Require QR code to end attendance session"
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {sessionType === "start" ? (
          <Button onClick={() => onOpenChange(false)} variant="contained">Continue Session</Button>
        ) : (
          <Button onClick={onFinalize} variant="contained">Finalize Session</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}