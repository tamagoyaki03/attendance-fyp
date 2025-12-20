import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem, 
  Box, 
  Button, 
  Typography, 
  Autocomplete, 
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from "@mui/material";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import supabase from "../../config/supabaseClient";
import { getCurrentLocation, geocodeAddress } from "../../utils/geolocationUtils";

export default function EditClassDialog({ open, onClose, classData, onClassAdded }) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "Lecture",
    day: "Monday",
    startTime: "",
    endTime: "",
    startDate: null,
    endDate: null,
    location: "",
    latitude: null,
    longitude: null,
    lecturer: "",
    students: [],
  });

  const [lecturers, setLecturers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Fetch lecturers and students
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch lecturers
        const { data: lecturerData, error: lecturerError } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", "lecturer");
        
        if (lecturerError) {
          console.error("Error fetching lecturers:", lecturerError);
        } else {
          console.log("Fetched lecturers:", lecturerData);
          setLecturers(lecturerData || []);
        }

        // Fetch students
        const { data: studentData, error: studentError } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", "student");
        
        if (studentError) {
          console.error("Error fetching students:", studentError);
        } else {
          console.log("Fetched students:", studentData);
          setAllStudents(studentData || []);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    
    if (open) {
      fetchData();
    }
  }, [open]);

  // Load class data when dialog opens
  useEffect(() => {
    if (classData && open) {
      const dayNames = {
        1: "Monday",
        2: "Tuesday", 
        3: "Wednesday",
        4: "Thursday",
        5: "Friday"
      };

      console.log("Loading class data:", classData);

      setFormData({
        code: classData.course_code || "",
        name: classData.course_title || "",
        type: classData.type || "Lecture",
        day: dayNames[classData.day_of_week] || "Monday",
        startTime: classData.type === "Lecture" 
          ? classData.lecture_start_time || "" 
          : classData.tutorial_start_time || "",
        endTime: classData.type === "Lecture" 
          ? classData.lecture_end_time || "" 
          : classData.tutorial_end_time || "",
        startDate: classData.type === "Lecture" 
          ? classData.lecture_start_date 
          : classData.tutorial_start_date,
        endDate: classData.type === "Lecture" 
          ? classData.lecture_end_date 
          : classData.tutorial_end_date,
        location: classData.type === "Lecture" 
          ? classData.lecture_location || "" 
          : classData.tutorial_location || "",
        latitude: classData.latitude || null,
        longitude: classData.longitude || null,
        lecturer: classData.lecturer_id || "",
        students: [],
      });

      // Fetch enrolled students for this class
      fetchEnrolledStudents();
    }
  }, [classData, open]);

  const fetchEnrolledStudents = async () => {
    if (!classData?.id) return;
    
    try {
      const isLecture = classData.type === "Lecture";
      const enrollmentTable = isLecture ? "enrollment_lecture" : "enrollment_tutorial";
      const courseIdField = isLecture ? "course_id" : "tutorial_id";

      const { data: enrollments, error } = await supabase
        .from(enrollmentTable)
        .select("student_id, users(id, name)")
        .eq(courseIdField, classData.id);

      if (error) {
        console.error("Error fetching enrollments:", error);
        return;
      }

      const enrolledStudents = enrollments.map(enrollment => enrollment.users);
      setFormData(prev => ({ ...prev, students: enrolledStudents }));
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
    }
  };

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear coordinates when location text changes
    if (name === 'location') {
      if (value.toLowerCase() === 'online') {
       setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
      } else {
        setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
      }
    }
  };

  const handleClose = () => {
    console.log("Handle close called, onClose type:", typeof onClose);
    setLocationStatus('');
    
    // Just close the dialog - don't reset form data here
    if (typeof onClose === 'function') {
      onClose();
      setTimeout(() => {
        document.activeElement?.blur?.();
      }, 100);
    } else {
      console.error("onClose is not a function:", onClose);
    }
  };

  // Add this new useEffect to reset form data when dialog closes
  useEffect(() => {
    if (!open) {
      // Reset form data when dialog is closed
      setFormData({
        code: "",
        name: "",
        type: "Lecture",
        day: "Monday",
        startTime: "",
        endTime: "",
        startDate: null,
        endDate: null,
        location: "",
        latitude: null,
        longitude: null,
        lecturer: "",
        students: [],
      });
      setLocationStatus('');
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const isLecture = formData.type === "Lecture";
      const courseTable = isLecture ? "course_lecture" : "course_tutorial";
      const enrollmentTable = isLecture ? "enrollment_lecture" : "enrollment_tutorial";
      const courseIdField = isLecture ? "course_id" : "tutorial_id";
      
      const dayNumber = {
        "Monday": 1,
        "Tuesday": 2,
        "Wednesday": 3,
        "Thursday": 4,
        "Friday": 5,
      }[formData.day];

      const payload = isLecture ? {
        course_code: formData.code,
        course_title: formData.name,
        lecturer_id: formData.lecturer,
        day_of_week: dayNumber,
        lecture_start_time: formData.startTime,
        lecture_end_time: formData.endTime,
        lecture_location: formData.location,
        latitude: formData.location.toLowerCase() === 'online' ? null : formData.latitude,
        longitude: formData.location.toLowerCase() === 'online' ? null : formData.longitude,
      } : {
        course_code: formData.code,
        course_title: formData.name,
        lecturer_id: formData.lecturer,
        day_of_week: dayNumber,
        tutorial_start_time: formData.startTime,
        tutorial_end_time: formData.endTime,
        tutorial_location: formData.location,
        latitude: formData.location.toLowerCase() === 'online' ? null : formData.latitude,
        longitude: formData.location.toLowerCase() === 'online' ? null : formData.longitude,
      };

      const { error } = await supabase
        .from(courseTable)
        .update(payload)
        .eq("id", classData.id);

      if (error) {
        console.error("Update error:", error);
        alert("An error occurred while updating the class. Please try again.");
        setIsLoading(false);
        return;
      }

      // Update student enrollments
      await supabase.from(enrollmentTable).delete().eq(courseIdField, classData.id);

      if (formData.students.length > 0) {
        const enrollments = formData.students.map(student => ({
          student_id: student.id,
          [courseIdField]: classData.id
        }));
        await supabase.from(enrollmentTable).insert(enrollments);
      }

      setIsLoading(false);
      if (onClassAdded) onClassAdded();
      handleClose();
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
      alert("An error occurred while updating the class. Please try again.");
    }
  };

  const currentLecturerName = lecturers.find(l => l.id === formData.lecturer)?.name || '';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disablePortal={false} keepMounted={false}>
      <DialogTitle>Edit Class</DialogTitle>
      <DialogContent>
        {locationStatus && (
          <Alert severity={locationStatus.includes('Error') ? 'error' : 'info'} sx={{ mb: 2 }}>
            {locationStatus}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          
          <TextField
            label="Course Code"
            fullWidth
            name="code"
            value={formData.code}
            onChange={handleChange}
            required
          />

          <TextField
            label="Course Title"
            fullWidth
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <TextField
            label="Type"
            select
            fullWidth
            name="type"
            value={formData.type}
            onChange={handleChange}
            disabled
          >
            <MenuItem value="Lecture">Lecture</MenuItem>
            <MenuItem value="Tutorial">Tutorial</MenuItem>
          </TextField>

          <TextField
            label="Day of Week"
            select
            fullWidth
            name="day"
            value={formData.day}
            onChange={handleChange}
          >
            <MenuItem value="Monday">Monday</MenuItem>
            <MenuItem value="Tuesday">Tuesday</MenuItem>
            <MenuItem value="Wednesday">Wednesday</MenuItem>
            <MenuItem value="Thursday">Thursday</MenuItem>
            <MenuItem value="Friday">Friday</MenuItem>
          </TextField>

          <TextField
            label="Start Time"
            type="time"
            fullWidth
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="End Time"
            type="time"
            fullWidth
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
          />

          <Box>
            <TextField
              label="Location"
              fullWidth
              name="location"
              value={formData.location}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <Box display="flex" gap={0.5}>
                    <Tooltip title="Get coordinates for entered location">
                      <IconButton 
                        onClick={handleGeocodeLocation} 
                        disabled={isGettingLocation || !formData.location.trim() || formData.location.toLowerCase() === 'online'}
                        size="small"
                        color="primary"
                      >
                        {isGettingLocation ? <CircularProgress size={16} /> : <LocationOnIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Use my current location">
                      <IconButton 
                        onClick={handleGetCurrentLocation} 
                        disabled={isGettingLocation || formData.location.toLowerCase() === 'online'}
                        size="small"
                        color="secondary"
                      >
                        {isGettingLocation ? <CircularProgress size={16} /> : <MyLocationIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                )
              }}
            />
            
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

          <TextField
            label="Lecturer"
            select
            fullWidth
            name="lecturer"
            value={formData.lecturer}
            onChange={handleChange}
            required
          >
            <MenuItem value="">-- Select Lecturer --</MenuItem>
            {lecturers.map((lecturer) => (
              <MenuItem key={lecturer.id} value={lecturer.id}>
                {lecturer.name}
              </MenuItem>
            ))}
          </TextField>

          {currentLecturerName && (
            <Typography variant="caption" color="text.secondary">
              Current lecturer: {currentLecturerName}
            </Typography>
          )}

          <Autocomplete
            multiple
            options={allStudents}
            getOptionLabel={(option) => option.name}
            value={formData.students}
            onChange={(event, newValue) => {
              setFormData(prev => ({ ...prev, students: newValue }));
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option.name}
                  {...getTagProps({ index })}
                  key={option.id}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Students"
                placeholder="Search and select students"
              />
            )}
          />

        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}