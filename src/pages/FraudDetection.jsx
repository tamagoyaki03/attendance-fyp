import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  InputLabel,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  TextField
} from "@mui/material";
import InputField from "../components/InputField";
import Sidebar from "../components/Sidebar";
import FraudTable from "../components/FraudTable";
import { FaSearch } from "react-icons/fa";
import supabase from "../config/supabaseClient"; 

export default function FraudDetection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [course, setCourse] = useState("");
  const [session, setSession] = useState("current");
  const [distance, setDistance] = useState(1.0);
  const [courses, setCourses] = useState([]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    // Fetch courses/classes from Supabase
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('classes') 
        .select('id, code, name');
      if (!error && data) {
        setCourses(data);
        if (data.length > 0) setCourse(data[0].id); // Set default selected course
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="grid grid-cols-[250px_1fr] gap-[40px] h-screen w-screen bg-[#121212]">
      <div className="fixed h-screen w-[250px]">
        <Sidebar />
      </div>
        <div className="col-start-2 overflow-y-auto p-8 pt-[40px] pr-[40px]">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Fraud Detection</h2>
                {/* <div className="flex items-center space-x-2">
                </div> */}
            </div>

            <div className="grid gap-[40px] grid-cols-2">
                <Card className="border color-[#e5e7eb]" style={{ background: "#09090b" }}>
                <div className="pb-2 m-[20px] mb-[0px]">
                    <Typography variant="h6" component="div">Location Analysis</Typography>
                    <Typography variant="body2" color="text.secondary">Compare student and lecturer locations</Typography>
                </div>
                <CardContent>
                    <div className="grid gap-2">
                    <div className="space-y-1">
                        <FormControl fullWidth style={{marginTop: '10px'}}>
                        <InputLabel id="course-label">Course</InputLabel>
                        <Select
                            labelId="course-label"
                            id="course"
                            value={course}
                            label="Course"
                            onChange={e => setCourse(e.target.value)}
                        >
                            {courses.map(cls => (
                              <MenuItem key={cls.id} value={cls.id}>
                                {cls.code} - {cls.name}
                              </MenuItem>
                            ))}
                        </Select>
                        </FormControl>
                        {/* <FormControl fullWidth style={{marginTop: '20px'}}>
                        <InputLabel id="session-label">Session</InputLabel>
                        <Select
                            labelId="session-label"
                            id="session"
                            value={session}
                            label="Session"
                            onChange={e => setSession(e.target.value)}
                        >
                            <MenuItem value="current">Current Session</MenuItem>
                            <MenuItem value="morning">Morning (9:00 AM)</MenuItem>
                            <MenuItem value="afternoon">Afternoon (2:00 PM)</MenuItem>
                            <MenuItem value="evening">Evening (6:00 PM)</MenuItem>
                        </Select>
                        </FormControl> */}
                    </div>
                    <div className="space-y-1" style={{marginTop: '10px'}}>
                        <InputLabel htmlFor="distance">Max Distance (km)</InputLabel>
                        <div className="flex space-x-2 w-full">
                        <TextField
                            id="distance"
                            type="number"
                            value={distance}
                            onChange={e => setDistance(e.target.value)}
                            inputProps={{ min: 0.1, max: 5.0, step: 0.1 }}
                            size="small"
                            fullWidth
                        />
                        <Button variant="contained" style={{color: "#09090b", backgroundColor: "#ffffff", marginLeft: '10px'}}>Apply</Button>
                        </div>
                    </div>
                    </div>
                </CardContent>
                </Card>

                <Card className="border" style={{ background: "#09090b" }}>
                <div className="pb-2 m-[20px] mb-[0px]">
                    <Typography variant="h6" component="div">Time Analysis</Typography>
                    <Typography variant="body2" color="text.secondary">Check for suspicious check-in/out patterns</Typography>
                </div>
                <CardContent>
                    <div className="grid gap-2">
                    <div className="space-y-1 ">
                        <InputLabel htmlFor="buffer">Late Buffer (minutes)</InputLabel>
                        <div className="mb-[20px]">
                            <TextField id="buffer" type="number" defaultValue="5" min="0" max="30" />
                        </div>
                    </div>
                    <Button className="w-full" style={{color: "#09090b", backgroundColor: "#ffffff"}}>Update Settings</Button>
                    </div>
                </CardContent>
                </Card>
            </div>

            <Card className="border mt-[20px]" style={{ background: "#09090b" }}>
                <div className="flex flex-row items-center">
                    <div className="flex-1 ml-[20px]">
                        <h2 className="mb-[0px]">Fraud Alert Log</h2>
                        <Typography variant="body2" color="text.secondary">Detailed list of all detected fraud alerts</Typography>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <InputField
                                id="search-fraud"
                                placeholder="Search"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                icon={<FaSearch className='text-[#ffffff] w-[16px] h-[16px]' />}
                                iconPosition="left"
                                className="flex-1 h-[40px] mr-[20px]"
                              />
                        </div>
                    </div>
                </div>
                <CardContent><FraudTable searchTerm={searchTerm}  /></CardContent>
            </Card>
        </div>
    </div>
  )
}
