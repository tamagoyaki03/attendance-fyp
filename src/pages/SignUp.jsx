import React, { useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  LinearProgress,
  Link as MuiLink,
} from "@mui/material"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { FaBell } from "react-icons/fa";
import supabase from "../config/supabaseClient";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "lecturer",
  })
  const [errors, setErrors] = useState({})
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [message, setMessage] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otp, setOtp] = useState("")
  const [userId, setUserId] = useState(null)
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "password") setPasswordStrength(calculatePasswordStrength(value))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const calculatePasswordStrength = (password) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[0-9]/.test(password)) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25
    return strength
  }

  const getPasswordStrengthLabel = () => {
    if (passwordStrength <= 25) return "Weak"
    if (passwordStrength <= 50) return "Fair"
    if (passwordStrength <= 75) return "Good"
    return "Strong"
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name) newErrors.name = "Name is required"
    if (!formData.email) newErrors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid"
    if (!formData.password) newErrors.password = "Password is required"
    else if (formData.password.length < 8) newErrors.password = "Must be at least 8 characters"
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setMessage("")
    if (!validateForm()) return
    setIsLoading(true)
    // Supabase sign up with email OTP
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          role: formData.role,
        },
      }
    });
    setIsLoading(false)
    if (error) {
      setMessage(error.message)
    } else {
      setUserId(data?.user?.id || null)
      setShowOtpInput(true)
      setMessage("A verification code has been sent to your email. Please enter it below.")
    }
  }

  // Confirm the OTP code
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")
    // Confirm sign up with OTP
    const { error } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: otp,
      type: "email",
    });
    setIsLoading(false)
    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Account verified! You can now log in.")
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
          title={<Typography variant="h5" fontWeight="bold">Create an Account</Typography>}
          subheader="Enter your details below"
        />
        {!showOtpInput ? (
        <form onSubmit={handleCreateAccount} noValidate>
          <CardContent sx={{paddingTop: "0px", paddingBottom: "0px"}}>
            <Typography fontSize={16} color="white" fontWeight={600}>
              Full Name
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={Boolean(errors.name)}
              helperText={errors.name}
              placeholder="Agnes Noris"
              sx={style}
            />
            <Typography fontSize={16} color="white" fontWeight={600}>
                Email
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              name="email"
              type="email"
              value={formData.email}
              sx={style}
              onChange={handleInputChange}
              error={Boolean(errors.email)}
              helperText={errors.email}
              placeholder="admin@university.edu"
            />
            <Typography fontSize={16} color="white" fontWeight={600}>
              Password
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              name="password"
              sx={style}
              placeholder="••••••••"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleInputChange}
              error={Boolean(errors.password)}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {formData.password && (
                <Box>
                    <Typography
                    variant="caption"
                    sx={{
                        color:
                        passwordStrength <= 25
                            ? "#ff1744" // red
                            : passwordStrength < 100
                            ? "#ff9100" // orange
                            : "#00e676", // green
                        fontWeight: 600,
                    }}
                    >
                    Strength: {getPasswordStrengthLabel()}
                    </Typography>
                    <LinearProgress
                    variant="determinate"
                    value={passwordStrength}
                    sx={{
                        height: 6,
                        borderRadius: 1,
                        backgroundColor: "#333",
                        "& .MuiLinearProgress-bar": {
                        backgroundColor:
                            passwordStrength <= 25
                            ? "#ff1744"
                            : passwordStrength < 100
                            ? "#ff9100"
                            : "#00e676",
                        },
                    }}
                    />
                </Box>
                )}
            <Typography fontSize={16} color="white" fontWeight={600} marginTop={2}>
              Confirm Password
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              name="confirmPassword"
              placeholder="••••••••"
              sx={style}
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <FormControl margin="normal">
              <FormLabel color="white">Role</FormLabel>
              <RadioGroup
                row
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <FormControlLabel
                value="lecturer"
                control={<Radio sx={{ color: "#fafafa", '&.Mui-checked': { color: "#fafafa" } }} />}
                label={<span style={{ color: "#fafafa" }}>Lecturer</span>}
                />
                <FormControlLabel
                value="admin"
                control={<Radio sx={{ color: "#fafafa", '&.Mui-checked': { color: "#fafafa" } }} />}
                label={<span style={{ color: "#fafafa" }}>Administrator</span>}
                />
              </RadioGroup>
            </FormControl>
             {message && (
              <Typography color={message.includes("code") ? "success.main" : "error.main"} mt={2}>
                {message}
              </Typography>
            )}
          </CardContent>
          <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }}>
            <Button variant="contained" type="submit" disabled={isLoading} fullWidth sx={{ background: "#ffffff", color: "#09090b" }}>
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
            <Typography variant="body2" textAlign="center" mt={1}>
              Already have an account? <MuiLink href="/" fontWeight={600} color="#fff">Log in</MuiLink>
            </Typography>
          </CardActions>
        </form>
        ) : (
        <form onSubmit={handleVerifyOtp}>
          <CardContent>
            <Typography fontSize={16} color="white" fontWeight={600}>
              Enter Verification Code
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              name="otp"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="Enter the code sent to your email"
              sx={style}
            />
            {message && (
              <Typography color={message.includes("verified") ? "success.main" : "error.main"} mt={2}>
                {message}
              </Typography>
            )}
          </CardContent>
          <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }}>
            <Button variant="contained" type="submit" disabled={isLoading} fullWidth sx={{ background: "#ffffff", color: "#09090b" }}>
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </CardActions>
        </form>
        )}
      </Card>
    </Box>
  )
}