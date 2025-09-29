# 🚀 Production Deployment Guide
## DA Submission Manager - Railway + Vercel Deployment

This guide provides step-by-step instructions for deploying the DA Submission Manager to production with proper service separation.

## 📋 Deployment Architecture

- **Railway**: Express.js API backend (`https://your-api.railway.app`)
- **Vercel #1**: Admin dashboard (`https://admin.yourdomain.com`) 
- **Vercel #2**: Public web app (`https://submit.yourdomain.com`)
- **Supabase**: PostgreSQL database with authentication

## 🔧 Pre-Deployment Setup

### 1. Domain Configuration
Ensure you have control over your domain and can create CNAME records:
- `admin.yourdomain.com` → Vercel
- `submit.yourdomain.com` → Vercel

### 2. Service Account Setup

#### Supabase Production Project
1. Create new Supabase project for production
2. Note down:
   - Project URL
   - Service role key (for backend)
   - Anon key (for frontend)

#### Google Cloud Setup (for document generation)
1. Create Google Cloud project
2. Enable Google Drive API + Google Docs API
3. Create service account
4. Download service account JSON
5. Format as single line for environment variable

#### Email Provider Setup
Choose one:
- **SendGrid**: Get API key
- **Gmail SMTP**: Set up app password
- **Other SMTP**: Get credentials

## 🚂 Railway Deployment (API Backend)

### Step 1: Prepare Railway
1. Create Railway account
2. Create new project
3. Connect to GitHub repository

### Step 2: Configure Build Settings
Railway will automatically detect `nixpacks.toml` configuration:
```toml
[phases.install]
nixPkgs = ["nodejs", "pnpm"]
cmds = [
  "corepack enable",
  "corepack prepare pnpm@9.12.0 --activate", 
  "pnpm install --frozen-lockfile"
]

[phases.build] 
cmds = [
  "pnpm run build:ui",
  "pnpm run build"
]

[start]
cmd = "pnpm --filter @dasub/api run start"
```

### Step 3: Set Environment Variables
In Railway dashboard → Variables, add all variables from `environment.railway.example`:

#### Required Core Variables:
```bash
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your_production_jwt_secret_minimum_32_characters
ADMIN_ORIGIN=https://admin.yourdomain.com
WEB_ORIGIN=https://submit.yourdomain.com
OPENAI_API_KEY=sk-proj-...
GOOGLE_CREDENTIALS_JSON={"type":"service_account"...}
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### Step 4: Deploy & Verify
1. Deploy from Railway dashboard
2. Check build logs for errors
3. Verify health endpoint: `https://your-api.railway.app/health`

## ⚡ Vercel Deployment (Frontend Apps)

### Step 1: Deploy Admin App

#### Create Vercel Project
```bash
# Clone your repository locally
cd da-submission-manager

# Deploy admin app
npx vercel --name dasub-admin
# When prompted:
# - What's your project directory? ./apps/admin
# - Want to override settings? Yes
# - Output directory: dist
# - Build command: cd ../.. && pnpm install && pnpm build:ui && cd apps/admin && pnpm build
```

#### Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables:
```bash
VITE_API_URL=https://your-api.railway.app/api
VITE_WEB_URL=https://submit.yourdomain.com
NODE_ENV=production
```

#### Set Custom Domain
1. Vercel dashboard → Domains
2. Add `admin.yourdomain.com`
3. Configure DNS: `CNAME admin → cname.vercel-dns.com`

### Step 2: Deploy Web App

#### Create Second Vercel Project  
```bash
# Deploy web app
npx vercel --name dasub-web
# When prompted:
# - What's your project directory? ./apps/web
# - Want to override settings? Yes
# - Output directory: dist
# - Build command: cd ../.. && pnpm install && pnpm build:ui && cd apps/web && pnpm build
```

#### Configure Environment Variables
```bash
VITE_API_URL=https://your-api.railway.app
NODE_ENV=production
```

#### Set Custom Domain
1. Add `submit.yourdomain.com`
2. Configure DNS: `CNAME submit → cname.vercel-dns.com`

