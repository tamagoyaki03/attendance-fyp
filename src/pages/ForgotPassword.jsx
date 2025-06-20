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
} from "@mui/material"
import { ArrowBack } from "@mui/icons-material"
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
  const [resetMessage, setResetMessage] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setResetMessage("")

    // Supabase password reset (sends code to email)
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

    // Confirm password reset with OTP code
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
      password: newPassword,
    });
    console.log("verifyOtp result:", { data, error });
    setIsLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setResetMessage("Password reset successful! You can now log in.")
      setTimeout(() => {
        navigate("/")
      }, 2000)
    }
  }

  const style = {
    color: "#fafafa",
    backgroundColor: "#18181b",
    borderRadius: '8px',
    margin: '5px 0',
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#ffffff",
    },
    "& .MuiOutlinedInput-root": {
        "& fieldset": { borderColor: "#27272a" },
        "&:hover fieldset": { borderColor: "#fafafa" },
        "&.Mui-focused fieldset": { borderColor: "#fafafa" },
    },
    "& .MuiInputBase-input": {
        color: "#fafafa",
        paddingLeft: '10px',
        height: '15px'
    },
    "& input:-webkit-autofill": {
        WebkitBoxShadow: "0 0 0 1000px #18181b inset",
        WebkitTextFillColor: "#fafafa",
        transition: "background-color 5000s ease-in-out 0s",
    }
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" p={2} sx={{background: 'black' }}>
      <Box display="flex" alignItems="center" gap={1} mb={4}>
        <FaBell style={{ color: 'white', height: '24px', width: '24px' }} />
        <Typography variant="h4" fontWeight="bold">
          Attendance
        </Typography>
      </Box>

      <Card sx={{ width: "100%", maxWidth: 400 , background: "black", color: "#ffffff" }} className="border">
        <CardHeader
          title={<Typography variant="h5" fontWeight="bold">Reset Password</Typography>}
          subheader={
            !isSubmitted
              ? "Enter your email and we'll send you a reset code"
              : showReset
              ? "Enter the code sent to your email and your new password"
              : ""
          }
        />

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} noValidate>
            <CardContent sx={{paddingTop: "0px", paddingBottom: "0px"}}>
              <Typography fontSize={16} color="white" fontWeight={600}>
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
                sx={style}
              />
              {error && <Typography variant="body2" color="error">{error}</Typography>}
            </CardContent>
            <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }} disableSpacing>
              <Button variant="contained" type="submit" disabled={isLoading} fullWidth sx={{ backgroundColor: "#fff" }}>
                {isLoading ? <CircularProgress size={24} /> : "Send reset code"}
              </Button>
              <Box display="flex" justifyContent="center" mt={2} >
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate("/")}
                  fullWidth
                  sx={{
                    color: "#fff",
                    borderColor: "#fff",
                    "&:hover": {
                      borderColor: "#fafafa",
                      backgroundColor: "rgba(255,255,255,0.08)",
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
              <Typography fontSize={16} color="white" fontWeight={600}>
                Verification Code
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                name="otp"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="Enter the code sent to your email"
                sx={style}
                required
              />
              <Typography fontSize={16} color="white" fontWeight={600} mt={2}>
                New Password
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                name="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                sx={style}
                required
              />
              {error && <Typography variant="body2" color="error">{error}</Typography>}
              {resetMessage && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {resetMessage}
                </Alert>
              )}
            </CardContent>
            <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }} disableSpacing>
              <Button variant="contained" type="submit" disabled={isLoading} fullWidth sx={{ backgroundColor: "#fff" }}>
                {isLoading ? <CircularProgress size={24} /> : "Reset Password"}
              </Button>
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate("/")}
                  fullWidth
                  sx={{
                    color: "#fff",
                    borderColor: "#fff",
                    "&:hover": {
                      borderColor: "#fafafa",
                      backgroundColor: "rgba(255,255,255,0.08)",
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