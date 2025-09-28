# API Monitoring & Health

Overview of monitoring, status tracking, and health endpoints for the DA Submission Manager API.

## Monitoring Endpoints

- `GET /api/admin/submissions/overview` – summary statistics, pathway breakdown, errors. Optional query params: `projectId`, `start`, `end`.
- `GET /api/admin/submissions/recent` – recent submissions list. Query params: `limit`, `offset`.
- `GET /api/admin/submissions/failed` – failed submissions with details. Query params: `limit`, `offset`.
- `GET /api/admin/submissions/by-status` – submissions filtered by status/project. Query params: `status`, `projectId`, `limit`, `offset`.
- `GET /api/submissions/:id/status` – public submission status with timeline (rate limited).

## Health Endpoints

- `GET /api/health/system` – database connectivity and submission stats.
- `GET /api/health/integrations` – integration heartbeat stats from monitoring views.
- `GET /api/health/ai-providers` – configuration state of AI providers.
- `GET /api/admin/health/detailed` – detailed admin health overview (stats, errors, integrations, stale submissions).

## Services

- `AnalyticsService`
  - `getSubmissionStats(projectId?, { start?, end? })`
  - `getPathwayBreakdown(projectId?)`
  - `getErrorAnalysis()`
  - `getIntegrationMetrics()`
  - Internal caching (60s TTL) for repeated queries.
- `StatusTrackerService`
  - `trackSubmissionProgress(submissionId, stage, status, detail?, metadata?)`
  - `getSubmissionTimeline(submissionId)`
  - `checkStaleSubmissions(thresholdMinutes?)`
  - `retryFailedOperations(submissionId)`

## Database Migration `0016_monitoring_views.sql`

- Tables: `submission_status_events`, `integration_status_logs`.
- Materialized views: status totals, pathway breakdown, daily activity, error summary, latest status event, integration status.
- Functions: refresh helper, analytics RPC functions, `find_stale_submissions`, `retry_submission_operations`.
- Indexes and helper views for fast dashboard queries.

## Notes

- Public status endpoint is rate limited (30 requests/minute).
- Refresh helper should run periodically to keep materialized views current.
- Status tracker RPCs allow automated retry workflows.

