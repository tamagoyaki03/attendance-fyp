-- Migration: allow 'flagged' as a valid status in attendance_record
ALTER TABLE attendance_record
  DROP CONSTRAINT IF EXISTS attendance_record_status_check;
ALTER TABLE attendance_record
  ADD CONSTRAINT attendance_record_status_check
    CHECK (status IN ('present', 'absent', 'tardy', 'excused', 'flagged'));
