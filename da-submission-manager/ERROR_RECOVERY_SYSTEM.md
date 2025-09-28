# Error Recovery and System Resilience

This document describes the comprehensive error recovery and system resilience features implemented in the DA Submission Manager.

## Overview

The system now includes:
- **Centralized Error Handling**: Standardized error processing and logging
- **Retry Service**: Automatic retry with exponential backoff and circuit breaker protection
- **Health Monitoring**: Real-time system health checks and monitoring
- **Admin Recovery Interface**: Manual intervention and recovery operations
- **Database Tracking**: Complete audit trail of errors and recovery operations

## Components

### 1. Centralized Error Handler (`services/errorHandler.ts`)

The error handler provides:
- **Standardized Error Format**: All errors follow a consistent structure
- **Error Classification**: User, system, integration, or temporary errors
- **Recovery Action Suggestions**: Automated and manual recovery recommendations
- **Database Logging**: All errors are persisted for analysis
- **Admin Notifications**: Critical errors trigger admin alerts
- **Express Middleware**: Automatic error handling for all routes

#### Error Types
- `USER`: Validation, authorization, not found errors
- `SYSTEM`: Database, file system, configuration errors  
- `INTEGRATION`: External API failures (Google, OpenAI, Action Network)
- `TEMPORARY`: Rate limits, timeouts, service unavailable

#### Error Codes
- Authentication: `UNAUTHORIZED`, `FORBIDDEN`
- Validation: `VALIDATION_FAILED`, `NOT_FOUND`, `CONFLICT`
- External Services: `GOOGLE_API_ERROR`, `OPENAI_API_ERROR`, `ACTION_NETWORK_ERROR`
- System: `DATABASE_ERROR`, `CONFIGURATION_ERROR`
- Temporary: `RATE_LIMIT_EXCEEDED`, `TIMEOUT`, `SERVICE_UNAVAILABLE`

### 2. Retry Service (`services/retryService.ts`)

Features:
- **Exponential Backoff**: Intelligent retry delays
- **Circuit Breaker Pattern**: Prevents cascading failures
- **Retry Policies**: Configurable per operation type
- **Manual Retry**: Admin can trigger manual retries
- **Retry Statistics**: Comprehensive retry metrics

#### Circuit Breaker States
- `CLOSED`: Normal operation
- `OPEN`: Service blocked due to failures
- `HALF_OPEN`: Testing if service has recovered

### 3. Health Check Service (`services/healthCheck.ts`)

Monitors:
- **Database Connectivity**: Response time and availability
- **External Services**: Google Docs, OpenAI, Gemini, Action Network
- **System Resources**: Memory usage, file system access
- **Queue Health**: Processing backlogs and pending operations

#### Health Statuses
- `HEALTHY`: All systems operational
- `DEGRADED`: Some issues but functional
- `UNHEALTHY`: Critical problems requiring attention
- `UNKNOWN`: Unable to determine status

### 4. Database Schema (`migrations/0017_error_recovery.sql`)

New tables:
- **`error_logs`**: Comprehensive error tracking
- **`recovery_operations`**: Automatic and manual retry operations
- **`circuit_breaker_states`**: Circuit breaker status per service
- **`health_check_results`**: Historical health data
- **`system_metrics`**: Performance and operational metrics

### 5. Enhanced Services

All external service integrations now include:
- **Retry Logic**: Automatic retry with appropriate backoff
- **Error Context**: Rich error information for troubleshooting
- **Circuit Breaker Protection**: Prevents overloading failed services
- **Graceful Degradation**: Fallback behaviors where possible

#### Enhanced Services:
- **Google Docs Service**: Document operations with retry
- **LLM Service**: OpenAI/Gemini with fallback and retry
- **Action Network Service**: Already had retry, enhanced with circuit breaker
- **Document Workflow**: Multi-step process recovery

### 6. Admin Interface (`admin/src/pages/SystemHealth.tsx`)

Admin can:
- **View System Health**: Real-time component status
- **Monitor Metrics**: Error rates, queue depths, response times
- **Review Retry Statistics**: Success/failure rates by operation
- **Manual Recovery**: Trigger retry operations manually
- **Historical Data**: Track health trends over time

## API Endpoints

### Health Endpoints
- `GET /api/health/system` - Overall system health
- `GET /api/health/integrations` - External service health
- `GET /api/health/ai-providers` - AI service health

### Admin Endpoints (require admin authentication)
- `GET /api/admin/health/detailed` - Detailed health with history
- `POST /api/admin/retry/:operationId` - Manual retry operation
- `GET /api/admin/retry/statistics` - Retry statistics

## Configuration

### Environment Variables
- Error tracking can be configured via existing environment variables
- Retry policies can be adjusted per service
- Circuit breaker thresholds are configurable
- Health check intervals can be modified

### Default Retry Policies
- **OpenAI/Gemini**: 2 retries, 1-8 second backoff
- **Google Docs**: 3 retries, 1-15 second backoff  
- **Action Network**: 3 retries, 0.5-2 second backoff
- **Email**: 2 retries, custom backoff

### Circuit Breaker Defaults
- **Failure Threshold**: 5 failures to open circuit
- **Success Threshold**: 2 successes to close circuit
- **Timeout**: 60 seconds before half-open attempt
- **Monitoring Period**: 5 minutes for failure counting

## Usage Examples

### Automatic Error Handling
```typescript
// Errors are automatically caught by the middleware
router.post('/api/example', async (req, res) => {
  // Any error thrown here will be processed by errorHandler
  const result = await someOperationThatMightFail();
  res.json(result);
});
```

### Manual Error Handling
```typescript
import { errorHandler, ErrorType, ErrorCode } from '../services/errorHandler';

try {
  await riskyOperation();
} catch (error) {
  const standardError = await errorHandler.handleError(
    ErrorType.INTEGRATION,
    ErrorCode.GOOGLE_API_ERROR,
    'Google Docs API failed',
    { 
      submissionId: 'sub_123',
      operation: 'document_generation' 
    },
    error
  );
  throw standardError;
}
```

### Using Retry Service
```typescript
import { retryService } from '../services/retryService';

const result = await retryService.executeWithRetry(
  () => externalAPICall(),
  {
    operationName: 'external_api',
    retryConfig: { maxRetries: 3 },
    errorContext: { submissionId: 'sub_123' }
  }
);
```

## Monitoring and Alerting

### Built-in Monitoring
- Health checks run every 30 seconds in admin interface
- Error logs are automatically created for all failures
- Retry operations are tracked with full context
- Circuit breaker states are monitored

### Admin Notifications
Admins are notified for:
- System-level errors
- Critical component failures
- Database connection issues
- Configuration problems

### Cleanup
- Error logs: Kept 90 days (resolved errors 30 days)
- Recovery operations: Completed operations kept 30 days
- Health checks: Kept 7 days
- System metrics: Kept 30 days

## Benefits

1. **Improved Reliability**: Automatic retry of failed operations
2. **Better User Experience**: Consistent error messages and graceful degradation
3. **Reduced Manual Intervention**: Automatic recovery where possible
4. **Enhanced Monitoring**: Real-time visibility into system health
5. **Faster Problem Resolution**: Rich error context and admin tools
6. **Audit Trail**: Complete history of errors and recovery attempts

## Implementation Notes

- All new services use the centralized error handling
- Existing routes are automatically protected by error middleware
- Circuit breakers prevent cascading failures
- Manual retry capability for admin intervention
- Health checks provide proactive problem detection

The system maintains backward compatibility while adding comprehensive error resilience and recovery capabilities.
