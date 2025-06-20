import React, { useState } from "react"
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
} from "@mui/material"
import { Visibility, VisibilityOff } from "@mui/icons-material"
import { useNavigate } from "react-router-dom"
import { FaBell } from "react-icons/fa";
import supabase from "../config/supabaseClient";

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

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    // Supabase sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      setMessage(error.message);
      return;
    }

    // Fetch user profile from your users table
    const { data: userProfile, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    setIsLoading(false);

    if (userError || !userProfile) {
      setMessage("Login successful, but failed to fetch user profile.");
    } else {
      // Normalize role for sidebar logic
      const role =
        userProfile.role === "admin" || userProfile.role === "Administrator"
          ? "Administrator"
          : "Lecturer";
      sessionStorage.setItem(
        "user",
        JSON.stringify({ ...userProfile, role })
      );
      setMessage("Login successful!");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    }
  };


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
          title={<Typography variant="h5" fontWeight="bold">Login</Typography>}
          subheader="Enter your credentials to access the attendance management system"
        />
        <form onSubmit={handleLogin}>
          <CardContent sx={{paddingTop: "0px", paddingBottom: "0px"}}>
            <Typography fontSize={16} color="white" fontWeight={600}>
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
              sx={style}
            />
            <Typography fontSize={16} color="white" fontWeight={600}>
              Password
            </Typography>
            <TextField
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              placeholder="••••••••"
              sx={style}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Box textAlign="right" mt={1}>
              <MuiLink href="/forgot-password" variant="body2" underline="hover" color="text.secondary">
                Forgot password?
              </MuiLink>
            </Box>
            <FormControlLabel
                control={
                    <Checkbox
                    sx={{
                        color: "#fafafa",
                        '&.Mui-checked': {
                        color: "#fafafa",
                        },
                    }}
                    />
                }
                label={<span style={{ color: "#fafafa" }}>Remember me for 30 days</span>}
                />
            {message && (
              <Typography color={message.includes("success") ? "success.main" : "error.main"} mt={2}>
                {message}
              </Typography>
            )}
          </CardContent>
          <CardActions sx={{ flexDirection: "column", alignItems: "stretch", px: 2, pb: 2 }}>
            <Button variant="contained" style={{ background: "white" }} type="submit" fullWidth disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <Typography variant="body2" align="center" mt={1}>
              Don't have an account?{" "}
              <MuiLink href="/signup" fontWeight={600} color="#fff">
                Sign up
              </MuiLink>
            </Typography>
          </CardActions>
        </form>
      </Card>
    </Box>
  )
}