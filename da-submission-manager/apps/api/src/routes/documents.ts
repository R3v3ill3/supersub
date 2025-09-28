import { Router } from 'express';
import { z } from 'zod';
import { getSupabase } from '../lib/supabase';
import { DocumentWorkflowService } from '../services/documentWorkflow';

const router = Router();
const documentWorkflow = new DocumentWorkflowService();

const statusUpdateSchema = z.object({
  status: z.enum(['created', 'user_editing', 'finalized', 'submitted', 'approved']),
  reviewStatus: z
    .enum(['not_started', 'in_progress', 'changes_requested', 'ready_for_submission', 'submitted'])
    .optional(),
  reviewStartedAt: z.string().datetime().optional(),
  reviewCompletedAt: z.string().datetime().optional(),
  lastModifiedAt: z.string().datetime().optional(),
});

const finalizeSchema = z.object({
  confirm: z.literal(true),
  notifyApplicant: z.boolean().optional(),
});

/**
 * GET /api/documents/:submissionId/status
 */
router.get('/api/documents/:submissionId/status', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const summary = await documentWorkflow.getDocumentStatus(submissionId);
    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/documents/:submissionId/preview
 */
router.get('/api/documents/:submissionId/preview', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const preview = await documentWorkflow.getDocumentPreview(submissionId);
    res.json(preview);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/documents/:submissionId/status
 */
router.put('/api/documents/:submissionId/status', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const body = statusUpdateSchema.parse(req.body);
    await documentWorkflow.updateDocumentStatus(submissionId, body.status, {
      reviewStatus: body.reviewStatus,
      reviewStartedAt: body.reviewStartedAt,
      reviewCompletedAt: body.reviewCompletedAt,
      lastModifiedAt: body.lastModifiedAt,
    });
    const summary = await documentWorkflow.getDocumentStatus(submissionId);
    res.json(summary);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/documents/:submissionId/finalize
 */
router.post('/api/documents/:submissionId/finalize', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const body = finalizeSchema.parse(req.body);

    const validationResult = await documentWorkflow.validateDocumentForSubmission(submissionId);
    if (!validationResult.isValid) {
      return res.status(422).json({
        error: 'Document not ready for submission',
        issues: validationResult.issues,
      });
    }

    const result = await documentWorkflow.finalizeAndSubmit(submissionId, {
      notifyApplicant: body.notifyApplicant ?? true,
    });

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(400).json({ error: error.message });
  }
});

/**
 * Legacy pass-through endpoints retained for backward compatibility
 */
router.post('/api/documents/process/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { data } = await supabase
      .from('submissions')
      .select('submission_pathway')
      .eq('id', submissionId)
      .single();

    if (!data) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const result = await documentWorkflow.processSubmission(submissionId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
