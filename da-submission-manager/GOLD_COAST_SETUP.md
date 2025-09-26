# Gold Coast City Council DA Submission Setup Guide

This guide provides step-by-step instructions for deploying the DA Submission Manager for Gold Coast City Council Development Application COM/2025/271.

## 🎯 Overview

The system will enable community members to:
- Prioritize concerns from an AI-analyzed "Grounds for Submission" template
- Add their own additional concerns
- Generate AI-assisted or manual submissions
- Submit directly to Gold Coast City Council at `mail@goldcoast.qld.gov.au`

## 📋 Prerequisites

### 1. Environment Setup
- Node.js 18+ and pnpm installed
- Supabase project created
- OpenAI API key
- Google Cloud service account with Docs & Drive API access

### 2. Google Cloud Setup
1. Create a project at https://console.cloud.google.com/
2. Enable Google Docs API and Google Drive API
3. Create a service account and download JSON credentials
4. Note the service account email (you'll share documents with this)

### 3. Templates Preparation
Create two Google Docs templates:

**Cover Letter Template** - Basic council submission letter with placeholders:
- `{{applicant_name}}`
- `{{applicant_email}}`
- `{{applicant_postal_address}}`
- `{{site_address}}`
- `{{application_number}}`
- `{{submission_date}}`
- `{{council_name}}`

**Grounds for Submission Template** - Detailed document with your opposition grounds that will be analyzed by AI to extract concerns for the survey.

## 🚀 Deployment Steps

### Step 1: Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your `.env` file:
```env
# Database (Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# OpenAI for AI analysis and generation
OPENAI_API_KEY=your_openai_api_key
OPENAI_ENABLED=true
OPENAI_MODEL=gpt-4o-mini
WORD_LIMIT=600

# Google APIs for document processing
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
GOOGLE_DRIVE_FOLDER_ID=optional_folder_id

# Email (start with disabled for testing)
EMAIL_PROVIDER=disabled
DEFAULT_FROM_EMAIL=noreply@yourorganization.org
DEFAULT_FROM_NAME=DA Submission Manager

# Server
PORT=3001
NODE_ENV=development
```

### Step 2: Database Setup

1. Run database migrations in your Supabase project:
   - Execute `packages/db/migrations/0001_core.sql`
   - Execute `packages/db/migrations/0002_ai.sql`
   - Execute `packages/db/migrations/0003_projects_and_documents.sql`
   - Execute `packages/db/migrations/0004_dual_docs.sql`

2. Install dependencies:
```bash
pnpm install
```

### Step 3: Gold Coast Project Setup

Run the automated setup script:
```bash
pnpm setup:gold-coast
```

This will:
- Create the Gold Coast City Council project
- Set up default concern templates
- Configure council email and application number
- Display setup instructions

### Step 4: Template Configuration

1. **Share your Google Docs** with the service account email

2. **Start the development servers**:
```bash
pnpm dev
```

3. **Open the admin interface** at http://localhost:5173 (or the port shown in terminal)

4. **Navigate to Templates → Template Analysis**

5. **Configure templates**:
   - Select "Gold Coast City Council DA Submissions" project
   - Enter your Cover Letter template Google Doc ID
   - Enter your Grounds template Google Doc ID
   - Wait for validation (green checkmarks)

6. **Analyze the Grounds template**:
   - Click "Analyze Document" on the grounds template
   - Review the extracted concerns
   - Click "Generate Survey" to save the concerns

### Step 5: Testing the User Experience

1. **Test the public submission form**:
   Visit: http://localhost:5174/gold-coast-council (or the web app port shown in terminal)

2. **Complete a test submission**:
   - Fill in applicant details (name, email, postal address) 
   - Enter development site address
   - Confirm application number (defaults to COM/2025/271)
   - Select concerns from the AI-generated survey
   - Prioritize your selected concerns using Up/Down buttons
   - Provide your own thoughts on the development
   - Add any additional concerns
   - Generate AI-assisted submission content
   - Submit directly to council

3. **Verify the workflow**:
   - Check that PDFs are generated (cover + grounds)
   - Since EMAIL_PROVIDER=disabled, emails will be logged as JSON
   - Review the admin interface for submission tracking

## 🖥️ Application Ports

The system uses three separate applications:

| Application | Purpose | Default URL | Configuration | Description |
|-------------|---------|-------------|---------------|-------------|
| **API** | Backend API | http://localhost:3500 | `PORT=3500` in .env | Database, AI processing, email |
| **Admin** | Project Management | http://localhost:5173 | Vite default (auto-increments) | Template analysis, project setup |
| **Web** | Public Submission Form | http://localhost:5174 | Vite default (auto-increments) | User-facing submission interface |

**Port Configuration**: 
- **API**: Controlled by `PORT` in your `.env` file
- **Admin & Web**: Use Vite's default behavior (starts at 5173, increments if ports are busy)
- All frontend apps automatically avoid port conflicts with your other projects

## 🎛️ Project Configuration

The Gold Coast project is configured with:

| Setting | Value |
|---------|-------|
| **Council Email** | mail@goldcoast.qld.gov.au |
| **Default Application** | COM/2025/271 |
| **Submission Pathway** | Direct (immediate council submission) |
| **Subject Template** | "Development application submission opposing application number {{application_number}}" |
| **AI Generation** | Enabled |

## 📝 User Workflow

1. **Survey Completion**: Users prioritize AI-extracted concerns and add custom ones
2. **AI Generation**: System generates personalized grounds text based on selections
3. **Document Creation**: Creates cover letter + detailed grounds document
4. **Direct Submission**: Emails both PDFs to council automatically
5. **Email Format**:
   - **To**: mail@goldcoast.qld.gov.au
   - **Subject**: "Development application submission opposing application number COM/2025/271"
   - **Attachments**: Cover letter PDF + Grounds for submission PDF
   - **Body**: Applicant details and submission context

## 🔧 Admin Features

### Template Analysis
- Upload Google Doc template IDs
- AI analysis of grounds documents
- Automatic concern extraction
- Survey generation and management

### Project Management
- Configure council details and email templates
- Set default application numbers
- Choose submission pathways
- Enable/disable AI features

### Survey Management
- View and edit extracted concerns
- Create custom concern templates
- Manage different template versions
- Delete unused concerns

### Submission Tracking
- Monitor all submissions and their status
- Track document generation and email delivery
- View PDF attachments and Google Doc links
- Audit trail of all activities

## 🌐 Production Deployment

### 1. Email Configuration
For production, configure a real email provider:

**SMTP Example**:
```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

**SendGrid Example**:
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
```

### 2. Security Considerations
- Use strong service role keys
- Limit Google service account permissions
- Use HTTPS in production
- Configure CORS appropriately
- Monitor email delivery and API usage

### 3. Scaling
- Use Supabase connection pooling
- Monitor OpenAI token usage
- Set up error monitoring (Sentry, etc.)
- Configure log aggregation

## 🚦 Testing Checklist

- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] Google service account working
- [ ] Templates uploaded and validated
- [ ] AI analysis extracting concerns correctly
- [ ] Survey generated and displaying properly
- [ ] Public form accepting submissions
- [ ] AI generation producing quality content
- [ ] Documents created with correct placeholders
- [ ] PDFs generated successfully
- [ ] Email sending (or JSON logging) working
- [ ] Admin interface showing submissions
- [ ] Council receiving properly formatted emails

## 🆘 Troubleshooting

### Common Issues

1. **Google Docs Access Error**
   - Ensure documents are shared with service account email
   - Check GOOGLE_CREDENTIALS_JSON is valid JSON
   - Verify Docs and Drive APIs are enabled

2. **AI Analysis Fails**
   - Check OPENAI_API_KEY is valid
   - Ensure document has sufficient content (>100 words)
   - Verify model is available (gpt-4o-mini)

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check if RLS policies are configured correctly
   - Ensure migrations are applied in order

4. **Email Not Sending**
   - For testing, use EMAIL_PROVIDER=disabled
   - Check SMTP credentials if using email
   - Verify email templates are valid

5. **Template Validation Errors**
   - Ensure Google Doc IDs are correct format
   - Check service account has read access
   - Verify documents are not empty

## 📞 Support

For setup assistance:
1. Check the console logs for detailed error messages
2. Review the environment.md file for configuration details
3. Test individual components using the admin interface
4. Use the dev endpoints for debugging

## 🎉 Success!

Once setup is complete, you'll have a fully functional DA submission system specifically configured for Gold Coast City Council opposition submissions to COM/2025/271, with AI-powered content generation and automated email delivery.
