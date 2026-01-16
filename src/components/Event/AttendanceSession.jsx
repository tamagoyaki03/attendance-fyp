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
import { startFraudMonitoring, stopFraudMonitoring } from "../../utils/fraudUtils";


import { sendAbsenceEmailsAfterLectureEnd } from "../../utils/sendAbsenceAfterLectureEnd";

// Helper function to pad numbers with leading zeros
const pad = (n) => n.toString().padStart(2, '0');

async function saveSessionPassword(sessionId, password) {
  if (sessionId && password) {
    try {
      // Get current date and time in Asia/Kuala_Lumpur
      const now = new Date();
      // Get local time in Asia/Kuala_Lumpur
      const localDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
      // Format YYYY-MM-DD
      const currentDate = localDate.toISOString().split('T')[0];
      // Format HH:MM:SS
      const currentTime = localDate.toTimeString().split(' ')[0];

      // Calculate end time (assuming 2-hour sessions, adjust as needed)
      const endDateTime = new Date(localDate.getTime() + (2 * 60 * 60 * 1000));
      const endHour = pad(endDateTime.getHours());
      const endMinute = pad(endDateTime.getMinutes());
      const endSecond = pad(endDateTime.getSeconds());

      // Add timeout to the database query
      const { error } = await Promise.race([
        supabase
          .from("attendance_session")
          .update({ 
            attendance_password: password,
            date: currentDate,
            start_time: currentTime,
            end_time: `${endHour}:${endMinute}:${endSecond}`
          })
          .eq("id", sessionId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        )
      ]);

      if (error) {
      } else {
      }
    } catch (error) {
      if (error.message === 'Query timeout') {
      }
    }
  }
}

async function updateSessionEndTime(sessionId) {
  if (sessionId) {
    try {
      // Get current date and time in Asia/Kuala_Lumpur
      const now = new Date();
      const localDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
      // Format HH:MM:SS
      const endHour = pad(localDate.getHours());
      const endMinute = pad(localDate.getMinutes());
      const endSecond = pad(localDate.getSeconds());
      const endTime = `${endHour}:${endMinute}:${endSecond}`;

      const { error } = await Promise.race([
        supabase
          .from("attendance_session")
          .update({ 
            end_time: endTime
          })
          .eq("id", sessionId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        )
      ]);
      
      if (error) {
      } else {
      }
    } catch (error) {
    }
  }
}

export default function AttendanceSession({
  open,
  onClose,
  sessionType,
  classData,
  onFinalize,
  sessionPassword,
  sessionId,
}) {
  const [qrValue, setQrValue] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const creatingSession = useRef(false);
  const fraudChannelRef = useRef(null);

  // End attendance, update end_time, and note that emails are sent by scheduled job
  const handleEndAttendance = async () => {
    await updateSessionEndTime(sessionId);
    
    // NOTE: Absence emails are NOT sent here immediately. They are sent automatically by sendAbsenceEmailsAfterLectureEnd
    // after the class end_time has passed. This is done via the scheduled interval check in AttendanceManagement.jsx
    
    if (onFinalize) {
      onFinalize();
    }
    if (onClose) {
      onClose();
    }
  };

  // Check if session has ended based on DB end_time
  const checkSessionExpired = async () => {
    if (!sessionId) return;
    try {
      const { data: session, error } = await supabase
        .from("attendance_session")
        .select("end_time, date")
        .eq("id", sessionId)
        .single();
      
      if (error || !session) return;
      
      if (session.end_time && session.date) {
        const endDateTime = new Date(`${session.date}T${session.end_time}`);
        if (new Date() > endDateTime) {
          setIsExpired(true);
        }
      }
    } catch (e) {
    }
  };

// Check session expiry from database
useEffect(() => {
  if (open && sessionId) {
    checkSessionExpired();
    // Poll every 10 seconds to check if session has ended
    const interval = setInterval(checkSessionExpired, 10000);
    return () => clearInterval(interval);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, sessionId]);

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
          let type = "course"; // default fallback
          
          if (classData?.type) {
            type = classData.type.toLowerCase() === "lecture" ? "course" : "tutorial";
          } else if (classData?.id) {
            try {
              const { data: lectureData, error: lectureError } = await supabase
                .from("course_lecture")
                .select("id")
                .eq("id", classData.id)
                .single();
              
              if (lectureData && !lectureError) {
                type = "course";
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
            }
          }
          
          const qrString = `${type}|${classData?.id || ""}|${sessionPassword || ""}|${sessionId || ""}`;
          setQrValue(qrString);
          setIsExpired(false);

          if (sessionId && sessionPassword) {
            await saveSessionPassword(sessionId, sessionPassword);
          }

          // Start fraud monitoring (location + time analysis) for this session
          try {
            if (sessionId) {
              // Fetch admin-configured fraud detection settings
              const { data: settings, error: settingsError } = await supabase
                .from("fraud_detection_settings")
                .select("max_distance_km, time_buffer_minutes")
                .limit(1)
                .single();
              
              if (settingsError || !settings) {
              }
              
              const maxKm = settings?.max_distance_km || 1.0;
              const timeBufferMinutes = settings?.time_buffer_minutes || 1;
              
              const channel = await startFraudMonitoring(sessionId, { maxKm, timeBufferMinutes });
              fraudChannelRef.current = channel;
            }
          } catch (e) {
          }
        } catch (error) {
          const fallbackQrString = `course|${classData?.id || ""}|${sessionPassword || ""}|${sessionId || ""}`;
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
          setLocation({ lat: 0, lng: 0 }); // Set default so QR still generates
        }
      );
      setCurrentTime(new Date());
    }
  }, [open]);

  // Cleanup fraud monitoring when dialog closes or on unmount
  useEffect(() => {
    if (!open && fraudChannelRef.current) {
      stopFraudMonitoring(fraudChannelRef.current);
      fraudChannelRef.current = null;
    }
    return () => {
      if (fraudChannelRef.current) {
        stopFraudMonitoring(fraudChannelRef.current);
        fraudChannelRef.current = null;
      }
    };
  }, [open]);

  // Update the render condition - remove location requirement
  if (!open || !classData || !qrValue) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        Attendance Session
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Display this QR code for students to scan and check in.
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
              <Chip label="Check-in" variant="outlined" color="success" />
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

        {/* Removed require QR code to end attendance session UI */}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleEndAttendance} variant="contained" color="primary">Close</Button>
      </DialogActions>
    </Dialog>
  );
}