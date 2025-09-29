# 📋 Production Deployment Checklist
## DA Submission Manager - Complete Launch Checklist

Use this checklist to ensure a successful production deployment.

## 🔄 Pre-Deployment Phase

### Domain & DNS Preparation
- [ ] Domain ownership verified
- [ ] DNS management access confirmed
- [ ] Subdomain strategy decided:
  - [ ] `admin.yourdomain.com` for admin dashboard
  - [ ] `submit.yourdomain.com` for public submission app

### Service Account Setup
- [ ] **Supabase Production Project**
  - [ ] Project created
  - [ ] Project URL documented
  - [ ] Service role key secured
  - [ ] Anon key documented
  
- [ ] **Google Cloud Configuration**
  - [ ] Project created
  - [ ] Drive API enabled
  - [ ] Docs API enabled  
  - [ ] Service account created
  - [ ] Service account JSON downloaded
  - [ ] JSON formatted as single line
  
- [ ] **Email Provider Setup**
  - [ ] SendGrid account created (or SMTP configured)
  - [ ] API key obtained
  - [ ] Sender domain verified
  
- [ ] **AI Services**
  - [ ] OpenAI API key obtained
  - [ ] Gemini API key obtained (fallback)

## 🚂 Railway Deployment (API Backend)

### Railway Setup
- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] New project created

### Configuration
- [ ] `railway.json` validated
- [ ] `nixpacks.toml` confirmed correct
- [ ] Current problematic `vercel.json` noted for removal

### Environment Variables (Railway)
- [ ] `NODE_ENV=production`
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `JWT_SECRET` set (minimum 32 characters)
- [ ] `ADMIN_ORIGIN=https://admin.yourdomain.com`
- [ ] `WEB_ORIGIN=https://submit.yourdomain.com`
- [ ] `OPENAI_API_KEY` set
- [ ] `GEMINI_API_KEY` set
- [ ] `GOOGLE_CREDENTIALS_JSON` set
- [ ] `EMAIL_PROVIDER` configured
- [ ] Email API keys set
- [ ] `DEFAULT_FROM_EMAIL` set

### Deployment & Verification
- [ ] Initial deployment triggered
- [ ] Build logs reviewed (no errors)
- [ ] Health endpoint tested: `GET /health`
- [ ] Railway domain noted (for frontend env vars)

## ⚡ Vercel Deployments (Frontend Apps)

### Admin App Deployment
- [ ] **Vercel Project Created**
  - [ ] Project name: `dasub-admin`
  - [ ] Connected to GitHub repository
  
- [ ] **Build Configuration**
  - [ ] Output directory: `apps/admin/dist`
  - [ ] Build command includes `pnpm build:ui`
  
- [ ] **Environment Variables**
  - [ ] `VITE_API_URL=https://your-api.railway.app/api`
  - [ ] `VITE_WEB_URL=https://submit.yourdomain.com`
  - [ ] `NODE_ENV=production`
  
- [ ] **Custom Domain**
  - [ ] `admin.yourdomain.com` added to Vercel
  - [ ] DNS CNAME record created
  - [ ] SSL certificate provisioned
  
- [ ] **Testing**
  - [ ] App loads at custom domain
  - [ ] Login page accessible
  - [ ] API connectivity verified

### Web App Deployment  
- [ ] **Vercel Project Created**
  - [ ] Project name: `dasub-web`
  - [ ] Connected to GitHub repository
  
- [ ] **Build Configuration** 
  - [ ] Output directory: `apps/web/dist`
  - [ ] Build command includes `pnpm build:ui`
  
- [ ] **Environment Variables**
  - [ ] `VITE_API_URL=https://your-api.railway.app`
  - [ ] `NODE_ENV=production`
  
- [ ] **Custom Domain**
  - [ ] `submit.yourdomain.com` added to Vercel
  - [ ] DNS CNAME record created
  - [ ] SSL certificate provisioned
  
