import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Box,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import Sidebar from "../components/Sidebar";
import Loading from "../components/Loading";
import { useNavigate } from "react-router-dom";
import supabase from "../config/supabaseClient";

export default function ProfilePage() {
  const [openLogout, setOpenLogout] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const userId = JSON.parse(sessionStorage.getItem("user"))?.id;

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      } else {
        setUser(data);
      }
    };
    if (userId) fetchUser();
  }, [userId]);

  if (!user) return <Loading message="Loading profile..." fullScreen />;

  const handleLogout = () => setOpenLogout(true);
  const handleLogoutCancel = () => setOpenLogout(false);
  const handleLogoutConfirm = () => {
    setOpenLogout(false);
    sessionStorage.clear();
    navigate("/");
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      "& fieldset": { borderColor: "#e2e8f0" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
    input: { color: "#0f172a" },
  };

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main
        data-has-sidebar
        className="p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh", marginLeft: "var(--sidebar-width, 250px)", transition: "margin-left 0.3s ease-in-out" }}
      >
        <div>
          <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left" style={{ color: "#0f172a", marginBottom: 0 }}>
            My Profile
          </h2>
          <div className="flex justify-between items-center">
            <p className="text-[14px] font-inter font-normal leading-[17px] text-left" style={{ color: "#374151" }}>
              View and manage your personal information
            </p>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                className="h-[40px] flex items-center justify-center space-x-2"
                sx={{
                  borderColor: "#ef4444",
                  color: "#ef4444",
                  background: "transparent",
                  "&:hover": { backgroundColor: "rgba(239,68,68,0.04)" },
                }}
              >
                Logout
              </Button>
            </Box>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-[10px]">
          <Card
            sx={{
              background: "#f8fafc",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardContent>
              <div className="flex flex-col items-center py-6">
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {user.name}
                </Typography>
                <Typography variant="body2" sx={{ color: "#475569" }}>
                  {user.role === "admin"
                    ? "Administrator"
                    : user.role === "lecturer"
                    ? "Lecturer"
                    : user.role || ""}
                </Typography>
              </div>
            </CardContent>
          </Card>

          <Card
            sx={{
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Personal Details
              </Typography>
              <Divider sx={{ marginBottom: "20px" }} />
              <Grid container spacing={2}>
                <Grid size={12}>
                  <TextField
                    disabled
                    fullWidth
                    label="Name"
                    value={user.name}
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                    sx={{ ...inputSx, marginBottom: "5px" }}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    disabled
                    fullWidth
                    label="Email"
                    value={user.email}
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                    sx={{ ...inputSx, marginBottom: "5px" }}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    disabled
                    fullWidth
                    label="Role"
                    value={
                      user.role === "admin"
                        ? "Administrator"
                        : user.role === "lecturer"
                        ? "Lecturer"
                        : user.role || ""
                    }
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                    sx={{ ...inputSx, marginBottom: "5px" }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </div>

        <Dialog open={openLogout} onClose={handleLogoutCancel}>
          <DialogTitle>Confirm Logout</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to logout? You will be redirected to the login page.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleLogoutCancel} color="primary">
              Cancel
            </Button>
            <Button onClick={handleLogoutConfirm} color="error" variant="contained">
              Logout
            </Button>
          </DialogActions>
        </Dialog>
      </main>
    </div>
  );
}