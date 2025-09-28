import NodeCache from 'node-cache';
import { Logger } from '../lib/logger';
import { GoogleDocsService } from './googleDocs';

export interface CombinedTemplate {
  templateId: string;
  content: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
}

export interface DualTrackConfig {
  original_grounds_template_id: string;
  followup_grounds_template_id: string;
  track_selection_prompt: string;
  track_descriptions: {
    followup: string;
    comprehensive: string;
  };
}

type Track = 'followup' | 'comprehensive';

type TemplateContent = {
  id: string;
  content: string;
};

const TEMPLATE_CACHE_TTL_SECONDS = 300;
const cache = new NodeCache({ stdTTL: TEMPLATE_CACHE_TTL_SECONDS, checkperiod: TEMPLATE_CACHE_TTL_SECONDS / 2 });

export class TemplateCombinerService {
  private logger = new Logger({ namespace: 'templateCombiner' });
  private googleDocs = new GoogleDocsService();

  async getCombinedGroundsTemplate(
    projectId: string,
    originalTemplateId: string,
    followupTemplateId: string
  ): Promise<CombinedTemplate> {
    const cacheKey = `combined:${projectId}:${originalTemplateId}:${followupTemplateId}`;
    const cached = cache.get<CombinedTemplate>(cacheKey);
    if (cached) {
      return cached;
    }

    const [original, followup] = await Promise.all([
      this.loadTemplateContent(originalTemplateId, 'Original grounds template not found'),
      this.loadTemplateContent(followupTemplateId, 'Follow-up grounds template not found')
    ]);

    const sections = [
      {
        title: 'Original Submission Points',
        body: original.content.trim()
      },
      {
        title: 'Additional Follow-up Points',
        body: followup.content.trim()
      }
    ];

    const content = await this.combineTemplateContents(original.content, followup.content);
    const combined: CombinedTemplate = {
      templateId: `combined-${original.id}-${followup.id}`,
      content,
      sections
    };

    cache.set(cacheKey, combined);
    return combined;
  }

  async getTrackSpecificTemplate(
    projectId: string,
    track: Track,
    dualTrackConfig: DualTrackConfig
  ): Promise<string> {
    if (track === 'followup') {
      const cacheKey = `followup:${projectId}:${dualTrackConfig.followup_grounds_template_id}`;
      const cached = cache.get<string>(cacheKey);
      if (cached) {
        return cached;
      }

      const template = await this.loadTemplateContent(
        dualTrackConfig.followup_grounds_template_id,
        'Follow-up grounds template not found'
      );
      cache.set(cacheKey, template.content);
      return template.content;
    }

    const combined = await this.getCombinedGroundsTemplate(
      projectId,
      dualTrackConfig.original_grounds_template_id,
      dualTrackConfig.followup_grounds_template_id
    );
    return combined.content;
  }

  async validateDualTrackConfig(
    projectId: string,
    config: DualTrackConfig
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      await this.loadTemplateContent(config.original_grounds_template_id, '');
    } catch (error: any) {
      issues.push(error?.message || 'Original grounds template not accessible');
    }

    try {
      await this.loadTemplateContent(config.followup_grounds_template_id, '');
    } catch (error: any) {
      issues.push(error?.message || 'Follow-up grounds template not accessible');
    }

    if (!config.track_selection_prompt?.trim()) {
      issues.push('Track selection prompt is required');
    }

    if (!config.track_descriptions?.followup?.trim()) {
      issues.push('Follow-up track description is required');
    }

    if (!config.track_descriptions?.comprehensive?.trim()) {
      issues.push('Comprehensive track description is required');
    }

    // Prime cache by attempting to combine
    if (issues.length === 0) {
      try {
        await this.getCombinedGroundsTemplate(
          projectId,
          config.original_grounds_template_id,
          config.followup_grounds_template_id
        );
      } catch (error: any) {
        issues.push(error?.message || 'Failed to prepare combined template');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private async loadTemplateContent(templateId: string, fallbackMessage: string): Promise<TemplateContent> {
    const cacheKey = `template:${templateId}`;
    const cached = cache.get<TemplateContent>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const content = await this.googleDocs.exportToText(templateId);
      const sanitized = this.sanitizeContent(content);
      const result = { id: templateId, content: sanitized };
      cache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      this.logger.error('Failed to load template content', { templateId, error: error?.message });
      throw new Error(fallbackMessage || error?.message || 'Failed to load template');
    }
  }

  private sanitizeContent(raw: string): string {
    if (!raw) return '';
    return raw
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async combineTemplateContents(
    originalContent: string,
    followupContent: string
  ): Promise<string> {
    const sections = [
      '# Grounds for Submission',
      '',
      '## Original Submission Points',
      originalContent.trim(),
      '',
      '## Additional Follow-up Points',
      followupContent.trim()
    ];

    return sections
      .map((section) => section.trim())
      .filter((section, index, arr) => {
        if (section.length > 0) {
          return true;
        }
        const prev = arr[index - 1];
        const next = arr[index + 1];
        return Boolean(prev && prev.length > 0 && next && next.length > 0);
      })
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}


