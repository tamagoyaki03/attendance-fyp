-- Migration: Add flag_reason column to attendance_record
ALTER TABLE attendance_record
ADD COLUMN flag_reason TEXT;
