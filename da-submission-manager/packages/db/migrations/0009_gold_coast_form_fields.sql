-- Add Gold Coast Council specific form fields to submissions table
-- Based on official "Have Your Say - Development Application" form

ALTER TABLE submissions 
  -- Residential address fields (required)
  ADD COLUMN IF NOT EXISTS applicant_residential_address TEXT,
  ADD COLUMN IF NOT EXISTS applicant_suburb TEXT,
  ADD COLUMN IF NOT EXISTS applicant_state TEXT,
  ADD COLUMN IF NOT EXISTS applicant_postcode TEXT,

  -- Postal address fields (separate from residential)
  ADD COLUMN IF NOT EXISTS postal_suburb TEXT,
  ADD COLUMN IF NOT EXISTS postal_state TEXT,
  ADD COLUMN IF NOT EXISTS postal_postcode TEXT,
  ADD COLUMN IF NOT EXISTS postal_email TEXT,

  -- Property identification fields
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS plan_number TEXT;

-- Create index on lot/plan numbers for property lookups
CREATE INDEX IF NOT EXISTS idx_submissions_property_lot_plan ON submissions(lot_number, plan_number);

-- Create index on residential suburb for geographic analysis
CREATE INDEX IF NOT EXISTS idx_submissions_residential_suburb ON submissions(applicant_suburb);
