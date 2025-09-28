import { getSupabase } from '../lib/supabase';
import Handlebars from 'handlebars';
import { logger } from '../lib/logger';
import NodeCache from 'node-cache';

type EmailTemplate = {
    id: string;
    template_name: string;
    subject_template: string;
    body_html_template?: string | null;
    body_text_template?: string | null;
};

export type RenderedEmailTemplate = {
    subject: string;
    html?: string;
    text?: string;
};

export class EmailTemplateService {
    private cache: NodeCache;

    constructor() {
        // Cache templates for 1 hour
        this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
    }

    private async getTemplate(templateName: string): Promise<EmailTemplate | null> {
        const cacheKey = `email-template-${templateName}`;
        const cachedTemplate = this.cache.get<EmailTemplate>(cacheKey);
        if (cachedTemplate) {
            return cachedTemplate;
        }

        const supabase = getSupabase();
        if (!supabase) {
            logger.error("Supabase client not available, can't fetch email templates.");
            return null;
        }

        const { data, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('template_name', templateName)
            .single();

        if (error) {
            logger.error(`Error fetching email template "${templateName}"`, { err: error });
            return null;
        }

        if (data) {
            this.cache.set(cacheKey, data);
        }

        return data;
    }

    async renderTemplate(templateName: string, context: object): Promise<RenderedEmailTemplate | null> {
        const template = await this.getTemplate(templateName);
        if (!template) {
            logger.warn(`Email template "${templateName}" not found.`);
            return null;
        }

        try {
            const subjectTemplate = Handlebars.compile(template.subject_template || '');
            const subject = subjectTemplate(context);

            let html: string | undefined;
            if (template.body_html_template) {
                const htmlTemplate = Handlebars.compile(template.body_html_template);
                html = htmlTemplate(context);
            }

            let text: string | undefined;
            if (template.body_text_template) {
                const textTemplate = Handlebars.compile(template.body_text_template);
                text = textTemplate(context);
            }

            return { subject, html, text };

        } catch (error: any) {
            logger.error(`Error rendering email template "${templateName}"`, { err: error });
            return null;
        }
    }
}
