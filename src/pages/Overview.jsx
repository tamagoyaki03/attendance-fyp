import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  TextField,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import Sidebar from "../components/Sidebar";
import ClassAttendance from "../components/Event/ClassAttendance";
import StudentView from "../components/Event/StudentsView";
import supabase from "../config/supabaseClient";

export default function Overview() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState("classes");
  const [userClasses, setUserClasses] = useState([]);

  // read sessionStorage at runtime (not at module import time)
  const currentUser = JSON.parse(sessionStorage.getItem("user") || "null") || {};
  const userRole = currentUser.role || "lecturer";
  const userId = currentUser.id || null;

  useEffect(() => {
    if (!userId) {
      // nothing to fetch yet
      setUserClasses([]);
      return;
    }

    let cancelled = false;
    const fetchClasses = async () => {
      try {
        let query = supabase
          .from("course_lecture")
          .select(`
            *,
            users(name),
            enrollment_lecture(id)
          `);
        if (userRole !== "admin") {
          query = query.eq("lecturer_id", userId);
        }
        const { data, error } = await query;
        if (cancelled) return;
        if (error) {
          console.error("Supabase fetch error:", error);
          setUserClasses([]);
        } else {
          setUserClasses(data || []);
        }
      } catch (err) {
        console.error("Unexpected fetch error:", err);
        if (!cancelled) setUserClasses([]);
      }
    };

    fetchClasses();

    return () => {
      cancelled = true;
    };
  }, [userId, userRole]);

  const filteredClasses = userClasses.filter(
    (cls) =>
      cls.course_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.course_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      "& fieldset": { borderColor: "#e6edf3" },
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
        className="ml-[250px] p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh" }}
      >
        <div>
          <h2
            className="text-[24px] font-inter font-semibold leading-[30px] text-left"
            style={{ color: "#0f172a", marginBottom: 0 }}
          >
            Dashboard
          </h2>
          <div className="flex justify-between items-center">
            <p
              className="text-[14px] font-inter font-normal leading-[17px] text-left"
              style={{ color: "#374151" }}
            >
              View attendance statistics and class performance
            </p>
          </div>
        </div>

        {userRole === "lecturer" && (
          <>
            <Box my={3}>
              <Alert severity="error" sx={{ fontSize: "16px" }}>
                <strong>Attention Required</strong> — 5 potential fraud cases detected today.
              </Alert>
            </Box>

            <Box my={3}>
              <Alert severity="warning" sx={{ fontSize: "16px" }}>
                <strong>New Leave Request</strong> — 3 pending leave applications awaiting review.
              </Alert>
            </Box>

            <Box my={3}>
              <Alert severity="info" sx={{ fontSize: "16px" }}>
                <strong>Pending Review</strong> — 4 absence documents pending review.
              </Alert>
            </Box>
          </>
        )}

        {userRole === "admin" && (
          <>
            <Tabs
              value={tab}
              onChange={(e, val) => setTab(val)}
              textColor="primary"
              indicatorColor="primary"
              sx={{ mb: 3 }}
            >
              <Tab label="Classes View" value="classes" sx={{ color: "#0f172a" }} />
              <Tab label="Students View" value="students" sx={{ color: "#0f172a" }} />
            </Tabs>
          </>
        )}

        {tab === "classes" && (
          <>
            <div className="grid grid-cols-3 gap-[20px] mt-6">
              <Card
                className="border"
                sx={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Classes
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {userClasses.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active classes today
                  </Typography>
                </CardContent>
              </Card>

              <Card
                className="border"
                sx={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Average Attendance
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    70.2%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Across all classes
                  </Typography>
                </CardContent>
              </Card>

              <Card
                className="border"
                sx={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
                }}
              >
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Classes Below 60%
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    8
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Require attention
                  </Typography>
                </CardContent>
              </Card>
            </div>

            <Box display="flex" alignItems="center" mb={3} mt={3}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  ...inputSx,
                }}
                InputProps={{
                  startAdornment: <Search fontSize="small" style={{ marginRight: 8, color: "#64748b" }} />,
                }}
              />
            </Box>

            <ClassAttendance classes={filteredClasses} />
          </>
        )}

        {tab === "students" && (
          <div className="gap-[20px] mt-6">
            <StudentView />
          </div>
        )}
      </main>
    </div>
  );
}