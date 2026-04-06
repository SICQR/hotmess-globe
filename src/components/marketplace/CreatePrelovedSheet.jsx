import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { toast } from 'sonner';

const CATEGORIES = ['Clothing', 'Accessories', 'Art', 'Equipment', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Well Loved'];

export default function CreatePrelovedSheet({ open, onClose, currentUser }) {
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoFiles, setPhotoFiles] = useState([]);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Clothing',
    brand: '',
    size: '',
    condition: 'Like New',
    shipping_available: true,
    local_pickup: true,
  });

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 4) {
      toast.error('Maximum 4 photos allowed');
      return;
    }
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPhotos((prev) => [...prev, ...newPreviews]);
    setPhotoFiles((prev) => [...prev, ...files]);
  };

  const removePhoto = (idx) => {
    URL.revokeObjectURL(photos[idx]);
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    photos.forEach((url) => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoFiles([]);
    setForm({
      title: '',
      description: '',
      price: '',
      category: 'Clothing',
      brand: '',
      size: '',
      condition: 'Like New',
      shipping_available: true,
      local_pickup: true,
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.description.trim()) return toast.error('Description is required');
    if (!form.price || Number(form.price) <= 0) return toast.error('Enter a valid price');
    if (!form.category) return toast.error('Select a category');
    if (!form.condition) return toast.error('Select condition');
    if (photoFiles.length === 0) return toast.error('Add at least 1 photo');

    setSubmitting(true);
    try {
      // Upload images to Supabase Storage
      const imageUrls = [];
      for (const file of photoFiles) {
        try {
          const url = await uploadToStorage(file, 'listing-images', currentUser.id);
          imageUrls.push(url);
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('Image upload failed. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      // Insert listing
      const { error: insertError } = await supabase.from('market_listings').insert({
        seller_id: currentUser.id,
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        currency: 'GBP',
        category: form.category,
        brand: form.brand.trim() || null,
        size: form.size.trim() || null,
        condition: form.condition,
        images: imageUrls,
        status: 'active',
        location_country: 'GB',
        shipping_available: form.shipping_available,
        local_pickup: form.local_pickup,
      });

      if (insertError) throw insertError;

      toast.success('Listing submitted for review');
      resetForm();
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err?.message || 'Failed to submit listing');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-black border-t-2 border-[#C8962C] rounded-t-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  Sell Something
                </h2>
                <button onClick={onClose} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">
                    Title *
                  </label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g. RAW Brief — Black/White, Size M"
                    className="bg-white/5 border-white/20"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">
                    Description *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Condition details, why you're selling, etc."
                    rows={3}
                    className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-[#C8962C]"
                  />
                </div>

                {/* Price + Category row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">
                      Price (£) *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => updateField('price', e.target.value)}
                      placeholder="0.00"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">
                      Category *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="w-full h-10 bg-white/5 border border-white/20 rounded-md px-3 text-white text-sm focus:outline-none focus:border-[#C8962C]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-black">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Brand + Size row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">
                      Brand
                    </label>
                    <Input
                      value={form.brand}
                      onChange={(e) => updateField('brand', e.target.value)}
                      placeholder="e.g. RAW, HUNG"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">
                      Size
                    </label>
                    <Input
                      value={form.size}
                      onChange={(e) => updateField('size', e.target.value)}
                      placeholder="e.g. M, 32, One Size"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-white/60 mb-1 block">
                    Condition *
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateField('condition', c)}
                        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border transition-colors ${
                          form.condition === c
                            ? 'bg-[#C8962C] border-[#C8962C] text-black'
                            : 'bg-transparent border-white/20 text-white/60 hover:border-white/40'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">
                    Photos * <span className="text-white/40">(max 4)</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {photos.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-20 border border-white/20">
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 border border-dashed border-white/20 flex flex-col items-center justify-center text-white/40 hover:border-[#C8962C] hover:text-[#C8962C] transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-[10px] mt-1">Add</span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>

                {/* Shipping toggles */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.shipping_available}
                      onChange={(e) => updateField('shipping_available', e.target.checked)}
                      className="accent-[#C8962C]"
                    />
                    Shipping available
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.local_pickup}
                      onChange={(e) => updateField('local_pickup', e.target.checked)}
                      className="accent-[#C8962C]"
                    />
                    Local pickup
                  </label>
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black uppercase tracking-wider h-12"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Submit for Review'
                  )}
                </Button>

                <p className="text-xs text-white/40 text-center">
                  Listings are reviewed before going live. You'll be notified once approved.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
