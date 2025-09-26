export type TemplateType = 'submission_format' | 'grounds' | 'council_email' | 'supporter_email';

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  submission_format: 'Submission Format',
  grounds: 'Grounds for Submission',
  council_email: 'Council Email Body',
  supporter_email: 'Supporter Email Body',
};
