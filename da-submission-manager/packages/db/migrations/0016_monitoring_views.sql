-- Monitoring and status tracking schema enhancements

-- 1. Status tracking tables -------------------------------------------------

CREATE TABLE IF NOT EXISTS submission_progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_progress_events_submission
  ON submission_progress_events(submission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_progress_events_stage_status
  ON submission_progress_events(stage, status, created_at DESC);


CREATE TABLE IF NOT EXISTS submission_retry_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  stage TEXT,
  operation TEXT NOT NULL DEFAULT 'auto_retry',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  payload JSONB,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_retry_tasks_unique
  ON submission_retry_tasks(submission_id, operation);

CREATE INDEX IF NOT EXISTS idx_submission_retry_tasks_status
  ON submission_retry_tasks(status, next_attempt_at);


CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')),
  detail JSONB,
  environment TEXT,
  latency_ms INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_checks_component
  ON system_health_checks(component, checked_at DESC);


CREATE TABLE IF NOT EXISTS integration_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')),
  detail JSONB,
  latency_ms INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_health_checks_integration
  ON integration_health_checks(integration, checked_at DESC);


CREATE TABLE IF NOT EXISTS ai_provider_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')),
  latency_ms INTEGER,
  tokens_per_minute INTEGER,
  detail JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_health_provider
  ON ai_provider_health(provider, checked_at DESC);


-- 2. Materialized views -----------------------------------------------------

CREATE MATERIALIZED VIEW mv_submission_overview AS
WITH latest_event AS (
  SELECT DISTINCT ON (submission_id)
    submission_id,
    stage AS latest_stage,
    status AS latest_stage_status,
    metadata AS latest_metadata,
    created_at AS last_event_at
  FROM submission_progress_events
  ORDER BY submission_id, created_at DESC
),
failed_events AS (
  SELECT
    submission_id,
    COUNT(*) AS failed_events,
    MAX(created_at) AS last_failed_at
  FROM submission_progress_events
  WHERE status IN ('failed','error','timeout')
  GROUP BY submission_id
)
SELECT
  s.id AS submission_id,
  s.project_id,
  s.status,
  s.submission_pathway,
  s.created_at,
  s.updated_at,
  s.submitted_to_council_at,
  s.action_network_sync_status,
  s.action_network_sync_error,
  le.latest_stage,
  le.latest_stage_status,
  le.latest_metadata,
  le.last_event_at,
  fe.failed_events,
  fe.last_failed_at
FROM submissions s
LEFT JOIN latest_event le ON le.submission_id = s.id
LEFT JOIN failed_events fe ON fe.submission_id = s.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_submission_overview_id
  ON mv_submission_overview(submission_id);

CREATE INDEX IF NOT EXISTS idx_mv_submission_overview_project
  ON mv_submission_overview(project_id, last_event_at DESC);


CREATE MATERIALIZED VIEW mv_submission_daily_stats AS
SELECT
  date_trunc('day', s.created_at)::date AS stat_date,
  s.project_id,
  COUNT(*) AS total_created,
  COUNT(*) FILTER (WHERE s.status IN ('SUBMITTED','COMPLETED')) AS total_completed,
  COUNT(*) FILTER (WHERE s.status IN ('FAILED','ERROR')) AS total_failed,
  COUNT(*) FILTER (WHERE s.status IN ('PROCESSING','AWAITING_REVIEW','DRAFT_SENT','NEW')) AS total_in_progress,
  ROUND(
    COALESCE(
      AVG(EXTRACT(EPOCH FROM (COALESCE(s.submitted_to_council_at, s.updated_at) - s.created_at)) / 3600),
      0
    )::numeric,
    2
  ) AS avg_completion_hours
FROM submissions s
GROUP BY stat_date, s.project_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_submission_daily_stats_id
  ON mv_submission_daily_stats(stat_date, project_id);


-- 3. Helper functions -------------------------------------------------------

CREATE OR REPLACE FUNCTION refresh_monitoring_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_submission_overview;
  EXCEPTION WHEN feature_not_supported THEN
    REFRESH MATERIALIZED VIEW mv_submission_overview;
  END;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_submission_daily_stats;
  EXCEPTION WHEN feature_not_supported THEN
    REFRESH MATERIALIZED VIEW mv_submission_daily_stats;
  END;
END;
$$;


CREATE OR REPLACE FUNCTION get_submission_stats(
  p_project_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE status IN ('SUBMITTED','COMPLETED')),
    'failed', COUNT(*) FILTER (WHERE status IN ('FAILED','ERROR')),
    'inProgress', COUNT(*) FILTER (WHERE status IN ('PROCESSING','AWAITING_REVIEW','DRAFT_SENT','NEW')),
    'awaitingReview', COUNT(*) FILTER (WHERE status = 'AWAITING_REVIEW'),
    'submittedToday', COUNT(*) FILTER (
      WHERE status IN ('SUBMITTED','COMPLETED')
        AND (COALESCE(submitted_to_council_at, updated_at))::date = current_date
    ),
    'avgCompletionHours',
      COALESCE(
        ROUND(
          AVG(EXTRACT(EPOCH FROM (COALESCE(submitted_to_council_at, updated_at) - created_at)) / 3600)::numeric,
          2
        ),
        0
      ),
    'lastUpdated', now()
  )
  INTO result
  FROM submissions s
  WHERE (p_project_id IS NULL OR s.project_id = p_project_id)
    AND (p_start_date IS NULL OR s.created_at >= p_start_date)
    AND (p_end_date IS NULL OR s.created_at < (p_end_date + INTERVAL '1 day'));

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;


