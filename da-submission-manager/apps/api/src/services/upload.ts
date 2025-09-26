import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

export type TemplateUploadType = 'submission_format' | 'grounds' | 'council_email' | 'supporter_email';

export interface TemplateUploadResult {
  storagePath: string;
  mimetype: string;
  size: number;
  originalFilename: string;
}

export class UploadService {
  private supabase: SupabaseClient;
  private bucket: string;

  constructor(bucketName = process.env.SUPABASE_TEMPLATE_BUCKET || 'templates') {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    this.supabase = supabase;
    this.bucket = bucketName;
  }

  async uploadTemplateFile(projectId: string, type: TemplateUploadType, file: Buffer, mimetype: string, originalFilename: string): Promise<TemplateUploadResult> {
    const extension = this.getExtension(originalFilename);
    const path = `${projectId}/${type}/${randomUUID()}${extension}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file, {
        contentType: mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }

    return {
      storagePath: path,
      mimetype,
      size: file.length,
      originalFilename,
    };
  }

  private getExtension(filename: string): string {
    const index = filename.lastIndexOf('.');
    return index >= 0 ? filename.slice(index) : '';
  }
}
