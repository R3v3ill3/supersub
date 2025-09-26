#!/usr/bin/env node

/**
 * Setup script for Gold Coast City Council DA Submission Project
 * Creates the project with the specified configuration for COM/2025/271
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

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

// Project configuration for Gold Coast Council
const GOLD_COAST_PROJECT = {
  name: 'Gold Coast City Council DA Submissions',
  slug: 'gold-coast-council',
  description: 'Development Application submissions for Gold Coast City Council, specifically for opposing applications like COM/2025/271',
  council_name: 'Gold Coast City Council',
  council_email: 'mail@goldcoast.qld.gov.au',
  council_subject_template: 'Development application submission opposing application number {{application_number}}',
  default_application_number: 'COM/2025/271',
  subject_template: 'Development Application Submission - {{site_address}}',
  default_pathway: 'direct', // Direct submission to council
  enable_ai_generation: true,
  is_active: true,
  from_email: process.env.DEFAULT_FROM_EMAIL || 'noreply@yourorganization.org',
  from_name: process.env.DEFAULT_FROM_NAME || 'DA Submission Manager'
};

// Default concerns for Gold Coast if none exist
const DEFAULT_CONCERNS = [
  {
    version: 'v1',
    key: 'traffic_safety',
    label: 'Traffic safety and pedestrian access',
    body: 'Increased vehicle movements from the development will impact pedestrian safety, school access, and local traffic flow. Existing intersections and crossing points may become unsafe during peak periods.',
    is_active: true
  },
  {
    version: 'v1', 
    key: 'environmental_impact',
    label: 'Environmental and ecological concerns',
    body: 'The proposed development may adversely impact local flora and fauna, stormwater management, and environmental sustainability. Assessment of environmental impacts appears insufficient.',
    is_active: true
  },
  {
    version: 'v1',
    key: 'community_character',
    label: 'Community character and amenity',
    body: 'The scale and design of the proposed development is inconsistent with the established community character and local amenity values. The proposal does not respect neighborhood context.',
    is_active: true
  },
  {
    version: 'v1',
    key: 'noise_impacts',
    label: 'Construction and operational noise',
    body: 'Construction activities and ongoing operations will generate excessive noise impacting residential amenity. Noise management plans appear inadequate to protect neighboring properties.',
    is_active: true
  },
  {
    version: 'v1',
    key: 'infrastructure_capacity',
    label: 'Infrastructure and service capacity',
    body: 'Local infrastructure including roads, utilities, and community services lack sufficient capacity to support the additional demand from this development.',
    is_active: true
  }
];

async function createGoldCoastProject() {
  console.log('🏗️  Setting up Gold Coast City Council DA Submission Project...\n');
  
  const supabase = getSupabase();

  try {
    // Check if project already exists
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, name, slug')
      .eq('slug', GOLD_COAST_PROJECT.slug)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      throw new Error(`Error checking for existing project: ${checkError.message}`);
    }

    if (existingProject) {
      console.log(`✅ Project "${existingProject.name}" already exists (ID: ${existingProject.id})`);
      console.log(`   Slug: ${existingProject.slug}`);
      return existingProject.id;
    }

    // Create the project
    console.log('📝 Creating new project...');
    const { data: project, error: createError } = await supabase
      .from('projects')
      .insert(GOLD_COAST_PROJECT)
      .select()
      .single();

    if (createError) {
      throw new Error(`Error creating project: ${createError.message}`);
    }

    console.log(`✅ Project created successfully!`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Name: ${project.name}`);
    console.log(`   Slug: ${project.slug}`);
    console.log(`   Council: ${project.council_name}`);
    console.log(`   Email: ${project.council_email}`);

    return project.id;

  } catch (error) {
    console.error('❌ Error creating Gold Coast project:', error.message);
    throw error;
  }
}

async function setupDefaultConcerns() {
  console.log('\n🎯 Setting up default concerns...');
  
  const supabase = getSupabase();

  try {
    // Check if concerns already exist
    const { data: existingConcerns, error: checkError } = await supabase
      .from('concern_templates')
      .select('key')
      .eq('version', 'v1')
      .eq('is_active', true);

    if (checkError) {
      throw new Error(`Error checking existing concerns: ${checkError.message}`);
    }

    if (existingConcerns && existingConcerns.length > 0) {
      console.log(`✅ Found ${existingConcerns.length} existing concerns for version v1`);
      return;
    }

    // Insert default concerns
    const { data: concerns, error: insertError } = await supabase
      .from('concern_templates')
      .insert(DEFAULT_CONCERNS)
      .select();

    if (insertError) {
      throw new Error(`Error inserting default concerns: ${insertError.message}`);
    }

    console.log(`✅ Created ${concerns.length} default concerns:`);
    concerns.forEach(concern => {
      console.log(`   - ${concern.key}: ${concern.label}`);
    });

  } catch (error) {
    console.error('❌ Error setting up concerns:', error.message);
    throw error;
  }
}

async function displaySetupInstructions(projectId) {
  console.log('\n📋 Setup Instructions:');
  console.log('='.repeat(50));
  
  console.log('\n1. 🔗 Admin Interface:');
  console.log('   Open your admin interface at: http://localhost:3000');
  console.log('   Navigate to Templates → Template Analysis');
  
  console.log('\n2. 📄 Template Setup:');
  console.log('   a) Create your council submission template in Google Docs');
  console.log('   b) Create your grounds for submission template in Google Docs');
  console.log('   c) Share both documents with your Google service account');
  console.log('   d) Copy the document IDs from the URLs');
  
  console.log('\n3. 🔧 Configuration:');
  console.log('   a) Select "Gold Coast City Council DA Submissions" as your project');
  console.log('   b) Paste your cover letter template ID');
  console.log('   c) Paste your grounds template ID and analyze it');
  console.log('   d) Generate the survey from the analysis');
  
  console.log('\n4. 🚀 Testing:');
  console.log('   a) Test the submission form at: http://localhost:3001/gold-coast-council');
  console.log('   b) Use the default application number: COM/2025/271');
  
  console.log('\n5. 📧 Email Setup:');
  console.log('   - For testing: EMAIL_PROVIDER=disabled (saves as JSON)');
  console.log('   - For production: Configure SMTP/SendGrid in your .env file');
  
  console.log('\n🎯 Project Configuration:');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Council Email: ${GOLD_COAST_PROJECT.council_email}`);
  console.log(`   Default App Number: ${GOLD_COAST_PROJECT.default_application_number}`);
  console.log(`   Submission Pathway: ${GOLD_COAST_PROJECT.default_pathway}`);
  
  console.log('\n✨ Ready for Gold Coast Council DA submissions!');
}

async function main() {
  try {
    console.log('🌟 Gold Coast City Council DA Submission Setup');
    console.log('='.repeat(50));
    
    // Create project
    const projectId = await createGoldCoastProject();
    
    // Setup default concerns
    await setupDefaultConcerns();
    
    // Display instructions
    await displaySetupInstructions(projectId);
    
    console.log('\n🎉 Setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
main().catch(console.error);

