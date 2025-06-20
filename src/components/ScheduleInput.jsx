import React from 'react';
import {
  InputLabel,
  TextField,
  MenuItem,
  Checkbox,
  ListItemText,
  Select,
  FormControl,
  Box,
  Button
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';

const daysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

const generateTimeOptions = () => {
  const times = [];
  let hour = 8;
  let minute = 0;
  while (hour < 23 || (hour === 23 && minute === 0)) {
    const h = hour.toString().padStart(2, '0');
    const m = minute.toString().padStart(2, '0');
    times.push(`${h}:${m}`);
    minute += 30;
    if (minute === 60) {
      minute = 0;
      hour += 1;
    }
  }
  return times;
};
const timeOptions = generateTimeOptions();

function ScheduleInput({ formData, setFormData }) {

  const handleDaysChange = (e) => {
    setFormData({
      ...formData,
      day: e.target.value,
    });
  };

  const handleStartTimeChange = (e) => {
    setFormData({
      ...formData,
      startTime: e.target.value,
    });
  };

  const handleEndTimeChange = (e) => {
    setFormData({
      ...formData,
      endTime: e.target.value,
    });
  };

  const handleStartDateChange = (newValue) => {
    setFormData({
      ...formData,
      startDate: newValue,
    });
  };

  const handleEndDateChange = (newValue) => {
    setFormData({
      ...formData,
      endDate: newValue,
    });
  };

  const handleAddSchedule = () => {
    if (
      !formData.day||
      !formData.startTime?.length ||
      !formData.endTime?.length ||
      !formData.startDate||
      !formData.endDate
    ) {
      return;
    }

    const scheduleText = `${formData.day} ${formData.startTime} - ${formData.endTime} from ${dayjs(formData.startDate).format("DD/MM/YYYY")} to ${dayjs(formData.endDate).format("DD/MM/YYYY")}`;

    setFormData({
      ...formData,
      schedule: scheduleText,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2 col-span-2">
        <InputLabel sx={{ color: "#fafafa", marginTop: "10px" }}>Schedule</InputLabel>
        <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel sx={{ color: "#a1a1aa" }}>Day of Week</InputLabel>
            <Select
                value={formData.day || ""}
                onChange={e => setFormData({ ...formData, day: e.target.value })}
                label="Day of Week"
                sx={{
                color: "#fafafa",
                backgroundColor: "#18181b",
                borderRadius: "8px",
                }}
            >
                {daysOfWeek.map((day) => (
                <MenuItem key={day} value={day}>
                    {day}
                </MenuItem>
                ))}
            </Select>
            </FormControl>

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: "#a1a1aa", "&.Mui-focused": { color: "#ffffff" }, backgroundColor: "#18181b" }}>
              Start Time
            </InputLabel>
            <Select
              value={formData.startTime || ""}
              onChange={handleStartTimeChange}
              sx={{
                color: "#fafafa",
                backgroundColor: "#18181b",
                borderRadius: "8px",
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
                },
              }}
            >
              {timeOptions.map((time) => (
                <MenuItem key={time} value={time}>
                  {time}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel sx={{ color: "#a1a1aa", "&.Mui-focused": { color: "#ffffff" }, backgroundColor: "#18181b" }}>
              End Time
            </InputLabel>
            <Select
              value={formData.endTime || ""}
              onChange={handleEndTimeChange}
              sx={{
                color: "#fafafa",
                backgroundColor: "#18181b",
                borderRadius: "8px",
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
                },
              }}
            >
              {timeOptions.map((time) => (
                <MenuItem key={time} value={time}>
                  {time}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <DatePicker
              label="Start Date"
              value={formData.startDate || null}
              onChange={handleStartDateChange}
              sx={{ "& .MuiInputLabel-root.Mui-focused": { color: "#ffffff" } }}
              slotProps={{
                textField: {
                  sx: {
                    flexGrow: 1,
                    "& .MuiInputBase-root": { color: "#fafafa" },
                    "& .MuiInputLabel-root": { color: "#fafafa" },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "#fafafa" },
                      "&:hover fieldset": { borderColor: "#fafafa" },
                      "&.Mui-focused fieldset": { borderColor: "#ffffff" },
                    },
                  },
                },
              }}
            />
            <DatePicker
              label="End Date"
              value={formData.endDate || null}
              onChange={handleEndDateChange}
              minDate={formData.startDate || null}
              sx={{ "& .MuiInputLabel-root.Mui-focused": { color: "#ffffff" } }}
              slotProps={{
                textField: {
                  sx: {
                    flexGrow: 1,
                    "& .MuiInputBase-root": { color: "#fafafa" },
                    "& .MuiInputLabel-root": { color: "#fafafa" },
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "#fafafa" },
                      "&:hover fieldset": { borderColor: "#fafafa" },
                      "&.Mui-focused fieldset": { borderColor: "#ffffff" },
                    },
                  },
                },
              }}
            />
          </Box>
        </LocalizationProvider>

        <Button
          variant="contained"
          onClick={handleAddSchedule}
          disabled={
            !formData.day ||
            !formData.startTime?.length ||
            !formData.endTime?.length ||
            !formData.startDate ||
            !formData.endDate
          }
          sx={{ mt: 2, color: "#09090b", backgroundColor: "#ffffff" }}
        >
          Set Schedule
        </Button>

        {formData.schedule && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: "#27272a", borderRadius: "4px" }}>
            <InputLabel sx={{ color: "#fafafa" }}>Current Schedule:</InputLabel>
            <Box sx={{ color: "#fafafa" }}>{formData.schedule}</Box>
          </Box>
        )}
      </div>
    </div>
  );
}

export default ScheduleInput;