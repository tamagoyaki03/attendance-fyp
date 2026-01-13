import React from "react";
import {
  InputLabel,
  TextField,
  MenuItem,
  FormControl,
  Select,
  Box,
  Button,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const generateTimeOptions = () => {
  const times = [];
  let hour = 8;
  let minute = 0;
  while (hour < 23 || (hour === 23 && minute === 0)) {
    const h = hour.toString().padStart(2, "0");
    const m = minute.toString().padStart(2, "0");
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

export default function ScheduleInput({ 
  formData = {}, 
  setFormData, 
  validationErrors = {},
  touched = {},
  setTouched = () => {},
  setValidationErrors = () => {},
  validateField = () => ""
}) {
  const handleField = (patch) => {
    // keep both camelCase and snake_case keys in sync to support different callers
    const normalized = {};
    if (patch.day !== undefined) normalized.day = patch.day;
    if (patch.startTime !== undefined) {
      normalized.startTime = patch.startTime;
      normalized.start_time = patch.startTime;
    }
    if (patch.endTime !== undefined) {
      normalized.endTime = patch.endTime;
      normalized.end_time = patch.endTime;
    }
    if (patch.startDate !== undefined) {
      normalized.startDate = patch.startDate;
      normalized.start_date = patch.startDate;
    }
    if (patch.endDate !== undefined) {
      normalized.endDate = patch.endDate;
      normalized.end_date = patch.endDate;
    }
    setFormData({ ...formData, ...patch, ...normalized });
  };

  const handleAddSchedule = () => {
    const day = formData.day;
    const start = formData.startTime || formData.start_time;
    const end = formData.endTime || formData.end_time;
    const sDate = formData.startDate || formData.start_date;
    const eDate = formData.endDate || formData.end_date;

    if (!day || !start || !end || !sDate || !eDate) return;

    const scheduleText = `${day} ${start} - ${end} from ${dayjs(sDate).format(
      "DD/MM/YYYY"
    )} to ${dayjs(eDate).format("DD/MM/YYYY")}`;

    setFormData({ ...formData, schedule: scheduleText });
  };

  return (
    <Box>
      <InputLabel sx={{ mb: 1 }}>Schedule</InputLabel>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="day-select-label">Day of Week</InputLabel>
        <Select
          labelId="day-select-label"
          value={formData.day || ""}
          label="Day of Week"
          onChange={(e) => {
            handleField({ day: e.target.value });
            setTouched((prev) => ({ ...prev, day: true }));
            const error = validateField("day", e.target.value);
            setValidationErrors((prev) => {
              const newErrors = { ...prev };
              if (error) newErrors.day = error;
              else delete newErrors.day;
              return newErrors;
            });
          }}
          size="small"
          error={touched.day && !!validationErrors.day}
          sx={{
            backgroundColor: "#ffffff",
            borderRadius: 1,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
          }}
        >
          {daysOfWeek.map((d) => (
            <MenuItem key={d} value={d}>
              {d}
            </MenuItem>
          ))}
        </Select>
        {touched.day && validationErrors.day && (
          <Box sx={{ color: "#d32f2f", fontSize: "0.75rem", mt: 0.5, ml: 1.75 }}>
            {validationErrors.day}
          </Box>
        )}
      </FormControl>

      <Box display="flex" gap={2} mb={2}>
        <FormControl fullWidth>
          <InputLabel id="start-time-label">Start Time</InputLabel>
          <Select
            labelId="start-time-label"
            value={formData.startTime || formData.start_time || ""}
            label="Start Time"
            onChange={(e) => {
              handleField({ startTime: e.target.value });
              setTouched((prev) => ({ ...prev, start_time: true }));
              const error = validateField("start_time", e.target.value);
              setValidationErrors((prev) => {
                const newErrors = { ...prev };
                if (error) newErrors.start_time = error;
                else delete newErrors.start_time;
                return newErrors;
              });
            }}
            size="small"
            error={touched.start_time && !!validationErrors.start_time}
            sx={{
              backgroundColor: "#ffffff",
              borderRadius: 1,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
            }}
          >
            {timeOptions.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </Select>
          {touched.start_time && validationErrors.start_time && (
            <Box sx={{ color: "#d32f2f", fontSize: "0.75rem", mt: 0.5, ml: 1.75 }}>
              {validationErrors.start_time}
            </Box>
          )}
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="end-time-label">End Time</InputLabel>
          <Select
            labelId="end-time-label"
            value={formData.endTime || formData.end_time || ""}
            label="End Time"
            onChange={(e) => {
              handleField({ endTime: e.target.value });
              setTouched((prev) => ({ ...prev, end_time: true }));
              const error = validateField("end_time", e.target.value);
              setValidationErrors((prev) => {
                const newErrors = { ...prev };
                if (error) newErrors.end_time = error;
                else delete newErrors.end_time;
                // Re-validate start_time to check if end > start
                if (formData.start_time) {
                  const startError = validateField("start_time", formData.start_time);
                  if (startError) newErrors.start_time = startError;
                  else delete newErrors.start_time;
                }
                return newErrors;
              });
            }}
            size="small"
            error={touched.end_time && !!validationErrors.end_time}
            sx={{
              backgroundColor: "#ffffff",
              borderRadius: 1,
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
            }}
          >
            {timeOptions.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
          {touched.end_time && validationErrors.end_time && (
            <Box sx={{ color: "#d32f2f", fontSize: "0.75rem", mt: 0.5, ml: 1.75 }}>
              {validationErrors.end_time}
            </Box>
          )}
        </FormControl>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box display="flex" gap={2} mb={2}>
          <DatePicker
            label="Start Date"
            value={formData.startDate || formData.start_date || null}
            onChange={(newVal) => {
              handleField({ startDate: newVal });
              setTouched((prev) => ({ ...prev, start_date: true }));
              const error = validateField("start_date", newVal);
              setValidationErrors((prev) => {
                const newErrors = { ...prev };
                if (error) newErrors.start_date = error;
                else delete newErrors.start_date;
                return newErrors;
              });
            }}
            slotProps={{
              textField: {
                size: "small",
                error: touched.start_date && !!validationErrors.start_date,
                helperText: touched.start_date && validationErrors.start_date,
                sx: {
                  backgroundColor: "#ffffff",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
                },
              },
            }}
          />
          <DatePicker
            label="End Date"
            value={formData.endDate || formData.end_date || null}
            onChange={(newVal) => {
              handleField({ endDate: newVal });
              setTouched((prev) => ({ ...prev, end_date: true }));
              const error = validateField("end_date", newVal);
              setValidationErrors((prev) => {
                const newErrors = { ...prev };
                if (error) newErrors.end_date = error;
                else delete newErrors.end_date;
                return newErrors;
              });
            }}
            slotProps={{
              textField: {
                size: "small",
                error: touched.end_date && !!validationErrors.end_date,
                helperText: touched.end_date && validationErrors.end_date,
                sx: {
                  backgroundColor: "#ffffff",
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e6edf3" },
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
          !(formData.startTime || formData.start_time) ||
          !(formData.endTime || formData.end_time) ||
          !(formData.startDate || formData.start_date) ||
          !(formData.endDate || formData.end_date)
        }
        sx={{ color: "#fff", backgroundColor: "#0f172a", "&:hover": { backgroundColor: "#0b1320" } }}
      >
        Set Schedule
      </Button>

      {formData.schedule && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: "#ffffff", border: "1px solid #e6edf3", borderRadius: 1 }}>
          <InputLabel sx={{ mb: 1 }}>Current Schedule</InputLabel>
          <Box>{formData.schedule}</Box>
        </Box>
      )}
    </Box>
  );
}