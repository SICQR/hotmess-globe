/**
 * Product Form Component
 * 
 * For sellers to create/edit products with content rating support.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Image, 
  DollarSign, 
  Tag,
  AlertTriangle,
  Info,
  Upload,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/utils/AuthProvider';
import { supabase } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

// Content rating options
const CONTENT_RATINGS = [
  { 
    id: 'sfw', 
    label: 'Safe for Work', 
    description: 'General audience content',
    color: '#39FF14',
    requiresVerification: false
  },
  { 
    id: 'suggestive', 
    label: 'Suggestive', 
    description: 'Mild adult themes, no explicit content',
    color: '#FFB800',
    requiresVerification: false
  },
  { 
    id: 'nsfw', 
    label: 'NSFW', 
    description: 'Adult content, requires age verification',
    color: '#FF1493',
    requiresVerification: true
  },
  { 
    id: 'xxx', 
    label: 'Explicit (XXX)', 
    description: 'Explicit adult content, 2257 compliance required',
    color: '#B026FF',
    requiresVerification: true,
    requires2257: true
  }
];

// Product categories
const CATEGORIES = [
  'Apparel', 'Accessories', 'Art', 'Digital', 'Health & Wellness',
  'Home & Living', 'Jewelry', 'Adult', 'Vintage', 'Other'
];

export default function ProductForm({ 
  productId, // For editing existing product
  onSuccess,
  className = '' 
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [has2257, setHas2257] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    images: [],
    content_rating: 'sfw',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  // Load existing product if editing
  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('Product')
        .select('*')
        .eq('id', productId)
        .single();

      if (!error && data) {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          price: data.price_cents ? (data.price_cents / 100).toFixed(2) : '',
          category: data.category || '',
          images: data.images || [],
          content_rating: data.content_rating || 'sfw',
          tags: data.tags || []
        });
      }
      setLoading(false);
    }

    loadProduct();
  }, [productId]);

  // Check 2257 compliance
  useEffect(() => {
    async function check2257() {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('compliance_2257')
        .select('id')
        .eq('seller_id', user.id)
        .not('id_verified_at', 'is', null)
        .single();

      setHas2257(!!data);
    }

    check2257();
  }, [user?.id]);

  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Add tag
  const addTag = () => {
    if (!tagInput.trim()) return;
    if (formData.tags.includes(tagInput.trim())) return;
    
    updateField('tags', [...formData.tags, tagInput.trim()]);
    setTagInput('');
  };

  // Remove tag
  const removeTag = (tag) => {
    updateField('tags', formData.tags.filter(t => t !== tag));
  };

  // Handle image upload (simplified - would use Supabase Storage)
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    // In production, upload to Supabase Storage and get URLs
    const newImages = files.map(f => URL.createObjectURL(f));
    updateField('images', [...formData.images, ...newImages].slice(0, 10));
  };

  // Remove image
  const removeImage = (index) => {
    updateField('images', formData.images.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedRating = CONTENT_RATINGS.find(r => r.id === formData.content_rating);
    
    // Check 2257 if required
    if (selectedRating?.requires2257 && !has2257) {
      alert('You need to complete 2257 compliance verification for explicit content.');
      navigate('/seller/compliance');
      return;
    }

    setSaving(true);

    try {
      const productData = {
        seller_id: user.id,
        title: formData.title,
        description: formData.description,
        price_cents: Math.round(parseFloat(formData.price) * 100),
        category: formData.category,
        images: formData.images,
        content_rating: formData.content_rating,
        age_verified_only: selectedRating?.requiresVerification || false,
        requires_2257: selectedRating?.requires2257 || false,
        tags: formData.tags,
        status: 'active'
      };

      if (productId) {
        await supabase
          .from('Product')
          .update(productData)
          .eq('id', productId);
      } else {
        await supabase
          .from('Product')
          .insert(productData);
      }

      onSuccess?.();
      navigate('/shop/my-products');

    } catch (error) {
      console.error('Save product error:', error);
      alert('Failed to save product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF1493]" />
      </div>
    );
  }

  const selectedRating = CONTENT_RATINGS.find(r => r.id === formData.content_rating);

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Title */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Product Title *</label>
        <Input
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="What are you selling?"
          required
          className="bg-white/5 border-white/20"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Description *</label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Describe your product..."
          rows={4}
          required
          className="bg-white/5 border-white/20"
        />
      </div>

      {/* Price & Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-2">Price (£) *</label>
          <Input
            type="number"
            step="0.01"
            min="0.50"
            value={formData.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="0.00"
            required
            className="bg-white/5 border-white/20"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-2">Category *</label>
          <select
            value={formData.category}
            onChange={(e) => updateField('category', e.target.value)}
            required
            className="w-full h-10 px-3 bg-white/5 border border-white/20 text-white"
          >
            <option value="">Select category</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Images (up to 10)</label>
        <div className="grid grid-cols-5 gap-2">
          {formData.images.map((img, i) => (
            <div key={i} className="relative aspect-square bg-white/5 border border-white/10">
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {formData.images.length < 10 && (
            <label className="aspect-square bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF1493] transition-colors">
              <Upload className="w-5 h-5 text-white/40" />
              <span className="text-[10px] text-white/40 mt-1">Add</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Content Rating */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Content Rating *</label>
        <div className="grid grid-cols-2 gap-2">
          {CONTENT_RATINGS.map((rating) => (
            <button
              key={rating.id}
              type="button"
              onClick={() => updateField('content_rating', rating.id)}
              className={`
                p-3 border-2 text-left transition-all
                ${formData.content_rating === rating.id 
                  ? 'bg-white/10' 
                  : 'border-white/10 hover:border-white/30'
                }
              `}
              style={{
                borderColor: formData.content_rating === rating.id ? rating.color : undefined
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: rating.color }}
                />
                <span className="font-bold text-sm text-white">{rating.label}</span>
              </div>
              <p className="text-xs text-white/50">{rating.description}</p>
            </button>
          ))}
        </div>

        {/* Rating warnings */}
        {selectedRating?.requiresVerification && (
          <div className="mt-3 p-3 bg-[#FFB800]/10 border border-[#FFB800]/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFB800] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-white/80">
              <p>This content requires buyers to verify their age (18+).</p>
            </div>
          </div>
        )}

        {selectedRating?.requires2257 && (
          <div className={`mt-3 p-3 flex items-start gap-2 ${has2257 ? 'bg-[#39FF14]/10 border-[#39FF14]/30' : 'bg-red-500/10 border-red-500/30'} border`}>
            {has2257 ? (
              <>
                <Check className="w-4 h-4 text-[#39FF14] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white/80">2257 compliance verified ✓</p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-red-400 font-bold">2257 compliance required</p>
                  <p className="text-white/60">You must verify your identity before selling explicit content.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/seller/compliance')}
                    className="text-[#FF1493] underline mt-1"
                  >
                    Complete verification →
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a tag"
            className="bg-white/5 border-white/20"
          />
          <Button type="button" onClick={addTag} variant="outline">
            Add
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <span 
                key={tag}
                className="px-2 py-1 bg-white/10 text-sm text-white/80 flex items-center gap-1"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X className="w-3 h-3 text-white/40 hover:text-white" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={saving || (selectedRating?.requires2257 && !has2257)}
        className="w-full bg-[#FF1493] hover:bg-[#FF1493]/80 h-12 font-bold"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : productId ? (
          'Update Product'
        ) : (
          'List Product'
        )}
      </Button>
    </form>
  );
}