- [ ] **Testing**
  - [ ] App loads at custom domain
  - [ ] Project slugs work (e.g., `/gold-coast-council`)
  - [ ] API connectivity verified

## 💾 Database Setup (Supabase)

### Migration Execution
Execute migrations in Supabase SQL editor **in exact order**:
- [ ] `0001_core.sql` - Basic tables and extensions
- [ ] `0002_ai.sql` - AI tracking tables
- [ ] `0003_projects_and_documents.sql` - Core entities
- [ ] `0004_dual_docs.sql` - Document handling
- [ ] `0005_action_network.sql` - Action Network integration
- [ ] `0006_project_testing_email.sql` - Email configuration
- [ ] `0007_council_attention_of.sql` - Council fields
- [ ] `0008_submission_postal_fields.sql` - Postal address fields
- [ ] `0009_gold_coast_form_fields.sql` - Gold Coast specific
- [ ] `0010_ai_provider_tracking.sql` - AI provider tracking
- [ ] `0010_project_action_network_api_key.sql` - API key storage
- [ ] `0011_admin_authentication.sql` - Admin authentication
- [ ] `0011_admin_authentication_simple.sql` - Simplified auth
- [ ] `0012_cover_email_template.sql` - Email templates
- [ ] `0013_template_files.sql` - Template file handling
- [ ] `0014_template_versions_expansion.sql` - Template versioning
- [ ] `0015_document_review_workflow.sql` - Review workflow
- [ ] `0016_monitoring_views.sql` - Monitoring views
- [ ] `0017_email_enhancements.sql` - Email improvements
- [ ] `0017_error_recovery.sql` - Error handling
- [ ] `0018_email_templates.sql` - Template system
- [ ] `0019_dual_track_projects.sql` - Dual track support
- [ ] `0020_create_troy_user.sql` - User creation
- [ ] `0020_dual_track_support.sql` - Full dual track

### Admin User Setup
- [ ] **Create Production Admin User**
  ```sql
  SELECT create_admin_user(
    'your-admin@yourdomain.com',
    'Your Admin Name',
    'secure_production_password', 
    'super_admin'
  );
  ```
- [ ] **Remove/Change Default Admin**
  - [ ] Default admin password changed from 'admin123'
  - [ ] Or default admin user disabled

### Database Verification
- [ ] All tables created successfully
- [ ] RLS policies active
- [ ] Admin user login tested
- [ ] Database connections stable

## 🔒 Security Configuration

### CORS Setup
- [ ] Production CORS configuration deployed
- [ ] Test cross-origin requests work
- [ ] Verify unauthorized domains blocked

### SSL & HTTPS
- [ ] All services use HTTPS
- [ ] SSL certificates auto-renewing
- [ ] Mixed content warnings resolved

### Authentication Flow
- [ ] Admin login works across domains
- [ ] JWT tokens working properly
- [ ] Session management functional

## 🌐 DNS & Domain Configuration

### DNS Records
- [ ] `CNAME admin.yourdomain.com → cname.vercel-dns.com`
- [ ] `CNAME submit.yourdomain.com → cname.vercel-dns.com`
- [ ] DNS propagation completed (24-48 hours)

### SSL Certificate Verification
- [ ] `https://admin.yourdomain.com` - SSL valid
- [ ] `https://submit.yourdomain.com` - SSL valid  
- [ ] `https://your-api.railway.app` - SSL valid

## ✅ End-to-End Testing

### API Functionality
- [ ] Health check: `GET https://your-api.railway.app/health`
- [ ] Authentication endpoints working
- [ ] Project API endpoints responding
- [ ] Document generation working
- [ ] Email sending functional

### Admin Dashboard Testing
- [ ] **Access & Authentication**
  - [ ] Admin app loads at `https://admin.yourdomain.com`
  - [ ] Login with production admin credentials
  - [ ] Dashboard loads after authentication
  