## 💾 Database Setup (Supabase)

### Step 1: Run Migrations
Execute these SQL files in your Supabase SQL editor **in order**:

```sql
-- 1. Execute: packages/db/migrations/0001_core.sql
-- 2. Execute: packages/db/migrations/0002_ai.sql  
-- 3. Execute: packages/db/migrations/0003_projects_and_documents.sql
-- ...continue with all migrations in numerical order...
-- 20. Execute: packages/db/migrations/0020_dual_track_support.sql
```

### Step 2: Create Production Admin User
Run this SQL to create your admin user:
```sql
SELECT create_admin_user(
  'your-admin@yourdomain.com',
  'Your Admin Name', 
  'secure_production_password',
  'super_admin'
);
```

### Step 3: Verify Database Setup
1. Check tables created successfully
2. Test admin login from admin app
3. Verify RLS policies are active

## 🔒 Security Configuration

### Update CORS Origins
The deployment includes production CORS configuration that restricts access to your domains only:
```typescript
// Automatically configured in apps/api/src/config/cors.ts
const PRODUCTION_ORIGINS = [
  'https://admin.yourdomain.com',
  'https://submit.yourdomain.com'  
];
```

### SSL Certificates
- **Vercel**: Auto-provisions SSL certificates
- **Railway**: Auto-provisions SSL certificates  
- **Custom domains**: Certificates managed by platforms

## 🌐 DNS Configuration

Add these DNS records to your domain:
```dns
CNAME   admin.yourdomain.com    → cname.vercel-dns.com
CNAME   submit.yourdomain.com   → cname.vercel-dns.com
```

Optional API custom domain:
```dns
CNAME   api.yourdomain.com      → your-api.railway.app
```

## ✅ Deployment Verification

### 1. API Health Check
```bash
curl https://your-api.railway.app/health
# Should return: {"ok":true}
```

### 2. Admin App Access
1. Visit `https://admin.yourdomain.com`
2. Login with admin credentials
3. Verify API connectivity (projects load)

### 3. Web App Access  
1. Visit `https://submit.yourdomain.com`
2. Test a project slug (e.g., `/gold-coast-council`)
3. Verify form loads and API calls work

### 4. End-to-End Test
1. Complete a submission through web app
2. Check submission appears in admin dashboard
3. Test document generation 
4. Verify email delivery

## 🔧 Troubleshooting

### Common Issues

#### Build Failures
- **Vercel build timeout**: Increase build timeout in settings
- **Missing UI package**: Ensure build command includes `pnpm build:ui`
- **TypeScript errors**: Check all apps compile locally first

#### CORS Errors
- Verify environment variables set correctly
- Check domain names match exactly (no trailing slashes)
- Ensure SSL certificates are active

#### Authentication Issues
- Verify Supabase environment variables
- Check JWT secret is same across environments
- Confirm admin user exists in database

#### Email/AI Service Failures
- Verify all API keys are set correctly
- Check Railway logs for specific errors
- Test individual service endpoints

### Monitoring

#### Railway Logs
```bash
# View real-time logs
railway logs --follow
```

#### Vercel Logs
Check deployment logs in Vercel dashboard → Functions tab

#### Database Monitoring
Monitor Supabase dashboard for:
- Connection usage
- Query performance
- Storage usage

## 🚀 Going Live

### Final Checklist
- [ ] All services deployed and healthy
- [ ] Custom domains configured with SSL
- [ ] Database migrations completed
- [ ] Admin user created and tested
- [ ] Email service configured and tested
- [ ] End-to-end user workflow tested
- [ ] Monitoring and alerts configured

### Post-Launch
1. Monitor error logs for first 24 hours
2. Test all critical user flows
3. Set up automated backups
4. Document any custom configurations

## 📞 Support

For deployment issues:
1. Check service-specific logs (Railway/Vercel/Supabase)
2. Verify environment variables match examples
3. Test individual components in isolation
4. Review this guide for missed steps

Your DA Submission Manager is now ready for production use! 🎉
