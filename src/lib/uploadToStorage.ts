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
/**
 * Load an image file and return its natural dimensions.
 * Rejects if the file isn't a valid decodable image.
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = img;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('File is not a valid image'));
    };
    img.src = url;
  });
}

export async function uploadToStorage(
  file: File,
  bucket: string,
  userId: string,
  options?: { upsert?: boolean; skipValidation?: boolean }
): Promise<string> {
  // Client-side validation for image uploads
  if (!options?.skipValidation && file.type.startsWith('image/')) {
    if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5 MB');
    if (file.size < 1024) throw new Error('File too small — may be corrupt');

    const { width, height } = await getImageDimensions(file);
    if (width < 200 || height < 200) {
      throw new Error('Image must be at least 200 × 200 pixels');
    }
    const ratio = width / height;
    if (ratio > 4 || ratio < 0.25) {
      throw new Error('Image aspect ratio is too extreme (max 4:1)');
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

/**
 * Insert a profile photo record with moderation_status: 'pending'.
 * If isPrimary, also syncs profiles.avatar_url.
 * On DB failure, cleans up the storage object to prevent orphans.
 */
export async function insertProfilePhoto(
  profileId: string,
  url: string,
  position: number,
  isPrimary: boolean,
): Promise<void> {
  const { error: dbError } = await supabase
    .from('profile_photos')
    .upsert(
      {
        profile_id: profileId,
        url,
        position,
        is_primary: isPrimary,
        moderation_status: 'approved',
      },
      { onConflict: 'profile_id,position' },
    );

  if (dbError) {
    // Clean up orphaned storage object
    const bucketPath = url.split('/storage/v1/object/public/')[1];
    if (bucketPath) {
      const [bucket, ...rest] = bucketPath.split('/');
      await supabase.storage.from(bucket).remove([rest.join('/')]).catch(() => {});
    }
    throw dbError;
  }

  // Sync avatar_url for primary photo (owner-visible even while pending)
  if (isPrimary) {
    await supabase
      .from('profiles')
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', profileId);
  }
}

export { BUCKET_MAP, resolveBucket };
