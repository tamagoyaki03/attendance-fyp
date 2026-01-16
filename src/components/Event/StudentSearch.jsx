import React, { useState, useEffect } from "react";
import { InputLabel, TextField, Autocomplete, Chip, CircularProgress, Box } from "@mui/material";
import supabase from "../../config/supabaseClient";

const StudentSearch = ({ formData = {}, setFormData }) => {
  const [allStudents, setAllStudents] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllStudents = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("users").select("id, name").eq("role", "student");
      if (error) {
        setAllStudents([]);
      } else {
        setAllStudents(data || []);
      }
      setLoading(false);
    };
    fetchAllStudents();
  }, []);

  const selectedStudents = Array.isArray(formData.students) ? formData.students : [];

  const filteredOptions = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      (s.id && s.id.toString().includes(inputValue))
  );

  const handleChange = (_, newValue) => {
    setFormData({ ...formData, students: newValue });
  };

  return (
    <Box>
      <InputLabel sx={{ mb: 1 }}>Students</InputLabel>
      <Autocomplete
        multiple
        id="students-autocomplete"
        options={filteredOptions}
        getOptionLabel={(option) => `${option.name}`}
        value={selectedStudents}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(_, newInput) => setInputValue(newInput)}
        loading={loading}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip variant="outlined" label={option.name} size="small" {...getTagProps({ index })} />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search students..."
            size="small"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={{
              backgroundColor: "#ffffff",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
            }}
          />
        )}
      />
    </Box>
  );
};

export default StudentSearch;
