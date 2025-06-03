import React, { useState, useEffect} from "react";
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
import LocationInput from "../LocationInput";
import TextField from "@mui/material/TextField";
import StudentSearch from "./StudentSearch";
import dayjs from "dayjs";

const EditClassDialog = ({ open, onOpenChange, onClassAdded, classData }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    lecturer: "",
    day: "",
    startTime: "",
    endTime: "",
    startDate: "",
    endDate: "",
    lat: null,
    long: null,
    students: [],
    location: "",
  });

  useEffect(() => {
  if (classData) {
    setFormData({
      code: classData.code || "",
      name: classData.name || "",
      lecturer: classData.lecturer || "",
      day: classData.day || "",
      startTime: classData.start_time ? classData.start_time.slice(0, 5) : "",
      endTime: classData.end_time ? classData.end_time.slice(0, 5) : "",
      startDate: classData.start_date ? dayjs(classData.start_date) : null,
      endDate: classData.end_date ? dayjs(classData.end_date) : null,
      lat: classData.lat !== undefined && classData.lat !== null ? Number(classData.lat) : null,
      long: classData.long !== undefined && classData.long !== null ? Number(classData.long) : null,
      students: [], 
      location: "", 
    });
    
    const fetchDetails = async () => {
      let students = [];
      if (Array.isArray(classData.students) && classData.students.length > 0) {
        const { data, error } = await supabase
          .from('users')
          .select('id, name')
          .in('id', classData.students);
        students = error ? classData.students.map(id => ({ id, name: id })) : data;
      }

      let locationName = "";
      if (
        classData.lat !== undefined &&
        classData.lat !== null &&
        classData.long !== undefined &&
        classData.long !== null
      ) {
        locationName = await fetchLocationName(Number(classData.lat), Number(classData.long));
      }

      setFormData(prev => ({
        ...prev,
        students,
        location: locationName,
      }));
    };

    fetchDetails();
  }
}, [classData, open]);

useEffect(() => {
  if (formData.lat && formData.long) {
    fetchLocationName(formData.lat, formData.long).then((locationName) => {
      setFormData((prev) => ({
        ...prev,
        location: locationName,
      }));
    });
  }
  // eslint-disable-next-line
}, [formData.lat, formData.long]);

async function fetchLocationName(lat, lon) {
  if (lat == null || lon == null) return "";
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  );
  if (!response.ok) return "";
  const data = await response.json();
  return data.display_name || "";
}

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
    setIsLoading(true)

    try {
      const studentsArray = Array.isArray(formData.students)
        ? formData.students.map((student) => student.id)
        : [];

      const payload = {
        code: formData.code,
        name: formData.name,
        lecturer: formData.lecturer,
        day: formData.day,
        start_time: formData.startTime,
        end_time: formData.endTime,
        start_date: formData.startDate ? formData.startDate.format("YYYY-MM-DD") : null,
        end_date: formData.endDate ? formData.endDate.format("YYYY-MM-DD") : null,
        lat: formData.lat,
        long: formData.long,
        students: studentsArray,
      };

      // const { data: user } = await supabase.auth.getUser(); //User authentication 
      console.log(payload);   

      const { data, error } = await supabase
        .from('classes')
        .update(payload)
        .eq('id', classData.id)
        .select();

        setIsLoading(false);

      if (error) {
        console.error("Error updating class:", error);
        alert("An error occurred while updating the class. Please try again.");
        return;
      } else if (data) {
        console.log("Class updated successfully:", data);
        if (onClassAdded) onClassAdded();
      }

      handleClose();
    } catch (error) {
      console.error("Error updating class:", error.message, error.details, error.hint);
      setIsLoading(false);
      alert("An error occurred while updating the class. Please try again.");
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} style={{ color: "#09090B" }}>
      <DialogContent className="sm:max-w-[525px]" sx={{ backgroundColor: "#09090B", color: "#fafafa", borderRadius: '8px', border: '1px solid #ffffff', }}>
        <h3 style={{ marginBottom: '0px' }}>Edit Class</h3>
        <DialogContentText className="mt-2" sx={{ color: "#a1a1aa", fontSize: '14px' }}>
          Edit the details for this class. Click save when you're done.
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
                id="lecturer"
                name="lecturer"
                placeholder="e.g., Dr. John Smith"
                value={formData.lecturer}
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
              <ScheduleInput 
                formData={formData} 
                setFormData={setFormData}
              />
            </div>
            <div className="space-y-2" style={{ marginTop: '20px' }}>
              <LocationInput
                formData={formData}
                setFormData={setFormData}
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
            <Button type="button" variant="outlined" onClick={handleClose} style={{color: "#fafafa", borderColor: "#27272a"}}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} style={{color: "#09090b", backgroundColor: "#ffffff"}}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditClassDialog;