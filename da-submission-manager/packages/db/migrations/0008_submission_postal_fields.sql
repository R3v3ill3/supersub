-- Capture structured postal address fields for Action Network
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS applicant_postal_city TEXT,
  ADD COLUMN IF NOT EXISTS applicant_postal_region TEXT,
  ADD COLUMN IF NOT EXISTS applicant_postal_postcode TEXT,
  ADD COLUMN IF NOT EXISTS applicant_postal_country TEXT;

