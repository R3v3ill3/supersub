# Environment Configuration

Copy this to `.env` in the root directory and update with your actual values.

```env
# Server Configuration
PORT=3500          # API server port

# Database Configuration (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# OpenAI Configuration (Primary AI Provider)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.2
OPENAI_MAX_TOKENS=900
OPENAI_ENABLED=true

# Gemini Configuration (Fallback AI Provider)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_TEMPERATURE=0.2
GEMINI_MAX_TOKENS=900
GEMINI_ENABLED=true

# Global AI Configuration
WORD_LIMIT=600

# Template Configuration
TEMPLATE_VERSION=v1

# Google APIs Configuration (for document generation)
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id_optional

# Email Configuration
# Use 'disabled' for test deployments (no real emails sent; JSON transport)
EMAIL_PROVIDER=disabled
# For SMTP:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# For SendGrid:
# SENDGRID_API_KEY=your_sendgrid_api_key

# For Gmail:
# GMAIL_USER=your_email@gmail.com
# GMAIL_APP_PASSWORD=your_app_password

# Default Email Settings
DEFAULT_FROM_EMAIL=noreply@yourorganization.org
DEFAULT_FROM_NAME=DA Submission Manager
# DEFAULT_PROJECT_ID is optional and only used by webhook/dev endpoints
# Leave empty if submissions are created via project slug using the public form
# DEFAULT_PROJECT_ID=

# Webhook Security (optional)
ACTION_NETWORK_WEBHOOK_SECRET=your_webhook_secret

# Development/Testing
NODE_ENV=development
```

## Setup Instructions

### 1. Supabase Setup
1. Create a Supabase project at https://supabase.com
2. Run the database migrations in order:
   - `packages/db/migrations/0001_core.sql`
   - `packages/db/migrations/0002_ai.sql`
   - `packages/db/migrations/0003_projects_and_documents.sql`
3. Get your project URL and service role key from the Supabase dashboard

### 2. OpenAI Setup
1. Get an API key from https://platform.openai.com/
2. Set `OPENAI_ENABLED=false` to use mock generation during development

### 3. Google APIs Setup
1. Create a Google Cloud Project at https://console.cloud.google.com/
2. Enable the Google Docs API and Google Drive API
3. Create a service account and download the JSON credentials
4. Share your template documents with the service account email
5. (Optional) Create a Google Drive folder and share it with the service account

### 4. Email Setup
Choose one of these options:

#### SMTP (recommended for development)
Use Gmail with an app password or any SMTP server.

#### SendGrid (recommended for production)
Create an account at https://sendgrid.com/ and get an API key.

#### Gmail API
Use the Gmail API directly (requires additional OAuth setup).

### 5. Project Setup
1. Create your first project using the `/api/projects` endpoint
2. Set the `DEFAULT_PROJECT_ID` environment variable to this project's UUID
3. Configure your Google Doc template ID in the project settings
