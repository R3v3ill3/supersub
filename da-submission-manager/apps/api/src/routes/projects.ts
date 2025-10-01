import { Router } from 'express';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';
import { config } from '../lib/config';
import { encryptApiKey } from '../lib/encryption';
import { ActionNetworkClient } from '../services/actionNetwork';
import { TemplateCombinerService, DualTrackConfig } from '../services/templateCombiner';
import { requireAuth } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimit';

const router = Router();

const actionNetworkConfigSchema = z.object({
  action_url: z.string().url('Action URL must be valid').or(z.literal('')).optional(),
  form_url: z.string().url('Form URL must be valid').or(z.literal('')).optional(),
  group_hrefs: z.array(z.string().url()).optional(),
  list_hrefs: z.array(z.string().url()).optional(),
  tag_hrefs: z.array(z.string().url()).optional(),
  custom_fields: z.record(z.string()).optional(),
}).optional();

const dualTrackSettingsSchema = z.object({
  original_grounds_template_id: z.string().optional(), // Optional for draft projects
  followup_grounds_template_id: z.string().optional(), // Optional for draft projects
  track_selection_prompt: z.string().optional(),
  track_descriptions: z.object({
    followup: z.string().optional(),
    comprehensive: z.string().optional()
  }).optional()
}).optional();

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  slug: z.string().min(1, 'Project slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  council_email: z.string().email('Valid council email is required'),
  council_name: z.string().min(1, 'Council name is required'),
  council_attention_of: z.string().min(1).optional().nullable(),
  google_doc_template_id: z.string().optional(), // legacy
  cover_template_id: z.string().optional(),
  grounds_template_id: z.string().optional(),
  council_subject_template: z.string().optional(),
  council_email_body_template: z.string().optional(),
  from_email: z.string().email().or(z.literal('')).optional(),
  from_name: z.string().optional(),
  test_submission_email: z.string().email().or(z.literal('')).optional().nullable(),
  default_application_number: z.string().optional(), // Optional for draft projects, required when active
  subject_template: z.string().default('Development Application Submission - {{site_address}}'),
  default_pathway: z.enum(['direct', 'review', 'draft']).default('review'),
  enable_ai_generation: z.boolean().default(true),
  is_active: z.boolean().default(true),
  action_network_api_key: z.string().optional(),
  action_network_config: actionNetworkConfigSchema.optional(),
  is_dual_track: z.boolean().default(false),
  dual_track_config: dualTrackSettingsSchema.optional()
});

const updateProjectSchema = projectSchema.partial();

const dualTrackUpdateSchema = z.object({
  is_dual_track: z.boolean(),
  dual_track_config: dualTrackSettingsSchema.optional().nullable()
});

const dualTrackValidationSchema = z.object({
  dual_track_config: dualTrackSettingsSchema
});

/**
 * Get all projects (admin only)
 */
router.get('/api/projects', requireAuth, adminLimiter, async (req, res) => {
  try {
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const includeInactive = req.query.include_inactive === 'true';
    
    let query = supabase
      .from('projects')
      .select('*')
      .order('name');

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: projects, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    // Get submission counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const { count: totalSubmissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);

        const { count: activeSubmissions } = await supabase
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .neq('status', 'SUBMITTED');

        return {
          ...project,
          submission_counts: {
            total: totalSubmissions || 0,
            active: activeSubmissions || 0
          }
        };
      })
    );

    res.json({ projects: projectsWithCounts });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get a single project by ID or slug
 */
