import React, { useState, useEffect } from 'react';
import { InputLabel, TextField, Autocomplete, Chip, CircularProgress } from '@mui/material';
import supabase from '../../config/supabaseClient';

const StudentSearch = ({ formData, setFormData }) => {
  const [allStudents, setAllStudents] = useState([]); // all fetched students
  const [inputValue, setInputValue] = useState('');   // search box value
  const [loading, setLoading] = useState(false);

  // 🔑 Fetch all students once on mount
  useEffect(() => {
    const fetchAllStudents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'student');

      if (error) {
        console.error('Error fetching students:', error);
        setAllStudents([]);
      } else {
        setAllStudents(data || []);
      }
      setLoading(false);
    };

    fetchAllStudents();
  }, []);

  // Keep selected students in sync with formData
  const selectedStudents = Array.isArray(formData.students) ? formData.students : [];

  // Filtered options based on search input
  const filteredOptions = allStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      student.id.toString().includes(inputValue)
  );

  const handleChange = (event, newValue) => {
    // update selected students
    setFormData((prev) => ({
      ...prev,
      students: newValue,
    }));
  };

  return (
    <div className="space-y-2">
      <InputLabel htmlFor="students" sx={{ color: "#fafafa", marginTop: '10px' }}>
        Students
      </InputLabel>

      <Autocomplete
        multiple
        id="students"
        options={filteredOptions}
        getOptionLabel={(option) => `${option.name}`}
        value={selectedStudents}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search students..."
            sx={{
              color: "#fafafa",
              backgroundColor: "#18181b",
              borderRadius: '8px',
              margin: '5px 0',
              input: { color: '#fafafa', paddingLeft: '10px' },
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "#fafafa" },
                "&.Mui-focused fieldset": { borderColor: "#ffffff" },
              },
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </div>
  );
};

export default StudentSearch;
