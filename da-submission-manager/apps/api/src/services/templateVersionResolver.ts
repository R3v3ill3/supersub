import { getSupabase } from '../lib/supabase';
import type { TemplateType } from '../types/templates';

export interface ActiveTemplate {
  storagePath: string;
  mimetype: string;
  mergeFields: Array<{ placeholder: string; canonical_field?: string }>;
}

export async function resolveActiveTemplate(projectId: string, templateType: TemplateType): Promise<ActiveTemplate | null> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('template_files')
    .select('template_versions!inner(storage_path, mimetype, merge_fields)
    ')
    .eq('project_id', projectId)
    .eq('template_type', templateType)
    .eq('template_versions.id', supabase.rpc('active_template_version', { p_project_id: projectId, p_template_type: templateType }))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const version = data?.template_versions?.[0];
  if (!version) return null;

  return {
    storagePath: version.storage_path,
    mimetype: version.mimetype,
    mergeFields: version.merge_fields || [],
  };
}
