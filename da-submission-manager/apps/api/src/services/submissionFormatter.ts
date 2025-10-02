/**
 * Service to format AI-generated grounds into proper Gold Coast submission structure
 */

interface SubmissionData {
  // Property details
  lot_number?: string;
  plan_number?: string;
  site_address: string;
  application_number: string;

  // Submitter details
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_residential_address: string;
  applicant_suburb: string;
  applicant_state: string;
  applicant_postcode: string;
  applicant_email: string;

  // Postal address
  postal_address_same?: boolean;
  applicant_postal_address?: string;
  postal_suburb?: string;
  postal_state?: string;
  postal_postcode?: string;
  postal_email?: string;

  // Generated content
  grounds_content: string;

  // Metadata
  submission_date?: string;
}

export class SubmissionFormatterService {
  /**
   * Format AI-generated grounds into full Gold Coast submission structure
   */
  formatGoldCoastSubmission(data: SubmissionData): string {
    const submissionDate = data.submission_date || new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const applicantName = `${data.applicant_first_name} ${data.applicant_last_name}`;

    // Build the formatted submission
    const sections: string[] = [];

    // Header
    sections.push('# Objection to Development Application\n');
    sections.push('**To:** Gold Coast City Council');
    sections.push('**Email:** mail@goldcoast.qld.gov.au\n');
    sections.push('---\n');

    // Application details
    sections.push('## Application details\n');
    sections.push(`**Property address:** ${data.site_address}`);
    sections.push(`**Application number:** ${data.application_number}`);
    if (data.lot_number) {
      sections.push(`**Lot number:** ${data.lot_number}`);
    }
    if (data.plan_number) {
      sections.push(`**Plan number:** ${data.plan_number}`);
    }
    sections.push('\n---\n');

    // Submitter details
    sections.push('## Submitter details\n');
    sections.push(`**First name:** ${data.applicant_first_name}`);
    sections.push(`**Surname:** ${data.applicant_last_name}`);
    sections.push(`**Residential address:** ${data.applicant_residential_address}`);
    sections.push(`**Suburb:** ${data.applicant_suburb}`);
    sections.push(`**State:** ${data.applicant_state}`);
    sections.push(`**Postcode:** ${data.applicant_postcode}`);
    sections.push(`**Email address:** ${data.applicant_email}\n`);

    // Postal address
    if (data.postal_address_same !== false) {
      sections.push('**Postal address (same as above):** Yes [X] No [ ]\n');
    } else {
      sections.push('**Postal address (same as above):** Yes [ ] No [X]\n');
      sections.push(`**Postal address:** ${data.applicant_postal_address}`);
      sections.push(`**Suburb:** ${data.postal_suburb}`);
      sections.push(`**State:** ${data.postal_state}`);
      sections.push(`**Postcode:** ${data.postal_postcode}`);
      if (data.postal_email) {
        sections.push(`**Email address:** ${data.postal_email}`);
      }
      sections.push('');
    }

    sections.push('---\n');

    // Submission position
    sections.push('## Submission details\n');
    sections.push('**What is your position on the development application?**\n');
    sections.push('Supporting [ ] **Objecting [X]**\n');
    sections.push('---\n');

    // Grounds header with proper addressing
    sections.push('## Grounds of submission:\n');
    sections.push('**To:**');
    sections.push('Mr Tim Baker');
    sections.push('Chief Executive Officer');
    sections.push('Gold Coast City Council\n');
    sections.push(`**Subject:** Objection to Development Application ${data.application_number}`);
    sections.push(`             ${data.site_address}\n`);
    sections.push(`**From:** ${applicantName}`);
    sections.push(`**Date:** ${submissionDate}\n`);
    sections.push('---\n');

    // AI-generated grounds content
    sections.push(data.grounds_content);
    sections.push('\n---\n');

    // Footer with planning compliance statement
    sections.push('The above grounds focus on planning issues and demonstrate how the proposed development is inconsistent with the Gold Coast City Plan, specifically addressing:\n');
    sections.push('- Compliance with applicable zones and overlays');
    sections.push('- Consistency with strategic framework and local government infrastructure plan');
    sections.push('- Assessment against relevant planning scheme codes');
    sections.push('- Consideration of State Planning Policy requirements');
    sections.push('- Impact on community values and local character as outlined in the City Plan\n');

    // Declaration
    sections.push('## Declaration\n');
    sections.push('I understand and acknowledge that:\n');
    sections.push('[X] The information provided in this submission is true and correct');
    sections.push('[X] This submission is NOT confidential and will be displayed through PD Online on the City of Gold Coast\'s website');
    sections.push('[X] I acknowledge Queensland State Laws will accept this communication as containing my signature within the meaning of the Electronic Transactions (Queensland) Act 2001 which can be found on the Queensland Legislation website\n');
    sections.push('**By submitting this form electronically, I agree with the declaration above.**\n');
    sections.push(`**Electronic Signature:** ${applicantName}`);
    sections.push(`**Date:** ${submissionDate}`);
    sections.push(`**Name:** ${applicantName}\n`);
    sections.push('---');
    sections.push(`*Submitted via DA Submission Manager - ${submissionDate}*`);

    return sections.join('\n');
  }
}
