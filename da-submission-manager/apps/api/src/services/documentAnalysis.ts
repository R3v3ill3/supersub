import OpenAI from 'openai';
import { GoogleDocsService } from './googleDocs';
import { UploadService } from './upload';
import { extractDocxText, extractPdfText } from './templateParser';
import { getSupabase } from '../lib/supabase';

export type ExtractedConcern = {
  key: string;
  label: string;
  body: string;
  priority: number;
  category?: string;
};

export type ConcernTemplate = {
  version: string;
  key: string;
  label: string;
  body: string;
  is_active: boolean;
};

export type DocumentAnalysisResult = {
  extractedConcerns: ExtractedConcern[];
  documentSummary: string;
  suggestedSurveyTitle: string;
  analysisMetadata: {
    totalConcerns: number;
    categories: string[];
    documentLength: number;
    analysisModel: string;
    analysisTimestamp: string;
  };
};

export class DocumentAnalysisService {
  private openai: OpenAI | null = null;
  private googleDocs: GoogleDocsService;

  constructor() {
    const enabled = process.env.OPENAI_ENABLED !== 'false';
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (enabled && (!apiKey || apiKey === 'your_openai_api_key')) {
      throw new Error('OpenAI API key not configured');
    }
    
    if (enabled && apiKey && apiKey !== 'your_openai_api_key') {
      this.openai = new OpenAI({ apiKey });
    }
    
    this.googleDocs = new GoogleDocsService();
  }

