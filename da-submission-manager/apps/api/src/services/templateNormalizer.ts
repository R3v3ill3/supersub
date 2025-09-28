export type CanonicalMergeFieldDefinition = {
  key: string;
  label: string;
  description?: string;
  synonyms?: string[];
  required?: boolean;
};

const CANONICAL_FIELDS: CanonicalMergeFieldDefinition[] = [
  { key: 'applicant_first_name', label: 'Applicant first name' },
  { key: 'applicant_last_name', label: 'Applicant last name' },
  {
    key: 'applicant_name',
    label: 'Applicant full name',
    synonyms: ['applicant_full_name', 'applicant_fullname', 'applicant'],
  },
  { key: 'applicant_email', label: 'Applicant email address' },
  {
    key: 'applicant_postal_address',
    label: 'Applicant postal address',
    description: 'Single-line postal mailing address',
    synonyms: ['postal_address'],
  },
  {
    key: 'applicant_residential_address',
    label: 'Applicant residential address',
    synonyms: ['residential_address'],
  },
  { key: 'applicant_suburb', label: 'Applicant suburb', synonyms: ['postal_suburb'] },
  { key: 'applicant_state', label: 'Applicant state', synonyms: ['postal_state'] },
  { key: 'applicant_postcode', label: 'Applicant postcode', synonyms: ['postal_postcode'] },
  { key: 'applicant_phone', label: 'Applicant phone', synonyms: ['phone', 'contact_number'] },
  { key: 'site_address', label: 'Site address' },
  { key: 'application_number', label: 'Application number', synonyms: ['da_number'] },
  {
    key: 'application_number_line',
    label: 'Application number line',
    description: 'Formatted sentence containing the application number',
  },
  { key: 'submission_date', label: 'Submission date' },
  { key: 'submission_body', label: 'Submission body text' },
  { key: 'grounds_content', label: 'Grounds for submission content' },
  { key: 'council_name', label: 'Council name' },
  { key: 'project_name', label: 'Project name' },
  { key: 'sender_name', label: 'Sender name', synonyms: ['from_name'] },
  { key: 'sender_email', label: 'Sender email', synonyms: ['from_email'] },
  { key: 'recipient_name', label: 'Recipient name' },
  { key: 'subject', label: 'Email/document subject line' },
  { key: 'submission_pathway', label: 'Submission pathway' },
  { key: 'lot_number', label: 'Lot number' },
  { key: 'plan_number', label: 'Plan number' },
  { key: 'postal_email', label: 'Postal contact email' },
  { key: 'user_style_sample', label: 'Supporter style sample' },
  { key: 'approved_facts', label: 'Approved facts block' },
  { key: 'allowed_links', label: 'Allowed external links' },
];

const aliasMap = new Map<string, CanonicalMergeFieldDefinition>();

for (const field of CANONICAL_FIELDS) {
  aliasMap.set(normalizeKey(field.key), field);
  for (const synonym of field.synonyms ?? []) {
    aliasMap.set(normalizeKey(synonym), field);
  }
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

export function guessCanonicalField(placeholder: string): CanonicalMergeFieldDefinition | undefined {
  return aliasMap.get(normalizeKey(placeholder));
}

export function normalizePlaceholders(placeholders: string[]): Array<{ placeholder: string; canonical_field?: string }> {
  const seen = new Set<string>();
  return placeholders
    .map((placeholder) => placeholder.trim())
    .filter((placeholder) => {
      if (!placeholder) return false;
      if (seen.has(placeholder)) return false;
      seen.add(placeholder);
      return true;
    })
    .sort((a, b) => a.localeCompare(b))
    .map((placeholder) => {
      const canonical = guessCanonicalField(placeholder);
      return {
        placeholder,
        canonical_field: canonical?.key,
      };
    });
}

export function listCanonicalMergeFields(): CanonicalMergeFieldDefinition[] {
  return [...CANONICAL_FIELDS];
}

export function describeCanonicalField(key: string): CanonicalMergeFieldDefinition | undefined {
  return CANONICAL_FIELDS.find((field) => field.key === key);
}

