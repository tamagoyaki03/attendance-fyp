import React, { useState } from "react";
import {
  Avatar,
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
import EditIcon from "@mui/icons-material/Edit";
import LogoutIcon from "@mui/icons-material/Logout";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const [openLogout, setOpenLogout] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem("user")) || {};
  const userName = user.name || "Charlie Tan"; 
  const userRole = user.role === "administrator" ? "Administrator" : "Lecturer";

  const handleLogout = () => setOpenLogout(true);
  const handleLogoutCancel = () => setOpenLogout(false);
  const handleLogoutConfirm = () => {
    setOpenLogout(false);
    navigate("/"); // Redirect to login page
  };

  return (
    <div className="bg-[#121212] min-h-screen w-screen">
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>
      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
        {/* Section Header */}
        <div>
          <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left text-[#fafafa] mb-[0px]">
            My Profile
          </h2>
          <div className="flex justify-between items-center">
            <p className="text-[14px] font-inter font-normal leading-[17px] text-left text-[#a1a1aa]">
              View and update your personal information
            </p>
            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                className="h-[40px] flex items-center justify-center space-x-2"
              >
                Logout
              </Button>
            </Box>
          </div>
        </div>

        {/* Profile Card Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-[10px]">
          {/* Left: Profile Summary */}
          <Card className="border" style={{ background: "#09090b", color: "#fafafa" }}>
            <CardContent>
              <div className="flex flex-col items-center">
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {userName}
                </Typography>
                <Typography variant="body2" color="#a1a1aa">
                  {userRole}
                </Typography>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details */}
          <Card className="border" style={{ background: "#09090b", color: "#fafafa", marginTop: "20px" }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Personal Details
              </Typography>
              <Divider sx={{ marginBottom: "20px", background: "#27272a" }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    disabled
                    fullWidth
                    label="Name"
                    value={userName}
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      sx: { color: "#fafafa" },
                    }}
                    sx={{
                      marginBottom: "5px",
                      backgroundColor: "#18181b",
                      input: { color: "#fafafa" },
                      label: { color: "#a1a1aa" },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    disabled
                    fullWidth
                    label="Email"
                    value="admin@example.com"
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      sx: { color: "#fafafa" },
                    }}
                    sx={{
                      marginBottom: "5px",
                      backgroundColor: "#18181b",
                      input: { color: "#fafafa" },
                      label: { color: "#a1a1aa" },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    disabled
                    fullWidth
                    label="Role"
                    value="Administrator"
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      sx: { color: "#fafafa" },
                    }}
                    sx={{
                      marginBottom: "5px",
                      backgroundColor: "#18181b",
                      input: { color: "#fafafa" },
                      label: { color: "#a1a1aa" },
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </div>

        {/* Logout Confirmation Dialog */}
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
};

export default ProfilePage;