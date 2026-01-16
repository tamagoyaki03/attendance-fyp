import React, { useState, useEffect } from "react";
import supabase from "../../config/supabaseClient";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  InputLabel,
  TextField,
  MenuItem,
  Box,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Typography,
  Autocomplete
} from "@mui/material";
import ScheduleInput from "../ScheduleInput";
import StudentSearch from "./StudentSearch";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { getCurrentLocation, geocodeAddress } from "../../utils/geolocationUtils";
import LocationPicker from "../LocationPicker";
import ConflictDialog from "../ConflictDialog";

const DAY_TO_NUMBER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
};

// Helper function to check if two time ranges overlap
const timeRangesOverlap = (start1, end1, start2, end2) => {
  // Convert time strings (HH:MM:SS or HH:MM) to minutes
  const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const start1Min = toMinutes(start1);
  const end1Min = toMinutes(end1);
  const start2Min = toMinutes(start2);
  const end2Min = toMinutes(end2);
  
  // Check if ranges overlap
  return start1Min < end2Min && start2Min < end1Min;
};

// Helper function to check for time conflicts
// eslint-disable-next-line no-unused-vars
const checkTimeConflicts = async (studentIds, dayOfWeek, startTime, endTime, isLecture) => {
  const conflicts = [];
  
  for (const studentId of studentIds) {
    // Get all enrollments for this student
    const [{ data: lectureEnrollments }, { data: tutorialEnrollments }] = await Promise.all([
      supabase
        .from('enrollment_lecture')
        .select(`
          id,
          course_id,
          course:course_lecture (
            id,
            course_code,
            course_title,
            day_of_week,
            lecture_start_time,
            lecture_end_time
          )
        `)
        .eq('student_id', studentId),
      supabase
        .from('enrollment_tutorial')
        .select(`
          id,
          tutorial_id,
          tutorial:course_tutorial (
            id,
            course_code,
            course_title,
            day_of_week,
            tutorial_start_time,
            tutorial_end_time
          )
        `)
        .eq('student_id', studentId)
    ]);
    
    // Check lecture enrollments for conflicts
    if (lectureEnrollments) {
      for (const enrollment of lectureEnrollments) {
        const course = enrollment.course;
        if (course && 
            course.day_of_week === dayOfWeek && 
            course.lecture_start_time && 
            course.lecture_end_time &&
            timeRangesOverlap(startTime, endTime, course.lecture_start_time, course.lecture_end_time)) {
          // Get student name
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', studentId)
            .single();
          
          conflicts.push({
            studentId,
            studentName: userData?.name || 'Unknown',
            conflictingClass: `${course.course_code} - ${course.course_title}`,
            conflictingTime: `${course.lecture_start_time.substring(0, 5)} - ${course.lecture_end_time.substring(0, 5)}`
          });
          break;
        }
      }
    }
    
    // Check tutorial enrollments for conflicts (if not already found a conflict)
    if (tutorialEnrollments && !conflicts.some(c => c.studentId === studentId)) {
      for (const enrollment of tutorialEnrollments) {
        const tutorial = enrollment.tutorial;
        if (tutorial && 
            tutorial.day_of_week === dayOfWeek && 
            tutorial.tutorial_start_time && 
            tutorial.tutorial_end_time &&
            timeRangesOverlap(startTime, endTime, tutorial.tutorial_start_time, tutorial.tutorial_end_time)) {
          // Get student name
          const { data: userData } = await supabase
            .from('users')
            .select('name')
            .eq('id', studentId)
            .single();
          
          conflicts.push({
            studentId,
            studentName: userData?.name || 'Unknown',
            conflictingClass: `${tutorial.course_code} - ${tutorial.course_title}`,
            conflictingTime: `${tutorial.tutorial_start_time.substring(0, 5)} - ${tutorial.tutorial_end_time.substring(0, 5)}`
          });
          break;
        }
      }
    }
  }
  
  return conflicts;
};