  /**
   * Analyze a Google Docs template to extract grounds for submission concerns
   */
  async analyzeGroundsTemplate(googleDocId: string): Promise<DocumentAnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI is disabled. Set OPENAI_ENABLED=true and provide OPENAI_API_KEY to use document analysis.');
    }

    try {
      // Extract text content from Google Doc
      const documentText = await this.googleDocs.exportToText(googleDocId);

      if (!documentText.trim()) {
        throw new Error('Document appears to be empty or inaccessible');
      }

      // Use OpenAI to analyze the document and extract concerns
      const analysisResult = await this.performAIAnalysis(documentText);

      return {
        extractedConcerns: analysisResult.concerns,
        documentSummary: analysisResult.summary,
        suggestedSurveyTitle: analysisResult.surveyTitle,
        analysisMetadata: {
          totalConcerns: analysisResult.concerns.length,
          categories: analysisResult.concerns
            .map((c) => c.category)
            .filter((value): value is string => Boolean(value))
            .filter((value, index, self) => self.indexOf(value) === index),
          documentLength: documentText.length,
          analysisModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          analysisTimestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      throw new Error(`Document analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze an uploaded template file (DOCX/PDF) to extract grounds for submission concerns
   */
  async analyzeUploadedTemplate(storagePath: string, mimetype: string): Promise<DocumentAnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI is disabled. Set OPENAI_ENABLED=true and provide OPENAI_API_KEY to use document analysis.');
    }

    try {
      // Download file from storage
      const uploadService = new UploadService();
      const fileBuffer = await uploadService.downloadFromStorage(storagePath);

      // Extract text based on mimetype
      let documentText: string;
      if (mimetype.includes('word') || mimetype.includes('docx') || storagePath.endsWith('.docx')) {
        documentText = await extractDocxText(fileBuffer);
      } else if (mimetype.includes('pdf') || storagePath.endsWith('.pdf')) {
        documentText = await extractPdfText(fileBuffer);
      } else {
        throw new Error(`Unsupported file type: ${mimetype}. Only DOCX and PDF files are supported.`);
      }

      if (!documentText.trim()) {
        throw new Error('Document appears to be empty or text could not be extracted');
      }

      // Use OpenAI to analyze the document and extract concerns
      const analysisResult = await this.performAIAnalysis(documentText);

      return {
        extractedConcerns: analysisResult.concerns,
        documentSummary: analysisResult.summary,
        suggestedSurveyTitle: analysisResult.surveyTitle,
        analysisMetadata: {
          totalConcerns: analysisResult.concerns.length,
          categories: analysisResult.concerns
            .map((c) => c.category)
            .filter((value): value is string => Boolean(value))
            .filter((value, index, self) => self.indexOf(value) === index),
          documentLength: documentText.length,
          analysisModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          analysisTimestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      throw new Error(`Uploaded template analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate survey templates from extracted concerns and save to database
   */
  async generateSurveyFromAnalysis(
    analysisResult: DocumentAnalysisResult,
    projectId: string,
    version: string = 'v1'
  ): Promise<ConcernTemplate[]> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Database not configured');
    }

    const concernTemplates: ConcernTemplate[] = analysisResult.extractedConcerns.map((concern, index) => ({
      version,
      key: concern.key,
      label: concern.label,
      body: concern.body,
      is_active: true
    }));

    // Save to database
    const { data, error } = await supabase
      .from('concern_templates')
      .upsert(concernTemplates.map(template => ({
        version: template.version,
        key: template.key,
        label: template.label,
        body: template.body,
        is_active: template.is_active
      })), {
        onConflict: 'version,key'
      })
      .select();

    if (error) {
      throw new Error(`Failed to save concern templates: ${error.message}`);
    }

    return concernTemplates;
  }

  /**
   * Perform AI analysis of document text to extract structured concerns
   */
  private async performAIAnalysis(documentText: string): Promise<{
    concerns: ExtractedConcern[];
    summary: string;
    surveyTitle: string;
  }> {
    const systemPrompt = `You are an expert in Australian development application processes and community consultation. Your task is to analyze a "Grounds for Submission" document template and extract distinct concerns that community members might prioritize when opposing a development application.

Instructions:
1. Identify distinct concern areas from the document (e.g., traffic safety, noise, heritage, environmental impact)
2. For each concern, create:
   - A unique key (lowercase, underscores, descriptive)
   - A short label (for UI display)
   - A detailed body text (2-4 sentences explaining the concern)
   - A category (if applicable)
   - Priority ranking (1-10, where 10 is most critical)
3. Focus on concerns that are:
   - Specific and actionable
   - Relevant to planning law and development assessment
   - Clear for community members to understand
   - Distinct from each other (avoid duplication)
4. Provide a document summary and suggested survey title

Respond with valid JSON matching this schema:
{
  "concerns": [
    {
      "key": "string",
      "label": "string", 
      "body": "string",
      "category": "string",
      "priority": number
    }
  ],
  "summary": "string",
  "surveyTitle": "string"
}`;

    const userPrompt = `Please analyze this Grounds for Submission document and extract the key concerns that community members should be able to prioritize:

DOCUMENT CONTENT:
${documentText}

Extract 5-12 distinct concerns that cover the main areas of potential community opposition to development applications.`;

    try {
      const response = await this.openai!.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      
      // Validate the response structure
      if (!parsed.concerns || !Array.isArray(parsed.concerns)) {
        throw new Error('Invalid response structure: missing concerns array');
      }

      // Validate each concern has required fields
      const validatedConcerns: ExtractedConcern[] = parsed.concerns.map((concern: any, index: number) => {
        if (!concern.key || !concern.label || !concern.body) {
          throw new Error(`Invalid concern at index ${index}: missing required fields`);
        }
        
        return {
          key: concern.key.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          label: concern.label.trim(),
          body: concern.body.trim(),
          priority: typeof concern.priority === 'number' ? concern.priority : 5,
          category: concern.category?.trim() || undefined
        };
      });

      return {
        concerns: validatedConcerns,
        summary: parsed.summary || 'Analysis of grounds for submission document completed.',
        surveyTitle: parsed.surveyTitle || 'Development Application Concerns Survey'
      };
    } catch (error: any) {
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Validate that a Google Doc is accessible and suitable for analysis
   */
  async validateTemplate(googleDocId: string): Promise<{
    isValid: boolean;
    documentTitle?: string;
    wordCount: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let wordCount = 0;
    let documentTitle: string | undefined;

    try {
      // Try to extract text content
      const documentText = await this.googleDocs.exportToText(googleDocId);
      
      if (!documentText.trim()) {
        issues.push('Document appears to be empty');
      } else {
        wordCount = documentText.split(/\s+/).filter(word => word.length > 0).length;
        
        if (wordCount < 100) {
          issues.push('Document may be too short for meaningful analysis (< 100 words)');
        }
        
        if (wordCount > 10000) {
          issues.push('Document may be too long for efficient analysis (> 10,000 words)');
        }
      }

      // Extract document title (first line or first 50 characters)
      const firstLine = documentText.split('\n')[0];
      documentTitle = firstLine ? firstLine.substring(0, 50).trim() : undefined;

    } catch (error: any) {
      issues.push(`Document access failed: ${error.message}`);
    }

    return {
      isValid: issues.length === 0,
      documentTitle,
      wordCount,
      issues
    };
  }

  /**
   * Preview analysis without saving to database (for admin preview)
   */
  async previewAnalysis(googleDocId: string): Promise<{
    preview: DocumentAnalysisResult;
    validation: Awaited<ReturnType<DocumentAnalysisService['validateTemplate']>>;
  }> {
    const validation = await this.validateTemplate(googleDocId);
    
    if (!validation.isValid) {
      throw new Error(`Template validation failed: ${validation.issues.join(', ')}`);
    }

    const analysis = await this.analyzeGroundsTemplate(googleDocId);
    
    return {
      preview: analysis,
      validation
    };
  }
}
