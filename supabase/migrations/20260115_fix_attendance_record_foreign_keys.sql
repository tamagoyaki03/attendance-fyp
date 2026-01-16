-- Migration: Fix foreign key constraints on attendance_record
-- The constraints were pointing to course_lecture/course_tutorial instead of enrollment_lecture/enrollment_tutorial

-- Drop existing incorrect foreign key constraints
ALTER TABLE attendance_record DROP CONSTRAINT IF EXISTS attendance_record_lecture_enrollment_id_fkey;
ALTER TABLE attendance_record DROP CONSTRAINT IF EXISTS attendance_record_tutorial_enrollment_id_fkey;

-- Add correct foreign key constraints
-- lecture_enrollment_id should reference enrollment_lecture(id)
ALTER TABLE attendance_record
ADD CONSTRAINT attendance_record_lecture_enrollment_id_fkey
FOREIGN KEY (lecture_enrollment_id)
REFERENCES enrollment_lecture(id)
ON DELETE CASCADE;

-- tutorial_enrollment_id should reference enrollment_tutorial(id)
ALTER TABLE attendance_record
ADD CONSTRAINT attendance_record_tutorial_enrollment_id_fkey
FOREIGN KEY (tutorial_enrollment_id)
REFERENCES enrollment_tutorial(id)
ON DELETE CASCADE;

-- Also ensure session_id is uuid type to match attendance_session.id
-- First drop the constraint if it exists
ALTER TABLE attendance_record DROP CONSTRAINT IF EXISTS attendance_record_session_id_fkey;

-- Clean up invalid session_id values (empty strings, invalid uuids)
-- Set them to NULL first
UPDATE attendance_record 
SET session_id = NULL 
WHERE session_id = '' 
   OR session_id IS NULL
   OR session_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Convert session_id from varchar to uuid
ALTER TABLE attendance_record
ALTER COLUMN session_id SET DATA TYPE uuid USING session_id::uuid;

-- Clean up orphaned records - delete attendance records that reference non-existent sessions
DELETE FROM attendance_record
WHERE session_id IS NOT NULL
  AND session_id NOT IN (SELECT id FROM attendance_session);

-- Add correct foreign key constraint
ALTER TABLE attendance_record
ADD CONSTRAINT attendance_record_session_id_fkey
FOREIGN KEY (session_id)
REFERENCES attendance_session(id)
ON DELETE CASCADE;