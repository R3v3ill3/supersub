import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { BulkEmailService } from '../services/bulkEmail';
import { requireAuth } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimit';
import { logger } from '../lib/logger';

const router = Router();
const bulkEmailService = new BulkEmailService();

// Configure multer for CSV file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Validation schemas
const createCampaignSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  fromEmail: z.string().email('Valid from email is required'),
  fromName: z.string().min(1, 'From name is required'),
  replyTo: z.string().email().optional(),
  subject: z.string().min(1, 'Subject is required'),
  bodyText: z.string().optional(),
  bodyHtml: z.string().min(1, 'Email body is required'),
  previewText: z.string().optional(),
});

const testEmailSchema = z.object({
  testEmails: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().email(),
      })
    )
    .min(1, 'At least one test email is required')
    .max(4, 'Maximum 4 test emails allowed'),
});

/**
 * GET /api/bulk-email/campaigns
 * Get all campaigns (optionally filtered by project)
 */
router.get('/api/bulk-email/campaigns', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const campaigns = await bulkEmailService.getCampaigns(
      projectId as string | undefined
    );
    
    res.json({ campaigns });
  } catch (error: any) {
    logger.error('Failed to fetch campaigns', { error });
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/bulk-email/campaigns/:campaignId
 * Get campaign details
 */
router.get('/api/bulk-email/campaigns/:campaignId', requireAuth, adminLimiter, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await bulkEmailService.getCampaign(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ campaign });
  } catch (error: any) {
    logger.error('Failed to fetch campaign', { error });
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/bulk-email/campaigns/:campaignId/progress
 * Get campaign progress
 */
router.get('/api/bulk-email/campaigns/:campaignId/progress', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const progress = await bulkEmailService.getCampaignProgress(campaignId);
    
    res.json({ progress });
  } catch (error: any) {
    logger.error('Failed to fetch campaign progress', { error });
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/bulk-email/parse-csv
 * Parse CSV file and return recipients (without creating campaign)
 */
router.post(
  '/api/bulk-email/parse-csv',
  requireAuth,
  adminLimiter,
  upload.single('csvFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required' });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const recipients = bulkEmailService.parseCSV(csvContent);

      res.json({
        recipients,
        count: recipients.length,
        filename: req.file.originalname,
      });
    } catch (error: any) {
      logger.error('Failed to parse CSV', { error });
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/bulk-email/campaigns
 * Create a new campaign with CSV upload
 */
router.post(
  '/api/bulk-email/campaigns',
  requireAuth,
  adminLimiter,
  upload.single('csvFile'),
  async (req, res) => {
    try {
      // Parse campaign data from form data
      const campaignData = {
        projectId: req.body.projectId,
        name: req.body.name,
        description: req.body.description,
        fromEmail: req.body.fromEmail,
        fromName: req.body.fromName,
        replyTo: req.body.replyTo,
        subject: req.body.subject,
        bodyText: req.body.bodyText,
        bodyHtml: req.body.bodyHtml,
        previewText: req.body.previewText,
        createdBy: (req as any).user?.email,
      };

      // Validate campaign data
      const validatedData = createCampaignSchema.parse(campaignData);

      // Parse CSV file
      if (!req.file) {
        return res.status(400).json({ error: 'CSV file is required' });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const recipients = bulkEmailService.parseCSV(csvContent);

      if (recipients.length === 0) {
        return res.status(400).json({ 
          error: 'No valid recipients found in CSV file' 
        });
      }

      // Create campaign
      const campaignId = await bulkEmailService.createCampaign(
        validatedData,
        recipients,
        req.file.originalname
      );

      res.status(201).json({
        campaignId,
        recipientCount: recipients.length,
        message: 'Campaign created successfully',
      });
    } catch (error: any) {
      logger.error('Failed to create campaign', { error });
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/bulk-email/campaigns/:campaignId/test
 * Send test emails
 */
router.post(
  '/api/bulk-email/campaigns/:campaignId/test',
  requireAuth,
  adminLimiter,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { testEmails } = testEmailSchema.parse(req.body);

      const result = await bulkEmailService.sendTestEmails(campaignId, testEmails);

      res.json({
        message: 'Test emails sent',
        ...result,
      });
    } catch (error: any) {
      logger.error('Failed to send test emails', { error });
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: error.errors 
        });
      }
      
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/bulk-email/campaigns/:campaignId/send
 * Start sending campaign
 */
router.post(
  '/api/bulk-email/campaigns/:campaignId/send',
  requireAuth,
  adminLimiter,
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      await bulkEmailService.sendCampaign(campaignId);

      res.json({
        message: 'Campaign sending started',
        campaignId,
      });
    } catch (error: any) {
      logger.error('Failed to start campaign', { error });
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /api/bulk-email/campaigns/:campaignId/cancel
 * Cancel campaign
 */
router.post(
  '/api/bulk-email/campaigns/:campaignId/cancel',
  requireAuth,
  adminLimiter,
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      await bulkEmailService.cancelCampaign(campaignId);

      res.json({
        message: 'Campaign cancelled',
        campaignId,
      });
    } catch (error: any) {
      logger.error('Failed to cancel campaign', { error });
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;

