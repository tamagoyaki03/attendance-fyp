import React, { useState, useEffect, useRef} from "react";
import {QRCodeSVG} from "qrcode.react";
// import QRGenerator from "../Event/QRGenerator";
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
import supabase from "../../config/supabaseClient";

async function saveSessionPassword(type, id, password) {
    // Choose table based on type
    // const table = type === "course" ? "course_lecture" : "course_tutorial";
    // Update the password field for the given id
    await supabase
      .from("attendance_session")
      .update({ password })
      .eq("id", id);
  }

export default function AttendanceSession({
  open,
  onOpenChange,
  sessionType,
  classData,
  onFinalize,
  onExpire, 
  sessionPassword,
}) {
  const [qrValue, setQrValue] = useState("")
  const [countdown, setCountdown] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const creatingSession = useRef(false);

  useEffect(() => {
    if (open && classData?.id) {
      const fetchLatestClassData = async () => {
        // Determine table based on type
        const table = classData.type === "Lecture" ? "course_lecture" : "course_tutorial";
        const { data, error } = await supabase
          .from(table)
          .select("course_code, course_title")
          .eq("id", classData.id)
          .single();
        if (data) {
          setLatestClassInfo({
            code: data.course_code,
            name: data.course_title,
          });
        }
      };
      fetchLatestClassData();
    }
  }, [open, classData]);

  // Generate a QR code when the dialog opens
  useEffect(() => {
    if (
      open &&
      sessionType === "start" &&
      location &&
      classData &&
      sessionPassword &&
      !creatingSession.current
    ) {
      const saved = localStorage.getItem("attendanceSession");
      if (saved) {
        const session = JSON.parse(saved);
        // If session is still valid, do not create a new one
        if (
          session.classId === classData.id &&
          Date.now() - session.startTime < 300 * 1000 // 5 minutes
        ) {
          return;
        }
      }
      creatingSession.current = true; 
      (async () => {
        const qrString = `${classData.type}|${classData.id}|${sessionPassword}`; //change qr type
        setQrValue(qrString);
        setCountdown(300);
        setIsExpired(false);

        saveSessionPassword(classData.type, classData.id, sessionPassword);
        // await createAttendanceSession(classData.id, classData.type, location, specialPassword);

        // Save session to localStorage
        const sessionData = {
          classId: classData.id,
          type: classData.type,
          qrValue: qrString,
          countdown: 300,
          startTime: Date.now(),
          sessionPassword,
          location,
        };
        localStorage.setItem("attendanceSession", JSON.stringify(sessionData));
      })();
    }
  }, [open, sessionType, location, classData, sessionPassword]);

  const [latestClassInfo, setLatestClassInfo] = useState({
    code: classData?.code || "",
    name: classData?.name || "",
  });


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

  useEffect(() => {
  if (open && sessionType === "start" && classData) {
    const saved = localStorage.getItem("attendanceSession");
    if (saved) {
      const session = JSON.parse(saved);
      if (
        session.classId === classData.id &&
        Date.now() - session.startTime < 300 * 1000 // 5 minutes
      ) {
        setQrValue(session.qrValue);
        setCountdown(300 - Math.floor((Date.now() - session.startTime) / 1000));
        setIsExpired(false);
        setLocation(session.location);
      } else {
        localStorage.removeItem("attendanceSession");
      }
    }
  }
}, [open, sessionType, classData]);

useEffect(() => {
  if (!open) {
    creatingSession.current = false;
  }
}, [open]);

  useEffect(() => {
  if (qrValue) {
    console.log("UPDATED QR VALUE:", qrValue);
  }
}, [qrValue]);

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
                {/* <Button onClick={handleRefreshQR} variant="outlined" sx={{ mt: 2 }}>
                  Generate New QR Code
                </Button> */}
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
                  {qrValue && (
                    <QRCodeSVG
                      value={qrValue}
                      size={300}
                      bgColor="#fff"
                      fgColor="#000"
                      level="H"
                      includeMargin={false}
                    />
                    // <QRGenerator></QRGenerator>
                  )}
                </Box>
                <Chip
                  label={
                    <Box display="flex" alignItems="center">
                      <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      Expires in {formatTime(countdown)}
                    </Box>
                  }
                  color={countdown < 60 ? "error" : "success"}
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
                    {classData?.course_code || "Unknown"} {classData?.course_title || "Unknown"}
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