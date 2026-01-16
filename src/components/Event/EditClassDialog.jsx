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
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Autocomplete
} from "@mui/material";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import supabase from "../../config/supabaseClient";
import { getCurrentLocation, geocodeAddress } from "../../utils/geolocationUtils";
import LocationPicker from "../LocationPicker";
import ConflictDialog from "../ConflictDialog";

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
const checkTimeConflicts = async (studentIds, dayOfWeek, startTime, endTime, isLecture, excludeClassId = null) => {
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
        // Skip the current class being edited
        if (course && 
            (!excludeClassId || (isLecture && course.id !== excludeClassId)) &&
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
        // Skip the current class being edited
        if (tutorial && 
            (!excludeClassId || (!isLecture && tutorial.id !== excludeClassId)) &&
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
  const [openLocationPicker, setOpenLocationPicker] = useState(false);
  const [lecturerConflict, setLecturerConflict] = useState(null);
  const [openLecturerConflictDialog, setOpenLecturerConflictDialog] = useState(false);
  const [studentConflicts, setStudentConflicts] = useState([]);
  const [openStudentConflictDialog, setOpenStudentConflictDialog] = useState(false);

  // Fetch lecturers and students
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch lecturers
        const { data: lecturerData, error: lecturerError } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", "lecturer");
        
        if (!lecturerError) {
          setLecturers(lecturerData || []);
        }

        // Fetch students
        const { data: studentData, error: studentError } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", "student");
        
        if (!studentError) {
          setAllStudents(studentData || []);
        }
      } catch {
        // Error handled silently
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        return;
      }

      const enrolledStudents = enrollments.map(enrollment => enrollment.users);
      setFormData(prev => ({ ...prev, students: enrolledStudents }));
    } catch {
      // Error handled by component state
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
    } catch (err) {
      setLocationStatus(`Error: ${err.message}`);
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
    } catch {
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

  // Alias for handleChange to maintain compatibility
  const handleInputChange = handleChange;

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
    setLocationStatus('');
    
    // Just close the dialog - don't reset form data here
    if (typeof onClose === 'function') {
      onClose();
      setTimeout(() => {
        document.activeElement?.blur?.();
      }, 100);
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

  // Check for lecturer scheduling conflicts
  const checkLecturerConflict = async () => {
    if (!formData.lecturer || !formData.day || !formData.startTime || !formData.endTime) {
      return null;
    }

    const dayNumber = {
      "Monday": 1,
      "Tuesday": 2,
      "Wednesday": 3,
      "Thursday": 4,
      "Friday": 5,
    }[formData.day];

    // Check both lecture and tutorial tables for conflicts
    const [lectureCheck, tutorialCheck] = await Promise.all([
      supabase
        .from('course_lecture')
        .select('id, course_code, course_title, lecture_start_time, lecture_end_time')
        .eq('lecturer_id', formData.lecturer)
        .eq('day_of_week', dayNumber)
        .neq('id', classData.id), // Exclude current class
      supabase
        .from('course_tutorial')
        .select('id, course_code, course_title, tutorial_start_time, tutorial_end_time')
        .eq('lecturer_id', formData.lecturer)
        .eq('day_of_week', dayNumber)
        .neq('id', classData.id) // Exclude current class
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

    // Check for time overlap using the same logic as student conflicts
    const newStart = formData.startTime;
    const newEnd = formData.endTime;

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
    
    // Check if location is not online and coordinates are missing
    if (formData.location && formData.location.toLowerCase() !== 'online' && (!formData.latitude || !formData.longitude)) {
      alert('Please save coordinates for this location. Click the location icon to geocode or use "Get my location".');
      return;
    }
    
    setIsLoading(true);

    // Check for lecturer scheduling conflicts
    const conflict = await checkLecturerConflict();
    if (conflict) {
      setLecturerConflict(conflict);
      setOpenLecturerConflictDialog(true);
      setIsLoading(false);
      return;
    }

    // Check for student time conflicts BEFORE updating course
    const isLecture = formData.type === "Lecture";
    const dayNumber = {
      "Monday": 1,
      "Tuesday": 2,
      "Wednesday": 3,
      "Thursday": 4,
      "Friday": 5,
    }[formData.day];

    // Get new students to be added (those not currently enrolled)
    const { data: currentEnrollments } = await supabase
      .from(isLecture ? "enrollment_lecture" : "enrollment_tutorial")
      .select(`id, student_id`)
      .eq(isLecture ? "course_id" : "tutorial_id", classData.id);
    
    const currentStudentIds = currentEnrollments?.map(e => e.student_id) || [];
    const newStudentIds = formData.students.map(s => s.id);
    const toAdd = newStudentIds.filter(id => !currentStudentIds.includes(id));

    // Check time conflicts for newly added students
    if (toAdd.length > 0) {
      const conflictingStudents = await checkTimeConflicts(
        toAdd,
        dayNumber,
        formData.startTime,
        formData.endTime,
        isLecture,
        classData.id
      );

      if (conflictingStudents.length > 0) {
        setStudentConflicts(conflictingStudents);
        setOpenStudentConflictDialog(true);
        setIsLoading(false);
        return;
      }
    }

    try {
      const courseTable = isLecture ? "course_lecture" : "course_tutorial";
      const enrollmentTable = isLecture ? "enrollment_lecture" : "enrollment_tutorial";
      const courseIdField = isLecture ? "course_id" : "tutorial_id";

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
        alert("An error occurred while updating the class. Please try again.");
        setIsLoading(false);
        return;
      }

      // --- Enrollment update logic ---
      // 1. Fetch current enrollments (already fetched before, but re-fetch to be safe)
      const { data: currentEnrollmentsForUpdate, error: fetchEnrollError } = await supabase
        .from(enrollmentTable)
        .select(`id, student_id`)
        .eq(courseIdField, classData.id);
      if (fetchEnrollError) {
        setIsLoading(false);
        alert("An error occurred while updating enrollments. Please try again.");
        return;
      }
      const currentStudentIdsForUpdate = currentEnrollmentsForUpdate.map(e => e.student_id);
      const newStudentIds = formData.students.map(s => s.id);

      // 2. Calculate students to add and remove
      const toAdd = newStudentIds.filter(id => !currentStudentIdsForUpdate.includes(id));
      // If newStudentIds is empty, toRemove should be all currentEnrollments
      const toRemove = currentEnrollmentsForUpdate.filter(e => !newStudentIds.includes(e.student_id));

      // 3. Insert new enrollments (already checked for conflicts before course update)
      if (toAdd.length > 0) {
        const enrollments = toAdd.map(student_id => ({
          student_id,
          [courseIdField]: classData.id
        }));
        await supabase.from(enrollmentTable).insert(enrollments);
      }

      // 4. Only delete enrollments that are not referenced in attendance_record
      for (const enrollment of toRemove) {
        // Check for attendance_record referencing this enrollment
        const attendanceField = isLecture ? "lecture_enrollment_id" : "tutorial_enrollment_id";
        const { data: attnRecords, error: attnError } = await supabase
          .from('attendance_record')
          .select('id')
          .eq(attendanceField, enrollment.id)
          .limit(1);
        if (!attnError && (!attnRecords || attnRecords.length === 0)) {
          // Safe to delete
          await supabase.from(enrollmentTable).delete().eq('id', enrollment.id);
        }
        // If referenced, skip deletion to avoid 409 error
      }

      setIsLoading(false);
      if (onClassAdded) onClassAdded();
      handleClose();
    } catch {
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

          <TextField 
            id="location" 
            name="location" 
            placeholder="e.g., Room 101, Building A" 
            value={formData.location} 
            onChange={handleInputChange} 
            fullWidth 
            sx={inputSx}
            label="Location"
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
                  <Tooltip title="Select location on map">
                    <IconButton 
                      onClick={() => setOpenLocationPicker(true)}
                      disabled={formData.location.toLowerCase() === 'online'}
                      size="small"
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
              )
            }}
          />
            
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
        startTime={formData.startTime}
        endTime={formData.endTime}
      />

      <ConflictDialog
        open={openStudentConflictDialog}
        onClose={() => setOpenStudentConflictDialog(false)}
        type="student"
        conflicts={studentConflicts}
        day={formData.day}
        startTime={formData.startTime}
        endTime={formData.endTime}
      />
    </Dialog>
  );
}