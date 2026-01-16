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
import ConfirmDialog from "../components/ConfirmDialog";
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
  Chip,
} from "@mui/material";

const ManageClasses = () => {
  const [fetchError, setFetchError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAddClassDialog, setOpenAddClassDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [openEditClassDialog, setOpenEditClassDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({ open: false, classItem: null });

  const getDayName = (dayNumber) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNumber] || "";
  };

  const formatTime = (time) => {
    if (!time) return "";
    // Remove seconds from time format (HH:MM:SS -> HH:MM)
    return time.substring(0, 5);
  };

  const isClassActive = (classItem) => {
    const endDate = classItem.type === "Lecture" ? classItem.lecture_end_date : classItem.tutorial_end_date;
    if (!endDate) return true; // If no end date, consider it active
    const classEndDate = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return classEndDate >= today;
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setIsLoading(true);
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
          start_time: item.lecture_start_time,
          end_time: item.lecture_end_time,
        })),
        ...(tutorials || []).map((item) => ({
          ...item,
          type: "Tutorial",
          course_code: item.course?.course_code,
          course_title: item.course?.course_title,
          lecturer_name: lecturerMap[item.lecturer_id] || "Unknown",
          num_students: tutorialEnrollmentCount[item.id] || 0,
          start_time: item.tutorial_start_time,
          end_time: item.tutorial_end_time,
        })),
      ];

      setClasses(merged);
      setFetchError(null);
    } catch (error) {
      setFetchError("Could not fetch classes");
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = (classItem) => {
    setDeleteDialog({ open: true, classItem });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.classItem) return;
    
    const classItem = deleteDialog.classItem;
    
    try {
      const isLecture = classItem.type === "Lecture";
      const enrollmentTable = isLecture ? "enrollment_lecture" : "enrollment_tutorial";
      const courseIdField = isLecture ? "course_id" : "tutorial_id";
      const courseTable = isLecture ? "course_lecture" : "course_tutorial";
      const attendanceField = isLecture ? "lecture_enrollment_id" : "tutorial_enrollment_id";
      
      // Get all enrollments for this class
      const { data: enrollments, error: fetchError } = await supabase
        .from(enrollmentTable)
        .select("id")
        .eq(courseIdField, classItem.id);
        
      if (fetchError) throw fetchError;
      
      // Delete only enrollments that have no attendance records
      if (enrollments && enrollments.length > 0) {
        for (const enrollment of enrollments) {
          const { data: attendanceRecords, error: attnError } = await supabase
            .from('attendance_record')
            .select('id')
            .eq(attendanceField, enrollment.id)
            .limit(1);
            
          if (!attnError && (!attendanceRecords || attendanceRecords.length === 0)) {
            // Safe to delete - no attendance records reference this enrollment
            await supabase.from(enrollmentTable).delete().eq('id', enrollment.id);
          }
          // If there are attendance records, skip deletion to avoid 409 conflict
        }
      }
      
      // Delete the course itself
      await supabase.from(courseTable).delete().eq("id", classItem.id);
      
      fetchClasses();
      setDeleteDialog({ open: false, classItem: null });
    } catch (error) {
      alert("An error occurred while deleting the class. Some enrollments with attendance records cannot be removed.");
      setDeleteDialog({ open: false, classItem: null });
    }
  };

  const filteredClasses = Array.isArray(classes)
    ? classes
        .filter((classItem) => {
          const q = searchTerm.toLowerCase();
          return (
            (classItem.course_code || "").toLowerCase().includes(q) ||
            (classItem.course_title || "").toLowerCase().includes(q) ||
            (classItem.lecturer_name || "").toLowerCase().includes(q)
          );
        })
        .sort((a, b) => {
          // Active classes first, then archived at bottom
          const aActive = isClassActive(a);
          const bActive = isClassActive(b);
          if (aActive !== bActive) return aActive ? -1 : 1;
          
          // Then sort by course code (letters first, then numbers)
          const codeA = a.course_code || "";
          const codeB = b.course_code || "";
          
          // Extract letters and numbers
          const lettersA = codeA.replace(/[0-9]/g, "");
          const lettersB = codeB.replace(/[0-9]/g, "");
          const numbersA = parseInt(codeA.replace(/[^0-9]/g, "")) || 0;
          const numbersB = parseInt(codeB.replace(/[^0-9]/g, "")) || 0;
          
          // Compare letters first
          if (lettersA !== lettersB) {
            return lettersA.localeCompare(lettersB);
          }
          // If letters are same, compare numbers
          return numbersA - numbersB;
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

      <main
        data-has-sidebar
        className="p-[40px] max-h-screen overflow-y-auto"
        style={{ minHeight: "100vh", marginLeft: "var(--sidebar-width, 250px)", transition: "margin-left 0.3s ease-in-out" }}
      >
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
                      {isLoading ? "Loading classes..." : "No classes found"}
                    </TableCell>
                  </TableRow>
                )}

                {filteredClasses.map((classItem) => (
                  <TableRow key={`${classItem.id}-${classItem.type}`} sx={{ opacity: isClassActive(classItem) ? 1 : 0.6, backgroundColor: !isClassActive(classItem) ? "#f9fafb" : "transparent" }}>
                    <TableCell sx={{ width: 160 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight={600}>{classItem.course_code}</Typography>
                        {!isClassActive(classItem) && (
                          <Typography variant="caption" sx={{ backgroundColor: "#fecaca", color: "#991b1b", px: 1, py: 0.5, borderRadius: "4px", fontWeight: 600 }}>
                            Archived
                          </Typography>
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography>{classItem.course_title}</Typography>
                        <Chip 
                          label={classItem.type} 
                          size="small" 
                          sx={{ 
                            height: "20px",
                            fontSize: "0.7rem",
                            backgroundColor: classItem.type === "Lecture" ? "#dbeafe" : "#fce7f3",
                            color: classItem.type === "Lecture" ? "#0c4a6e" : "#831843",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      {(classItem.day_of_week !== null && classItem.day_of_week !== undefined) || classItem.start_time ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {classItem.day_of_week !== null && classItem.day_of_week !== undefined ? getDayName(classItem.day_of_week) : ""}, 
                          {classItem.start_time && classItem.end_time ? ` ${formatTime(classItem.start_time)} - ${formatTime(classItem.end_time)}` : ""}
                        </Typography>
                      ) : null}
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

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, classItem: null })}
        onConfirm={confirmDelete}
        title="Delete Class"
        message={`Are you sure you want to delete ${deleteDialog.classItem?.course_code || 'this class'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
      />
    </div>
  );
};

export default ManageClasses;