CREATE OR REPLACE FUNCTION get_pathway_breakdown(
  p_project_id UUID DEFAULT NULL
) RETURNS TABLE(
  pathway TEXT,
  total BIGINT,
  percentage NUMERIC
)
LANGUAGE sql
AS $$
  WITH filtered AS (
    SELECT submission_pathway
    FROM submissions
    WHERE submission_pathway IS NOT NULL
      AND (p_project_id IS NULL OR project_id = p_project_id)
  ),
  totals AS (
    SELECT COUNT(*) AS total_count FROM filtered
  )
  SELECT
    f.submission_pathway AS pathway,
    COUNT(*) AS total,
    CASE
      WHEN t.total_count = 0 THEN 0
      ELSE ROUND(COUNT(*)::numeric * 100 / t.total_count, 2)
    END AS percentage
  FROM filtered f
  CROSS JOIN totals t
  GROUP BY f.submission_pathway, t.total_count
  ORDER BY total DESC;
$$;


CREATE OR REPLACE FUNCTION get_error_analysis()
RETURNS TABLE(
  stage TEXT,
  occurrences BIGINT,
  last_occurrence TIMESTAMPTZ,
  sample_error TEXT
)
LANGUAGE sql
AS $$
  SELECT
    stage,
    COUNT(*) AS occurrences,
    MAX(created_at) AS last_occurrence,
    MAX(metadata ->> 'error_message') FILTER (WHERE metadata ? 'error_message') AS sample_error
  FROM submission_progress_events
  WHERE status IN ('failed','error','timeout')
  GROUP BY stage
  ORDER BY occurrences DESC;
$$;


CREATE OR REPLACE FUNCTION get_integration_metrics()
RETURNS TABLE(
  integration TEXT,
  latest_status TEXT,
  success_rate NUMERIC,
  avg_latency_ms NUMERIC,
  last_checked TIMESTAMPTZ,
  degraded_count BIGINT,
  failure_count BIGINT
)
LANGUAGE sql
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (integration)
      integration,
      status,
      latency_ms,
      checked_at
    FROM integration_health_checks
    ORDER BY integration, checked_at DESC
  ),
  recent AS (
    SELECT
      integration,
      COUNT(*) FILTER (WHERE status = 'healthy') AS success_count,
      COUNT(*) FILTER (WHERE status = 'degraded') AS degraded_count,
      COUNT(*) FILTER (WHERE status = 'down') AS failure_count,
      AVG(latency_ms) AS avg_latency_ms,
      MAX(checked_at) AS last_checked
    FROM integration_health_checks
    WHERE checked_at >= now() - INTERVAL '7 days'
    GROUP BY integration
  )
  SELECT
    COALESCE(r.integration, l.integration) AS integration,
    COALESCE(l.status, 'unknown') AS latest_status,
    CASE
      WHEN COALESCE(r.success_count, 0) + COALESCE(r.failure_count, 0) + COALESCE(r.degraded_count, 0) = 0
        THEN NULL
      ELSE ROUND(
        COALESCE(r.success_count, 0)::NUMERIC * 100 /
        (COALESCE(r.success_count, 0) + COALESCE(r.failure_count, 0) + COALESCE(r.degraded_count, 0)),
        2
      )
    END AS success_rate,
    ROUND(COALESCE(r.avg_latency_ms, l.latency_ms)::NUMERIC, 2) AS avg_latency_ms,
    COALESCE(r.last_checked, l.checked_at) AS last_checked,
    COALESCE(r.degraded_count, 0) AS degraded_count,
    COALESCE(r.failure_count, 0) AS failure_count
  FROM latest l
  FULL OUTER JOIN recent r ON r.integration = l.integration;
