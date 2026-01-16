-- Migration: Fix unique constraint for attendance_record
-- Remove old unique constraint on (lecture_enrollment_id, date)
ALTER TABLE attendance_record DROP CONSTRAINT IF EXISTS idx_unique_lecture_attendance_per_date;

-- Remove old unique constraint on (tutorial_enrollment_id, date) if it exists
ALTER TABLE attendance_record DROP CONSTRAINT IF EXISTS idx_unique_tutorial_attendance_per_date;

-- Add new unique constraint on (session_id, lecture_enrollment_id)
ALTER TABLE attendance_record ADD CONSTRAINT idx_unique_lecture_attendance_per_session UNIQUE (session_id, lecture_enrollment_id);

-- Add new unique constraint on (session_id, tutorial_enrollment_id)
ALTER TABLE attendance_record ADD CONSTRAINT idx_unique_tutorial_attendance_per_session UNIQUE (session_id, tutorial_enrollment_id);
