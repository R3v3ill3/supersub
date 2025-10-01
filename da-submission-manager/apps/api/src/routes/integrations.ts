import { Router } from 'express';
import { z } from 'zod';
import { config, getActionNetworkClientForProject, getGlobalActionNetworkClient, ProjectWithApiKey } from '../lib/config';
import { ActionNetworkClient } from '../services/actionNetwork';
import { getSupabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimit';

const router = Router();

async function getClient(projectId?: string): Promise<ActionNetworkClient> {
  if (projectId) {
    // Get project-specific API key
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }
    
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, name, slug, action_network_config, action_network_api_key_encrypted')
      .eq('id', projectId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch project: ${error.message}`);
    }
    
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    
    return getActionNetworkClientForProject(project as ProjectWithApiKey);
  } else {
    // Use global API key for backward compatibility
    return getGlobalActionNetworkClient();
  }
}

router.get('/api/integrations/action-network/forms', requireAuth, adminLimiter, async (req, res) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const client = await getClient(projectId);
    const forms = await client.listForms();
    res.json({ forms });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/integrations/action-network/lists', requireAuth, adminLimiter, async (req, res) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const client = await getClient(projectId);
    const lists = await client.listLists();
    res.json({ lists });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/integrations/action-network/tags', requireAuth, adminLimiter, async (req, res) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const client = await getClient(projectId);
    const tags = await client.listTags();
    res.json({ tags });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/api/integrations/action-network/tags', requireAuth, adminLimiter, async (req, res) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const client = await getClient(projectId);
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }).parse(req.body);

    const tag = await client.createTag(body.name, body.description);
    res.status(201).json({ tag });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/integrations/action-network/groups', requireAuth, adminLimiter, async (req, res) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const client = await getClient(projectId);
    const groups = await client.listGroups().catch(() => []); // Groups may not be available for all accounts
    res.json({ groups });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/api/integrations/action-network/test', requireAuth, adminLimiter, async (req, res) => {
  try {
    console.log('[action-network/test] Received request');
    console.log('[action-network/test] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[action-network/test] Content-Type:', req.headers['content-type']);

    const body = z.object({
      apiKey: z.string().min(1, 'API key is required'),
    }).parse(req.body);

    console.log('[action-network/test] Validation passed, API key length:', body.apiKey?.length);
    console.log('[action-network/test] Creating client with API key');

    // Create a temporary client with the provided API key
    const client = new ActionNetworkClient({ apiKey: body.apiKey });

    console.log('[action-network/test] Client created, fetching resources from Action Network');

    // Test the connection by fetching resources (groups are optional as not all accounts have access)
    const [forms, lists, tags, groupsResult] = await Promise.all([
      client.listForms(),
      client.listLists(),
      client.listTags(),
      client.listGroups().catch(() => []), // Groups may not be available, return empty array
    ]);
    const groups = groupsResult || [];

    console.log('[action-network/test] Successfully fetched resources:', {
      formsCount: forms.length,
      listsCount: lists.length,
      tagsCount: tags.length,
      groupsCount: groups.length
    });

    res.json({
      success: true,
      forms,
      lists,
      tags,
      groups,
    });
  } catch (error: any) {
    console.error('[action-network/test] ❌ ERROR');
    console.error('[action-network/test] Type:', error.constructor.name);
    console.error('[action-network/test] Message:', error.message);
    console.error('[action-network/test] Status:', error.response?.status);
    console.error('[action-network/test] Response type:', typeof error.response?.data);
    if (typeof error.response?.data === 'string') {
      console.error('[action-network/test] Response is HTML (404 page), length:', error.response.data.length);
    } else {
      console.error('[action-network/test] Response data:', error.response?.data);
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }
    res.status(400).json({
      success: false,
      error: error.message || 'Connection test failed',
      details: error.response?.data || undefined
    });
  }
});

export default router;

