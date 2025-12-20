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
  Typography
} from "@mui/material";
import ScheduleInput from "../ScheduleInput";
import StudentSearch from "./StudentSearch";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { getCurrentLocation, geocodeAddress } from "../../utils/geolocationUtils";

const DAY_TO_NUMBER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
};

export default function AddClassDialog({ open, onClose, onClassAdded }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
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
     console.error('Error getting location:', error);
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
    console.error('Error geocoding location:', error);
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
    setValidationErrors({}); // Clear validation errors
   
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
      console.log("Calling onClose(false)");
      onClose(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'location') {
      if (value.toLowerCase() === 'online') {
        setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
     } else {
       setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
     }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dayNumber = DAY_TO_NUMBER[formData.day];

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
      console.error("Error adding class:", error);
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
              <TextField select id="type" name="type" value={formData.type} onChange={handleInputChange} required sx={inputSx}>
                <MenuItem value="" disabled>Select type</MenuItem>
                <MenuItem value="Lecture">Lecture</MenuItem>
                <MenuItem value="Tutorial">Tutorial</MenuItem>
              </TextField>
            </Box>

            {formData.type === "Tutorial" && (
              <Box sx={{ gridColumn: "1 / -1" }}>
                <InputLabel htmlFor="parentCourseId" sx={{ mb: 1 }}>Lecture Course</InputLabel>
                <TextField select id="parentCourseId" name="parentCourseId" value={formData.parentCourseId} onChange={handleParentCourseChange} required sx={inputSx}>
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
              <TextField id="code" name="code" placeholder="e.g., CS101" value={formData.code} onChange={handleInputChange} required sx={inputSx} disabled={formData.type === "Tutorial"} />
            </Box>

            <Box>
              <InputLabel htmlFor="lecturer" sx={{ mb: 1 }}>Lecturer</InputLabel>
              <TextField select id="lecturer" name="lecturer" value={formData.lecturer} onChange={handleInputChange} sx={inputSx}>
                {lecturers.length === 0 ? <MenuItem disabled>Loading lecturers...</MenuItem> : lecturers.map((lect) => <MenuItem key={lect.id} value={lect.id}>{lect.name}</MenuItem>)}
              </TextField>
            </Box>

            <Box sx={{ gridColumn: "1 / -1" }}>
              <InputLabel htmlFor="name" sx={{ mb: 1 }}>Class Name</InputLabel>
              <TextField id="name" name="name" placeholder="e.g., Introduction to Programming" value={formData.name} onChange={handleInputChange} required fullWidth sx={inputSx} disabled={formData.type === "Tutorial"} />
            </Box>

            <Box sx={{ gridColumn: "1 / -1" }}>
              <ScheduleInput formData={formData} handleInputChange={handleInputChange} setFormData={setFormData} />
            </Box>

            <Box sx={{ gridColumn: "1 / -1" }}>
              <InputLabel htmlFor="location" sx={{ mb: 1 }}>Location</InputLabel>
              <Box display="flex" gap={1}>
                <TextField id="location" name="location" placeholder="e.g., Room 101" value={formData.location} onChange={handleInputChange} fullWidth sx={inputSx} />
                <Button 
                 variant="outlined" 
                 onClick={() => setFormData(prev => ({ 
                   ...prev, 
                   location: "Online", 
                   latitude: null, 
                   longitude: null 
                 }))}
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
              </Box>
             
             {formData.latitude && formData.longitude && formData.location.toLowerCase() !== 'online' && (
               <Box sx={{ mt: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                 <Typography variant="caption" color="text.secondary">
                   Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
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
                console.log("Cancel button clicked");
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
    </Dialog>
  );
}