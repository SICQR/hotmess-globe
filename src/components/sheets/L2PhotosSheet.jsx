/**
 * L2PhotosSheet — Profile photo management
 * Upload, reorder, and delete profile photos.
 */

import { useState, useEffect, useRef } from 'react';
import { Camera, X, Plus, Loader2, Image, Star } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function L2PhotosSheet() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('profile_photos')
      .select('id, url, position, is_primary')
      .eq('profile_id', user.id)
      .order('position', { ascending: true });

    setPhotos(data || []);
    setLoading(false);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const ext = file.name.split('.').pop();
      const path = `profile-photos/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);

      const { error: dbError } = await supabase.from('profile_photos').insert({
        profile_id: user.id,
        url: publicUrl,
        position: photos.length,
        is_primary: photos.length === 0,
      });
      if (dbError) throw dbError;

      await loadPhotos();
      toast.success('Photo added');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await supabase.from('profile_photos').delete().eq('id', id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      toast.success('Photo removed');
    } catch {
      toast.error('Failed to remove photo');
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('profile_photos').update({ is_primary: false }).eq('profile_id', user.id);
      await supabase.from('profile_photos').update({ is_primary: true }).eq('id', id);
      setPhotos(prev => prev.map(p => ({ ...p, is_primary: p.id === id })));
      toast.success('Cover photo updated');
    } catch {
      toast.error('Failed to update cover photo');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <p className="text-white/40 text-xs">
          {photos.length}/6 photos · Tap ⭐ to set cover
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-[#1C1C1E]">
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
              {photo.is_primary && (
                <div className="absolute top-1.5 left-1.5 bg-[#C8962C] rounded-full p-1">
                  <Star className="w-2.5 h-2.5 text-black fill-black" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                {!photo.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(photo.id)}
                    className="w-7 h-7 rounded-full bg-[#C8962C] flex items-center justify-center"
                  >
                    <Star className="w-3.5 h-3.5 text-black" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          ))}

          {photos.length < 6 && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-1.5 hover:border-[#C8962C]/40 hover:bg-[#C8962C]/5 transition-all disabled:opacity-50"
            >
              {uploading
                ? <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
                : <>
                    <Plus className="w-6 h-6 text-white/30" />
                    <span className="text-white/30 text-[10px]">Add</span>
                  </>}
            </button>
          )}
        </div>

        {photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Image className="w-10 h-10 text-white/10 mb-2" />
            <p className="text-white/40 text-sm font-bold">No photos yet</p>
            <p className="text-white/25 text-xs mt-1">Add up to 6 photos</p>
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-white/8">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || photos.length >= 6}
          className={cn(
            'w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all',
            photos.length < 6
              ? 'bg-[#C8962C] text-black active:scale-95'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}
        >
          <Camera className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Add Photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
