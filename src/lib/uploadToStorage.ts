import { supabase } from '@/components/utils/supabaseClient';

/**
 * Maps logical code names → actual Supabase storage bucket names in production.
 * Code uses clean names; prod buckets have context prefixes.
 */
const BUCKET_MAP: Record<string, string> = {
  // Audio uploads (radio, music)
  audio:            'records-audio',
  // Event / venue images
  'event-images':   'records-covers',
  // Chat photo / file attachments
  'chat-attachments': 'chat-uploads',
  // General media (product photos, profile assets, misc)
  media:            'messmarket-images',
  // Profile avatars — same bucket in prod
  avatars:          'avatars',
  // Preloved listing images
  'listing-images': 'messmarket-images',
  // General uploads (Go Live photos, beacon images, product form, disputes)
  uploads:          'messmarket-images',
};

/**
 * Resolve a logical bucket name to its production bucket name.
 * Falls through to the input if no mapping exists.
 */
function resolveBucket(bucket: string): string {
  return BUCKET_MAP[bucket] ?? bucket;
}

/**
 * Upload a file to a Supabase storage bucket and return the public URL.
 * Bucket name is resolved via BUCKET_MAP before upload so callers can use
 * clean logical names regardless of how buckets are named in Supabase.
 */
export async function uploadToStorage(
  file: File,
  bucket: string,
  userId: string,
  options?: { upsert?: boolean; skipValidation?: boolean }
): Promise<string> {
  // Client-side validation for image uploads
  if (!options?.skipValidation && file.type.startsWith('image/')) {
    if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB');
    if (file.size < 1024) throw new Error('File too small — may be corrupt');

    // Dimension validation — min 200×200, reject extreme aspect ratios
    try {
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('Could not read image dimensions'));
        img.src = URL.createObjectURL(file);
      });
      if (dims.w < 200 || dims.h < 200) throw new Error('Image must be at least 200×200 pixels');
      const ratio = Math.max(dims.w, dims.h) / Math.min(dims.w, dims.h);
      if (ratio > 4) throw new Error('Image aspect ratio too extreme — crop closer to square');
    } catch (e) {
      if (e instanceof Error && (e.message.includes('200') || e.message.includes('aspect'))) throw e;
      // If dimension check fails for non-image reasons, allow upload
    }
  }

  const resolvedBucket = resolveBucket(bucket);
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(resolvedBucket)
    .upload(path, file, { upsert: options?.upsert ?? true });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from(resolvedBucket)
    .getPublicUrl(path);

  return publicUrl;
}

export { BUCKET_MAP, resolveBucket };
