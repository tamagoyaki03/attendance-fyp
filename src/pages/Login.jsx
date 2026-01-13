import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Link as MuiLink,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import supabase from "../config/supabaseClient";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    // Validate email field
    if (!email || email.trim() === "") {
      setMessage("Email address is required");
      setIsLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage("Invalid email address");
      setIsLoading(false);
      return;
    }

    if (!password || password.trim() === "") {
      setMessage("Password is required");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();

      setIsLoading(false);

      if (userError || !userProfile) {
        setMessage("Login successful, but failed to fetch user profile.");
      } else if (userProfile.role !== "lecturer" && userProfile.role !== "admin") {
        // Only allow lecturers and admins to log in
        setMessage("Access denied. Only lecturers and admins can access this system.");
        // Sign out the user
        await supabase.auth.signOut();
      } else {
        const role = userProfile.role === "admin" ? "admin" : "lecturer";
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(
          "user",
          JSON.stringify({ id: userProfile.id, name: userProfile.name, role })
        );
        setMessage("Login successful!");
        setTimeout(() => navigate("/dashboard"), 800);
      }
    } catch (err) {
      setIsLoading(false);
      setMessage("An unexpected error occurred.");
      console.error(err);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={2}
      sx={{ background: "#f8fafc" }}
    >
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
          title={<Typography variant="h5" fontWeight="bold" color="#0f172a">Login</Typography>}
          subheader={<Typography variant="body2" color="text.secondary" sx={{ opacity: 0.95 }}>Enter your credentials to access the attendance management system</Typography>}
        />

        <form onSubmit={handleLogin} noValidate>
          <CardContent sx={{ paddingTop: "0px", paddingBottom: "0px" }}>
            <Typography fontSize={16} color="#0f172a" fontWeight={600}>
              Email
            </Typography>
            <TextField
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
              placeholder="admin@university.edu"
              sx={inputSx}
            />
            <Typography fontSize={16} color="#0f172a" fontWeight={600}>
              Password
            </Typography>
            <TextField
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              placeholder="••••••••"
              margin="normal"
              sx={inputSx}
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
            <Box textAlign="right" mt={1}>
              <MuiLink href="/forgot-password" variant="body2" underline="hover" sx={{ color: "#0f172a" }}>
                Forgot password?
              </MuiLink>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  sx={{
                    color: "#0f172a",
                    "&.Mui-checked": { color: "#0f172a" },
                  }}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              }
              label={<span style={{ color: "#0f172a" }}>Remember me for 30 days</span>}
            />

            {message && (
              <Typography color={message.includes("successful") ? "success.main" : "error.main"} mt={2}>
                {message}
              </Typography>
            )}
          </CardContent>

          <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }}>
            <Button
              variant="contained"
              type="submit"
              fullWidth
              disabled={isLoading}
              sx={{ backgroundColor: "#0f172a", color: "#fff", textTransform: "none", "&:hover": { backgroundColor: "#0b1320" } }}
            >
              {isLoading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Login"}
            </Button>

            <Typography variant="body2" align="center" mt={1} color="text.secondary">
              Don't have an account?{" "}
              <MuiLink href="/signup" fontWeight={600} sx={{ color: "#0f172a" }}>
                Sign up
              </MuiLink>
            </Typography>
          </CardActions>
        </form>
      </Card>
    </Box>
  );
}