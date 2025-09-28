# High Trees Template Testing Guide

## 🧪 Testing Your New Templates

The templates I created are **reference templates** that show the structure and content. To test them in your system, you need to convert them to Google Docs.

## Step 1: Create Google Docs Templates

### Option A: Comprehensive Template (for first-time submitters)
1. Create a new Google Doc
2. Copy the content from `packages/templates/high-trees-comprehensive-template.md`
3. Convert markdown formatting to Google Docs formatting:
   - `**text**` → **Bold text**
   - `### Header` → Heading 3 style
   - `{{variable}}` → Keep as-is for placeholder replacement
4. Share with your Google Service Account email
5. Copy the Google Doc ID from the URL

### Option B: Follow-Up Template (for returning submitters)  
1. Create a new Google Doc
2. Copy content from `packages/templates/high-trees-follow-up-template.md`
3. Convert markdown to Google Docs formatting
4. Share with your Google Service Account
5. Copy the Google Doc ID

## Step 2: Configure Templates in Admin Interface

### Access Admin Templates Page
```bash
# Start your development servers
pnpm dev

# Navigate to admin interface
http://localhost:3000/templates
```

### Upload Template Analysis
1. **Select Project:** Choose your High Trees project
2. **Template Analysis Tab:** 
   - Enter Google Doc ID for comprehensive template
   - Click "Validate Template" 
   - Click "Analyze Template" to extract concerns
   - Generate survey from analysis

## Step 3: Test Different User Scenarios

### Test Scenario 1: First-Time Submitter
```bash
# Navigate to submission form
http://localhost:3001/your-project-slug

# Fill out form with NEW email address
# System should use comprehensive template
```

### Test Scenario 2: Returning Submitter  
```bash
# Navigate to submission form  
http://localhost:3001/your-project-slug

# Fill out form with EXISTING email address
# System should detect previous submission
# System should use follow-up template
```

## Step 4: Implementation Enhancement

### Add Template Selection Logic
To make the system automatically choose between templates, you'll need to:

1. **Database Enhancement:**
```sql
ALTER TABLE submissions ADD COLUMN has_previous_submission BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_submissions_email_created ON submissions(applicant_email, created_at);
```

2. **Logic Enhancement** in `documentWorkflow.ts`:
```javascript
private async selectTemplate(applicantEmail: string): Promise<string> {
  const previousSubmissions = await this.supabase
    .from('submissions')
    .select('id')
    .eq('applicant_email', applicantEmail)
    .lt('created_at', new Date().toISOString());
    
  return previousSubmissions.data?.length > 0 
    ? project.follow_up_template_id 
    : project.comprehensive_template_id;
}
```

3. **Project Configuration:**
Add both template IDs to your project:
```javascript
{
  comprehensive_template_id: "1abc-comprehensive-google-doc-id",
  follow_up_template_id: "2def-follow-up-google-doc-id"
}
```

## Step 5: Testing Checklist

### ✅ Template Structure Tests
- [ ] All placeholders (`{{variable}}`) are recognized
- [ ] Handlebars conditionals (`{{#if}}`) work correctly
- [ ] Australian English and civic tone maintained
- [ ] No emojis, em dashes, or rhetorical devices
- [ ] Planning framework compliance language included

### ✅ AI Generation Tests  
- [ ] OpenAI generates appropriate content for `{{grounds_content}}`
- [ ] Word limits respected (600-800 words for AI sections)
- [ ] Content follows submission rules from `packages/prompts/submission.system.txt`
- [ ] JSON schema compliance for AI responses

### ✅ User Flow Tests
- [ ] New users get comprehensive template
- [ ] Returning users get follow-up template  
- [ ] All required fields populate correctly
- [ ] Documents generate successfully
- [ ] PDFs export correctly
- [ ] Emails send to council successfully

### ✅ Content Quality Tests
- [ ] Follow-up template references previous submission
- [ ] Comprehensive template includes full planning analysis
- [ ] Both templates maintain Gold Coast Council compliance
- [ ] Declaration and signature blocks are correct

## Troubleshooting

### Template Not Loading
- Check Google Doc sharing permissions
- Verify Google Service Account access
- Confirm Document ID is correct

### Placeholder Issues
- Ensure all `{{variables}}` match system expectations
- Check capitalization and spelling
- Verify Handlebars syntax for conditionals

### AI Generation Problems
- Check OpenAI API key configuration
- Verify concern templates are loaded
- Review prompt customization for each template type

## Expected Results

### Comprehensive Template Output
- **Length:** 800-1200 words total
- **Structure:** Full objection with complete planning analysis
- **Tone:** Formal, comprehensive, detailed
- **Content:** Covers traffic, environment, planning compliance

### Follow-Up Template Output  
- **Length:** 400-600 words total
- **Structure:** References previous submission, focuses on changes
- **Tone:** Formal but more concise
- **Content:** Highlights new concerns from amended application

## Next Steps

1. **Test both templates with real data**
2. **Refine AI prompts for each template type**
3. **Implement database schema changes**
4. **Add template selection logic**
5. **Deploy for High Trees Primary School campaign**

The templates are designed to integrate seamlessly with your existing OpenAI workflow while providing appropriate complexity based on user submission history.
