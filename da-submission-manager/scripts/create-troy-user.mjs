#!/usr/bin/env node

/**
 * Script to create Troy's admin user account
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

async function createTroyUser() {
  console.log('👤 Creating Troy\'s admin user account...\n');
  
  const supabase = getSupabase();
  const email = 'troyburton@gmail.com';
  const password = '0Rganiser!';

  try {
    // Check if Troy's user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('admin_users')
      .select('id, email, name, role')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Error checking for existing user: ${checkError.message}`);
    }

    if (existingUser) {
      console.log(`✅ User already exists:`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   ID: ${existingUser.id}`);
      return existingUser.id;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create Troy's user account
    console.log('📝 Creating Troy\'s admin user account...');
    const { data: user, error: createError } = await supabase
      .from('admin_users')
      .insert({
        email: email,
        name: 'Troy Burton',
        password_hash: passwordHash,
        role: 'super_admin',
        is_active: true
      })
      .select('*')
      .single();

    if (createError) {
      throw new Error(`Error creating admin user: ${createError.message}`);
    }

    console.log(`✅ Troy's admin user created successfully!`);
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
  console.log('\n📋 Login Instructions:');
  console.log('='.repeat(50));
  
  console.log('\n🔗 Admin Interface:');
  console.log('   URL: http://localhost:5173');
  
  console.log('\n🔑 Your Credentials:');
  console.log('   Email: troyburton@gmail.com');
  console.log('   Password: 0Rganiser!');
  console.log('   Role: super_admin');
  
  console.log('\n⚡ Next Steps:');
  console.log('   1. Make sure the admin app is running on port 5173');
  console.log('   2. Go to http://localhost:5173');
  console.log('   3. Login with the credentials above');
  
  console.log(`\n✨ User ID: ${userId}`);
}

async function main() {
  try {
    console.log('🔐 Creating Troy\'s Admin Account');
    console.log('='.repeat(50));
    
    // Create Troy's user
    const userId = await createTroyUser();
    
    // Display login instructions
    displayLoginInstructions(userId);
    
    console.log('\n🎉 User account setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);
