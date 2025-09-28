-- Migration: Error Recovery and Resilience System
-- This migration adds tables and functions for comprehensive error tracking,
-- retry mechanisms, and system monitoring.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Error tracking table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('user', 'system', 'integration', 'temporary')),
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB DEFAULT '{}',
  resolution_status TEXT DEFAULT 'unresolved' CHECK (resolution_status IN ('unresolved', 'resolved', 'ignored')),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT
);

-- Recovery operations table
CREATE TABLE IF NOT EXISTS recovery_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'completed', 'failed', 'cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  error_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Circuit breaker state table for tracking service health
CREATE TABLE IF NOT EXISTS circuit_breaker_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health check results table
CREATE TABLE IF NOT EXISTS health_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  response_time INTEGER, -- milliseconds
  message TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System metrics table for performance tracking
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_logs_submission_id ON error_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_code ON error_logs(error_code);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolution_status ON error_logs(resolution_status);

CREATE INDEX IF NOT EXISTS idx_recovery_operations_submission_id ON recovery_operations(submission_id);
CREATE INDEX IF NOT EXISTS idx_recovery_operations_status ON recovery_operations(status);
CREATE INDEX IF NOT EXISTS idx_recovery_operations_next_retry_at ON recovery_operations(next_retry_at);
CREATE INDEX IF NOT EXISTS idx_recovery_operations_operation_type ON recovery_operations(operation_type);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_states_service_name ON circuit_breaker_states(service_name);
CREATE INDEX IF NOT EXISTS idx_health_check_results_check_name ON health_check_results(check_name);
CREATE INDEX IF NOT EXISTS idx_health_check_results_created_at ON health_check_results(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_recovery_operations_updated_at 
    BEFORE UPDATE ON recovery_operations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circuit_breaker_states_updated_at 
    BEFORE UPDATE ON circuit_breaker_states 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to schedule failed submission retries
CREATE OR REPLACE FUNCTION schedule_failed_submission_retries(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
  operation_record RECORD;
BEGIN
  -- Get all failed operations for this submission that haven't exceeded max retries
  FOR operation_record IN 
    SELECT * FROM recovery_operations 
    WHERE submission_id = p_submission_id 
    AND status = 'failed' 
    AND retry_count < max_retries
  LOOP
    -- Schedule for retry in 5 minutes with exponential backoff
    UPDATE recovery_operations 
    SET 
      status = 'pending',
      next_retry_at = NOW() + INTERVAL '5 minutes' * POWER(2, operation_record.retry_count),
      updated_at = NOW()
    WHERE id = operation_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get error statistics
CREATE OR REPLACE FUNCTION get_error_statistics(
  p_hours INTEGER DEFAULT 24,
  p_error_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  error_type TEXT,
  error_code TEXT,
  count BIGINT,
  resolved_count BIGINT,
  avg_resolution_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.error_type,
    el.error_code,
    COUNT(*) as count,
    COUNT(CASE WHEN el.resolution_status = 'resolved' THEN 1 END) as resolved_count,
    AVG(el.resolved_at - el.created_at) as avg_resolution_time
  FROM error_logs el
  WHERE el.created_at >= NOW() - INTERVAL '1 hour' * p_hours
    AND (p_error_type IS NULL OR el.error_type = p_error_type)
  GROUP BY el.error_type, el.error_code
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get retry statistics
CREATE OR REPLACE FUNCTION get_retry_statistics(p_hours INTEGER DEFAULT 24)
RETURNS TABLE (
  operation_type TEXT,
  total_operations BIGINT,
  successful_operations BIGINT,
  failed_operations BIGINT,
  avg_retry_count NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ro.operation_type,
    COUNT(*) as total_operations,
    COUNT(CASE WHEN ro.status = 'completed' THEN 1 END) as successful_operations,
    COUNT(CASE WHEN ro.status = 'failed' THEN 1 END) as failed_operations,
    AVG(ro.retry_count) as avg_retry_count,
    ROUND(
      COUNT(CASE WHEN ro.status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 
      2
    ) as success_rate
  FROM recovery_operations ro
  WHERE ro.created_at >= NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY ro.operation_type
  ORDER BY total_operations DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old records
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS VOID AS $$
BEGIN
  -- Clean up error logs older than 90 days (keep only resolved ones older than 30 days)
  DELETE FROM error_logs 
  WHERE created_at < NOW() - INTERVAL '90 days'
    OR (resolution_status = 'resolved' AND resolved_at < NOW() - INTERVAL '30 days');
  
  -- Clean up completed recovery operations older than 30 days
  DELETE FROM recovery_operations 
  WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '30 days';
  
  -- Clean up health check results older than 7 days
  DELETE FROM health_check_results 
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Clean up system metrics older than 30 days
  DELETE FROM system_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Monitoring data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- Views for monitoring and reporting

-- View for current system health
CREATE OR REPLACE VIEW current_system_health AS
SELECT 
  hcr.check_name,
  hcr.status,
  hcr.response_time,
  hcr.message,
  hcr.created_at
FROM health_check_results hcr
INNER JOIN (
  SELECT check_name, MAX(created_at) as latest_check
  FROM health_check_results
  GROUP BY check_name
) latest ON hcr.check_name = latest.check_name 
  AND hcr.created_at = latest.latest_check;

-- View for active recovery operations
CREATE OR REPLACE VIEW active_recovery_operations AS
SELECT 
  ro.id,
  ro.submission_id,
  ro.operation_type,
  ro.status,
  ro.retry_count,
  ro.max_retries,
  ro.next_retry_at,
  ro.created_at,
  s.applicant_name,
  s.site_address,
  p.name as project_name
FROM recovery_operations ro
LEFT JOIN submissions s ON ro.submission_id = s.id
LEFT JOIN projects p ON s.project_id = p.id
WHERE ro.status IN ('pending', 'retrying')
ORDER BY ro.created_at DESC;

-- View for error summary
CREATE OR REPLACE VIEW error_summary AS
SELECT 
  el.error_type,
  el.error_code,
  COUNT(*) as total_count,
  COUNT(CASE WHEN el.resolution_status = 'unresolved' THEN 1 END) as unresolved_count,
  COUNT(CASE WHEN el.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_count,
  MAX(el.created_at) as last_occurrence
FROM error_logs el
GROUP BY el.error_type, el.error_code
ORDER BY total_count DESC;

-- Row Level Security (RLS) policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Allow service role to access all records
CREATE POLICY "Service role has full access to error_logs" ON error_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to recovery_operations" ON recovery_operations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to circuit_breaker_states" ON circuit_breaker_states
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to health_check_results" ON health_check_results
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to system_metrics" ON system_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Admin users can view and manage error recovery
CREATE POLICY "Admin users can access error_logs" ON error_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Admin users can access recovery_operations" ON recovery_operations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() AND active = true
    )
  );

-- Regular authenticated users can only view their own error logs
CREATE POLICY "Users can view their own error logs" ON error_logs
  FOR SELECT USING (
    submission_id IN (
      SELECT s.id FROM submissions s 
      WHERE s.applicant_email = auth.jwt() ->> 'email'
    )
  );

COMMENT ON TABLE error_logs IS 'Tracks all application errors with context and resolution status';
COMMENT ON TABLE recovery_operations IS 'Manages automatic and manual retry operations for failed processes';
COMMENT ON TABLE circuit_breaker_states IS 'Tracks circuit breaker states for external service resilience';
COMMENT ON TABLE health_check_results IS 'Stores system health check results for monitoring';
COMMENT ON TABLE system_metrics IS 'Stores system performance and operational metrics';

-- Insert initial circuit breaker states for key services
INSERT INTO circuit_breaker_states (service_name, state) VALUES 
  ('google_docs', 'closed'),
  ('openai', 'closed'),
  ('gemini', 'closed'),
  ('action_network', 'closed'),
  ('email_service', 'closed')
ON CONFLICT (service_name) DO NOTHING;
