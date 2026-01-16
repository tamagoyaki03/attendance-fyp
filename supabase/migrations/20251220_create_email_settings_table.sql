-- Create email_settings table for storing lecturer-specific email configurations
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_timing VARCHAR(50) DEFAULT 'immediate', -- immediate, daily, weekly
  reminder_frequency VARCHAR(50) DEFAULT '3days', -- none, 1day, 3days, weekly
  email_template TEXT,
  cc_emails TEXT, -- comma-separated email addresses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lecturer_id)
);

-- Enable RLS
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow lecturers to view/update their own settings (no cast needed - both TEXT now)
CREATE POLICY "Allow lecturers to manage own email settings" ON email_settings
  FOR ALL
  USING (lecturer_id::text = auth.uid())
  WITH CHECK (lecturer_id::text = auth.uid());

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS email_settings_lecturer_id_idx ON email_settings(lecturer_id);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_settings_update_timestamp
  BEFORE UPDATE ON email_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_settings_timestamp();
