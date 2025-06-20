import React, { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Button,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Card,
  CardContent,
  Alert,
  Tabs,
  Tab,
  TextField,
  IconButton,
} from "@mui/material"
import { FilterList, Search, People } from "@mui/icons-material"
import Sidebar from "../components/Sidebar"
import ClassAttendance from "../components/Event/ClassAttendance"
import StudentView from "../components/Event/StudentsView"
import supabase from "../config/supabaseClient"

const getUserRole = () => {
    const user = JSON.parse(sessionStorage.getItem("user")) || {};
    return user.role || "Lecturer";
};

export default function Overview() {
  const [searchTerm, setSearchTerm] = useState("")
  const userRole = getUserRole();
  const [tab, setTab] = useState("classes")
  const [totalClasses, setTotalClasses] = useState(0);

  useEffect(() => {
    const fetchTotalEnrollments = async () => {
        const { count, error } = await supabase
        .from("course_lecture")
        .select("*", { count: "exact", head: true });

        if (error) {
        console.error("Supabase count error:", error);
        } else {
        setTotalClasses(count || 0);
        }
    };

    fetchTotalEnrollments();
  }, []);

  return (
    <div className="bg-[#121212] min-h-screen w-screen">
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>
      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
        {/* Section Header */}
        <div>
          <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left text-[#fafafa] mb-[0px]">
            Dashboard
          </h2>
          <div className="flex justify-between items-center">
            <p className="text-[14px] font-inter font-normal leading-[17px] text-left text-[#a1a1aa]">
              View attendance statistics and class performance
            </p>
          </div>
        </div>

        {/* Only for Lecturers */}
        {userRole === "Lecturer" && (
            <>
            {/* Alert Section */}
            <Box my={3} className="border" sx={{ borderColor: "red", borderRadius: 1}}>
            <Alert severity="error" sx={{fontSize: "18px", color: "red"}}>
                <strong>Attention Required</strong> 
                <p className="m-[0px]">5 potential fraud cases detected today.</p>
            </Alert>
            </Box>

            {/* Absence Document Review Notification */}
            <Box my={3} className="border" sx={{ borderColor: "#f59e0b", borderRadius: 1 }}>
            <Alert severity="warning" sx={{ fontSize: "18px", color: "#f59e0b" }}>
                <strong>New Leave Request</strong>
                <p className="m-[0px]">3 pending leave applications awaiting review.</p>
            </Alert>
            </Box>

            {/* Leave Request Notification */}
            <Box my={3} className="border" sx={{ borderColor: "#1976d2", borderRadius: 1 }}>
            <Alert severity="info" sx={{ fontSize: "18px", color: "#1976d2" }}>
                <strong>Pending Review</strong>
                <p className="m-[0px]">4 absence documents pending review.</p>
            </Alert>
            </Box>
         </>
        )}

        {/* Tabs only for Administrator */}
        {userRole === "Administrator" && (
            <>
            <Tabs
            value={tab}
            onChange={(e, val) => setTab(val)}
            textColor="inherit"
            indicatorColor="primary"
            sx={{ mb: 3 }}
            >
            <Tab label="Classes View" value="classes" sx={{ color: "#fafafa" }} />
            <Tab label="Students View" value="students" sx={{ color: "#fafafa" }} />
            </Tabs>
            </>
        )}
            
            {tab === "classes" && (
            <>  
            {/* Cards Section */}
          <div className="grid grid-cols-3 gap-[20px] mt-6">
      <Card className="border" style={{ background: "#09090b" }}>
        <CardContent>
          <Typography variant="subtitle2">Total Classes</Typography>
          <Typography variant="h5" fontWeight="bold">
            {totalClasses}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Active classes today
          </Typography>
        </CardContent>
      </Card>

      <Card className="border" style={{ background: "#09090b" }}>
        <CardContent>
          <Typography variant="subtitle2">Average Attendance</Typography>
          <Typography variant="h5" fontWeight="bold">70.2%</Typography>
          <Typography variant="body2" color="textSecondary">Across all classes</Typography>
        </CardContent>
      </Card>

      <Card className="border" style={{ background: "#09090b" }}>
        <CardContent>
          <Typography variant="subtitle2">Classes Below 60%</Typography>
          <Typography variant="h5" fontWeight="bold">8</Typography>
          <Typography variant="body2" color="textSecondary">Require attention</Typography>
        </CardContent>
      </Card>
    </div>
             {/* Search and Filter Section*/}
          <Box display="flex" alignItems="center" mb={3} mt={3}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                startAdornment: (
                    <Search fontSize="small" style={{ marginRight: 8 }} />
                ),
                }}
            />
            </Box>
            <ClassAttendance/>
            </>
            )}

             {tab === "students" && (
            <>  
            {/* Cards Section */}
          <div className=" gap-[20px] mt-6">
            <StudentView/>
          </div>
          </>
            )}
        </main>
    </div>
  )
}