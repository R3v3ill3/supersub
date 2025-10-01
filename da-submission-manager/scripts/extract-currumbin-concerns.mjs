import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const projectId = '47e0d49d-0a2a-4385-82eb-7214e109becb';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

if (!openaiKey) {
  console.error('Missing OPENAI_API_KEY in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

async function extractConcernsFromMarkdown(markdownText, track) {
  console.log(`\n🤖 Analyzing ${track} template with AI...\n`);

  const systemPrompt = `You are an expert in Australian development application processes and community submissions. Your task is to analyze a submission template document and extract distinct areas of concern that a community member might have about a development proposal.

Instructions:
1. Identify distinct concern areas from the document (e.g., traffic safety, noise, heritage, environmental impact, planning compliance)
2. For each concern, create:
   - A unique key (lowercase, underscores, descriptive, e.g., "traffic_safety")
   - A short label (for UI display, e.g., "Traffic safety and pedestrian access")
   - A detailed body text (2-4 sentences explaining the concern in first person, as if the submitter is writing)
   - A category (e.g., "safety", "environment", "planning", "amenity")
   - Priority ranking (1-10, where 10 is most critical based on emphasis in the document)

Extract 5-12 distinct concerns that cover the main areas of potential community opposition mentioned in this document.

Return valid JSON only (no markdown, no code blocks) in this exact format:
{
  "concerns": [
    {
      "key": "concern_key",
      "label": "Concern Label",
      "body": "Detailed explanation of the concern in first person...",
      "category": "category_name",
      "priority": 8
    }
  ],
  "summary": "Brief summary of the main themes in this template",
  "surveyTitle": "Suggested title for the survey"
}`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this submission template and extract concerns:\n\n${markdownText}` }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content);
  console.log(`✅ Extracted ${result.concerns.length} concerns from ${track} template`);
  console.log(`   Summary: ${result.summary}\n`);

  return result.concerns.map(concern => ({
    project_id: projectId,
    version: 'v1',
    key: concern.key,
    label: concern.label,
    body: concern.body,
    is_active: true,
    track: track,
    metadata: {
      priority: concern.priority,
      category: concern.category,
      extracted_at: new Date().toISOString(),
      extraction_model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    }
  }));
}

async function extractConcernsForProject() {
  console.log('🔍 Extracting concerns from Currumbin templates...\n');

  const templates = [
    {
      path: `templates/${projectId}/currumbin-original-grounds.md`,
      track: 'comprehensive',
      label: 'Comprehensive (Original)'
    },
    {
      path: `templates/${projectId}/currumbin-followup-grounds.md`,
      track: 'followup',
      label: 'Follow-up'
    }
  ];

  const allConcerns = [];

  for (const template of templates) {
    console.log(`📄 Processing ${template.label} template...`);
    console.log(`   Path: ${template.path}`);

    // Download markdown from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('templates')
      .download(template.path);

    if (downloadError) {
      console.error(`   ❌ Failed to download: ${downloadError.message}`);
      continue;
    }

    const markdownText = await fileData.text();
    console.log(`   ✅ Downloaded (${markdownText.length} chars)`);

    // Extract concerns using AI
    const concerns = await extractConcernsFromMarkdown(markdownText, template.track);
    allConcerns.push(...concerns);

    console.log(`   Concerns extracted:`);
    concerns.forEach((c, i) => {
      console.log(`   ${i + 1}. [${c.key}] ${c.label} (priority: ${c.metadata.priority})`);
    });
  }

  console.log(`\n💾 Saving ${allConcerns.length} concerns to database...\n`);

  // NOTE: This requires the migration to have been run first!
  // The migration adds project_id, track, and metadata columns
  const { data, error } = await supabase
    .from('concern_templates')
    .upsert(allConcerns, {
      onConflict: 'project_id,version,key',
      ignoreDuplicates: false
    })
    .select('id, key, label, track');

  if (error) {
    console.error('❌ Failed to save concerns:', error.message);
    console.log('\n⚠️  Make sure you have run the migration first:');
    console.log('   1. Go to Supabase dashboard → SQL Editor');
    console.log('   2. Run: packages/db/migrations/0021_concern_templates_project_track.sql');
    process.exit(1);
  }

  console.log(`✅ Saved ${data.length} concerns!\n`);
  console.log('📊 Summary by track:');
  const byTrack = data.reduce((acc, c) => {
    acc[c.track] = (acc[c.track] || 0) + 1;
    return acc;
  }, {});
  Object.entries(byTrack).forEach(([track, count]) => {
    console.log(`   - ${track}: ${count} concerns`);
  });

  console.log('\n✅ Concern extraction complete!');
  console.log('\nNext steps:');
  console.log('1. Update the survey route to filter by project_id and track');
  console.log('2. Update the submission form to show dual-track selection UI');
  console.log('3. Test the workflow in the web app');
}

extractConcernsForProject().catch(console.error);