export default function AddClassDialog({ open, onClose, onClassAdded }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [openLocationPicker, setOpenLocationPicker] = useState(false);
  const [lecturerConflict, setLecturerConflict] = useState(null);
  const [openLecturerConflictDialog, setOpenLecturerConflictDialog] = useState(false);
  const [studentConflicts, setStudentConflicts] = useState([]);
  const [openStudentConflictDialog, setOpenStudentConflictDialog] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    lecturer: "",
    day: "",
    start_time: "",
    end_time: "",
    start_date: null,
    end_date: null,
    students: [],
    location: "",
    latitude: null,
    longitude: null,
    type: "",
    parentCourseId: "", // link tutorial to a lecture
  });
  const [lecturers, setLecturers] = useState([]);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchLecturers = async () => {
      const { data } = await supabase.from("users").select("id, name").eq("role", "lecturer");
      setLecturers(data || []);
    };
    const fetchCourses = async () => {
      const { data } = await supabase.from("course_lecture").select("id, course_code, course_title");
      setCourses(data || []);
    };
    fetchLecturers();
    fetchCourses();
  }, []);

  const handleGetCurrentLocation = async () => {
    if (formData.location.toLowerCase() === 'online') {
      setLocationStatus('Location not needed for online classes');
      setTimeout(() => setLocationStatus(''), 3000);
      return;
    }

    setIsGettingLocation(true);
    setLocationStatus('Getting your current location...');

    try {
      const location = await getCurrentLocation();
      setFormData(prev => ({
       ...prev,
       latitude: location.latitude,
       longitude: location.longitude,
       location: prev.location || `Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}`
     }));
     setLocationStatus('Current location obtained successfully!');
     setTimeout(() => setLocationStatus(''), 3000);
   } catch (error) {
     setLocationStatus(`Error: ${error.message}`);
     setTimeout(() => setLocationStatus(''), 5000);
   } finally {
     setIsGettingLocation(false);
   }
};
 
