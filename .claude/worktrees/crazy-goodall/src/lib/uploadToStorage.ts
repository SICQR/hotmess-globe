import { supabase } from '@/components/utils/supabaseClient';

/**
 * Upload a file to a Supabase storage bucket and return the public URL.
 * Replaces the broken base44 UploadFile migration stub.
 */
export async function uploadToStorage(
  file: File,
  bucket: string,
  userId: string,
  options?: { upsert?: boolean }
): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: options?.upsert ?? true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}
