-- Create absence_emails table to track sent absence notification emails
-- This prevents duplicate emails from being sent for the same session

CREATE TABLE IF NOT EXISTS absence_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES attendance_session(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_absence_emails_session_id ON absence_emails(session_id);
CREATE INDEX IF NOT EXISTS idx_absence_emails_student_id ON absence_emails(student_id);
CREATE INDEX IF NOT EXISTS idx_absence_emails_lecturer_id ON absence_emails(lecturer_id);

-- Create unique constraint to prevent duplicate email logs for same student-session
CREATE UNIQUE INDEX IF NOT EXISTS idx_absence_emails_unique_student_session 
  ON absence_emails(student_id, session_id);

-- Enable RLS
ALTER TABLE absence_emails ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow lecturers to view their own sent emails
CREATE POLICY "Allow lecturers to view their sent absence emails" ON absence_emails
  FOR SELECT
  USING (
    lecturer_id = auth.uid()
  );

-- Policy 2: Allow lecturers to insert absence email logs
CREATE POLICY "Allow lecturers to log sent absence emails" ON absence_emails
  FOR INSERT
  WITH CHECK (
    lecturer_id = auth.uid()
  );

-- Policy 3: Allow admins to view all absence emails
CREATE POLICY "Allow admins to view all absence emails" ON absence_emails
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
