/**
 * L2EditListingSheet -- Edit an existing preloved listing
 *
 * Registered in sheetSystem (height: full) + SheetRouter.
 * Pre-fills from existing listing data passed as sheet props.
 * Save -> update preloved_listings table.
 * Delete -> set status = 'archived'.
 */

import { useState, useEffect } from 'react';
import { Loader2, Trash2, Save, Camera, X } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
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
  const [loading, setLoading] = useState(!listingProp);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('good');
  const [category, setCategory] = useState('Clothing');
  const [photos, setPhotos] = useState([]);
  const [id, setId] = useState(listingId || listingProp?.id || null);

  // Load listing data if not passed as prop
  useEffect(() => {
    if (listingProp) {
      setTitle(listingProp.title || '');
      setDescription(listingProp.description || '');
      setPrice(String(listingProp.price || ''));
      setCondition(listingProp.condition || 'good');
      setCategory(listingProp.category || 'Clothing');
      setPhotos(Array.isArray(listingProp.images) ? listingProp.images : []);
      setId(listingProp.id);
      setLoading(false);
      return;
    }
    if (!listingId) { setLoading(false); return; }

    const load = async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select('*')
        .eq('id', listingId)
        .single();
      if (data) {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPrice(String(data.price || ''));
        setCondition(data.condition || 'good');
        setCategory(data.category || 'Clothing');
        setPhotos(Array.isArray(data.images) ? data.images : []);
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
    if (!id) { toast.error('Listing not found'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('market_listings')
      .update({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        condition,
        category,
        images: photos,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSaving(false);
    if (error) {
      console.error('[edit-listing] save error:', error.message);
      toast.error('Failed to save changes');
    } else {
      toast.success('Listing updated');
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
              className="w-20 h-20 rounded-xl bg-[#1C1C1E] border border-dashed border-white/10 flex items-center justify-center flex-shrink-0"
              onClick={() => toast('Photo upload is being finished now')}
            >
              <Camera className="w-5 h-5 text-white/20" />
            </button>
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
