import { getSupabase } from '../lib/supabase';
import type { TemplateType } from '../types/templates';

export interface TemplateVersionRecord {
  id: string;
  template_file_id: string;
  storage_path: string;
  mimetype: string;
  original_filename: string;
  merge_fields: Array<{ placeholder: string; canonical_field?: string }>;
}

export async function getActiveTemplate(projectId: string, templateType: TemplateType): Promise<TemplateVersionRecord | null> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('template_files')
    .select('active_version_id, template_versions!template_files_active_version_fkey(id, template_file_id, storage_path, mimetype, original_filename, merge_fields)')
    .eq('project_id', projectId)
    .eq('template_type', templateType)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const version = data?.template_versions?.[0];
  return version ?? null;
}
