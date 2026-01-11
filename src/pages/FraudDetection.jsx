import React, { useState, useEffect } from "react";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import FraudTable from "../components/FraudTable";
import supabase from "../config/supabaseClient";

export default function FraudDetection() {

  const [searchTerm, setSearchTerm] = useState("");
  const [distance, setDistance] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Fetch current settings and user role on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setDistance(null);
      setBuffer(null);
      // Fetch settings (single row)
      const { data, error } = await supabase
        .from("fraud_detection_settings")
        .select("id, max_distance_km, time_buffer_minutes")
        .limit(1)
        .single();
      if (data) {
        setSettingsId(data.id);
        setDistance(Number(data.max_distance_km));
        setBuffer(Number(data.time_buffer_minutes));
      }
      setLoading(false);
    };
    const fetchRole = async () => {
      const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
      if (user) {
        // You may need to adjust this query to match your users table/role logic
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(data?.role === "admin");
      }
    };
    fetchSettings();
    fetchRole();
  }, []);

  // Update settings in DB
  const handleUpdateSettings = async () => {
    setLoading(true);
    if (!isAdmin) {
      setSnackbar({ open: true, message: "Only admins can update settings.", severity: "error" });
      setLoading(false);
      return;
    }
    if (!settingsId) {
      setSnackbar({ open: true, message: "Settings row not found. Please contact admin.", severity: "error" });
      setLoading(false);
      return;
    }
    const { error } = await supabase
      .from("fraud_detection_settings")
      .update({ max_distance_km: distance, time_buffer_minutes: buffer, updated_at: new Date().toISOString() })
      .eq("id", settingsId);
    setLoading(false);
    if (!error) {
      setSnackbar({ open: true, message: "Settings updated successfully!", severity: "success" });
    } else {
      setSnackbar({ open: true, message: "Failed to update settings: " + error.message, severity: "error" });
    }
  };

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main
        className="ml-[250px] p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh" }}
      >
        <div>
          <h2
            className="text-[24px] font-inter font-semibold leading-[30px] text-left"
            style={{ color: "#0f172a", marginBottom: 0 }}
          >
            Fraud Detection
          </h2>
          <p className="text-[14px]" style={{ color: "#374151" }}>
            Identify suspicious check-ins and location anomalies
          </p>
        </div>

        <div className="grid gap-[40px] grid-cols-2 mt-6">
          <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6">Location Analysis</Typography>
              <Typography variant="body2" color="text.secondary">Compare student check-in vs class location (all sessions)</Typography>
            </Box>
            <CardContent>
              <Box mb={2}>
                <InputLabel htmlFor="distance" sx={{ mb: 1, display: "block", color: "text.secondary" }}>
                  Max Distance (km)
                </InputLabel>
                <Box display="flex" gap={1}>
                  <TextField
                    id="distance"
                    type="number"
                    value={distance === null ? "" : distance}
                    onChange={(e) => setDistance(e.target.value)}
                    inputProps={{ min: 0.1, max: 5.0, step: 0.1 }}
                    size="small"
                    sx={{ flex: 1, "& .MuiOutlinedInput-root": { backgroundColor: "#fff" } }}
                    disabled={distance === null}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
            <Box sx={{ p: 2, pb: 0 }}>
              <Typography variant="h6">Time Analysis</Typography>
              <Typography variant="body2" color="text.secondary">Check for suspicious check-in/out timestamps (all sessions)</Typography>
            </Box>
            <CardContent>
              <Box mb={2}>
                <InputLabel htmlFor="buffer" sx={{ mb: 1, display: "block", color: "text.secondary" }}>
                  Late Buffer (minutes)
                </InputLabel>
                <Box display="flex" gap={1}>
                  <TextField
                    id="buffer"
                    type="number"
                    value={buffer === null ? "" : buffer}
                    onChange={(e) => setBuffer(e.target.value)}
                    inputProps={{ min: 1, max: 30, step: 1 }}
                    size="small"
                    sx={{ flex: 1, "& .MuiOutlinedInput-root": { backgroundColor: "#fff" } }}
                    disabled={buffer === null}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </div>

        <Box mt={2} mb={2}>
          <Button
            variant="contained"
            color="primary"
            disabled={!isAdmin || loading}
            onClick={handleUpdateSettings}
          >
            Update Settings
          </Button>
        </Box>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <MuiAlert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </MuiAlert>
        </Snackbar>

        <Card sx={{ mt: 4, background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2 }}>
            <Box>
              <Typography variant="h6">Fraud Alert Log</Typography>
              <Typography variant="body2" color="text.secondary">Detailed list of detected fraud alerts</Typography>
            </Box>

            <Box sx={{ width: 320 }}>
              <TextField
                id="search-fraud"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: "#64748b" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  backgroundColor: "#ffffff",
                  borderRadius: 1,
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
                }}
              />
            </Box>
          </Box>

          <CardContent>
            <FraudTable searchTerm={searchTerm} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

