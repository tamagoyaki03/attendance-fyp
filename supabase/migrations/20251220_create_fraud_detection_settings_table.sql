-- Centralized fraud detection settings (admin only, single row)
CREATE TABLE IF NOT EXISTS fraud_detection_settings (
  id SERIAL PRIMARY KEY,
  max_distance_km DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  time_buffer_minutes INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only allow admins to update
ALTER TABLE fraud_detection_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin update" ON fraud_detection_settings
  FOR UPDATE USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Allow admin select" ON fraud_detection_settings
  FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
-- Allow all to read (optional, if you want all users to see settings)
CREATE POLICY "Allow all select" ON fraud_detection_settings
  FOR SELECT USING (TRUE);
