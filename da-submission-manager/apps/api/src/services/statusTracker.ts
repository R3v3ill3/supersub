import NodeCache from 'node-cache';
import { getSupabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const STATUS_CACHE_TTL = 30; // seconds
const CACHE = new NodeCache({ stdTTL: STATUS_CACHE_TTL, checkperiod: STATUS_CACHE_TTL * 2 });

type ProgressStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'pending_retry';

export type SubmissionStage =
  | 'submission_created'
  | 'document_generation'
  | 'review_preparation'
  | 'user_review'
  | 'council_email'
  | 'action_network_sync'
  | 'ai_generation'
  | 'integration_callback'
  | 'retry';

export type SubmissionProgressRecord = {
  id: string;
  submission_id: string;
  stage: SubmissionStage;
  status: ProgressStatus;
  metadata: Record<string, any> | null;
  actor: string | null;
  created_at: string;
  updated_at: string;
};

export type SubmissionTimeline = {
  submissionId: string;
  timeline: SubmissionProgressRecord[];
};

export type StaleSubmission = {
  submissionId: string;
  projectId: string;
  status: string;
  latestStage: SubmissionStage | null;
  latestStageStatus: ProgressStatus | null;
  lastEventAt: string | null;
  minutesInactive: number;
};

export class StatusTrackerService {
  private static ensureSupabase() {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }
    return supabase;
  }

  private static buildCacheKey(submissionId: string, suffix: string) {
    return `status:${submissionId}:${suffix}`;
  }

  static async trackSubmissionProgress(
    submissionId: string,
    stage: SubmissionStage,
    status: ProgressStatus,
    metadata: Record<string, any> | null = null,
    actor?: string
  ): Promise<SubmissionProgressRecord> {
    const supabase = this.ensureSupabase();

    const { data, error } = await supabase
      .from('submission_progress_events')
      .insert({
        submission_id: submissionId,
        stage,
        status,
        metadata,
        actor: actor ?? null,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to record submission progress', { submissionId, stage, status, error: error.message });
      throw new Error(`Failed to record submission progress: ${error.message}`);
    }

    // Invalidate cached timeline + overview
    CACHE.del([this.buildCacheKey(submissionId, 'timeline'), this.buildCacheKey(submissionId, 'overview')]);

    return data as SubmissionProgressRecord;
  }

  static async getSubmissionTimeline(submissionId: string): Promise<SubmissionTimeline> {
    const cacheKey = this.buildCacheKey(submissionId, 'timeline');
    const cached = CACHE.get<SubmissionTimeline>(cacheKey);
    if (cached) {
      return cached;
    }

    const supabase = this.ensureSupabase();
    const { data, error } = await supabase
      .from('submission_progress_events')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load submission timeline: ${error.message}`);
    }

    const timeline: SubmissionTimeline = {
      submissionId,
      timeline: (data as SubmissionProgressRecord[]) ?? []
    };

    CACHE.set(cacheKey, timeline);
    return timeline;
  }

  static async checkStaleSubmissions(inactivityMinutes = 30): Promise<StaleSubmission[]> {
    const cacheKey = `status:stale:${inactivityMinutes}`;
    const cached = CACHE.get<StaleSubmission[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const supabase = this.ensureSupabase();
    const { data, error } = await supabase.rpc('get_stale_submissions', {
      p_inactivity_minutes: inactivityMinutes
    });

    if (error) {
      throw new Error(`Failed to fetch stale submissions: ${error.message}`);
    }

    const mapped = ((data ?? []) as any[]).map((row) => ({
      submissionId: row.submission_id,
      projectId: row.project_id,
      status: row.status,
      latestStage: row.latest_stage,
      latestStageStatus: row.latest_stage_status,
      lastEventAt: row.last_event_at,
      minutesInactive: Number(row.minutes_inactive ?? 0)
    }));

    CACHE.set(cacheKey, mapped, STATUS_CACHE_TTL * 2);
    return mapped;
  }

  static async retryFailedOperations(submissionId: string): Promise<void> {
    const supabase = this.ensureSupabase();
    const { error } = await supabase.rpc('schedule_failed_submission_retries', {
      p_submission_id: submissionId
    });

    if (error) {
      throw new Error(`Failed to schedule retries: ${error.message}`);
    }

    CACHE.del([this.buildCacheKey(submissionId, 'timeline'), this.buildCacheKey(submissionId, 'overview')]);
  }
}

export default StatusTrackerService;
