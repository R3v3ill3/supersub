import express from 'express';

const router = express.Router();

// GET /stats - A simple health check endpoint for monitoring
router.get('/stats', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
