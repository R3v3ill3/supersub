export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

export type Tables = {
  submissions: {
    Row: {
      id: string;
      project_id: string;
      applicant_first_name: string;
      applicant_last_name: string;
      applicant_email: string;
      applicant_postal_address: string | null;
      site_address: string;
      application_number: string | null;
      submission_pathway: 'direct' | 'review' | 'draft';
      review_deadline: string | null;
      status: string;
      google_doc_id: string | null;
      google_doc_url: string | null;
      pdf_url: string | null;
      submitted_to_council_at: string | null;
      review_started_at: string | null;
      review_completed_at: string | null;
      last_modified_at: string | null;
      created_at: string;
      updated_at: string;
      council_confirmation_id: string | null;
      grounds_text_generated: string | null;
      action_network_sync_status: string | null;
      action_network_synced_at: string | null;
      action_network_sync_error: string | null;
      action_network_person_id: string | null;
      action_network_submission_id: string | null;
      action_network_payload: JSONValue | null;
      submission_track: 'followup' | 'comprehensive' | 'single' | null;
      is_returning_submitter: boolean | null;
    };
    Insert: Partial<Tables['submissions']['Row']>;
    Update: Partial<Tables['submissions']['Row']>;
  };
  documents: {
    Row: {
      id: string;
      submission_id: string;
      google_doc_id: string;
      google_doc_url: string;
      pdf_url: string | null;
      template_id: string | null;
      doc_type: 'cover' | 'grounds' | null;
      placeholders_data: JSONObject;
      status: 'created' | 'user_editing' | 'finalized' | 'submitted' | 'approved';
      review_started_at: string | null;
      review_completed_at: string | null;
      last_modified_at: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Partial<Tables['documents']['Row']>;
    Update: Partial<Tables['documents']['Row']>;
  };
  projects: {
    Row: {
      id: string;
      name: string;
      council_email: string;
      council_name: string;
      slug: string;
      google_doc_template_id: string | null;
      cover_template_id: string | null;
      grounds_template_id: string | null;
      from_email: string | null;
      from_name: string | null;
      subject_template: string;
      council_subject_template: string | null;
      council_email_body_template: string | null;
      default_application_number: string | null;
      default_pathway: string;
      enable_ai_generation: boolean;
      action_network_config: JSONValue | null;
      test_submission_email: string | null;
      is_dual_track: boolean | null;
      dual_track_config: JSONValue | null;
    };
    Insert: Partial<Tables['projects']['Row']>;
    Update: Partial<Tables['projects']['Row']>;
  };
  email_logs: {
    Row: {
      id: string;
      submission_id: string;
      to_email: string;
      from_email: string;
      subject: string;
      body_text: string | null;
      body_html: string | null;
      attachments: JSONValue;
      status: string;
      error_message: string | null;
      sent_at: string | null;
      created_at: string;
    };
    Insert: Partial<Tables['email_logs']['Row']>;
    Update: Partial<Tables['email_logs']['Row']>;
  };
  submission_status_events: {
    Row: {
      id: string;
      submission_id: string;
      stage: string;
      status: string;
      detail: string | null;
      metadata: JSONValue;
      occurred_at: string;
      created_at: string;
    };
    Insert: Partial<Tables['submission_status_events']['Row']>;
    Update: Partial<Tables['submission_status_events']['Row']>;
  };
  integration_status_logs: {
    Row: {
      id: string;
      integration_name: string;
      status: string;
      response_time_ms: number | null;
      detail: string | null;
      metadata: JSONValue;
      created_at: string;
    };
    Insert: Partial<Tables['integration_status_logs']['Row']>;
    Update: Partial<Tables['integration_status_logs']['Row']>;
  };
};

export type Database = {
  public: {
    Tables: Tables;
  };
};

