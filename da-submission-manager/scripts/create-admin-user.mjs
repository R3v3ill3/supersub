#!/usr/bin/env node

/**
 * Script to create the initial admin user
 * Use this if the migration INSERT statement fails
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Supabase client
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('❌ Missing Supabase configuration');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
    process.exit(1);
  }
  
  return createClient(url, key);
}

async function createDefaultAdmin() {
  console.log('👤 Creating default admin user...\n');
  
  const supabase = getSupabase();

  try {
    // Check if admin user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('admin_users')
      .select('id, email, name, role')
      .eq('email', 'admin@example.com')
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Error checking for existing user: ${checkError.message}`);
    }

    if (existingUser) {
      console.log(`✅ Admin user already exists:`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   ID: ${existingUser.id}`);
      return existingUser.id;
    }

    // Hash the default password
    const passwordHash = await bcrypt.hash('admin123', 12);

    // Create the admin user
    console.log('📝 Creating default super admin user...');
    const { data: user, error: createError } = await supabase
      .from('admin_users')
      .insert({
        email: 'admin@example.com',
        name: 'System Administrator',
        password_hash: passwordHash,
        role: 'super_admin',
        is_active: true
      })
      .select('*')
      .single();

    if (createError) {
      throw new Error(`Error creating admin user: ${createError.message}`);
    }

    console.log(`✅ Default admin user created successfully!`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);

    return user.id;

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  }
}

function displayLoginInstructions(userId) {
  console.log('\n📋 Admin Login Instructions:');
  console.log('='.repeat(50));
  
  console.log('\n🔗 Admin Interface:');
  console.log('   URL: http://localhost:5173');
  
  console.log('\n🔑 Default Credentials:');
  console.log('   Email: admin@example.com');
  console.log('   Password: admin123');
  console.log('   Role: super_admin');
  
  console.log('\n🚨 CRITICAL SECURITY STEPS:');
  console.log('   1. Start the system: pnpm dev');
  console.log('   2. Login with the credentials above');
  console.log('   3. IMMEDIATELY change the default password!');
  console.log('   4. Create additional admin users as needed');
  
  console.log('\n⚡ Quick Start:');
  console.log('   pnpm dev                    # Start all services');
  console.log('   open http://localhost:5173  # Open admin interface');
  
  console.log('\n🛡️ Security Features:');
  console.log('   ✅ JWT token authentication');
  console.log('   ✅ Secure password hashing (bcrypt)');
  console.log('   ✅ Session management');
  console.log('   ✅ Rate limiting protection');
  console.log('   ✅ Role-based access control');
  
  console.log(`\n✨ Admin User ID: ${userId}`);
}

async function main() {
  try {
    console.log('🔐 DA Submission Manager - Admin User Setup');
    console.log('='.repeat(50));
    
    // Create default admin user
    const userId = await createDefaultAdmin();
    
    // Display login instructions
    displayLoginInstructions(userId);
    
    console.log('\n🎉 Admin user setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);
