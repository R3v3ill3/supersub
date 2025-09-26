import { Router } from 'express';
import { z } from 'zod';
import { DocumentWorkflowService } from '../services/documentWorkflow';
import { getSupabase } from '../lib/supabase';

const router = Router();
let documentWorkflow: DocumentWorkflowService;

const processSubmissionSchema = z.object({
  pathway: z.enum(['direct', 'review', 'draft']).optional(),
  generatedContent: z.string().optional()
});

/**
 * Process a submission through the complete document workflow
 */
router.post('/api/documents/process/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const body = processSubmissionSchema.parse(req.body);

    // If pathway is specified, update the submission
    if (body.pathway) {
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from('submissions')
          .update({ submission_pathway: body.pathway })
          .eq('id', submissionId);
      }
    }

    if (!documentWorkflow) {
      documentWorkflow = new DocumentWorkflowService();
    }
    
    const result = await documentWorkflow.processSubmission(
      submissionId,
      body.generatedContent
    );

    res.json(result);
  } catch (error: any) {
    console.error('Document processing error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Finalize and submit a document that has been reviewed
 */
router.post('/api/documents/finalize/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;

    if (!documentWorkflow) {
      documentWorkflow = new DocumentWorkflowService();
    }
    
    const result = await documentWorkflow.finalizeAndSubmit(submissionId);

    res.json(result);
  } catch (error: any) {
    console.error('Document finalization error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get document details for a submission
 */
router.get('/api/documents/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        *,
        submissions!inner(
          id,
          applicant_first_name,
          applicant_last_name,
          applicant_email,
          site_address,
          application_number,
          status,
          submission_pathway
        )
      `)
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    res.json({ documents });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all documents with filtering and pagination
 */
router.get('/api/documents', async (req, res) => {
  try {
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const projectId = req.query.project_id as string;

    let query = supabase
      .from('documents')
      .select(`
        *,
        submissions!inner(
          id,
          project_id,
          applicant_first_name,
          applicant_last_name,
          applicant_email,
          site_address,
          application_number,
          status,
          submission_pathway,
          created_at,
          projects!inner(name, slug)
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (projectId) {
      query = query.eq('submissions.project_id', projectId);
    }

    const { data: documents, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    res.json({
      documents,
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
 * Update document status
 */
router.patch('/api/documents/:documentId/status', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status } = z.object({
      status: z.enum(['created', 'user_editing', 'finalized', 'submitted'])
    }).parse(req.body);

    const supabase = getSupabase();
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data, error } = await supabase
      .from('documents')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }

    res.json({ document: data });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
