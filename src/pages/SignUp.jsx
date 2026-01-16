import React, { useState } from "react";
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
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import supabase from "../config/supabaseClient";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "lecturer",
  });
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [message, setMessage] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [userId, setUserId] = useState(null);

  const navigate = useNavigate();

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength <= 25) return "Weak";
    if (passwordStrength <= 50) return "Fair";
    if (passwordStrength <= 75) return "Good";
    return "Strong";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "password") setPasswordStrength(calculatePasswordStrength(value));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Must be at least 8 characters";
    } else {
      // Password strength validation - same as ForgotPassword
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        newErrors.password = "Password must include uppercase, lowercase, number and special character";
      }
    }
    
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!validateForm()) {
      return;
    }
    setIsLoading(true);
    
    try {
      // Step 1: Create auth user without custom data
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
          },
        },
      });
      
      
      if (error) {
        setIsLoading(false);
        setMessage(error.message);
        return;
      }

      if (!data?.user) {
        setIsLoading(false);
        setMessage("Something went wrong. Please try again.");
        return;
      }

      const userId = data.user.id;
      setUserId(userId);

      // Step 2: Update user profile data (insert or update if already exists from trigger)
      try {
        const { error: upsertError } = await supabase
          .from("users")
          .upsert([
            {
              id: userId,
              email: formData.email,
              name: formData.name,
              role: formData.role,
            },
          ]);

        if (upsertError) {
          // Don't fail signup just because user data update failed
          // User can still proceed to login and complete profile later
        } else {
        }
      } catch (upsertErr) {
        // Silently continue - auth user was created even if custom data update failed
      }

      setIsLoading(false);

      // Check if email confirmation is required
      if (data.user.identities && data.user.identities.length === 0) {
        setMessage("This email is already registered. Please log in instead.");
      } else if (data.user.confirmed_at) {
        setMessage("Account created successfully! Redirecting to login...");
        setTimeout(() => navigate("/"), 1800);
      } else {
        setShowOtpInput(true);
        setMessage("A verification code has been sent to your email. Please enter it below.");
      }
    } catch (err) {
      setIsLoading(false);
      setMessage("Network error. Please check your connection and try again.");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    const { error } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: otp,
      type: "email",
    });
    setIsLoading(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account verified! You can now log in.");
      setTimeout(() => navigate("/"), 1800);
    }
  };

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
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" p={2} sx={{ background: "#f8fafc" }}>
      <Box display="flex" alignItems="center" gap={1} mb={4}>
        <FaBell style={{ color: "#0f172a", height: "24px", width: "24px" }} />
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
        }}
      >
        <CardHeader
          title={<Typography variant="h5" fontWeight="bold" color="#0f172a">Create an Account</Typography>}
          subheader={<Typography variant="body2" color="text.secondary" sx={{ opacity: 0.95 }}>Enter your details below</Typography>}
        />

        {!showOtpInput ? (
          <form onSubmit={handleCreateAccount} noValidate>
            <CardContent sx={{ paddingTop: "0px", paddingBottom: "0px" }}>
              <Typography fontSize={16} color="#0f172a" fontWeight={600}>
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
                sx={inputSx}
              />
              <Typography fontSize={16} color="#0f172a" fontWeight={600}>
                Email
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                name="email"
                type="email"
                value={formData.email}
                sx={inputSx}
                onChange={handleInputChange}
                error={Boolean(errors.email)}
                helperText={errors.email}
                placeholder="admin@university.edu"
              />
              <Typography fontSize={16} color="#0f172a" fontWeight={600}>
                Password
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                name="password"
                sx={inputSx}
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                error={Boolean(errors.password)}
                helperText={errors.password}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: "#0f172a" }}>
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
                          ? "#ff1744"
                          : passwordStrength < 100
                          ? "#ff9100"
                          : "#00e676",
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
                      backgroundColor: "#f1f5f9",
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
              <Typography fontSize={16} color="#0f172a" fontWeight={600} marginTop={2}>
                Confirm Password
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                name="confirmPassword"
                placeholder="••••••••"
                sx={inputSx}
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                error={Boolean(errors.confirmPassword)}
                helperText={errors.confirmPassword}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" sx={{ color: "#0f172a" }}>
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl margin="normal">
                <FormLabel sx={{ color: "#0f172a" }}>Role</FormLabel>
                <RadioGroup
                  row
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <FormControlLabel
                    value="lecturer"
                    control={<Radio sx={{ color: "#0f172a", '&.Mui-checked': { color: "#0f172a" } }} />}
                    label={<span style={{ color: "#0f172a" }}>Lecturer</span>}
                  />
                  <FormControlLabel
                    value="admin"
                    control={<Radio sx={{ color: "#0f172a", '&.Mui-checked': { color: "#0f172a" } }} />}
                    label={<span style={{ color: "#0f172a" }}>Administrator</span>}
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
              <Button variant="contained" type="submit" disabled={isLoading} fullWidth sx={{ backgroundColor: "#0f172a", color: "#fff", textTransform: "none", "&:hover": { backgroundColor: "#0b1320" } }}>
                {isLoading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Create Account"}
              </Button>
              <Typography variant="body2" textAlign="center" mt={1} color="text.secondary">
                Already have an account? <MuiLink href="/" fontWeight={600} sx={{ color: "#0f172a" }}>Log in</MuiLink>
              </Typography>
            </CardActions>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} noValidate>
            <CardContent>
              <Typography fontSize={16} color="#0f172a" fontWeight={600}>
                Enter Verification Code
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                name="otp"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="Enter the code sent to your email"
                sx={inputSx}
              />
              {message && (
                <Typography color={message.includes("verified") ? "success.main" : "error.main"} mt={2}>
                  {message}
                </Typography>
              )}
            </CardContent>
            <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }}>
              <Button variant="contained" type="submit" disabled={isLoading} fullWidth sx={{ backgroundColor: "#0f172a", color: "#fff", textTransform: "none", "&:hover": { backgroundColor: "#0b1320" } }}>
                {isLoading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Verify"}
              </Button>
            </CardActions>
          </form>
        )}
      </Card>
    </Box>
  );
}