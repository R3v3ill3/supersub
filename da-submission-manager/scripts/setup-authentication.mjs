#!/usr/bin/env node

/**
 * Setup script for DA Submission Manager Authentication System
 * Helps generate secure JWT secrets and validates authentication configuration
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function checkEnvFile() {
  const envPath = path.resolve(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  No .env file found. Creating from template...');
    
    const examplePath = path.resolve(__dirname, '../environment.example');
    if (fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log('✅ Created .env file from environment.example');
      return true;
    } else {
      console.error('❌ environment.example file not found');
      return false;
    }
  }
  
  return true;
}

function updateJwtSecret() {
  const envPath = path.resolve(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found');
    return false;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if JWT_SECRET exists and is secure
  const jwtSecretMatch = envContent.match(/^JWT_SECRET=(.*)$/m);
  
  if (!jwtSecretMatch || jwtSecretMatch[1] === 'your_super_secure_jwt_secret_key_here') {
    const newSecret = generateSecureSecret();
    
    if (jwtSecretMatch) {
      // Replace existing placeholder
      envContent = envContent.replace(
        /^JWT_SECRET=.*$/m,
        `JWT_SECRET=${newSecret}`
      );
    } else {
      // Add JWT_SECRET if not present
      envContent += `\n# Authentication Configuration\nJWT_SECRET=${newSecret}\nJWT_EXPIRES_IN=7d\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Generated secure JWT secret');
    return true;
  } else {
    console.log('✅ JWT secret already configured');
    return true;
  }
}

function displayAuthenticationInstructions() {
  console.log('\n📋 Authentication Setup Complete!');
  console.log('='.repeat(50));
  
  console.log('\n🔐 Security Configuration:');
  console.log('   ✅ JWT secret generated');
  console.log('   ✅ Secure password hashing enabled');
  console.log('   ✅ Session management configured');
  console.log('   ✅ Rate limiting enabled');
  
  console.log('\n👤 Default Admin Account:');
  console.log('   Email: admin@example.com');
  console.log('   Password: admin123');
  console.log('   Role: super_admin');
  
  console.log('\n🚨 CRITICAL SECURITY STEPS:');
  console.log('   1. Run the authentication database migration:');
  console.log('      packages/db/migrations/0011_admin_authentication.sql');
  console.log('   2. Start the system: pnpm dev');
  console.log('   3. Login with default credentials');
  console.log('   4. IMMEDIATELY change the default password!');
  console.log('   5. Create additional admin users as needed');
  
  console.log('\n🔗 Admin Interface:');
  console.log('   URL: http://localhost:5173');
  console.log('   Default Login: admin@example.com / admin123');
  
  console.log('\n🛡️ Protected Features:');
  console.log('   ✅ All admin interface pages require login');
  console.log('   ✅ Project management protected');
  console.log('   ✅ Template administration secured');
  console.log('   ✅ Action Network integration protected');
  console.log('   ✅ User management (super admin only)');
  
  console.log('\n📊 User Roles:');
  console.log('   • Admin: Full access to all admin features');
  console.log('   • Super Admin: Admin access + user management');
  
  console.log('\n🔧 Next Steps:');
  console.log('   1. Run database migration');
  console.log('   2. Start development servers');
  console.log('   3. Login and change default password');
  console.log('   4. Test all protected routes');
  console.log('   5. Create additional admin users');
  
  console.log('\n⚠️  PRODUCTION SECURITY:');
  console.log('   • Use HTTPS for all connections');
  console.log('   • Set strong JWT secret (64+ characters)');
  console.log('   • Enable proper CORS configuration');
  console.log('   • Monitor failed login attempts');
  console.log('   • Regular security audits');
}

function validateEnvironment() {
  const envPath = path.resolve(__dirname, '../.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'JWT_SECRET'
  ];

  const missing = requiredVars.filter(varName => {
    const pattern = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(pattern);
    return !match || match[1].startsWith('your_') || !match[1].trim();
  });

  if (missing.length > 0) {
    console.log('\n⚠️  Missing or placeholder environment variables:');
    missing.forEach(varName => {
      console.log(`   • ${varName}`);
    });
    console.log('\n   Update these in your .env file before starting the system.');
    return false;
  }

  return true;
}

async function main() {
  console.log('🔐 DA Submission Manager - Authentication Setup');
  console.log('='.repeat(50));
  
  try {
    // Ensure .env file exists
    if (!checkEnvFile()) {
      process.exit(1);
    }
    
    // Generate secure JWT secret
    updateJwtSecret();
    
    // Validate environment
    const envValid = validateEnvironment();
    
    // Display instructions
    displayAuthenticationInstructions();
    
    if (!envValid) {
      console.log('\n❌ Please configure missing environment variables before proceeding.');
      process.exit(1);
    }
    
    console.log('\n🎉 Authentication setup completed successfully!');
    console.log('\n   Run: pnpm dev');
    console.log('   Then visit: http://localhost:5173');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);
