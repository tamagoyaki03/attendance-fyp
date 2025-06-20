import React, { useState, useEffect } from "react";
import supabase from "../../config/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  InputLabel,
} from "@mui/material";
import ScheduleInput from "../ScheduleInput";
import TextField from "@mui/material/TextField";
import StudentSearch from "./StudentSearch";
import dayjs from "dayjs";
import MenuItem from "@mui/material/MenuItem";

const DAY_TO_NUMBER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
};

const style ={color: "#fafafa",
                  backgroundColor: "#18181b",
                  borderRadius: "8px",
                  margin: "5px 0",
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
                    paddingLeft: "10px",
                    height: "15px",
                  },
                  "& input:-webkit-autofill": {
                    WebkitBoxShadow: "0 0 0 1000px #18181b inset",
                    WebkitTextFillColor: "#fafafa",
                    transition: "background-color 5000s ease-in-out 0s",
                  }}

const EditClassDialog = ({ open, onOpenChange, onClassAdded, classData, lecturers }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    lecturer: "",
    day: "",
    startTime: "",
    endTime: "",
    startDate: "",
    endDate: "",
    students: [],
    location: "",
    type: "",
  });

  // Fetch students enrolled in this class
  useEffect(() => {
    if (classData) {
      // Determine type and table names
      const isLecture = classData.type === "Lecture";
      const courseTable = isLecture ? "course_lecture" : "course_tutorial";
      const enrollmentTable = isLecture ? "enrollment_lecture" : "enrollment_tutorial";
      const courseIdField = isLecture ? "course_id" : "tutorial_id";

      // Set initial form data
      setFormData({
        code: classData.course_code || "",
        name: classData.course_title || "",
        lecturer: classData.lecturer_id || "",
        day: classData.day_of_week
          ? Object.keys(DAY_TO_NUMBER).find(
              (k) => DAY_TO_NUMBER[k] === classData.day_of_week
            ) || ""
          : "",
        startTime: classData.lecture_start_time
          ? classData.lecture_start_time.slice(0, 5)
          : "",
        endTime: classData.lecture_end_time
          ? classData.lecture_end_time.slice(0, 5)
          : "",
        startDate: classData.lecture_start_date
          ? dayjs(classData.lecture_start_date)
          : null,
        endDate: classData.lecture_end_date
          ? dayjs(classData.lecture_end_date)
          : null,
        students: [],
        location: classData.lecture_location || "",
        type: classData.type || "",
      });

      // Fetch enrolled students
      const fetchEnrolledStudents = async () => {
        const { data: enrollments, error: enrollError } = await supabase
          .from(enrollmentTable)
          .select("student_id")
          .eq(courseIdField, classData.id);

        let students = [];
        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map((e) => e.student_id);
          const { data: users, error: userError } = await supabase
            .from("users")
            .select("id, name")
            .in("id", studentIds);
          students = users || [];
        }
        setFormData((prev) => ({
          ...prev,
          students,
        }));
      };

      fetchEnrolledStudents();
    }
  }, [classData, open]);

  const handleClose = () => {
    document.activeElement && document.activeElement.blur();
    onOpenChange(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const isLecture = formData.type === "Lecture";
      const courseTable = isLecture ? "course_lecture" : "course_tutorial";
      const enrollmentTable = isLecture ? "enrollment_lecture" : "enrollment_tutorial";
      const courseIdField = isLecture ? "course_id" : "tutorial_id";

      const dayNumber = DAY_TO_NUMBER[formData.day];

      // Build payload for course table
      const payload = {
        course_code: formData.code,
        course_title: formData.name,
        lecturer_id: formData.lecturer,
        day_of_week: dayNumber,
        lecture_start_time: formData.startTime,
        lecture_end_time: formData.endTime,
        lecture_start_date: formData.startDate
          ? formData.startDate.format("YYYY-MM-DD")
          : null,
        lecture_end_date: formData.endDate
          ? formData.endDate.format("YYYY-MM-DD")
          : null,
        lecture_location: formData.location,
      };

      // Update course
      const { data, error } = await supabase
        .from(courseTable)
        .update(payload)
        .eq("id", classData.id)
        .select();

      if (error) {
        setIsLoading(false);
        alert("An error occurred while updating the class. Please try again.");
        return;
      }

      // Update enrollments: delete old, insert new
      const studentsArray = Array.isArray(formData.students)
        ? formData.students.map((student) => ({
            student_id: student.id,
            [courseIdField]: classData.id,
          }))
        : [];

      // Delete old enrollments
      await supabase
        .from(enrollmentTable)
        .delete()
        .eq(courseIdField, classData.id);

      // Insert new enrollments
      if (studentsArray.length > 0) {
        await supabase.from(enrollmentTable).insert(studentsArray);
      }

      setIsLoading(false);
      if (onClassAdded) onClassAdded();
      handleClose();
    } catch (error) {
      setIsLoading(false);
      alert("An error occurred while updating the class. Please try again.");
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} style={{ color: "#09090B" }}>
      <DialogContent
        className="sm:max-w-[525px]"
        sx={{
          backgroundColor: "#09090B",
          color: "#fafafa",
          borderRadius: "8px",
          border: "1px solid #ffffff",
        }}
      >
        <h3 style={{ marginBottom: "0px" }}>Edit Class</h3>
        <DialogContentText
          className="mt-2"
          sx={{ color: "#a1a1aa", fontSize: "14px" }}
        >
          Edit the details for this class. Click save when you're done.
        </DialogContentText>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 mt-[20px]">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <InputLabel htmlFor="code" sx={{ color: "#fafafa" }}>
                  Class Code
                </InputLabel>
                <TextField
                  id="code"
                  name="code"
                  placeholder="e.g., CS101"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  sx={{style}}
                  inputProps={{ style: { paddingLeft: "10px" } }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <InputLabel
                htmlFor="name"
                sx={{ color: "#fafafa", marginTop: "10px" }}
              >
                Class Name
              </InputLabel>
              <TextField
                id="name"
                name="name"
                placeholder="e.g., Introduction to Programming"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={{ width: "100%" }}
                sx={{style}}
                inputProps={{ style: { paddingLeft: "10px" } }}
              />
            </div>
            <div className="space-y-2">
              <InputLabel
                htmlFor="lecturer"
                sx={{ color: "#fafafa", marginTop: "10px" }}
              >
                Lecturer
              </InputLabel>
              <TextField
                select
                id="lecturer"
                name="lecturer"
                placeholder="Select Lecturer"
                value={formData.lecturer}
                onChange={handleInputChange}
                margin="normal"
                required
                style={{ width: "100%" }}
                sx={{style}}
                inputProps={{ style: { paddingLeft: "10px" } }}
                SelectProps={{ displayEmpty: true }}
              >
                {lecturers.map((lect) => (
                  <MenuItem key={lect.id} value={lect.id}>
                    {lect.name}
                  </MenuItem>
                ))}
              </TextField>
            </div>
            <div className="space-y-2">
              <InputLabel htmlFor="type" sx={{ color: "#fafafa" }}>
                Class Type
              </InputLabel>
              <TextField
                id="type"
                name="type"
                select
                value={formData.type}
                onChange={handleInputChange}
                required
                sx={{style}}
                inputProps={{ style: { paddingLeft: "10px" } }}
                SelectProps={{ displayEmpty: true }}
                disabled
              >
                <MenuItem value="Lecture">Lecture</MenuItem>
                <MenuItem value="Tutorial">Tutorial</MenuItem>
              </TextField>
            </div>
            <div className="space-y-2">
              <ScheduleInput
                formData={formData}
                setFormData={setFormData}
              />
            </div>
            <div className="space-y-2" style={{ marginTop: "20px" }}>
              <InputLabel htmlFor="location" sx={{ color: "#fafafa" }}>
                Location
              </InputLabel>
              <TextField
                id="location"
                name="location"
                placeholder="e.g., Room 101"
                value={formData.location}
                onChange={handleInputChange}
                required
                style={{ width: "100%" }}
                sx={{style}}
                inputProps={{ style: { paddingLeft: "10px" } }}
              />
            </div>
            <div className="space-y-2">
              <StudentSearch
                formData={formData}
                setFormData={setFormData}
              />
            </div>
          </div>
          <DialogActions className="mt-[10px]">
            <Button
              type="button"
              variant="outlined"
              onClick={handleClose}
              style={{ color: "#fafafa", borderColor: "#27272a" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              style={{ color: "#09090b", backgroundColor: "#ffffff" }}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClassDialog;