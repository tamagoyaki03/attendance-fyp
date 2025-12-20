import React, { useState, useEffect } from "react";
import supabase from "../config/supabaseClient";
import Sidebar from "../components/Sidebar";
import Button from "../components/Button";
import { FaSearch } from "react-icons/fa";
import { IoIosAdd } from "react-icons/io";
import { FiEdit } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { GoPeople } from "react-icons/go";
import AddClassDialog from "../components/Event/AddClassDialog";
import EditClassDialog from "../components/Event/EditClassDialog";
import {
  Box,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Typography,
} from "@mui/material";

const ManageClasses = () => {
  const [fetchError, setFetchError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [openEditClassDialog, setOpenEditClassDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      // fetch lectures, tutorials, users and enrollments in parallel
      const [
        { data: lectures, error: lectureError },
        { data: tutorials, error: tutorialError },
        { data: users, error: usersError },
        { data: lectureEnrollments, error: enrollLectureError },
        { data: tutorialEnrollments, error: enrollTutorialError },
      ] = await Promise.all([
        supabase.from("course_lecture").select("*"),
        supabase
          .from("course_tutorial")
          .select(`
            *,
            course:course_lecture (
              id,
              course_title,
              course_code
            )
          `),
        supabase.from("users").select("id, name"),
        supabase.from("enrollment_lecture").select("course_id"),
        supabase.from("enrollment_tutorial").select("tutorial_id"),
      ]);

      if (lectureError || tutorialError || usersError || enrollLectureError || enrollTutorialError) {
        setFetchError("Could not fetch classes");
        setClasses([]);
        return;
      }

      const lecturerMap = {};
      users?.forEach((u) => {
        lecturerMap[u.id] = u.name;
      });

      const lectureEnrollmentCount = {};
      (lectureEnrollments || []).forEach((e) => {
        lectureEnrollmentCount[e.course_id] = (lectureEnrollmentCount[e.course_id] || 0) + 1;
      });

      const tutorialEnrollmentCount = {};
      (tutorialEnrollments || []).forEach((e) => {
        tutorialEnrollmentCount[e.tutorial_id] = (tutorialEnrollmentCount[e.tutorial_id] || 0) + 1;
      });

      const merged = [
        ...(lectures || []).map((item) => ({
          ...item,
          type: "Lecture",
          lecturer_name: lecturerMap[item.lecturer_id] || "Unknown",
          num_students: lectureEnrollmentCount[item.id] || 0,
        })),
        ...(tutorials || []).map((item) => ({
          ...item,
          type: "Tutorial",
          course_code: item.course?.course_code,
          course_title: item.course?.course_title,
          lecturer_name: lecturerMap[item.lecturer_id] || "Unknown",
          num_students: tutorialEnrollmentCount[item.id] || 0,
        })),
      ];

      setClasses(merged);
      setFetchError(null);
    } catch (error) {
      console.error("Unexpected error:", error);
      setFetchError("Could not fetch classes");
      setClasses([]);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = async (classItem) => {
    const confirmed = window.confirm("Are you sure you want to delete this class?");
    if (!confirmed) return;

    await supabase.from("enrollment_lecture").delete().eq("course_id", classItem.id);
    await supabase.from("course_lecture").delete().eq("id", classItem.id);

    fetchClasses();
  };

  const filteredClasses = Array.isArray(classes)
    ? classes.filter((classItem) => {
        const q = searchTerm.toLowerCase();
        return (
          (classItem.course_code || "").toLowerCase().includes(q) ||
          (classItem.course_title || "").toLowerCase().includes(q) ||
          (classItem.lecturer_name || "").toLowerCase().includes(q)
        );
      })
    : [];

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    input: { color: "#0f172a" },
  };

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", width: "100%" }}>
      <div className="fixed left-0 top-0 h-screen w-[250px] z-10">
        <Sidebar />
      </div>

      <main className="ml-[250px] p-[40px] max-h-screen overflow-y-auto" style={{ minHeight: "100vh" }}>
        <div>
          <h2 className="text-[24px] font-inter font-semibold leading-[30px] text-left" style={{ color: "#0f172a", marginBottom: 0 }}>
            Manage Classes
          </h2>
          <div className="flex justify-between items-center">
            <p className="text-[14px] font-inter font-normal leading-[17px] text-left" style={{ color: "#374151" }}>
              Add, edit, or remove classes from the system
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button onClick={() => setOpenAddClassDialog(true)} variant="primary" className="h-[40px]">
                <IoIosAdd className="h-[20px] w-[20px]" />
                <span>Add Class</span>
              </Button>
            </div>
          </div>
        </div>

        <Box mt={3} mb={2} display="flex" alignItems="center">
          <TextField
            id="search-classes"
            placeholder="Search classes..."
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaSearch style={{ color: "#64748b", width: 16, height: 16 }} />
                </InputAdornment>
              ),
            }}
            sx={inputSx}
          />
        </Box>

        <Card sx={{ mt: 2, background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 6px 18px rgba(15,23,42,0.04)" }}>
          <TableContainer component={Paper} sx={{ background: "#ffffff", boxShadow: "none", borderRadius: 0 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Lecturer</TableCell>
                  <TableCell>Students</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {fetchError && (
                  <TableRow>
                    <TableCell colSpan={5}>{fetchError}</TableCell>
                  </TableRow>
                )}

                {!fetchError && filteredClasses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                      No classes found
                    </TableCell>
                  </TableRow>
                )}

                {filteredClasses.map((classItem) => (
                  <TableRow key={`${classItem.id}-${classItem.type}`}>
                    <TableCell sx={{ width: 160 }}>
                      <Typography fontWeight={600}>{classItem.course_code}</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography>{classItem.course_title} <Typography component="span" variant="caption" color="text.secondary">({classItem.type})</Typography></Typography>
                    </TableCell>

                    <TableCell sx={{ width: 240 }}>
                      <Typography>{classItem.lecturer_name}</Typography>
                    </TableCell>

                    <TableCell sx={{ width: 140 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <GoPeople />
                        <Typography>{classItem.num_students || 0}</Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedClass(classItem);
                          setOpenEditClassDialog(true);
                        }}
                      >
                        <FiEdit />
                      </IconButton>

                      <IconButton size="small" onClick={() => handleDelete(classItem)}>
                        <RiDeleteBin6Line />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </main>

      <AddClassDialog open={openAddClassDialog} onClose={() => setOpenAddClassDialog(false)} onClassAdded={fetchClasses} />

      <EditClassDialog open={openEditClassDialog} onClose={() => setOpenEditClassDialog(false)} classData={selectedClass} onClassAdded={fetchClasses} />
    </div>
  );
};

export default ManageClasses;