-- Cleanup Test Submissions
-- WARNING: These deletions CASCADE to survey_responses, llm_drafts, documents, etc.

-- ========================================
-- OPTION 1: Preview what will be deleted
-- ========================================
-- Run this first to see what you're about to delete

SELECT 
  id,
  applicant_email,
  site_address,
  status,
  created_at,
  updated_at
FROM submissions
ORDER BY created_at DESC;

-- Count by email
SELECT 
  applicant_email,
  COUNT(*) as submission_count
FROM submissions
GROUP BY applicant_email
ORDER BY submission_count DESC;


-- ========================================
-- OPTION 2: Delete by specific email
-- ========================================
-- Safest option - delete only your test email

-- Preview first:
SELECT id, applicant_email, site_address, created_at
FROM submissions
WHERE applicant_email = 'troyburton@gmail.com'  -- CHANGE THIS
ORDER BY created_at DESC;

-- Then delete (email_queue first, then submissions):
DELETE FROM email_queue
WHERE submission_id IN (
  SELECT id FROM submissions WHERE applicant_email = 'troyburton@gmail.com'  -- CHANGE THIS
);

DELETE FROM submissions
WHERE applicant_email = 'troyburton@gmail.com';  -- CHANGE THIS


-- ========================================
-- OPTION 3: Delete submissions from today
-- ========================================
-- Delete only today's test submissions

-- Preview first:
SELECT id, applicant_email, site_address, created_at
FROM submissions
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Then delete (email_queue first, then submissions):
DELETE FROM email_queue
WHERE submission_id IN (
  SELECT id FROM submissions WHERE DATE(created_at) = CURRENT_DATE
);

DELETE FROM submissions
WHERE DATE(created_at) = CURRENT_DATE;


-- ========================================
-- OPTION 4: Delete submissions from last N days
-- ========================================
-- Delete recent test submissions (e.g., last 7 days)

-- Preview first (last 7 days):
SELECT id, applicant_email, site_address, created_at
FROM submissions
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Then delete (email_queue first, then submissions):
DELETE FROM email_queue
WHERE submission_id IN (
  SELECT id FROM submissions WHERE created_at >= NOW() - INTERVAL '7 days'
);

DELETE FROM submissions
WHERE created_at >= NOW() - INTERVAL '7 days';


-- ========================================
-- OPTION 5: Delete ALL submissions (⚠️ DANGEROUS)
-- ========================================
-- Only use this if you're sure you want to delete EVERYTHING

-- Preview first:
SELECT COUNT(*) as total_submissions FROM submissions;

-- Then delete (uncomment to use):
-- First delete email_queue, then submissions
-- DELETE FROM email_queue;
-- DELETE FROM submissions;


-- ========================================
-- OPTION 6: Keep only latest N submissions
-- ========================================
-- Keep last 5, delete the rest

-- Preview what will be kept:
SELECT id, applicant_email, created_at
FROM submissions
ORDER BY created_at DESC
LIMIT 5;

-- Delete everything except last 5 (email_queue first):
DELETE FROM email_queue
WHERE submission_id NOT IN (
  SELECT id FROM submissions
  ORDER BY created_at DESC
  LIMIT 5
);

DELETE FROM submissions
WHERE id NOT IN (
  SELECT id FROM submissions
  ORDER BY created_at DESC
  LIMIT 5
);


-- ========================================
-- OPTION 7: Delete by status
-- ========================================
-- Delete submissions that haven't been completed

-- Preview first:
SELECT id, applicant_email, site_address, status, created_at
FROM submissions
WHERE status IN ('NEW', 'IN_PROGRESS', 'READY_FOR_REVIEW')
ORDER BY created_at DESC;

-- Then delete (email_queue first, then submissions):
DELETE FROM email_queue
WHERE submission_id IN (
  SELECT id FROM submissions 
  WHERE status IN ('NEW', 'IN_PROGRESS', 'READY_FOR_REVIEW')
);

DELETE FROM submissions
WHERE status IN ('NEW', 'IN_PROGRESS', 'READY_FOR_REVIEW');


-- ========================================
-- Verification after deletion
-- ========================================
-- Run this to confirm cleanup

SELECT 
  'submissions' as table_name,
  COUNT(*) as remaining_count
FROM submissions
UNION ALL
SELECT 
  'survey_responses' as table_name,
  COUNT(*) as remaining_count
FROM survey_responses
UNION ALL
SELECT 
  'llm_drafts' as table_name,
  COUNT(*) as remaining_count
FROM llm_drafts
UNION ALL
SELECT 
  'documents' as table_name,
  COUNT(*) as remaining_count
FROM documents;

