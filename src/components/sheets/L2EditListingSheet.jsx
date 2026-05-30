/**
 * L2EditListingSheet -- Edit an existing preloved listing
 *
 * Registered in sheetSystem (height: full) + SheetRouter.
 * Pre-fills from existing listing data passed as sheet props.
 * Save -> update market_listings table.
 * Delete -> set status = 'archived'.
 */

import { useState, useEffect, useRef } from 'react';
import { Loader2, Trash2, Save, Camera, X } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { useSheet } from '@/contexts/SheetContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const CONDITIONS = [
  { value: 'new', label: 'New with tags' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

const CATEGORIES = [
  'Clothing',
  'Shoes',
  'Accessories',
  'Bags',
  'Jewellery',
  'Underwear',
  'Other',
];

export default function L2EditListingSheet({ listingId, listing: listingProp }) {
  const { closeSheet } = useSheet();
  const queryClient = useQueryClient();
  const photoInputRef = useRef(null);
  const [loading, setLoading] = useState(!listingProp);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('good');
  const [category, setCategory] = useState('Clothing');
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState('active');
  const [userId, setUserId] = useState(null);
  const [id, setId] = useState(null);

  // Clean ID helper
  const cleanId = (rawId) => {
    if (!rawId) return null;
    return String(rawId).replace('preloved_', '');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data?.session?.user?.id));
  }, []);

  // Load listing data if not passed as prop
  useEffect(() => {
    const targetId = cleanId(listingId || listingProp?.id);
    if (!targetId) { setLoading(false); return; }
    setId(targetId);

    if (listingProp) {
      setTitle(listingProp.title || '');
      setDescription(listingProp.description || '');
      setPrice(String((listingProp.price_pence ? listingProp.price_pence / 100 : listingProp.price) || ''));
      setQuantity(listingProp.quantity || 1);
      setCondition(listingProp.condition || 'good');
      setCategory(listingProp.category || 'Clothing');
      setStatus(listingProp.status || 'active');
      
      const imgList = Array.isArray(listingProp.images) ? [...listingProp.images] : [];
      if (listingProp.cover_image_url && !imgList.includes(listingProp.cover_image_url)) {
        imgList.unshift(listingProp.cover_image_url);
      }
      setPhotos(imgList);
      setId(listingProp.id);
      setLoading(false);
      return;
    }
    if (!listingId) { setLoading(false); return; }

    const load = async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .eq('id', targetId)
        .single();
      if (data) {
        // OWNERSHIP CHECK
        const { data: { session } } = await supabase.auth.getSession();
        const currentUid = session?.user?.id;
        if (data.seller_id !== currentUid) {
          alert('🚫 OWNERSHIP WARNING\nListing Seller: ' + data.seller_id + '\nYou are logged in as: ' + currentUid + '\n\nThis is why the update is failing!');
        }

        setTitle(data.title || '');
        setDescription(data.description || '');
        setPrice(String((data.price_pence ? data.price_pence / 100 : data.price) || ''));
        setQuantity(data.quantity || 1);
        setCondition(data.condition || 'good');
        setCategory(data.category || 'Clothing');
        setStatus(data.status || 'active');
        
        const imgList = Array.isArray(data.images) ? [...data.images] : [];
        if (data.cover_image_url && !imgList.includes(data.cover_image_url)) {
          imgList.unshift(data.cover_image_url);
        }
        setPhotos(imgList);
        setId(data.id);
      }
      if (error) toast.error('Failed to load listing');
      setLoading(false);
    };
    load();
  }, [listingId, listingProp]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) { toast.error('Enter a valid price'); return; }
    if (!id) { toast.error('Listing ID missing'); return; }

    setSaving(true);
    
    // Explicit debug log
    const updateData = {
      title: title.trim(),
      description: description.trim(),
      price_pence: Math.round(Number(price) * 100),
      quantity: Math.max(0, parseInt(quantity.toString()) || 0),
      status: status, // Matches our LIVE/SOLD toggle
      condition,
      category,
      cover_image_url: photos[0] || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('market_listings')
      .update(updateData)
      .eq('id', id)
      .select();

    setSaving(false);

    if (error) {
      console.error('[edit-listing] save error:', error.message);
      toast.error('Save failed: ' + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ['my-preloved-listings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-sheet'] });
      toast.success('Listing updated successfully!');
      closeSheet();
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const { error } = await supabase
      .from('market_listings')
      .update({ status: 'archived' })
      .eq('id', id);
    setDeleting(false);
    if (error) {
      toast.error('Failed to delete listing');
    } else {
      toast.success('Listing removed');
      closeSheet();
    }
  };

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const toastId = toast.loading('Uploading photo...');
    try {
      const url = await uploadToStorage(files[0], 'listing-images', userId);
      setPhotos(prev => [...prev, url]);
      toast.success('Photo added', { id: toastId });
    } catch (err) {
      toast.error('Upload failed: ' + err.message, { id: toastId });
    } finally {
      e.target.value = '';
    }
  };

  const handlePhotoRemove = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#050507' }}>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* Photos */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 font-black mb-2 block">Photos</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#1C1C1E]">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => handlePhotoRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            <button
              className="w-20 h-20 rounded-xl bg-[#1C1C1E] border border-dashed border-white/10 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
              onClick={() => photoInputRef.current?.click()}
            >
              <Camera className="w-5 h-5 text-white/20" />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 font-black mb-2 block">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What are you selling?"
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 font-black mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the item, size, brand..."
            rows={4}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60 transition-colors resize-none"
          />
        </div>

        {/* Price */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 font-black mb-2 block">Price (GBP)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C8962C] font-bold text-sm">£</span>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60 transition-colors"
            />
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 font-black mb-2 block">Quantity Available</label>
          <div className="flex items-center gap-4 bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-2">
            <button 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-lg font-bold text-white active:scale-95"
            >
              -
            </button>
            <span className="flex-1 text-center text-lg font-black text-white">{quantity}</span>
            <button 
              onClick={() => setQuantity(q => q + 1)}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-lg font-bold text-white active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Status Toggle */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 font-black mb-2 block">Listing Status</label>
          <div className="flex gap-2">
            <button
              onClick={() => { setStatus('active'); if(quantity < 1) setQuantity(1); }}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                status === 'active' || status === 'live'
                  ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30'
                  : 'bg-white/5 text-white/40 grayscale'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${status === 'active' || status === 'live' ? 'bg-[#30D158] shadow-[0_0_8px_#30D158]' : 'bg-white/20'}`} />
              LIVE
            </button>
            <button
              onClick={() => setStatus('sold')}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                status === 'sold'
                  ? 'bg-[#C8962C]/20 text-[#C8962C] border border-[#C8962C]/30'
                  : 'bg-white/5 text-white/40 grayscale'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${status === 'sold' ? 'bg-[#C8962C] shadow-[0_0_8px_#C8962C]' : 'bg-white/20'}`} />
              SOLD
            </button>
          </div>
          <p className="text-[10px] text-white/20 mt-2 px-1">
            {status === 'sold' ? 'Listing is hidden from marketplace.' : 'Listing is visible and can be purchased.'}
          </p>
        </div>

        {/* Condition */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 font-black mb-2 block">Condition</label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                onClick={() => setCondition(c.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  condition === c.value
                    ? 'bg-[#C8962C] text-black'
                    : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/30 font-black mb-2 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  category === cat
                    ? 'bg-[#C8962C] text-black'
                    : 'bg-white/10 text-white/60 hover:bg-white/15'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom action bar */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2" style={{ backgroundColor: 'rgba(5,5,7,0.95)' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          style={{ backgroundColor: '#C8962C', color: '#000' }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 text-white/30 hover:text-[#FF3B30] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete listing
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 h-10 rounded-xl font-bold text-xs bg-white/10 text-white/60"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 h-10 rounded-xl font-bold text-xs bg-[#FF3B30] text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Confirm Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
