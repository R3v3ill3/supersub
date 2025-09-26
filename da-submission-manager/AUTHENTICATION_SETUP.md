# 🔐 Authentication System Implementation Guide

## Overview

The DA Submission Manager now includes a comprehensive authentication system that secures the admin interface with JWT tokens, role-based access control, and session management.

## 🏗️ Architecture

### **Database Layer**
- **Admin Users**: Secure user management with bcrypt password hashing
- **Sessions**: JWT token tracking with expiration and device information
- **Row Level Security**: Supabase RLS policies for data protection
- **Role-Based Access**: Admin and Super Admin roles with different permissions

### **API Layer** 
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Login attempt protection (5 attempts per 15 minutes)
- **Session Management**: Active session tracking and cleanup
- **Password Security**: bcrypt hashing with 12 rounds

### **Admin Interface**
- **React Context**: Global authentication state management
- **Protected Routes**: Automatic redirect to login for unauthorized access
- **User Profile**: Display current user information with logout functionality
- **Token Management**: Automatic token handling via HTTP cookies and localStorage

## 🚀 Setup Instructions

### **1. Run Database Migration**

Execute the authentication migration in your Supabase SQL editor:

```sql
-- packages/db/migrations/0011_admin_authentication.sql
-- This creates admin_users and admin_sessions tables with full security
```

### **2. Add Environment Variables**

Update your `.env` file with authentication configuration:

```env
# Authentication Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_chars
JWT_EXPIRES_IN=7d
ADMIN_ORIGIN=http://localhost:5173
WEB_ORIGIN=http://localhost:5174
```

⚠️ **Important**: Use a strong, unique JWT secret (minimum 32 characters) for production!

### **3. Install Dependencies**

The system automatically includes the required dependencies:

```bash
# API dependencies (already added)
pnpm install  # Installs jsonwebtoken, bcryptjs, cookie-parser

# Admin interface (no additional dependencies needed)
```

### **4. Start the System**

```bash
pnpm dev  # Starts all three apps with authentication enabled
```

## 👤 Default Admin Account

A default super admin account is created automatically:

```
Email: admin@example.com
Password: admin123
Role: super_admin
```

**🚨 CRITICAL SECURITY**: Change this password immediately after first login!

## 🔑 Authentication Features

### **Admin User Management**

**Super Admin Capabilities:**
- Create new admin users
- Activate/deactivate admin accounts  
- View all admin users
- Manage user roles
- Cannot delete their own account

**Admin Capabilities:**
- Change their own password
- View their own profile
- Access all admin interface features

### **Security Features**

**Login Protection:**
- Rate limiting (5 attempts per 15 minutes per IP)
- Password complexity requirements (minimum 8 characters)
- Secure session tracking
- Automatic token cleanup

**Session Security:**
- HTTP-only cookies (primary)
- localStorage backup token
- 7-day token expiration
- Device and IP tracking
- Automatic session cleanup

### **API Protection**

**Protected Routes:**
All admin-only API endpoints now require authentication:
- `/api/projects/*` - Project management
- `/api/templates/*` - Template administration
- `/api/auth/users` - User management (super admin only)

**Authentication Methods:**
- Bearer tokens: `Authorization: Bearer <token>`
- HTTP-only cookies: Automatic handling
- Token validation on every request

## 🛡️ Security Implementation

### **Password Security**
```javascript
// bcrypt with 12 rounds (very secure)
password_hash = crypt(password, gen_salt('bf'))
```

### **JWT Token Security**
```javascript
{
  user_id: "uuid",
  email: "user@example.com", 
  name: "User Name",
  role: "admin|super_admin",
  iat: timestamp,
  exp: timestamp,
  iss: "da-submission-manager",
  aud: "admin-interface"
}
```

### **Database Security**
```sql
-- Row Level Security enforces data access rules
-- Admin users can only access their own data
-- Super admins can access all admin data
-- Complete audit trail for all operations
```

## 🔄 User Workflow

