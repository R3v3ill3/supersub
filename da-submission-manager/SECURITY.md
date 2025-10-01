# Security Guidelines

## 🚨 CRITICAL: Exposed Secrets

**ACTION REQUIRED**: The `.env` file in this repository previously contained production secrets. If you have pushed this to a remote repository, you **MUST** rotate all credentials immediately.

### Secrets to Rotate

1. **Supabase Credentials**
   - Navigate to: Supabase Dashboard → Settings → API
   - Generate new service role key
   - Update RLS policies if needed
   - Update all deployment environments

2. **OpenAI API Key**
   - Visit: https://platform.openai.com/api-keys
   - Revoke old key
   - Generate new key
   - Update environment variables

3. **Google Gemini API Key**
   - Visit: https://makersuite.google.com/app/apikey
   - Delete old key
   - Generate new key
   - Update environment variables

4. **SendGrid API Key**
   - Navigate to: SendGrid Dashboard → Settings → API Keys
   - Delete compromised key
   - Create new key with minimum required permissions
   - Update environment variables

5. **Action Network API Key**
   - Contact Action Network support to rotate
   - Update environment variables

6. **Encryption Secret**
   - Generate new 32-byte base64 secret:
     ```bash
     openssl rand -base64 32
     ```
   - Re-encrypt all stored API keys in database
   - Update environment variable

## Secret Management Best Practices

### Never Commit Secrets

- ✅ Use `.env` for local development (gitignored)
- ✅ Use platform environment variables for production (Railway, Vercel)
- ✅ Use `.env.example` for documentation (no real values)
- ❌ Never commit `.env` files
- ❌ Never hardcode secrets in source code
- ❌ Never log sensitive values

### Environment Variable Checklist

**Before deploying:**
- [ ] All secrets removed from codebase
- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` is up to date
- [ ] Production secrets set in Railway/Vercel dashboards
- [ ] All API keys have appropriate permissions (least privilege)
- [ ] Secrets are rotated if previously exposed

### Git History Cleanup

If secrets were previously committed, clean git history:

```bash
# WARNING: This rewrites git history. Coordinate with team.

# Remove sensitive file from entire git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch da-submission-manager/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (requires coordination)
git push origin --force --all
```

**Alternative**: Consider the repository compromised and:
1. Create a new repository
2. Rotate all secrets
3. Copy code (without git history) to new repo
4. Archive old repository

## API Key Permissions

### Supabase Service Role Key
- Has full database access
- Used for: Admin operations, bypassing RLS
- **Risk**: High - can read/write all data
- **Rotation frequency**: Every 90 days or on exposure

### OpenAI API Key
- Access to GPT models
- **Cost risk**: High - unauthorized use can incur significant charges
- Set usage limits in OpenAI dashboard
- **Rotation frequency**: Every 90 days or on exposure

### SendGrid API Key
- Email sending capability
- **Risk**: Medium - could send spam as your organization
- Use "Mail Send" permission only (not "Full Access")
- **Rotation frequency**: Every 90 days or on exposure

### Action Network API Key
- Access to community organizing data
- **Risk**: High - contains personally identifiable information
- **Rotation frequency**: Every 90 days or on exposure

## Deployment Security

### Railway (API Server)

```bash
# Set environment variables via Railway CLI
railway variables set SUPABASE_URL="https://..."
railway variables set SUPABASE_SERVICE_ROLE_KEY="..."
railway variables set OPENAI_API_KEY="sk-..."
# ... etc
```

Or use Railway dashboard: Project → Variables

### Vercel (Frontend Apps)

```bash
# Set environment variables via Vercel CLI
vercel env add VITE_API_URL production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

Or use Vercel dashboard: Project → Settings → Environment Variables

## Monitoring & Alerts

### Setup Alerts For:
- [ ] Unusual API usage (OpenAI, Gemini)
- [ ] Failed authentication attempts
- [ ] Email delivery failures
- [ ] Database connection errors
- [ ] Unauthorized access attempts

### Regular Security Audits
- [ ] Review API access logs monthly
- [ ] Check for unusual submission patterns
- [ ] Verify all users in admin dashboard
- [ ] Review database RLS policies
- [ ] Test authentication flows

## Incident Response

### If secrets are exposed:

1. **Immediate** (within 1 hour):
   - Rotate all exposed credentials
   - Review recent API logs for unauthorized access
   - Check database for unauthorized changes
   - Notify team

2. **Short-term** (within 24 hours):
   - Audit all systems for evidence of compromise
   - Review all recent submissions for spam/abuse
   - Check billing for unexpected charges
   - Document incident

3. **Long-term** (within 1 week):
   - Implement additional monitoring
   - Review and update security policies
   - Conduct team security training
   - Consider security audit

## Contact

For security concerns, contact: [Your Security Contact Email]

For urgent security issues: [Emergency Contact]