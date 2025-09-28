#!/usr/bin/env node

/**
 * Create admin user in Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('🔐 Creating admin user in Supabase Auth...\n');

  try {
    // Create user with admin role in metadata
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'troyburton@gmail.com',
      password: '0Rganiser!',
      email_confirm: true,
      user_metadata: {
        role: 'super_admin',
        name: 'Troy Burton'
      }
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log('✅ User already exists, updating role...');
        
        // Get existing user
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.users.find(u => u.email === 'troyburton@gmail.com');
        if (existingUser) {
          // Update user metadata
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id, 
            {
              user_metadata: {
                role: 'super_admin',
                name: 'Troy Burton'
              }
            }
          );
          
          if (updateError) throw updateError;
          
          console.log('✅ Updated existing user with super_admin role');
          console.log(`   User ID: ${existingUser.id}`);
          console.log(`   Email: ${existingUser.email}`);
          console.log(`   Role: super_admin`);
        }
      } else {
        throw error;
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Role: super_admin`);
    }

    console.log('\n🎉 Admin user is ready!');
    console.log('\n📋 Login Credentials:');
    console.log('   Email: troyburton@gmail.com');
    console.log('   Password: 0Rganiser!');
    console.log('   Admin URL: http://localhost:5173');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  }
}

// Run the setup
createAdminUser().catch(console.error);