### **Login Process**
1. User visits admin interface (`/admin`)
2. If not authenticated, login form is displayed
3. Credentials validated against database
4. JWT token generated and stored in secure cookie
5. User redirected to dashboard with full access

### **Session Management**
1. Token validated on every API request
2. User information displayed in sidebar
3. Automatic token refresh handling
4. Secure logout clears all tokens and sessions

### **Role-Based Access**
1. **Admin Role**: Full access to admin interface and all features
2. **Super Admin Role**: All admin capabilities plus user management

## 📋 API Endpoints

### **Authentication Endpoints**

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| `POST` | `/api/auth/login` | User login | No | None |
| `POST` | `/api/auth/logout` | User logout | Yes | Admin |
| `GET` | `/api/auth/me` | Get current user | Yes | Admin |
| `POST` | `/api/auth/users` | Create admin user | Yes | Super Admin |
| `GET` | `/api/auth/users` | List admin users | Yes | Super Admin |
| `PUT` | `/api/auth/users/:id/status` | Activate/deactivate user | Yes | Super Admin |
| `PUT` | `/api/auth/password` | Change password | Yes | Admin |

### **Protected Admin Routes**

All existing admin routes now require authentication:
- Project management (`/api/projects/*`)
- Template administration (`/api/templates/*`) 
- Submission management (`/api/submissions/*`)
- Integration configuration (`/api/integrations/*`)

## 🧪 Testing Authentication

### **1. Test Login Flow**
```bash
# Visit admin interface
open http://localhost:5173

# Use default credentials
Email: admin@example.com
Password: admin123
```

### **2. Test API Protection**
```bash
# Without token (should fail)
curl http://localhost:3500/api/projects
# Response: 401 Unauthorized

# With token (should succeed)
curl -H "Authorization: Bearer <token>" http://localhost:3500/api/projects
```

### **3. Test User Management**
```bash
# Create new admin (as super admin)
curl -X POST http://localhost:3500/api/auth/users \
  -H "Authorization: Bearer <super_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@admin.com","name":"New Admin","password":"securepass"}'
```

## 🚨 Production Security Checklist

### **Before Deployment:**
- [ ] Change default admin password
- [ ] Use strong, unique JWT secret (32+ characters)
- [ ] Enable HTTPS for all connections
- [ ] Configure proper CORS origins
- [ ] Set up monitoring for failed login attempts
- [ ] Enable database backup and encryption
- [ ] Review and test all admin user permissions

### **Monitoring:**
- [ ] Track login attempts and failures
- [ ] Monitor session creation and cleanup
- [ ] Alert on privilege escalation attempts
- [ ] Log all admin actions for audit trail

## 🔧 Troubleshooting

### **Common Issues**

**1. Login Fails with Valid Credentials**
- Check JWT_SECRET is properly set
- Verify database migration was applied
- Check network connectivity to Supabase

**2. Token Validation Errors**
- Ensure JWT_SECRET matches between sessions
- Check token hasn't expired (7 days default)
- Verify cookie settings for your domain

**3. Permission Denied Errors**  
- Confirm user role is correct (`admin` or `super_admin`)
- Check RLS policies in Supabase
- Verify API endpoint requires correct role level

**4. Rate Limiting Issues**
- Wait 15 minutes for rate limit reset
- Check IP address tracking
- Verify rate limit configuration

### **Debug Commands**

```bash
# Check authentication health
curl http://localhost:3500/api/auth/health

# Verify token (replace with your token)
curl -H "Authorization: Bearer <token>" http://localhost:3500/api/auth/me
```

## 🎯 Benefits

1. **Enterprise Security**: Industry-standard JWT authentication
2. **Role-Based Access**: Granular permission control
3. **Session Management**: Comprehensive user session tracking  
4. **Attack Protection**: Rate limiting and secure password policies
5. **Audit Trail**: Complete logging of admin activities
6. **User Experience**: Seamless login/logout with persistent sessions
7. **Production Ready**: Full security implementation for deployment

The authentication system provides enterprise-grade security while maintaining a smooth user experience for admin interface access! 🔐
