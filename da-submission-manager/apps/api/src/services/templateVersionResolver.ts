import { getSupabase } from '../lib/supabase';
import type { TemplateType } from '../types/templates';

export interface ActiveTemplate {
  storagePath: string;
  mimetype: string;
  originalFilename?: string;
  templateFileId?: string;
  mergeFields: Array<{ placeholder: string; canonical_field?: string }>;
}

export async function resolveActiveTemplate(
  projectId: string,
  templateType: TemplateType
): Promise<ActiveTemplate | null> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('template_files')
    .select(
      `
      active_version_id,
      template_versions(id, template_file_id, storage_path, mimetype, merge_fields, original_filename)
    `
    )
    .eq('project_id', projectId)
    .eq('template_type', templateType)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.active_version_id) {
    return null;
  }

  const version = data.template_versions?.find(
    (entry: any) => entry.id === data.active_version_id
  );

  if (!version) {
    return null;
  }

  return {
    storagePath: version.storage_path,
    mimetype: version.mimetype,
    originalFilename: version.original_filename,
    templateFileId: version.template_file_id,
    mergeFields: version.merge_fields || [],
  };
}
