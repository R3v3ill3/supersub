import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ActionNetworkConfig, ActionNetworkClient } from '../services/actionNetwork';
import { decryptApiKey } from './encryption';

// Load .env from current working directory (Railway will set env vars directly)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Try to load .env file if it exists, but don't fail if it doesn't (Railway provides env vars)
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
} catch (e) {
  // Ignore - Railway provides env vars directly
}

export interface DualTrackConfig {
  followup_label?: string;
  comprehensive_label?: string;
  track_description?: string;
  default_track?: 'followup' | 'comprehensive';
  survey_versions?: {
    followup?: string;
    comprehensive?: string;
  };
  template_keys?: {
    followup?: string;
    comprehensive?: string;
  };
}

export interface ProjectActionNetworkConfig {
  action_url?: string;
  form_url?: string;
  group_hrefs?: string[];
  list_hrefs?: string[];
  tag_hrefs?: string[];
  custom_fields?: Record<string, string>;
}

export interface ProjectWithApiKey {
  id: string;
  name: string;
  slug: string;
  action_network_config: ProjectActionNetworkConfig;
  action_network_api_key_encrypted?: string;
  is_dual_track?: boolean;
  dual_track_config?: DualTrackConfig | null;
}

export interface AppConfig {
  actionNetwork?: ActionNetworkConfig;
}

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const optionalEnv: ActionNetworkConfig | undefined = process.env.ACTION_NETWORK_API_KEY
  ? {
      apiKey: process.env.ACTION_NETWORK_API_KEY,
      baseUrl: process.env.ACTION_NETWORK_BASE_URL,
    }
  : undefined;

export const config: AppConfig = {
  actionNetwork: optionalEnv,
};

/**
 * Creates an Action Network client using a project's encrypted API key
 * Falls back to global environment variable if project doesn't have a key
 */
export function getActionNetworkClientForProject(project: ProjectWithApiKey): ActionNetworkClient {
  let apiKey: string;
  
  if (project.action_network_api_key_encrypted) {
    // Use project-specific encrypted API key
    try {
      apiKey = decryptApiKey(project.action_network_api_key_encrypted);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to decrypt Action Network API key for project ${project.slug}: ${message}`);
    }
  } else if (config.actionNetwork?.apiKey) {
    // Fall back to global environment variable
    apiKey = config.actionNetwork.apiKey;
  } else {
    throw new Error(`No Action Network API key configured for project ${project.slug} or in environment variables`);
  }

  return new ActionNetworkClient({
    apiKey,
    baseUrl: config.actionNetwork?.baseUrl,
  });
}

/**
 * Creates an Action Network client using the global environment API key
 * This is for backward compatibility and admin operations
 */
export function getGlobalActionNetworkClient(): ActionNetworkClient {
  if (!config.actionNetwork) {
    throw new Error('Action Network API key not configured in environment variables');
  }
  return new ActionNetworkClient(config.actionNetwork);
}

