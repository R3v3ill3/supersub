import { Router } from 'express';
import { getSupabase } from '../lib/supabase';

const router = Router();

/**
 * Diagnostic endpoint to check deployment version
 * GET /api/diagnostic/version
 */
router.get('/api/diagnostic/version', async (req, res) => {
  res.json({
    success: true,
    deployedAt: new Date().toISOString(),
    version: 'v2.1-diagnostic-enhanced',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Diagnostic endpoint to check AI configuration
 * GET /api/diagnostic/ai-config
 */
router.get('/api/diagnostic/ai-config', async (req, res) => {
  try {
    const config = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      
      openai: {
        enabled: process.env.OPENAI_ENABLED,
        enabledCheck: process.env.OPENAI_ENABLED !== 'false',
        hasApiKey: !!process.env.OPENAI_API_KEY,
        apiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 8) + '...' : 'NOT SET',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini (default)',
        temperature: process.env.OPENAI_TEMPERATURE || '0.05 (default)',
        maxTokens: process.env.OPENAI_MAX_TOKENS || '4000 (default)'
      },
      
      gemini: {
        enabled: process.env.GEMINI_ENABLED,
        enabledCheck: process.env.GEMINI_ENABLED !== 'false',
        hasApiKey: !!process.env.GEMINI_API_KEY,
        apiKeyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 8) + '...' : 'NOT SET',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash (default)',
        temperature: process.env.GEMINI_TEMPERATURE || '0.05 (default)',
        maxTokens: process.env.GEMINI_MAX_TOKENS || '4000 (default)'
      },
      
      generation: {
        wordLimit: process.env.WORD_LIMIT || '2500 (default)',
        templateVersion: process.env.TEMPLATE_VERSION || 'v1 (default)'
      },
      
      willUseAI: (process.env.OPENAI_ENABLED !== 'false' && !!process.env.OPENAI_API_KEY) || 
                 (process.env.GEMINI_ENABLED !== 'false' && !!process.env.GEMINI_API_KEY),
      
      primaryProvider: process.env.OPENAI_ENABLED !== 'false' && !!process.env.OPENAI_API_KEY ? 'OpenAI' : 
                       process.env.GEMINI_ENABLED !== 'false' && !!process.env.GEMINI_API_KEY ? 'Gemini' : 
                       'MOCK MODE (No valid AI provider configured)'
    };
    
    res.json({
      success: true,
      config,
      warning: !config.willUseAI ? 'AI is DISABLED - system will use mock concatenation mode' : null
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Diagnostic endpoint to check what concern will be loaded for a specific key
 * GET /api/diagnostic/concern/:key
 */
router.get('/api/diagnostic/concern/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const version = (req.query.version as string) || 'v1';
    
    // This mimics what the generate endpoint does
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    const { data, error } = await supabase
      .from('concern_templates')
      .select('id, key, label, body, is_active, version')
      .eq('key', key)
      .eq('version', version)
      .eq('is_active', true);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    const hasMeasurements = data?.some(c => c.body.includes('12,600'));
    
    res.json({
      success: true,
      key,
      version,
      count: data?.length || 0,
      concerns: data || [],
      hasMultiple: (data?.length || 0) > 1,
      hasMeasurements,
      warning: (data?.length || 0) > 1 ? 'WARNING: Multiple active concerns with same key! System will use first one returned.' : 
               !hasMeasurements && key === 'bulk_excavation' ? 'WARNING: bulk_excavation concern does NOT contain measurements!' : null
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

