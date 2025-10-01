import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

export type TemplateUploadType = 'submission_format' | 'grounds' | 'council_email' | 'supporter_email' | 'followup_grounds' | 'combined_grounds';

export interface TemplateUploadResult {
  storagePath: string;
  mimetype: string;
  size: number;
  originalFilename: string;
}

export class UploadService {
  private supabase: SupabaseClient;
  private bucket: string;
  private bucketInitialized = false;

  constructor(bucketName = process.env.SUPABASE_TEMPLATE_BUCKET || 'templates') {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase not configured');
    }
    this.supabase = supabase;
    this.bucket = bucketName;
  }

  private async ensureBucketExists(): Promise<void> {
    if (this.bucketInitialized) return;

    try {
      // Check if bucket exists by listing it
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();

      if (listError) {
        console.warn('[upload] Could not list buckets:', listError.message);
        return;
      }

      const bucketExists = buckets?.some(b => b.name === this.bucket);

      if (!bucketExists) {
        console.log(`[upload] Creating storage bucket: ${this.bucket}`);
        const { error: createError } = await this.supabase.storage.createBucket(this.bucket, {
          public: false,
          fileSizeLimit: 52428800, // 50MB
        });

        if (createError) {
          console.error('[upload] Failed to create bucket:', createError.message);
        } else {
          console.log('[upload] Bucket created successfully');
        }
      }

      this.bucketInitialized = true;
    } catch (error) {
      console.warn('[upload] Error checking/creating bucket:', error);
    }
  }

  async uploadTemplateFile(projectId: string, type: TemplateUploadType, file: Buffer, mimetype: string, originalFilename: string): Promise<TemplateUploadResult> {
    await this.ensureBucketExists();

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

  async downloadFromStorage(storagePath: string): Promise<Buffer> {
    await this.ensureBucketExists();

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(storagePath);

    if (error) {
      throw new Error(`Failed to download file from storage: ${error.message}`);
    }

    if (!data) {
      throw new Error(`File not found in storage: ${storagePath}`);
    }

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private getExtension(filename: string): string {
    const index = filename.lastIndexOf('.');
    return index >= 0 ? filename.slice(index) : '';
  }
}
