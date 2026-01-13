import React, { useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material"
import { ArrowBack, Visibility, VisibilityOff } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { FaBell } from "react-icons/fa"
import supabase from "../config/supabaseClient"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [resetMessage, setResetMessage] = useState("")
  const navigate = useNavigate()

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      color: "#0f172a",
      backgroundColor: "#fff",
      borderRadius: 1,
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
    input: { color: "#0f172a" },
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setResetMessage("")

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email address");
      setIsLoading(false);
      return;
    }

    // Check if email exists in users table with role lecturer or admin
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .in("role", ["lecturer", "admin"])
      .single();

    if (checkError || !existingUser) {
      setError("Email not registered");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setIsLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setIsSubmitted(true)
      setShowReset(true)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setResetMessage("")

    // Validate OTP
    if (!otp || otp.trim() === "") {
      setError("Verification code is required");
      setIsLoading(false);
      return;
    }

    // Validate password
    if (!newPassword || newPassword.trim() === "") {
      setError("Password is required");
      setIsLoading(false);
      return;
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError("Password must have at least 8 characters, including uppercase, lowercase, number and special character.");
      setIsLoading(false);
      return;
    }

    // Step 1: Verify OTP
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });
    
    console.log("verifyOtp result:", { error: verifyError });

    if (verifyError) {
      setError(verifyError.message);
      setIsLoading(false);
      return;
    }

    // Step 2: Update password after successful OTP verification
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    console.log("updateUser result:", { error: updateError });

    setIsLoading(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setResetMessage("Password reset successful! You can now log in.");
      setTimeout(() => {
        navigate("/");
      }, 1800);
    }
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" p={2} sx={{ background: "#f8fafc" }}>
      <Box display="flex" alignItems="center" gap={1} mb={4}>
        <FaBell style={{ color: '#0f172a', height: '24px', width: '24px' }} />
        <Typography variant="h4" fontWeight="bold" color="#0f172a">
          Attendance
        </Typography>
      </Box>

      <Card
        sx={{
          width: "100%",
          maxWidth: 440,
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 2,
          boxShadow: "none",
          transition: "transform 160ms ease, box-shadow 160ms ease",
          "&:hover": { transform: "translateY(-6px)", boxShadow: "0 10px 30px rgba(2,6,23,0.08)" },
          p: 0,
        }}
      >
        <CardHeader
          title={<Typography variant="h5" fontWeight="bold" color="#0f172a">Reset Password</Typography>}
          subheader={
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.95 }}>
              {!isSubmitted
                ? "Enter your email and we'll send you a reset code"
                : showReset
                ? "Enter the code sent to your email and your new password"
                : ""
              }
            </Typography>
          }
        />

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} noValidate>
            <CardContent sx={{ paddingTop: "0px", paddingBottom: "0px" }}>
              <Typography fontSize={16} color="#0f172a" fontWeight={600}>
                Email
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
                placeholder="admin@university.edu"
                sx={inputSx}
              />
              {error && <Typography variant="body2" color="error">{error}</Typography>}
            </CardContent>
            <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }} disableSpacing>
              <Button variant="contained" type="submit" disabled={isLoading} fullWidth sx={{ backgroundColor: "#0f172a", color: "#fff", textTransform: "none", "&:hover": { backgroundColor: "#0b1320" } }}>
                {isLoading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Send reset code"}
              </Button>
              <Box display="flex" justifyContent="center" mt={2} width="100%">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate("/")}
                  fullWidth
                  sx={{
                    color: "#0f172a",
                    borderColor: "#e6edf3",
                    backgroundColor: "transparent",
                    "&:hover": {
                      borderColor: "#cbd5e1",
                      backgroundColor: "rgba(15,23,42,0.04)",
                    },
                  }}
                >
                  Back to login
                </Button>
              </Box>
            </CardActions>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} noValidate>
            <CardContent>
              <Typography fontSize={16} color="#0f172a" fontWeight={600}>
                Verification Code
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                name="otp"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="Enter the code sent to your email"
                sx={inputSx}
                required
              />
              <Typography fontSize={16} color="#0f172a" fontWeight={600} mt={2}>
                New Password
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                sx={inputSx}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end" sx={{ color: "#0f172a" }}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {error && <Typography variant="body2" color="error">{error}</Typography>}
              {resetMessage && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {resetMessage}
                </Alert>
              )}
            </CardContent>
            <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }} disableSpacing>
              <Button variant="contained" type="submit" disabled={isLoading} fullWidth sx={{ backgroundColor: "#0f172a", color: "#fff", textTransform: "none", "&:hover": { backgroundColor: "#0b1320" } }}>
                {isLoading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Reset Password"}
              </Button>
              <Box display="flex" justifyContent="center" mt={2} width="100%">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate("/")}
                  fullWidth
                  sx={{
                    color: "#0f172a",
                    borderColor: "#e6edf3",
                    backgroundColor: "transparent",
                    "&:hover": {
                      borderColor: "#cbd5e1",
                      backgroundColor: "rgba(15,23,42,0.04)",
                    },
                  }}
                >
                  Back to login
                </Button>
              </Box>
            </CardActions>
          </form>
        )}
      </Card>
    </Box>
  )
}