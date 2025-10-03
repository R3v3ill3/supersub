# Bulk Email Campaign Guide

## Overview

The bulk email feature allows you to send personalized emails to hundreds of recipients directly from the admin panel using your SendGrid API.

## Features

✅ **CSV Upload** - Upload recipient lists with name and email columns  
✅ **Email Composer** - Rich HTML email editor with personalization  
✅ **Test Send** - Send to 1-4 test addresses before bulk send  
✅ **Preview** - See how your email will look  
✅ **Progress Tracking** - Real-time monitoring of send progress  
✅ **Batching** - Automatic batching to respect SendGrid rate limits  
✅ **Error Handling** - Retry logic and detailed error reporting  

## Setup Instructions

### 1. Install Dependencies

```bash
cd da-submission-manager
pnpm install
```

This will install the new `csv-parse` dependency needed for CSV parsing.

### 2. Run Database Migration

Run the migration to create the bulk email tables:

```bash
# Connect to your Supabase database and run:
# packages/db/migrations/0030_bulk_email_campaigns.sql
```

Or use your preferred migration tool to execute the migration.

### 3. Configure SendGrid

Make sure your `.env` file has SendGrid configured:

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
DEFAULT_FROM_EMAIL=cvcommunitycare@reveille.net.au
DEFAULT_FROM_NAME=Currumbin Valley Community Care
```

### 4. Verify SendGrid Sender

Make sure the sender email (`cvcommunitycare@reveille.net.au`) is verified in your SendGrid account:
1. Go to SendGrid Dashboard → Settings → Sender Authentication
2. Verify the domain or email address
3. Complete SPF/DKIM setup for better deliverability

## Usage Guide

### Step 1: Prepare Your CSV File

Create a CSV file with the following columns:

```csv
first_name,last_name,email,zip_code,can2_phone
John,Smith,john@example.com,4221,61405311175
Jane,Doe,jane@example.com,4223,61402984031
Bob,Wilson,bob@example.com,4221,
```

**Required Columns:**
- `first_name` - Recipient's first name
- `last_name` - Recipient's last name
- `email` - Recipient's email address (required)

**Optional Columns:**
- `zip_code` - Postal/zip code (stored for future use)
- `can2_phone` - Phone number (stored for future use)

**Requirements:**
- Email column is required (case-insensitive: `email`, `Email`, `EMAIL`, `Email Address`)
- Name columns: `first_name`/`last_name` or single `name` column
- Also accepts: `firstName`, `lastName`, `First_Name`, `Last_Name`
- Phone: `can2_phone`, `phone`, `Phone`, `mobile`
- Zip: `zip_code`, `zipcode`, `zip`, `postcode`
- Duplicate emails will be automatically removed
- Invalid emails will be skipped with warnings
- Empty phone/zip fields are acceptable

### Step 2: Access Bulk Email Page

1. Log into the admin panel
2. Click **Bulk Email** in the navigation menu
3. You'll see a 4-step wizard

### Step 3: Upload CSV

1. Click the upload area or drag & drop your CSV file
2. Click **Parse Recipients**
3. The system will validate and count your recipients
4. You'll see how many valid recipients were found

### Step 4: Compose Email

Fill in the campaign details:

**Campaign Name** (internal only)
- Example: "High Trees Currumbin - October 2025"

**From Email**
- Must be verified in SendGrid
- Example: `cvcommunitycare@reveille.net.au`

**From Name**
- Example: "Currumbin Valley Community Care"

**Reply-To Email**
- Where replies will go
- Example: `cvcommunitycare@reveille.net.au`

**Subject Line**
- Example: "Act Now – Objections Close 10 October (COM/2025/271)"

**Preview Text**
- First ~150 characters shown in inbox preview
- Example: "The clock is ticking. Another application has been lodged..."

**Email Body (HTML)**
- Three editor modes available:
  - **Edit HTML** - Write/paste HTML code
  - **Preview** - See how it will look
  - **Split View** ⭐ - Edit and preview side-by-side (recommended!)
- Use the sample template in `sample-bulk-email-currumbin.html`
- Personalize with `{{name}}` - will be replaced with recipient's name
- Example: `<p>Dear {{name}},</p>`

**Tips:**
- Use **Split View** for best experience (live preview as you type)
- Click **Preview Full Email** to see the complete email with headers
- Paste HTML directly from your email editor
- Character counter shows total length
- See detailed guide: `HTML_EDITOR_GUIDE.md`

### Step 5: Send Test Emails

**IMPORTANT:** Always send test emails before bulk sending!

1. Enter 1-4 test email addresses (with names)
2. Click **Send Test Emails**
3. Test emails will have `[TEST]` prefix in subject and a warning banner
4. Check your inbox to verify:
   - Email formatting looks correct
   - Links work
   - Personalization works (`{{name}}` is replaced)
   - Email doesn't land in spam

### Step 6: Review & Send

1. Review the campaign summary:
   - Number of recipients
   - From/Subject details
   - Current status
2. Read the warning about the action being irreversible
3. Click **Send to All XXX Recipients** when ready

### Step 7: Monitor Progress

The system will show real-time progress:
- **Total:** Total recipients
- **Sent:** Successfully sent emails
- **Pending:** Emails waiting to be sent
- **Failed:** Emails that failed (with error details)

**Progress Bar:** Shows completion percentage

The system sends emails in batches of 50 with 1-second delays between batches to respect SendGrid rate limits.

## Sample Email Template

A complete HTML email template is provided in `sample-bulk-email-template.html`. This template includes:

- Responsive design (mobile-friendly)
- Professional styling
- Call-to-action buttons
- Personalization with `{{name}}`
- Pre-configured for the Currumbin Valley campaign

To use it:
1. Open `sample-bulk-email-template.html`
2. Copy the HTML code
3. Paste into the "Email Body (HTML)" field
4. Update the submission tool link
5. Customize text as needed

## SendGrid Best Practices

### Rate Limits

The system automatically handles rate limiting:
- Sends in batches of 50 emails
- 1-second delay between batches
- For 500 recipients: ~10 batches = ~10 seconds total

### Deliverability Tips

1. **Warm Up Your Domain**
   - If this is your first bulk send, start with smaller batches
   - Gradually increase volume over several days

2. **Authenticate Your Domain**
   - Set up SPF, DKIM, and DMARC records
   - This significantly improves deliverability

3. **Clean Your List**
   - Remove invalid emails
   - Remove emails that have bounced before
   - Use double opt-in if possible

4. **Monitor Your Sender Reputation**
   - Check SendGrid's reputation monitoring
   - Watch for bounce rates >5%
   - Watch for spam complaint rates >0.1%

5. **Test Before Sending**
   - Always send test emails
   - Check spam filters
   - Test in multiple email clients (Gmail, Outlook, etc.)

## Troubleshooting

### CSV Upload Issues

**Problem:** "No valid recipients found"
- Check CSV has `name` and `email` columns
- Verify email addresses are valid format
- Remove header row duplicates

**Problem:** "CSV parsing failed"
- Ensure file is valid CSV format
- Check for special characters in names
- Try exporting from Excel as "CSV UTF-8"

### Email Sending Issues

**Problem:** Test emails not arriving
- Check SendGrid API key is correct
- Verify sender email is authenticated in SendGrid
- Check spam/junk folders
- Review SendGrid activity logs

**Problem:** High bounce rate
- Clean your recipient list
- Remove invalid email addresses
- Verify domain authentication

**Problem:** Emails going to spam
- Set up SPF/DKIM/DMARC
- Ask recipients to whitelist your sender address
- Avoid spam trigger words in subject
- Include physical address in footer
- Include unsubscribe link

### Technical Issues

**Problem:** Campaign stuck in "sending" status
- Check API server logs
- Check SendGrid API status
- Verify database connection
- Campaign will auto-resume on next batch

**Problem:** Migration fails
- Ensure you're connected to correct database
- Check for existing table name conflicts
- Review migration logs for specific errors

## Database Schema

### bulk_email_campaigns
Stores campaign metadata and tracking

Key fields:
- `id` - Campaign UUID
- `name` - Campaign name
- `from_email`, `from_name` - Sender details
- `subject`, `body_html` - Email content
- `total_recipients` - Total count
- `sent_count`, `failed_count` - Progress tracking
- `status` - draft, testing, sending, completed, failed, cancelled

### bulk_email_recipients
Stores individual recipients and their send status

Key fields:
- `campaign_id` - Links to campaign
- `name`, `email` - Recipient details
- `status` - pending, sending, sent, failed
- `message_id` - SendGrid message ID
- `error_message` - If failed, why

## API Endpoints

All endpoints require authentication (admin token).

### `GET /api/bulk-email/campaigns`
List all campaigns (optionally filter by project)

### `GET /api/bulk-email/campaigns/:campaignId`
Get campaign details

### `GET /api/bulk-email/campaigns/:campaignId/progress`
Get real-time campaign progress

### `POST /api/bulk-email/parse-csv`
Parse CSV file and return recipients (doesn't create campaign)

### `POST /api/bulk-email/campaigns`
Create new campaign with CSV upload

### `POST /api/bulk-email/campaigns/:campaignId/test`
Send test emails (1-4 addresses)

### `POST /api/bulk-email/campaigns/:campaignId/send`
Start sending campaign to all recipients

### `POST /api/bulk-email/campaigns/:campaignId/cancel`
Cancel a running campaign

## Security Considerations

1. **Authentication**
   - All endpoints require admin authentication
   - Only authenticated admins can send bulk emails

2. **Rate Limiting**
   - Admin endpoints have rate limiting
   - Prevents abuse and accidental spam

3. **Email Validation**
   - All emails are validated before sending
   - Invalid emails are automatically skipped

4. **Audit Trail**
   - All campaigns are logged in database
   - Full recipient tracking
   - Error messages stored for debugging

5. **SendGrid API Key**
   - Store in environment variables
   - Never commit to git
   - Rotate regularly

## Next Steps

### For Your First Campaign (Currumbin Valley)

1. ✅ Install dependencies: `pnpm install`
2. ✅ Run database migration: `0030_bulk_email_campaigns.sql`
3. ✅ Configure SendGrid API key in `.env`
4. ✅ Verify sender email in SendGrid
5. ✅ Prepare CSV file with 500 recipients
6. ✅ Copy HTML from `sample-bulk-email-template.html`
7. ✅ Update submission tool link in template
8. ✅ Log into admin panel → Bulk Email
9. ✅ Upload CSV
10. ✅ Compose email using template
11. ✅ Send test emails to yourself and 1-2 colleagues
12. ✅ Review test emails carefully
13. ✅ Send to all recipients
14. ✅ Monitor progress

### Testing Checklist

Before sending to 500 recipients, verify:

- [ ] Test email received in inbox (not spam)
- [ ] Subject line is correct
- [ ] "From" name displays correctly
- [ ] Email formatting looks good on mobile
- [ ] Email formatting looks good on desktop
- [ ] All links work correctly
- [ ] Personalization works ({{name}} replaced)
- [ ] Reply-to email is correct
- [ ] No typos in content
- [ ] Call-to-action buttons are prominent
- [ ] Images load (if any)

## Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review API server logs: `apps/api/` 
3. Check SendGrid activity dashboard
4. Verify database records in Supabase
5. Test with smaller recipient list first

## Future Enhancements

Potential features to add later:

- 📊 Campaign analytics (open rates, click rates)
- 📝 Email template library
- 🔄 Scheduled sends
- 📧 Unsubscribe management
- 🎨 Visual email editor (drag & drop)
- 📱 SMS integration
- 🔗 Link tracking
- 👥 Recipient segmentation
- 📈 A/B testing

---

**Ready to send your first campaign?** Follow the steps above and you'll be up and running in minutes!