$$;


CREATE OR REPLACE FUNCTION get_recent_submissions(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_project_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL
) RETURNS TABLE(
  submission_id UUID,
  project_id UUID,
  status TEXT,
  submission_pathway TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  latest_stage TEXT,
  latest_stage_status TEXT,
  last_event_at TIMESTAMPTZ,
  action_network_sync_status TEXT,
  failed_events BIGINT
)
LANGUAGE sql
AS $$
  SELECT
    submission_id,
    project_id,
    status,
    submission_pathway,
    created_at,
    updated_at,
    latest_stage,
    latest_stage_status,
    last_event_at,
    action_network_sync_status,
    COALESCE(failed_events, 0) AS failed_events
  FROM mv_submission_overview
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
    AND (p_status IS NULL OR status = p_status)
  ORDER BY COALESCE(last_event_at, updated_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;


CREATE OR REPLACE FUNCTION get_failed_submissions(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_project_id UUID DEFAULT NULL
) RETURNS TABLE(
  submission_id UUID,
  project_id UUID,
  status TEXT,
  submission_pathway TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  latest_stage TEXT,
  latest_stage_status TEXT,
  last_event_at TIMESTAMPTZ,
  action_network_sync_status TEXT,
  action_network_sync_error TEXT,
  failed_events BIGINT,
  last_failed_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT
    submission_id,
    project_id,
    status,
    submission_pathway,
    created_at,
    updated_at,
    latest_stage,
    latest_stage_status,
    last_event_at,
    action_network_sync_status,
    action_network_sync_error,
    COALESCE(failed_events, 0) AS failed_events,
    last_failed_at
  FROM mv_submission_overview
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
    AND (
      status IN ('FAILED','ERROR')
      OR latest_stage_status IN ('failed','error','timeout')
      OR COALESCE(failed_events, 0) > 0
    )
  ORDER BY COALESCE(last_failed_at, last_event_at, updated_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;


CREATE OR REPLACE FUNCTION get_submissions_by_status(
  p_status TEXT,
  p_project_id UUID DEFAULT NULL,
  p_pathway TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE(
  submission_id UUID,
  project_id UUID,
  status TEXT,
  submission_pathway TEXT,
  latest_stage TEXT,
  latest_stage_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT
    submission_id,
    project_id,
    status,
    submission_pathway,
    latest_stage,
    latest_stage_status,
    created_at,
    updated_at,
    last_event_at
  FROM mv_submission_overview
  WHERE status = p_status
    AND (p_project_id IS NULL OR project_id = p_project_id)
    AND (p_pathway IS NULL OR submission_pathway = p_pathway)
  ORDER BY COALESCE(last_event_at, updated_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;


CREATE OR REPLACE FUNCTION get_stale_submissions(
  p_inactivity_minutes INTEGER DEFAULT 30
) RETURNS TABLE(
  submission_id UUID,
  project_id UUID,
  status TEXT,
  latest_stage TEXT,
  latest_stage_status TEXT,
  last_event_at TIMESTAMPTZ,
  minutes_inactive NUMERIC
)
LANGUAGE sql
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (submission_id)
      submission_id,
      stage AS latest_stage,
      status AS latest_stage_status,
      created_at AS last_event_at
    FROM submission_progress_events
    ORDER BY submission_id, created_at DESC
  )
  SELECT
    s.id AS submission_id,
    s.project_id,
    s.status,
    l.latest_stage,
    l.latest_stage_status,
    l.last_event_at,
    ROUND(
      EXTRACT(EPOCH FROM (now() - COALESCE(l.last_event_at, s.updated_at))) / 60,
      2
    ) AS minutes_inactive
  FROM submissions s
  LEFT JOIN latest l ON l.submission_id = s.id
  WHERE COALESCE(l.last_event_at, s.updated_at) < (now() - INTERVAL '1 minute' * p_inactivity_minutes)
    AND s.status NOT IN ('SUBMITTED','COMPLETED','FAILED','ERROR');
$$;


CREATE OR REPLACE FUNCTION schedule_failed_submission_retries(
  p_submission_id UUID
) RETURNS SETOF submission_retry_tasks
LANGUAGE plpgsql
AS $$
DECLARE
  retry_record submission_retry_tasks;
BEGIN
  FOR retry_record IN
    UPDATE submission_retry_tasks
    SET status = 'pending',
        updated_at = now(),
        next_attempt_at = now() + INTERVAL '5 minutes'
    WHERE submission_id = p_submission_id
      AND status = 'failed'
    RETURNING *
  LOOP
    RETURN NEXT retry_record;
  END LOOP;

  IF NOT FOUND THEN
    INSERT INTO submission_retry_tasks (submission_id, status, attempts, next_attempt_at)
    VALUES (p_submission_id, 'pending', 0, now())
    RETURNING * INTO retry_record;
    RETURN NEXT retry_record;
  END IF;

  RETURN;
END;
$$;


CREATE OR REPLACE FUNCTION get_public_submission_status(
  p_submission_id UUID
) RETURNS TABLE(
  submission_id UUID,
  project_slug TEXT,
  status TEXT,
  submission_pathway TEXT,
  latest_stage TEXT,
  latest_stage_status TEXT,
  last_event_at TIMESTAMPTZ,
  submitted_to_council_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  action_required BOOLEAN,
  timeline JSONB
)
LANGUAGE sql
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (submission_id)
      submission_id,
      stage AS latest_stage,
      status AS latest_stage_status,
      created_at AS last_event_at
    FROM submission_progress_events
    ORDER BY submission_id, created_at DESC
  ),
  timeline AS (
    SELECT
      submission_id,
      jsonb_agg(
        jsonb_build_object(
          'stage', stage,
          'status', status,
          'metadata', metadata,
          'occurredAt', created_at
        )
        ORDER BY created_at
      ) AS events
    FROM submission_progress_events
    WHERE submission_id = p_submission_id
    GROUP BY submission_id
  )
  SELECT
    s.id,
    p.slug AS project_slug,
    s.status,
    s.submission_pathway,
    lt.latest_stage,
    lt.latest_stage_status,
    lt.last_event_at,
    s.submitted_to_council_at,
    s.created_at,
    s.updated_at,
    s.status IN ('AWAITING_REVIEW','DRAFT_SENT') AS action_required,
    COALESCE(tl.events, '[]'::jsonb) AS timeline
  FROM submissions s
  JOIN projects p ON p.id = s.project_id
  LEFT JOIN latest lt ON lt.submission_id = s.id
  LEFT JOIN timeline tl ON tl.submission_id = s.id
  WHERE s.id = p_submission_id
  LIMIT 1;
$$;


CREATE OR REPLACE FUNCTION get_system_health_snapshot()
RETURNS TABLE(
  component TEXT,
  status TEXT,
  detail JSONB,
  environment TEXT,
  latency_ms INTEGER,
  checked_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT DISTINCT ON (component)
    component,
    status,
    detail,
    environment,
    latency_ms,
    checked_at
  FROM system_health_checks
  ORDER BY component, checked_at DESC;
$$;


CREATE OR REPLACE FUNCTION get_integration_health_snapshot()
RETURNS TABLE(
  integration TEXT,
  status TEXT,
  detail JSONB,
  latency_ms INTEGER,
  checked_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT DISTINCT ON (integration)
    integration,
    status,
    detail,
    latency_ms,
    checked_at
  FROM integration_health_checks
  ORDER BY integration, checked_at DESC;
$$;


CREATE OR REPLACE FUNCTION get_ai_provider_health_snapshot()
RETURNS TABLE(
  provider TEXT,
  status TEXT,
  detail JSONB,
  latency_ms INTEGER,
  tokens_per_minute INTEGER,
  checked_at TIMESTAMPTZ
)
LANGUAGE sql
AS $$
  SELECT DISTINCT ON (provider)
    provider,
    status,
    detail,
    latency_ms,
    tokens_per_minute,
    checked_at
  FROM ai_provider_health
  ORDER BY provider, checked_at DESC;
$$;


-- Initial refresh to populate materialized views
DO $$
BEGIN
  BEGIN
    PERFORM refresh_monitoring_materialized_views();
  EXCEPTION WHEN feature_not_supported THEN
    REFRESH MATERIALIZED VIEW mv_submission_overview;
    REFRESH MATERIALIZED VIEW mv_submission_daily_stats;
  END;
END;
$$;

