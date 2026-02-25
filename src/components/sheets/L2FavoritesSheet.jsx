/**
 * L2FavoritesSheet — Saved profiles / favourites
 * Shows profiles the user has favourited.
 */

import { useState, useEffect } from 'react';
import { Heart, User, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';

export default function L2FavoritesSheet() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openSheet } = useSheet();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('user_favorites')
        .select('favorited_id, created_at, profiles!favorited_id(id, display_name, avatar_url, location, right_now_status)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setFavorites(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleRemove = async (favoritedId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_favorites').delete()
      .eq('user_id', user.id)
      .eq('favorited_id', favoritedId);
    setFavorites(prev => prev.filter(f => f.favorited_id !== favoritedId));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
        <div className="w-16 h-16 rounded-2xl bg-[#1C1C1E] flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-white/10" />
        </div>
        <p className="text-white/60 font-bold text-sm">No favourites yet</p>
        <p className="text-white/30 text-xs mt-1">Tap the heart on someone's profile to save them</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2">
        <p className="text-white/30 text-xs">{favorites.length} saved</p>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {favorites.map(fav => {
          const profile = fav.profiles;
          return (
            <div key={fav.favorited_id} className="px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => openSheet('profile', { id: fav.favorited_id })}
                className="w-11 h-11 rounded-full bg-[#1C1C1E] flex-shrink-0 overflow-hidden"
              >
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white/20" />
                    </div>}
              </button>
              <button
                onClick={() => openSheet('profile', { id: fav.favorited_id })}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-white font-bold text-sm truncate">
                  {profile?.display_name || 'Unknown'}
                </p>
                {(profile?.location || profile?.right_now_status) && (
                  <p className="text-white/40 text-xs truncate mt-0.5">
                    {profile?.right_now_status || profile?.location}
                  </p>
                )}
              </button>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openSheet('profile', { id: fav.favorited_id })}
                  className="w-8 h-8 rounded-full bg-[#C8962C]/20 flex items-center justify-center"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#C8962C]" />
                </button>
                <button
                  onClick={() => handleRemove(fav.favorited_id)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                >
                  <Heart className="w-3.5 h-3.5 text-[#C8962C] fill-[#C8962C]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
