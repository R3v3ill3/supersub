# Monitoring and Status APIs

This document describes the monitoring and status tracking APIs implemented for the DA Submission Manager system.

## Overview

The monitoring system provides comprehensive visibility into:
- Submission status and progress tracking
- System health monitoring
- Integration health checks
- AI provider availability
- Analytics and reporting

## API Endpoints

### Submission Monitoring

#### GET `/api/admin/submissions/overview`
Dashboard summary stats for administrators.

**Authentication:** Admin required  
**Query Parameters:**
- `project_id` (string, optional): Filter by project
- `start` (string, optional): Start date filter (ISO format)
- `end` (string, optional): End date filter (ISO format)

**Response:**
```json
{
  "stats": {
    "total": 150,
    "completed": 120,
    "failed": 5,
    "inProgress": 20,
    "awaitingReview": 8,
    "submittedToday": 12,
    "avgCompletionHours": 2.5,
    "lastUpdated": "2025-09-28T03:15:00Z"
  },
  "stale": [
    {
      "submissionId": "uuid",
      "projectId": "uuid", 
      "status": "PROCESSING",
      "latestStage": "document_generation",
      "latestStageStatus": "in_progress",
      "lastEventAt": "2025-09-28T01:00:00Z",
      "minutesInactive": 135
    }
  ]
}
```

#### GET `/api/admin/submissions/recent`
Recent submissions with pagination.

**Authentication:** Admin required  
**Query Parameters:**
- `limit` (number, 1-100): Number of results (default: 20)
- `offset` (number): Pagination offset (default: 0)  
- `project_id` (string, optional): Filter by project
- `status` (string, optional): Filter by status

**Response:**
```json
{
  "submissions": [
    {
      "submission_id": "uuid",
      "project_id": "uuid",
      "status": "SUBMITTED",
      "submission_pathway": "review",
      "created_at": "2025-09-28T02:00:00Z",
      "updated_at": "2025-09-28T02:30:00Z",
      "latest_stage": "council_email",
      "latest_stage_status": "completed",
      "last_event_at": "2025-09-28T02:30:00Z",
      "action_network_sync_status": "completed",
      "failed_events": 0
    }
  ]
}
```

#### GET `/api/admin/submissions/failed`
Failed submissions requiring attention.

**Authentication:** Admin required  
**Query Parameters:**
- `limit` (number, 1-100): Number of results (default: 20)
- `offset` (number): Pagination offset (default: 0)
- `project_id` (string, optional): Filter by project

**Response:** Similar to recent submissions but filtered for failures.

#### GET `/api/admin/submissions/by-status`
Submissions filtered by status.

**Authentication:** Admin required  
**Query Parameters:**
- `status` (string, required): Status to filter by
- `pathway` (string, optional): Filter by submission pathway
- `project_id` (string, optional): Filter by project
- `limit` (number, 1-100): Number of results (default: 50)
- `offset` (number): Pagination offset (default: 0)

#### GET `/api/submissions/:id/status`
Public status check for users.

**Authentication:** None (rate limited)  
**Rate Limit:** 20 requests per minute per IP

**Response:**
```json
{
  "submission_id": "uuid",
  "project_slug": "gold-coast-da", 
  "status": "SUBMITTED",
  "submission_pathway": "review",
  "latest_stage": "council_email",
  "latest_stage_status": "completed",
  "last_event_at": "2025-09-28T02:30:00Z",
  "submitted_to_council_at": "2025-09-28T02:30:00Z",
  "created_at": "2025-09-28T01:00:00Z",
  "updated_at": "2025-09-28T02:30:00Z",
  "action_required": false,
  "timeline": [
    {
      "stage": "submission_created",
      "status": "completed", 
      "metadata": null,
      "occurredAt": "2025-09-28T01:00:00Z"
    },
    {
      "stage": "document_generation",
      "status": "completed",
      "metadata": { "document_count": 2 },
      "occurredAt": "2025-09-28T01:15:00Z" 
    }
  ]
}
```

### System Health

#### GET `/api/health/system`
Overall system health check.

**Authentication:** None

**Response:**
```json
{
  "ok": true,
  "components": [
    {
      "component": "database",
      "status": "healthy",
      "detail": { "connection_time_ms": 25 },
      "environment": "production",
      "latency_ms": 25,
      "checked_at": "2025-09-28T03:15:00Z"
    }
  ]
}
```

#### GET `/api/health/integrations`
Integration health status.

**Authentication:** None

**Response:**
```json
{
  "ok": true,
  "integrations": [
    {
      "integration": "action_network",
      "status": "healthy", 
      "detail": { "api_version": "v2" },
      "latency_ms": 150,
      "checked_at": "2025-09-28T03:15:00Z"
    }
  ]
}
```

#### GET `/api/health/ai-providers`
AI provider availability.

**Authentication:** None

**Response:**
```json
{
  "ok": true,
  "providers": [
    {
      "provider": "openai",
      "status": "healthy",
      "detail": { "model": "gpt-4" },
      "latency_ms": 500,
      "tokens_per_minute": 120,
      "checked_at": "2025-09-28T03:15:00Z"
    }
  ]
}
```

#### GET `/api/admin/health/detailed`
Detailed health history for admin dashboard.

**Authentication:** Admin required  
**Query Parameters:**
- `since` (date, optional): Show checks since this date
- `limit` (number, 1-500): Max results (default: 100)

**Response:**
```json
{
  "system": [...],
  "integrations": [...], 
  "aiProviders": [...]
}
```

## Database Schema

The monitoring system uses these additional tables:

- `submission_progress_events` - Track detailed submission progress
- `submission_retry_tasks` - Manage failed operation retries  
- `system_health_checks` - System component health history
- `integration_health_checks` - Integration health history
- `ai_provider_health` - AI provider health history

## Materialized Views

For performance, the system includes materialized views:

- `mv_submission_overview` - Aggregated submission status 
- `mv_submission_daily_stats` - Daily submission statistics

Views are refreshed automatically by the system.

## Services

### AnalyticsService

Provides cached analytics data:

- `getSubmissionStats(projectId?, dateRange?)` - Submission statistics
- `getPathwayBreakdown(projectId?)` - Usage by pathway
- `getErrorAnalysis()` - Error patterns
- `getIntegrationMetrics()` - Integration success rates

### StatusTrackerService  

Manages submission progress tracking:

- `trackSubmissionProgress(id, stage, status)` - Record progress
- `getSubmissionTimeline(id)` - Get submission timeline
- `checkStaleSubmissions(minutes)` - Find stuck submissions
- `retryFailedOperations(id)` - Retry failed operations

## Usage Examples

### Track Submission Progress
```typescript
import StatusTrackerService from '../services/statusTracker';

await StatusTrackerService.trackSubmissionProgress(
  submissionId,
  'document_generation', 
  'completed',
  { document_count: 2 }
);
```

### Get Analytics
```typescript  
import AnalyticsService from '../services/analytics';

const stats = await AnalyticsService.getSubmissionStats(
  projectId,
  { start: '2025-09-01', end: '2025-09-30' }
);
```

## Performance Notes

- Analytics are cached for 2 minutes to reduce database load
- Status checks are cached for 30 seconds
- Materialized views optimize complex queries
- Public endpoints are rate limited

## Next Steps

This monitoring system provides the data foundation for:
- Admin dashboard real-time monitoring
- User status pages  
- Automated alerting systems
- Performance optimization