- [ ] **Core Functions**
  - [ ] Projects list loads
  - [ ] Project creation works
  - [ ] Template management functional
  - [ ] User submissions visible

### Public Web App Testing  
- [ ] **Basic Functionality**
  - [ ] Web app loads at `https://submit.yourdomain.com`
  - [ ] Project slug routing works (e.g., `/gold-coast-council`)
  - [ ] Forms render correctly
  
- [ ] **Submission Workflow**
  - [ ] Complete test submission
  - [ ] AI content generation works
  - [ ] Document generation successful
  - [ ] Email delivery confirmed
  - [ ] Submission appears in admin dashboard

### Integration Testing
- [ ] **Cross-App Communication**
  - [ ] Admin → API calls work
  - [ ] Web → API calls work
  - [ ] Authentication persists across domains
  
- [ ] **External Services**
  - [ ] Google Drive document access
  - [ ] OpenAI API responses
  - [ ] Email provider delivery
  - [ ] Supabase database queries

## 📊 Monitoring & Observability

### Service Health Monitoring
- [ ] **Railway Monitoring**
  - [ ] Application metrics enabled
  - [ ] Error logging configured
  - [ ] Performance monitoring active
  
- [ ] **Vercel Monitoring**
  - [ ] Build monitoring enabled
  - [ ] Runtime error tracking
  - [ ] Performance insights active
  
- [ ] **Supabase Monitoring**
  - [ ] Database performance tracking
  - [ ] Connection pool monitoring
  - [ ] Query performance analysis

### Alerting Setup
- [ ] Critical error alerts configured
- [ ] Service downtime notifications
- [ ] Performance degradation alerts

## 🚀 Go-Live Phase

### Final Pre-Launch
- [ ] **Performance Testing**
  - [ ] Load testing completed
  - [ ] Response times acceptable
  - [ ] Error rates within limits
  
- [ ] **Security Review**
  - [ ] Secrets properly secured
  - [ ] Access controls validated
  - [ ] HTTPS everywhere confirmed
  
- [ ] **Backup Strategy**
  - [ ] Database backup scheduled
  - [ ] Configuration backup created
  - [ ] Recovery procedures documented

### Launch Execution
- [ ] **Announce Maintenance Window** (if replacing existing system)
- [ ] **Switch DNS** (if applicable)
- [ ] **Monitor Initial Traffic**
  - [ ] First hour monitoring
  - [ ] Error rate tracking
  - [ ] Performance validation
  
- [ ] **User Acceptance Testing**
  - [ ] Key stakeholders test workflows
  - [ ] Issues documented and resolved
  - [ ] Sign-off obtained

## 📚 Post-Launch Activities

### Documentation Updates
- [ ] Production URLs documented
- [ ] Admin credentials secured
- [ ] Runbook for common issues created
- [ ] Contact information for services documented

### Operational Procedures
- [ ] Deployment procedure documented
- [ ] Rollback procedure tested
- [ ] Incident response plan created
- [ ] Regular maintenance schedule established

### Success Metrics
- [ ] Baseline performance metrics captured
- [ ] User adoption tracking setup
- [ ] System reliability monitoring
- [ ] Cost optimization review scheduled

---

## 🎉 Launch Complete!

When all items are checked off, your DA Submission Manager is successfully deployed to production with:

✅ **Railway**: API backend optimized for long-running processes
✅ **Vercel**: Frontend apps optimized for global delivery  
✅ **Supabase**: Production database with security and scalability
✅ **Custom Domains**: Professional URLs with SSL certificates
✅ **Security**: Production CORS, authentication, and access controls
✅ **Monitoring**: Comprehensive observability across all services

**Production URLs:**
- Admin: `https://admin.yourdomain.com`
- Web: `https://submit.yourdomain.com` 
- API: `https://your-api.railway.app`

Congratulations on your successful production deployment! 🚀
