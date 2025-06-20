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
import MenuItem from "@mui/material/MenuItem";

const DAY_TO_NUMBER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
};


const AddClassDialog = ({ open, onOpenChange, onClassAdded }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    lecturer: "",
    day: [],
    start_time: "",
    end_time: "",
    start_date: "",
    end_date: "",
    students: [],
    location: "",
    type: "",
  });
  const [lecturers, setLecturers] = useState([]);

useEffect(() => {
  const fetchLecturers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'lecturer');

    if (error) {
      console.error('Error fetching lecturers:', error);
    } else {
      setLecturers(data || []);
    }
  };

  fetchLecturers();
}, []);

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
    const dayNumber = DAY_TO_NUMBER[formData.day]; // formData.day should be e.g. 'Monday'


    // 2️⃣ Build the payload for course table (without students)
    const payload = {
      course_code: formData.code,
      course_title: formData.name,
      lecturer_id: formData.lecturer,
      day_of_week: dayNumber,
      lecture_start_time: formData.startTime,
      lecture_end_time: formData.endTime,
      lecture_start_date: formData.startDate,
      lecture_end_date: formData.endDate,
      lecture_location: formData.location
    };

    // 3️⃣ Choose table name by type
    const courseTable =
      formData.type === "Lecture" ? "course_lecture" : "course_tutorial";
    const enrollmentTable =
      formData.type === "Lecture" ? "enrollment_lecture" : "enrollment_tutorial";

    // 4️⃣ Insert course record
    const { data: courseData, error: courseError } = await supabase
      .from(courseTable)
      .insert([payload])
      .select(); // get the new row(s) back

    if (courseError) {
      console.error("Error adding course:", courseError);
      throw courseError;
    }

    // 5️⃣ Get the inserted course id
    const courseId = courseData[0].id;

    // 6️⃣ Insert enrollments for each student
    const studentsArray = Array.isArray(formData.students)
      ? formData.students.map((student) => ({
          student_id: student.id,
          [`course_id`]: courseId, // dynamically set FK
        }))
      : [];

    if (studentsArray.length > 0) {
      const { error: enrollmentError } = await supabase
        .from(enrollmentTable)
        .insert(studentsArray);

      if (enrollmentError) {
        console.error("Error adding enrollments:", enrollmentError);
        throw enrollmentError;
      }
    }

    // ✅ Done — show success
    if (onClassAdded) onClassAdded();
    handleClose();
    setFormData({
      code: "",
      name: "",
      lecturer: "",
      day: "",
      start_time: "",
      end_time: "",
      start_date: "",
      end_date: "",
      students: [],
      location: "",
      type: "",
    });
  } catch (error) {
    console.error("Error adding class:", error.message, error.details, error.hint);
    alert("An error occurred while adding the class. Please try again.");
  } finally {
    setIsLoading(false);
  }
};


  return (
    <Dialog open={open} onClose={handleClose} style={{ color: "#09090B" }}>
      <DialogContent className="sm:max-w-[525px]" sx={{ backgroundColor: "#09090B", color: "#fafafa", borderRadius: '8px', border: '1px solid #ffffff', }}>
        <h3 style={{ marginBottom: '0px' }}>Add New Class</h3>
        <DialogContentText className="mt-2" sx={{ color: "#a1a1aa", fontSize: '14px' }}>
          Enter the details for the new class. Click save when you're done.
        </DialogContentText>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 mt-[20px]">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <InputLabel htmlFor="code" sx={{ color: "#fafafa" }}>Class Code</InputLabel>
                <TextField
                  id="code"
                  name="code"
                  placeholder="e.g., CS101"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  sx={{color: "#fafafa", backgroundColor: "#18181b", borderRadius: '8px', margin: '5px 0',
                    "& .MuiInputLabel-root.Mui-focused": { color: "#ffffff" },
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
                    },
                  }}
                  inputProps={{ style: { paddingLeft: '10px' } }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <InputLabel htmlFor="name" sx={{ color: "#fafafa", marginTop: '10px' }}>Class Name</InputLabel>
              <TextField
                id="name"
                name="name"
                placeholder="e.g., Introduction to Programming"
                value={formData.name}
                onChange={handleInputChange}
                required
                style={{ width: '100%' }}
                sx={{color: "#fafafa", backgroundColor: "#18181b", borderRadius: '8px', margin: '5px 0',
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
                    },
                  }}
                inputProps={{ style: { paddingLeft: '10px' } }}
              />
            </div>
            <div className="space-y-2">
              <InputLabel htmlFor="lecturer" sx={{ color: "#fafafa", marginTop: '10px' }}>Lecturer</InputLabel>
              <TextField
                select
                id="lecturer"
                name="lecturer"
                placeholder="Select Lecturer"
                value={formData.lecturer}
                onChange={handleInputChange}
                margin="normal"
                required
                style={{ width: '100%' }}
                sx={{
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
                  },
                }}
                inputProps={{ style: { paddingLeft: '10px' } }}
                SelectProps={{ displayEmpty: true }}
              >
                {lecturers.length === 0 ? (
                  <MenuItem disabled>Loading lecturers...</MenuItem>
                ) : (
                lecturers.map((lect) => (
                  <MenuItem key={lect.id} value={lect.id}>
                    {lect.name}
                  </MenuItem>
                ))
              )}
              </TextField>
            </div>
            <div className="space-y-2">
              <InputLabel htmlFor="type" sx={{ color: "#fafafa" }}>Class Type</InputLabel>
              <TextField
                id="type"
                name="type"
                select
                value={formData.type}
                onChange={handleInputChange}
                required
                sx={{
                  color: "#fafafa",
                  backgroundColor: "#18181b",
                  borderRadius: '8px',
                  margin: '5px 0',
                  "& .MuiInputLabel-root.Mui-focused": { color: "#ffffff" },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#ffffff" },
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
                  },
                }}
                inputProps={{ style: { paddingLeft: '10px' } }}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="" disabled>Select type</MenuItem>
                <MenuItem value="Lecture">Lecture</MenuItem>
                <MenuItem value="Tutorial">Tutorial</MenuItem>
              </TextField>
            </div>
            <div className="space-y-2">
              <ScheduleInput 
                formData={formData} 
                handleInputChange={handleInputChange}
                setFormData={setFormData}
              />
            </div>
            <div className="space-y-2" style={{ marginTop: '20px' }}>
              <div className="space-y-2" style={{ marginTop: '20px' }}>
                <InputLabel htmlFor="location" sx={{ color: "#fafafa" }}>Location</InputLabel>
                <TextField
                  id="location"
                  name="location"
                  placeholder="e.g., Room 101"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%' }}
                  sx={{
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
                    },
                  }}
                  inputProps={{ style: { paddingLeft: '10px' } }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <StudentSearch
                formData={formData}
                handleInputChange={handleInputChange}
                setFormData={setFormData}
              />
            </div>
          </div>
          <DialogActions className="mt-[10px]">
            <Button type="button" variant="outlined" onClick={handleClose} style={{color: "#fafafa", borderColor: "#27272a"}}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} style={{color: "#09090b", backgroundColor: "#ffffff"}}>
              {isLoading ? "Adding..." : "Add Class"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClassDialog;