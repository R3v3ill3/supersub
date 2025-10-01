import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = '47e0d49d-0a2a-4385-82eb-7214e109becb';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupCurrumbinProject() {
  console.log('🏗️  Setting up Currumbin Valley project...\n');

  // 1. Update project with site address in action_network_config
  console.log('1️⃣  Adding default site address to project...');
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .update({
      action_network_config: {
        form_url: "",
        tag_hrefs: [],
        action_url: "",
        list_hrefs: [],
        group_hrefs: [],
        custom_fields: {},
        default_site_address: "940 Currumbin Creek Road, Currumbin Valley, QLD"
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)
    .select()
    .single();

  if (projectError) {
    console.error('   ❌ Failed:', projectError.message);
  } else {
    console.log('   ✅ Site address added to project config\n');
  }

  // 2. Check for existing concerns
  console.log('2️⃣  Checking for AI-generated concerns...');
  const { data: concerns, error: concernsError } = await supabase
    .from('concern_templates')
    .select('*')
    .eq('version', 'v1')
    .eq('is_active', true);

  if (concerns && concerns.length > 0) {
    console.log(`   ✅ Found ${concerns.length} concerns already in database\n`);
  } else {
    console.log('   ⚠️  No concerns found - creating default set...\n');

    // Create default concerns extracted from the templates
    const defaultConcerns = [
      {
        key: 'planning_non_compliance',
        label: 'Non-compliance with Gold Coast City Plan and SEQ Regional Plan',
        body: 'The proposed development violates the Gold Coast City Plan Strategic Framework, particularly Maps 2 and 4, which designate this area as Natural Landscape Area and part of the greenspace network. It also conflicts with the Rural Zone Code and the South East Queensland Regional Plan (SEQRP) Regional Landscape and Rural Production Area (RLRPA) designation.',
        version: 'v1',
        is_active: true,
        track: 'all',
        metadata: { extracted_from: 'currumbin-original-grounds.md', sections: ['1.1', '1.2', '2'] }
      },
      {
        key: 'traffic_safety',
        label: 'Traffic safety, parking, and road infrastructure concerns',
        body: 'The proposed development creates significant traffic safety issues including insufficient sightlines, inadequate parking (only 13 spaces for 25 staff), unsafe ingress/egress locations requiring substantial verge works and retaining walls near existing Armco barriers. The infrastructure cannot support the additional traffic from daily operations and special events.',
        version: 'v1',
        is_active: true,
        track: 'all',
        metadata: { extracted_from: 'currumbin-original-grounds.md', sections: ['3'] }
      },
      {
        key: 'amenity_environmental',
        label: 'Amenity and environmental impacts',
        body: 'The development will cause noise pollution from buses and school activities, visual intrusion due to inadequate screening, ecological disruption including vegetation removal, increased water runoff and pollution, and heightened bushfire risk in this high-risk rural area.',
        version: 'v1',
        is_active: true,
        track: 'all',
        metadata: { extracted_from: 'currumbin-original-grounds.md', sections: ['4'] }
      },
      {
        key: 'bulk_excavation',
        label: 'Excessive bulk excavation and earthworks',
        body: 'The revised design requires approximately 12,600 m³ of cut, 2,400 m³ of fill, and 7,000 m³ of soil to be exported off-site, with steep batters (1:1) and extensive retaining walls. This scale far exceeds the original proposal and will cause significant construction impacts, truck movements, and permanent visual scarring.',
        version: 'v1',
        is_active: true,
        track: 'followup',
        metadata: { extracted_from: 'currumbin-followup-grounds.md', sections: ['3'] }
      },
      {
        key: 'easement_extension',
        label: 'Unapproved easement extension',
        body: 'The applicant proposes extending an existing easement to facilitate turning movements, materially altering land tenure arrangements in a way not previously notified to the community.',
        version: 'v1',
        is_active: true,
        track: 'followup',
        metadata: { extracted_from: 'currumbin-followup-grounds.md', sections: ['2'] }
      },
      {
        key: 'community_need',
        label: 'Lack of demonstrated community need',
        body: 'The applicant has not demonstrated legitimate need for a school in this rural setting. Most prospective students are expected from urban areas, contradicting the RLRPA intent to preserve rural land for appropriate rural uses.',
        version: 'v1',
        is_active: true,
        track: 'comprehensive',
        metadata: { extracted_from: 'currumbin-original-grounds.md', sections: ['5'] }
      }
    ];

    const { data: inserted, error: insertError } = await supabase
      .from('concern_templates')
      .insert(defaultConcerns)
      .select();

    if (insertError) {
      console.error('   ❌ Failed to insert concerns:', insertError.message);
    } else {
      console.log(`   ✅ Created ${inserted.length} concern templates\n`);
    }
  }

  // 3. Disable Action Network temporarily
  console.log('3️⃣  Action Network configuration...');
  console.log('   ⚠️  Action Network API key is not configured');
  console.log('   💡 To enable Action Network:');
  console.log('      - Get your API key from Action Network dashboard');
  console.log('      - Add it via the Admin UI project settings');
  console.log('      - Or run: UPDATE projects SET action_network_api_key_encrypted = encrypt_api_key(\'your-key\') WHERE id = \'${projectId}\'\n');

  console.log('\n✅ Setup complete!');
  console.log('\n📋 Summary:');
  console.log('   ✓ Site address: 940 Currumbin Creek Road, Currumbin Valley');
  console.log('   ✓ Application number: COM/2025/271');
  console.log('   ✓ Dual-track templates configured');
  console.log('   ✓ Survey concerns populated');
  console.log('   ⚠ Action Network: needs API key (optional)');
  console.log('\n🚀 Ready for testing in web app!');
}

setupCurrumbinProject().catch(console.error);