router.get('/api/projects/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Try to find by ID first, then by slug
    let query = supabase
      .from('projects')
      .select('*');

    if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      query = query.eq('id', identifier);
    } else {
      query = query.eq('slug', identifier);
    }

    const { data: project, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    // Get submission statistics
    const { count: totalSubmissions } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project.id);

    const { data: statusCounts } = await supabase
      .from('submissions')
      .select('status')
      .eq('project_id', project.id);

    const statusBreakdown = statusCounts?.reduce((acc, { status }) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const projectWithStats = {
      ...project,
      submission_counts: {
        total: totalSubmissions || 0,
        by_status: statusBreakdown
      }
    };

    res.json({ project: projectWithStats });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create a new project (admin only)
 */
router.post('/api/projects', requireAuth, adminLimiter, async (req, res) => {
  try {
    // Validate and parse project data
    let projectData;
    try {
      projectData = projectSchema.parse({
        ...req.body,
        council_attention_of: typeof req.body.council_attention_of === 'string'
          ? req.body.council_attention_of.trim() || null
          : req.body.council_attention_of,
      });
    } catch (validationError: any) {
      console.error('Project validation error:', validationError);
      if (validationError.errors) {
        const errorMessages = validationError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({
          error: `Validation failed: ${errorMessages}`,
          details: validationError.errors
        });
      }
      return res.status(400).json({ error: 'Invalid project data' });
    }

    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check if slug is unique
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', projectData.slug)
      .single();

    if (existingProject) {
      return res.status(400).json({ error: 'A project with this slug already exists' });
    }

    // Validate required fields for active projects
    if (projectData.is_active && !projectData.default_application_number) {
      return res.status(400).json({
        error: 'default_application_number is required for active projects',
        hint: 'Inactive (draft) projects can be created without an application number'
      });
    }

    // Prepare the project data for insertion
    const insertData: any = { ...projectData };

    if (insertData.dual_track_config && !insertData.is_dual_track) {
      insertData.is_dual_track = true;
    }
    
    // Encrypt the API key if provided
    if (projectData.action_network_api_key) {
      try {
        insertData.action_network_api_key_encrypted = encryptApiKey(projectData.action_network_api_key);
        insertData.api_key_updated_at = new Date().toISOString();
        // Remove the plain text key from the data
        delete insertData.action_network_api_key;
      } catch (encryptError: any) {
        return res.status(400).json({ error: `Failed to encrypt API key: ${encryptError.message}` });
      }
    } else {
      // Remove the field entirely if not provided
      delete insertData.action_network_api_key;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    // Remove encrypted key from response
    if (project.action_network_api_key_encrypted) {
      delete project.action_network_api_key_encrypted;
      project.has_action_network_api_key = true;
    }

    res.status(201).json({ project });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update a project (admin only)
 */
router.patch('/api/projects/:projectId', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { projectId } = req.params;
    const payload = {
      ...req.body,
      council_attention_of: typeof req.body.council_attention_of === 'string'
        ? req.body.council_attention_of.trim() || null
        : req.body.council_attention_of,
    };

    const updates = updateProjectSchema.parse(payload);
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // If updating slug, check uniqueness
    if (updates.slug) {
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('slug', updates.slug)
        .neq('id', projectId)
        .single();

      if (existingProject) {
        return res.status(400).json({ error: 'A project with this slug already exists' });
      }
    }

    // If activating a project, ensure it has required fields
    if (updates.is_active === true) {
      // Get current project to check for default_application_number
      const { data: currentProject } = await supabase
        .from('projects')
        .select('default_application_number')
        .eq('id', projectId)
        .single();

      const finalApplicationNumber = updates.default_application_number || currentProject?.default_application_number;

      if (!finalApplicationNumber) {
        return res.status(400).json({
          error: 'Cannot activate project without default_application_number',
          hint: 'Please provide a default application number before activating the project'
        });
      }
    }

    // If changing default_application_number and there are submissions, block it
    if (updates.default_application_number) {
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
      if ((count || 0) > 0) {
        return res.status(400).json({ error: 'Cannot change application number after submissions exist' });
      }
    }

    // Handle Action Network API key encryption
    const updateData: any = { ...updates };
    if (updateData.action_network_api_key) {
      try {
        updateData.action_network_api_key_encrypted = encryptApiKey(updateData.action_network_api_key);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to encrypt Action Network API key' });
      }
      delete updateData.action_network_api_key;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw new Error(`Failed to update project: ${error.message}`);
    }

    // Remove encrypted key from response and add has_action_network_api_key flag
    if (project.action_network_api_key_encrypted) {
      delete project.action_network_api_key_encrypted;
      project.has_action_network_api_key = true;
    }

    res.json({ project });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    res.status(400).json({ error: error.message });
  }
});

router.put('/api/projects/:projectId/dual-track', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { is_dual_track, dual_track_config } = dualTrackUpdateSchema.parse(req.body);

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const updates: Record<string, unknown> = {
      is_dual_track,
      dual_track_config: dual_track_config ?? null,
      updated_at: new Date().toISOString()
    };

    if (!is_dual_track) {
      updates.dual_track_config = null;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw new Error(`Failed to update dual-track configuration: ${error.message}`);
    }

    res.json({ project });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    res.status(400).json({ error: error.message });
  }
});

router.post('/api/projects/:projectId/dual-track/validate', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { dual_track_config } = dualTrackValidationSchema.parse(req.body);

    const combiner = new TemplateCombinerService();
    const validation = await combiner.validateDualTrackConfig(projectId, dual_track_config as DualTrackConfig);

    res.json(validation);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/projects/:projectId/template-preview/:track', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { projectId, track } = req.params;
    if (!['followup', 'comprehensive'].includes(track)) {
      return res.status(400).json({ error: 'Invalid track specified' });
    }

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, is_dual_track, dual_track_config')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      if (error?.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw new Error(`Failed to load project: ${error?.message ?? 'unknown error'}`);
    }

    if (!project.is_dual_track) {
      return res.status(400).json({ error: 'Project is not configured for dual-track submissions' });
    }

    const dualTrackConfig = project.dual_track_config as DualTrackConfig | null;
    if (!dualTrackConfig) {
      return res.status(400).json({ error: 'Dual-track configuration is missing' });
    }

    const combiner = new TemplateCombinerService();
    const preview = await combiner.getTrackSpecificTemplate(projectId, track as 'followup' | 'comprehensive', dualTrackConfig);

    res.json({
      track,
      preview,
      metadata: {
        prompt: dualTrackConfig.track_selection_prompt,
        descriptions: dualTrackConfig.track_descriptions
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/api/projects/:projectId/action-network', requireAuth, adminLimiter, async (req, res) => {
  const { projectId } = req.params;
  try {
    const body = actionNetworkConfigSchema.parse(req.body);
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update({
        action_network_config: body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select('id, action_network_config')
      .single();

    if (error) {
      throw new Error(`Failed to update Action Network config: ${error.message}`);
    }

    res.json({ ok: true, config: project?.action_network_config });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(400).json({ error: error.message });
  }
});

router.post('/api/projects/:projectId/action-network/test', requireAuth, adminLimiter, async (req, res) => {
  const { projectId } = req.params;
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('name, action_network_config')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!config.actionNetwork) {
      return res.status(400).json({ error: 'Action Network API key not configured' });
    }

    const actionNetworkConfig = project.action_network_config;
    if (!actionNetworkConfig?.action_url) {
      return res.status(400).json({ error: 'Project missing Action Network action URL' });
    }

    const client = new ActionNetworkClient(config.actionNetwork);
    const testEmail = `test+${Date.now()}@example.com`;

    const person = await client.upsertPerson({
      given_name: 'Test',
      family_name: 'Sync',
      email_addresses: [{ address: testEmail }],
      custom_fields: {
        project_id: projectId,
        project_name: project.name,
        test_sync: true,
      },
    });

    const personLink = person && typeof person === 'object' && '_links' in person 
      ? (person as any)._links?.self?.href 
      : null;
    res.json({ ok: true, testPerson: personLink });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Delete (deactivate) a project (admin only)
 */
router.delete('/api/projects/:projectId', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check if project has active submissions
    const { count: activeSubmissions } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .neq('status', 'SUBMITTED');

    if (activeSubmissions && activeSubmissions > 0) {
      return res.status(400).json({ 
        error: `Cannot delete project with ${activeSubmissions} active submissions. Complete or cancel them first.` 
      });
    }

    // Deactivate instead of deleting
    const { data: project, error } = await supabase
      .from('projects')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw new Error(`Failed to deactivate project: ${error.message}`);
    }

    res.json({ project, message: 'Project deactivated successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get submissions for a project
 */
router.get('/api/projects/:projectId/submissions', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { projectId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = supabase
      .from('submissions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: submissions, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    res.json({
      submissions,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Duplicate a project
 */
router.post('/api/projects/:projectId/duplicate', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, slug } = z.object({
      name: z.string().min(1),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/)
    }).parse(req.body);

    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Get the original project
    const { data: originalProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      throw new Error(`Failed to fetch project: ${fetchError.message}`);
    }

    // Check if new slug is unique
    const { data: existingProject } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingProject) {
      return res.status(400).json({ error: 'A project with this slug already exists' });
    }

    // Create the duplicate
    const { id, created_at, updated_at, ...projectData } = originalProject;
    const newProject = {
      ...projectData,
      name,
      slug
    };

    const { data: duplicatedProject, error: createError } = await supabase
      .from('projects')
      .insert(newProject)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to duplicate project: ${createError.message}`);
    }

    res.status(201).json({ project: duplicatedProject });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    res.status(400).json({ error: error.message });
  }
});

export default router;
