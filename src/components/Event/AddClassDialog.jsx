import React, { useState } from "react";
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
    lat: null,
    long: null,
    students: [],
    location: "",
  });

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
        start_date: formData.startDate,
        end_date: formData.endDate,
        lat: formData.lat,
        long: formData.long,
        students: Array.isArray(formData.students) ? formData.students.map(s => s.id) : [],
      };

      // const { data: user } = await supabase.auth.getUser(); //User authentication
      console.log(payload);

      const { data, error } = await supabase
        .from('classes')
        .insert([payload]);
      setIsLoading(false)

      if (error) {
        console.error("Error adding class:", error);
        return;
      } else if (data) {
        console.log("Class added successfully:", data);
        if (onClassAdded) onClassAdded();
      }

      if (onClassAdded) onClassAdded();
      handleClose();

      setFormData({
        code: "",
        name: "",
        lecturer: "",
        schedule: "",
        start_time: "",
        end_time: "",
        start_date: "",
        end_date: "",
        lat: null,
        long: null,
        students: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding class:", error.message, error.details, error.hint);
      setIsLoading(false);
      alert("An error occurred while adding the class. Please try again.");
    }
  }

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
                handleInputChange={handleInputChange}
                setFormData={setFormData}
              />
            </div>
            <div className="space-y-2" style={{ marginTop: '20px' }}>
              <LocationInput
                formData={formData}
                handleInputChange={handleInputChange}
                setFormData={setFormData}
              />
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