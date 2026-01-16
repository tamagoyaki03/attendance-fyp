-- Create fraud_detection_alerts table (separate from attendance_issues)
-- This table stores real-time fraud detection results from location and time anomaly checks

CREATE TABLE IF NOT EXISTS fraud_detection_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES attendance_session(id) ON DELETE CASCADE,
  course_code VARCHAR(50),
  alert_type VARCHAR(50) NOT NULL, -- "Location Anomaly", "Time Anomaly", etc.
  description TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  expected_latitude DECIMAL(10, 8),
  expected_longitude DECIMAL(11, 8),
  distance_km DECIMAL(10, 2), -- For location anomalies
  expected_time TIMESTAMPTZ,
  actual_time TIMESTAMPTZ,
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  status VARCHAR(20) DEFAULT 'open', -- open, reviewed, resolved
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE fraud_detection_alerts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow admins to view all fraud alerts
CREATE POLICY "Allow admins to view all fraud alerts" ON fraud_detection_alerts
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy 2: Allow lecturers to view fraud alerts for their sessions
CREATE POLICY "Allow lecturers to view fraud alerts for their sessions" ON fraud_detection_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attendance_session
      WHERE attendance_session.id = fraud_detection_alerts.session_id
      AND (
        attendance_session.lecturer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM course_lecture
          WHERE course_lecture.id = attendance_session.course_lecture_id
          AND course_lecture.lecturer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM course_tutorial
          WHERE course_tutorial.id = attendance_session.course_tutorial_id
          AND course_tutorial.lecturer_id = auth.uid()
        )
      )
    )
  );

-- Policy 3: Allow admins to insert fraud alerts
CREATE POLICY "Allow admins to insert fraud alerts" ON fraud_detection_alerts
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy 4: Allow system/service role to insert fraud alerts (for automated detection)
CREATE POLICY "Allow system to insert fraud alerts" ON fraud_detection_alerts
  FOR INSERT
  WITH CHECK (TRUE); -- Client-side inserts from monitoring, controlled by app logic

-- Policy 5: Allow admins to update fraud alerts (resolve/review)
CREATE POLICY "Allow admins to update fraud alerts" ON fraud_detection_alerts
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy 6: Allow lecturers to update fraud alerts for their sessions
CREATE POLICY "Allow lecturers to update fraud alerts for their sessions" ON fraud_detection_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM attendance_session
      WHERE attendance_session.id = fraud_detection_alerts.session_id
      AND (
        attendance_session.lecturer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM course_lecture
          WHERE course_lecture.id = attendance_session.course_lecture_id
          AND course_lecture.lecturer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM course_tutorial
          WHERE course_tutorial.id = attendance_session.course_tutorial_id
          AND course_tutorial.lecturer_id = auth.uid()
        )
      )
    )
  );

-- Create index for common queries
CREATE INDEX IF NOT EXISTS fraud_detection_alerts_user_id_idx ON fraud_detection_alerts(user_id);
CREATE INDEX IF NOT EXISTS fraud_detection_alerts_session_id_idx ON fraud_detection_alerts(session_id);
CREATE INDEX IF NOT EXISTS fraud_detection_alerts_status_idx ON fraud_detection_alerts(status);
CREATE INDEX IF NOT EXISTS fraud_detection_alerts_created_at_idx ON fraud_detection_alerts(created_at DESC);

-- Add RLS policies to attendance_issues if they don't exist (for reference/audit)
ALTER TABLE IF EXISTS attendance_issues ENABLE ROW LEVEL SECURITY;

-- Policy for attendance_issues: Allow admins to view all
CREATE POLICY IF NOT EXISTS "Allow admins to view attendance issues" ON attendance_issues
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy for attendance_issues: Allow lecturers to view for their courses
CREATE POLICY IF NOT EXISTS "Allow lecturers to view attendance issues" ON attendance_issues
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attendance_session
      WHERE attendance_session.id = attendance_issues.session_id
      AND (
        attendance_session.lecturer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM course_lecture
          WHERE course_lecture.id = attendance_session.course_lecture_id
          AND course_lecture.lecturer_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM course_tutorial
          WHERE course_tutorial.id = attendance_session.course_tutorial_id
          AND course_tutorial.lecturer_id = auth.uid()
        )
      )
    )
  );

-- Policy for attendance_issues: Allow admins to insert
CREATE POLICY IF NOT EXISTS "Allow admins to insert attendance issues" ON attendance_issues
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy for attendance_issues: Allow system to insert
CREATE POLICY IF NOT EXISTS "Allow system to insert attendance issues" ON attendance_issues
  FOR INSERT
  WITH CHECK (TRUE);

-- Policy for attendance_issues: Allow updates by admins
CREATE POLICY IF NOT EXISTS "Allow admins to update attendance issues" ON attendance_issues
  FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
