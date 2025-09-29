import NodeCache from 'node-cache';
import { getSupabase } from '../lib/supabase';
import { logger } from '../lib/logger';

type DateRange = {
  start?: string;
  end?: string;
};

type CacheKeyParts = {
  key: string;
  projectId?: string | null;
  start?: string | null;
  end?: string | null;
};

function buildCacheKey(parts: CacheKeyParts): string {
  return [
    parts.key,
    parts.projectId ?? 'all',
    parts.start ?? 'none',
    parts.end ?? 'none'
  ].join(':');
}

const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

export class AnalyticsService {
  private static ensureSupabase() {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }
    return supabase;
  }

  static async getSubmissionStats(projectId?: string, dateRange?: DateRange) {
    const key = buildCacheKey({
      key: 'submission-stats',
      projectId,
      start: dateRange?.start ?? null,
      end: dateRange?.end ?? null
    });

    const cached = cache.get(key);
    if (cached) return cached;

    const supabase = this.ensureSupabase();
    const { data, error } = await supabase.rpc('get_submission_stats', {
      p_project_id: projectId ?? null,
      p_start_date: dateRange?.start ?? null,
      p_end_date: dateRange?.end ?? null
    });

    if (error) {
      logger.error('Failed to load submission stats', { error: error.message });
      throw new Error(`Failed to load submission stats: ${error.message}`);
    }

    const result = data ?? [];
    cache.set(key, result);
    return result;
  }

  static async getPathwayBreakdown(projectId?: string) {
    const key = buildCacheKey({
      key: 'pathway-breakdown',
      projectId
    });

    const cached = cache.get(key);
    if (cached) return cached;

    const supabase = this.ensureSupabase();
    const { data, error } = await supabase.rpc('get_pathway_breakdown', {
      p_project_id: projectId ?? null
    });

    if (error) {
      logger.error('Failed to load pathway breakdown', { error: error.message });
      throw new Error(`Failed to load pathway breakdown: ${error.message}`);
    }

    const result = data ?? [];
    cache.set(key, result);
    return result;
  }

  static async getTrackBreakdown(projectId?: string) {
    const key = buildCacheKey({
      key: 'track-breakdown',
      projectId,
    });

    const cached = cache.get(key);
    if (cached) return cached;

    const supabase = this.ensureSupabase();
    const { data, error } = await supabase.rpc('get_submission_track_breakdown', {
      p_project_id: projectId ?? null,
    });

    if (error) {
      logger.error('Failed to load track breakdown', { error: error.message });
      throw new Error(`Failed to load track breakdown: ${error.message}`);
    }

    const result = data ?? [];
    cache.set(key, result);
    return result;
  }

  static async getErrorAnalysis() {
    const key = 'error-analysis';
    const cached = cache.get(key);
    if (cached) return cached;

    const supabase = this.ensureSupabase();
    const { data, error } = await supabase.rpc('get_error_analysis');

    if (error) {
      logger.error('Failed to load error analysis', { error: error.message });
      throw new Error(`Failed to load error analysis: ${error.message}`);
    }

    const result = data ?? [];
    cache.set(key, result);
    return result;
  }

  static async getIntegrationMetrics() {
    const key = 'integration-metrics';
    const cached = cache.get(key);
    if (cached) return cached;

    const supabase = this.ensureSupabase();
    const { data, error } = await supabase.rpc('get_integration_metrics');

    if (error) {
      logger.error('Failed to load integration metrics', { error: error.message });
      throw new Error(`Failed to load integration metrics: ${error.message}`);
    }

    const result = data ?? [];
    cache.set(key, result);
    return result;
  }

  static invalidateCache(prefix?: string) {
    if (!prefix) {
      cache.flushAll();
      return;
    }
    const keys = cache.keys().filter((k) => k.startsWith(prefix));
    cache.del(keys);
  }
}

export default AnalyticsService;

