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

export default function ScheduleInput({ formData = {}, setFormData }) {
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
          onChange={(e) => handleField({ day: e.target.value })}
          size="small"
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
      </FormControl>

      <Box display="flex" gap={2} mb={2}>
        <FormControl fullWidth>
          <InputLabel id="start-time-label">Start Time</InputLabel>
          <Select
            labelId="start-time-label"
            value={formData.startTime || formData.start_time || ""}
            label="Start Time"
            onChange={(e) => handleField({ startTime: e.target.value })}
            size="small"
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
        </FormControl>

        <FormControl fullWidth>
          <InputLabel id="end-time-label">End Time</InputLabel>
          <Select
            labelId="end-time-label"
            value={formData.endTime || formData.end_time || ""}
            label="End Time"
            onChange={(e) => handleField({ endTime: e.target.value })}
            size="small"
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
        </FormControl>
      </Box>

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box display="flex" gap={2} mb={2}>
          <DatePicker
            label="Start Date"
            value={formData.startDate || formData.start_date || null}
            onChange={(newVal) => handleField({ startDate: newVal })}
            slotProps={{
              textField: {
                size: "small",
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
            onChange={(newVal) => handleField({ endDate: newVal })}
            minDate={formData.startDate || formData.start_date || null}
            slotProps={{
              textField: {
                size: "small",
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