const handleGeocodeLocation = async () => {
  if (formData.location.toLowerCase() === 'online') {
    setLocationStatus('Location not needed for online classes');
    setTimeout(() => setLocationStatus(''), 3000);
    return;
  }

  if (!formData.location.trim()) {
    setLocationStatus('Please enter a location first');
    setTimeout(() => setLocationStatus(''), 3000);
    return;
  }

  setIsGettingLocation(true);
  setLocationStatus('Getting coordinates for the location...');

  try {
    const result = await geocodeAddress(formData.location);
    setFormData(prev => ({
      ...prev,
      latitude: result.latitude,
      longitude: result.longitude
    }));
    setLocationStatus('Location coordinates found!');
    setTimeout(() => setLocationStatus(''), 3000);
  } catch (error) {
    setLocationStatus('Could not find coordinates for this location');
    setTimeout(() => setLocationStatus(''), 5000);
  } finally {
    setIsGettingLocation(false);
  }
};

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      "& fieldset": { borderColor: "#e2e8f0" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
  };

  const handleClose = () => {
    document.activeElement && document.activeElement.blur();
    setLocationStatus('');
    setValidationErrors({});
    setTouched({});
   
   // Reset form data when canceling
   setFormData({
     code: "",
     name: "",
     lecturer: "",
     day: "",
     start_time: "",
     end_time: "",
     start_date: null,
     end_date: null,
     students: [],
     location: "",
     latitude: null,
     longitude: null,
     type: "",
     parentCourseId: "",
   });
    if (typeof onClose === 'function') {
      onClose(false);
    }
  };

  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "type":
        if (!value) error = "Class type is required";
        break;
      case "parentCourseId":
        if (formData.type === "Tutorial" && !value) error = "Lecture course is required for tutorials";
        break;
      case "code":
        if (!value) error = "Class code is required";
        break;
      case "name":
        if (!value) error = "Class name is required";
        break;
      case "lecturer":
        if (!value) error = "Lecturer is required";
        break;
      case "day":
        if (!value) error = "Day is required";
        break;
      case "start_time":
        if (!value) error = "Start time is required";
        break;
      case "end_time":
        if (!value) error = "End time is required";
        else if (formData.start_time && value <= formData.start_time) {
          error = "End time must be after start time";
        }
        break;
      case "start_date":
        if (!value) error = "Start date is required";
        break;
      case "end_date":
        if (!value) error = "End date is required";
        else if (formData.start_date && value < formData.start_date) {
          error = "End date must be after start date";
        }
        break;
      case "location":
        if (!value) error = "Location is required";
        break;
      default:
        break;
    }

    return error;
  };

  const validateForm = () => {
    const errors = {};
    
    errors.type = validateField("type", formData.type);
    if (formData.type === "Tutorial") {
      errors.parentCourseId = validateField("parentCourseId", formData.parentCourseId);
    }
    errors.code = validateField("code", formData.code);
    errors.name = validateField("name", formData.name);
    errors.lecturer = validateField("lecturer", formData.lecturer);
    errors.day = validateField("day", formData.day);
    errors.start_time = validateField("start_time", formData.start_time);
    errors.end_time = validateField("end_time", formData.end_time);
    errors.start_date = validateField("start_date", formData.start_date);
    errors.end_date = validateField("end_date", formData.end_date);
    errors.location = validateField("location", formData.location);

    // Filter out empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });

    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));

    // Validate the field
    const error = validateField(name, value);
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[name] = error;
      } else {
        delete newErrors[name];
      }
      return newErrors;
    });

    if (name === 'location') {
      if (value.toLowerCase() === 'online') {
        setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
     } else {
       setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
     }
    }

    // If changing type, clear parent course errors
    if (name === 'type' && value !== 'Tutorial') {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.parentCourseId;
        return newErrors;
      });
    }
  };

  const handleParentCourseChange = (e) => {
    const parentCourseId = e.target.value;
    const selectedCourse = courses.find((c) => c.id === parentCourseId);

    if (selectedCourse) {
      // Auto-fill code and name from parent course
      setFormData((prev) => ({
        ...prev,
        parentCourseId,
        code: selectedCourse.course_code,
        name: selectedCourse.course_title,
      }));
    } else {
      setFormData((prev) => ({ ...prev, parentCourseId }));
    }
  };

  // Check for lecturer scheduling conflicts
  const checkLecturerConflict = async () => {
    if (!formData.lecturer || !formData.day || !formData.start_time || !formData.end_time) {
      return null;
    }

    const dayNumber = DAY_TO_NUMBER[formData.day];

    // Check both lecture and tutorial tables for conflicts
    const [lectureCheck, tutorialCheck] = await Promise.all([
      supabase
        .from('course_lecture')
        .select('course_code, course_title, lecture_start_time, lecture_end_time')
        .eq('lecturer_id', formData.lecturer)
        .eq('day_of_week', dayNumber),
      supabase
        .from('course_tutorial')
        .select('course_code, course_title, tutorial_start_time, tutorial_end_time')
        .eq('lecturer_id', formData.lecturer)
        .eq('day_of_week', dayNumber)
    ]);

    const allClasses = [
      ...(lectureCheck.data || []).map(c => ({
        code: c.course_code,
        title: c.course_title,
        start: c.lecture_start_time,
        end: c.lecture_end_time,
        type: 'Lecture'
      })),
      ...(tutorialCheck.data || []).map(c => ({
        code: c.course_code,
        title: c.course_title,
        start: c.tutorial_start_time,
        end: c.tutorial_end_time,
        type: 'Tutorial'
      }))
    ];

    // Check for time overlap
    const newStart = formData.start_time;
    const newEnd = formData.end_time;

    for (const existingClass of allClasses) {
      // Check if times overlap using timeRangesOverlap function
      if (timeRangesOverlap(newStart, newEnd, existingClass.start, existingClass.end)) {
        return existingClass;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      type: true,
      parentCourseId: true,
      code: true,
      name: true,
      lecturer: true,
      day: true,
      start_time: true,
      end_time: true,
      start_date: true,
      end_date: true,
      location: true,
    });

    // Check if location is not online and coordinates are missing
    if (formData.location && formData.location.toLowerCase() !== 'online' && (!formData.latitude || !formData.longitude)) {
      alert('Please save coordinates for this location. Click the location icon to geocode or use "Get my location".');
      return;
    }

    // Validate all fields
    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);

    const dayNumber = DAY_TO_NUMBER[formData.day];

    // Check for lecturer scheduling conflicts FIRST
    const conflict = await checkLecturerConflict();
    if (conflict) {
      setLecturerConflict(conflict);
      setOpenLecturerConflictDialog(true);
      setIsLoading(false);
      return;
    }

    // Check for student time conflicts BEFORE creating the course
    if (formData.students && formData.students.length > 0) {
      const conflictingStudents = await checkTimeConflicts(
        formData.students.map(s => s.id),
        dayNumber,
        formData.start_time,
        formData.end_time,
        formData.type === "Lecture"
      );

      if (conflictingStudents.length > 0) {
        setStudentConflicts(conflictingStudents);
        setOpenStudentConflictDialog(true);
        setIsLoading(false);
        return;
      }
    }

    try {

      let payload;
      let courseTable, enrollmentTable;

      if (formData.type === "Lecture") {
        courseTable = "course_lecture";
        enrollmentTable = "enrollment_lecture";
        payload = {
          course_code: formData.code,
          course_title: formData.name,
          lecturer_id: formData.lecturer,
          day_of_week: dayNumber,
          lecture_start_time: formData.start_time || null,
          lecture_end_time: formData.end_time || null,
          lecture_start_date: formData.start_date || null,
          lecture_end_date: formData.end_date || null,
          lecture_location: formData.location,
          latitude: formData.location.toLowerCase() === 'online' ? null : formData.latitude,
          longitude: formData.location.toLowerCase() === 'online' ? null : formData.longitude,
        };
      } else {
        courseTable = "course_tutorial";
        enrollmentTable = "enrollment_tutorial";
        if (!formData.parentCourseId) {
          alert("Please select a parent lecture course for this tutorial");
          setIsLoading(false);
          return;
        }
        payload = {
          course_id: formData.parentCourseId,
          course_code: formData.code,
          course_title: formData.name,
          lecturer_id: formData.lecturer,
          day_of_week: dayNumber,
          tutorial_start_time: formData.start_time || null,
          tutorial_end_time: formData.end_time || null,
          tutorial_start_date: formData.start_date || null,
          tutorial_end_date: formData.end_date || null,
          tutorial_location: formData.location,
          latitude: formData.location.toLowerCase() === 'online' ? null : formData.latitude,
          longitude: formData.location.toLowerCase() === 'online' ? null : formData.longitude,
        };
      }

      const { data: courseData, error: courseError } = await supabase.from(courseTable).insert([payload]).select();

      if (courseError) throw courseError;

      const courseId = courseData[0].id;

      const studentsArray = Array.isArray(formData.students)
        ? formData.students.map((student) => ({ 
            student_id: student.id, 
            [formData.type === "Lecture" ? "course_id" : "tutorial_id"]: courseId 
          }))
        : [];

      if (studentsArray.length > 0) {
        const { error: enrollmentError } = await supabase.from(enrollmentTable).insert(studentsArray);
        if (enrollmentError) throw enrollmentError;
      }

      if (typeof onClassAdded === 'function') {
        onClassAdded();
      }
      setFormData({
        code: "",
        name: "",
        lecturer: "",
        day: "",
        start_time: "",
        end_time: "",
        start_date: null,
        end_date: null,
        students: [],
        location: "",
        latitude: null,
        longitude: null,
        type: "",
      });

      setLocationStatus('');

     // Close the dialog
     if (typeof onClose === 'function') {
       onClose(false);
     }

    } catch (error) {
      alert("An error occurred while adding the class. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Add New Class</DialogTitle>

      <DialogContent sx={{ backgroundColor: "#ffffff"}}>
        <DialogContentText sx={{ color: "text.secondary", mb: 2 }}>
          Enter the details for the new class. Click save when you're done.
        </DialogContentText>

        {locationStatus && (
          <Alert severity={locationStatus.includes('Error') ? 'error' : 'info'} sx={{ mb: 2 }}>
            {locationStatus}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box display="grid" gap={2} gridTemplateColumns={{ xs: "1fr", md: "1fr 1fr" }}>
            <Box>
              <InputLabel htmlFor="type" sx={{ mb: 1 }}>Class Type</InputLabel>
              <TextField 
                select 
                id="type" 
                name="type" 
                value={formData.type} 
                onChange={handleInputChange} 
                required 
                sx={inputSx}
                error={touched.type && !!validationErrors.type}
                helperText={touched.type && validationErrors.type}
              >
                <MenuItem value="" disabled>Select type</MenuItem>
                <MenuItem value="Lecture">Lecture</MenuItem>
                <MenuItem value="Tutorial">Tutorial</MenuItem>
              </TextField>
            </Box>

            {formData.type === "Tutorial" && (
              <Box sx={{ gridColumn: "1 / -1" }}>
                <InputLabel htmlFor="parentCourseId" sx={{ mb: 1 }}>Lecture Course</InputLabel>
                <TextField 
                  select 
                  id="parentCourseId" 
                  name="parentCourseId" 
                  value={formData.parentCourseId} 
                  onChange={handleParentCourseChange} 
                  required 
                  sx={inputSx}
                  error={touched.parentCourseId && !!validationErrors.parentCourseId}
                  helperText={touched.parentCourseId && validationErrors.parentCourseId}
                >
                  {courses.map((course) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.course_code} - {course.course_title}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            )}

            <Box>
              <InputLabel htmlFor="code" sx={{ mb: 1 }}>Class Code</InputLabel>
              <TextField 
                id="code" 
                name="code" 
                placeholder="e.g., CS101" 
                value={formData.code} 
                onChange={handleInputChange} 
                required 
                sx={inputSx} 
                disabled={formData.type === "Tutorial"}
                error={touched.code && !!validationErrors.code}
                helperText={touched.code && validationErrors.code}
              />
            </Box>

            <Box>
              <InputLabel htmlFor="lecturer" sx={{ mb: 1 }}>Lecturer</InputLabel>
              <TextField 
                select 
                id="lecturer" 
                name="lecturer" 
                value={formData.lecturer} 
                onChange={handleInputChange} 
                sx={inputSx}
                error={touched.lecturer && !!validationErrors.lecturer}
                helperText={touched.lecturer && validationErrors.lecturer}
              >
                {lecturers.length === 0 ? <MenuItem disabled>Loading lecturers...</MenuItem> : lecturers.map((lect) => <MenuItem key={lect.id} value={lect.id}>{lect.name}</MenuItem>)}
              </TextField>
            </Box>

            <Box sx={{ gridColumn: "1 / -1" }}>
              <InputLabel htmlFor="name" sx={{ mb: 1 }}>Class Name</InputLabel>
              <TextField 
                id="name" 
                name="name" 
                placeholder="e.g., Introduction to Programming" 
                value={formData.name} 
                onChange={handleInputChange} 
                required 
                fullWidth 
                sx={inputSx} 
                disabled={formData.type === "Tutorial"}
                error={touched.name && !!validationErrors.name}
                helperText={touched.name && validationErrors.name}
              />
            </Box>

            <Box sx={{ gridColumn: "1 / -1" }}>
              <ScheduleInput 
                formData={formData} 
                handleInputChange={handleInputChange} 
                setFormData={setFormData} 
                validationErrors={validationErrors}
                touched={touched}
                setTouched={setTouched}
                setValidationErrors={setValidationErrors}
                validateField={validateField}
              />
            </Box>

            <Box sx={{ gridColumn: "1 / -1" }}>
              <InputLabel htmlFor="location" sx={{ mb: 1 }}>Location</InputLabel>
              <Box display="flex" gap={1} alignItems="flex-start">
                <TextField 
                  id="location" 
                  name="location" 
                  placeholder="e.g., Room 101, Building A" 
                  value={formData.location} 
                  onChange={handleInputChange} 
                  fullWidth 
                  sx={inputSx}
                  error={touched.location && !!validationErrors.location}
                  helperText={touched.location && validationErrors.location}
                />
                <Button 
                 variant="outlined" 
                 onClick={() => setFormData(prev => ({ 
                   ...prev, 
                   location: "Online", 
                   latitude: null, 
                   longitude: null 
                 }))}
                 sx={{ whiteSpace: 'nowrap' }}
               >
                 Online
               </Button>
                <Tooltip title="Get coordinates for entered location">
                  <IconButton
                    onClick={handleGeocodeLocation}
                    disabled={isGettingLocation || !formData.location.trim()|| formData.location.toLowerCase() === 'online'}
                    color="primary"
                  >
                    {isGettingLocation ? <CircularProgress size={20} /> : <LocationOnIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Use my current location">
                 <IconButton
                   onClick={handleGetCurrentLocation}
                   disabled={isGettingLocation || formData.location.toLowerCase() === 'online'}
                   color="secondary"
                 >
                   {isGettingLocation ? <CircularProgress size={20} /> : <MyLocationIcon />}
                 </IconButton>
               </Tooltip>
               <Tooltip title="Select location on map">
                 <IconButton
                   onClick={() => setOpenLocationPicker(true)}
                   disabled={formData.location.toLowerCase() === 'online'}
                   color="info"
                   sx={{ 
                     backgroundColor: '#e3f2fd',
                     '&:hover': { backgroundColor: '#bbdefb' }
                   }}
                 >
                   📍
                 </IconButton>
               </Tooltip>
              </Box>
             
             {formData.location && formData.location.toLowerCase() !== 'online' && !formData.latitude && (
               <Box sx={{ mt: 1, p: 1, backgroundColor: '#fff3cd', borderRadius: 1, border: '1px solid #ffc107' }}>
                 <Typography variant="caption" color="error">
                   ⚠️ Coordinates required for physical locations. Click the location icon to save coordinates.
                 </Typography>
               </Box>
             )}
             
             {formData.latitude && formData.longitude && formData.location.toLowerCase() !== 'online' && (
               <Box sx={{ mt: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                 <Typography variant="caption" color="success" sx={{ fontWeight: 'bold' }}>
                   ✓ Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                 </Typography>
               </Box>
             )}

             {formData.location.toLowerCase() === 'online' && (
               <Box sx={{ mt: 1, p: 1, backgroundColor: '#e3f2fd', borderRadius: 1 }}>
                 <Typography variant="caption" color="primary">
                   📱 Online class - No location coordinates needed
                 </Typography>
               </Box>
             )}
            </Box>

            <Box sx={{ gridColumn: "1 / -1" }}>
              <StudentSearch formData={formData} handleInputChange={handleInputChange} setFormData={setFormData} />
            </Box>
          </Box>

          <DialogActions>
            <Button 
              variant="outlined" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              variant="contained" 
              disabled={isLoading || Object.keys(validationErrors).length > 0}
              type="button"
            >
              {isLoading ? "Adding..." : "Add Class"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>

      <LocationPicker
        open={openLocationPicker}
        onClose={() => setOpenLocationPicker(false)}
        onLocationSelect={(selectedLocation) => {
          setFormData({
            ...formData,
            location: formData.location || selectedLocation.location,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude
          });
          setLocationStatus('✓ Coordinates set from map selection');
        }}
        initialLocation={formData.location}
        initialPosition={formData.latitude && formData.longitude ? { latitude: formData.latitude, longitude: formData.longitude } : null}
      />

      <ConflictDialog
        open={openLecturerConflictDialog}
        onClose={() => setOpenLecturerConflictDialog(false)}
        type="lecturer"
        conflicts={lecturerConflict}
        day={formData.day}
        startTime={formData.start_time}
        endTime={formData.end_time}
      />

      <ConflictDialog
        open={openStudentConflictDialog}
        onClose={() => setOpenStudentConflictDialog(false)}
        type="student"
        conflicts={studentConflicts}
        day={formData.day}
        startTime={formData.start_time}
        endTime={formData.end_time}
      />
    </Dialog>
  );
}