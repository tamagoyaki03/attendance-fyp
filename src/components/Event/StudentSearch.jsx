import React, { useState, useEffect } from 'react';
import { InputLabel, TextField, Chip, Box, CircularProgress } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import supabase from '../../config/supabaseClient';

const fetchStudents = async (query, studentIds) => {
  if (!studentIds || studentIds.length === 0) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .in('id', studentIds)
    .ilike('name', `%${query}%`);

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  // Optionally also match against ID
  return data.filter(
    s =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.id.includes(query)
  );
};

const StudentSearch = ({formData, setFormData }) => {
  const [query, setQuery] = useState('');
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearchChange = async (event) => {
    const value = event.target.value;
    setQuery(value);
    setLoading(true);
    if (!value) {
      // Fetch all students if input is empty
      const { data } = await supabase.from('users').select('id, name');
      setStudentOptions(data || []);
    } else {
      const results = await fetchStudents(value);
      setStudentOptions(results);
    }
    setLoading(false);
  };

  useEffect(() => {
  const fetchAllStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('id, name');
    if (error) {
      setStudentOptions([]);
    } else {
      setStudentOptions(data);
    }
    setLoading(false);
  };
  fetchAllStudents();
}, []);

  useEffect(() => {
  setSelectedStudents(Array.isArray(formData.students) ? formData.students : []);
}, [formData.students]);

    const handleAddStudent = (event, newValue) => {
      setSelectedStudents(newValue);
      setFormData((prev) => ({
        ...prev,
        students: newValue, 
      }));
    };

  return (
    <div className="space-y-2">
      <InputLabel htmlFor="students" sx={{ color: "#fafafa", marginTop: '10px' }}>Students</InputLabel>

      <Autocomplete
        multiple
        options={Array.isArray(studentOptions) ? studentOptions : []}
        getOptionLabel={(option) => `${option.name} `} //(${option.id})
        onInputChange={(_, value) => handleSearchChange({ target: { value } })}
        onChange={handleAddStudent}
        value={selectedStudents} 
        inputValue={query}
        loading={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            id="students"
            placeholder="Search students..."
            sx={{
              color: "#fafafa",
              backgroundColor: "#18181b",
              borderRadius: '8px',
              margin: '5px 0',
              input: { color: '#fafafa', paddingLeft: '10px' },
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "#fafafa" }, 
                "&.Mui-focused fieldset": { borderColor: "#ffffff" } 
              }
            }}
          />
        )}
      />
    </div>
  );
};

export default StudentSearch;
