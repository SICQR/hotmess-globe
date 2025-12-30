import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const PRODUCT_TYPES = [
  { value: 'physical', label: 'Physical Goods' },
  { value: 'digital', label: 'Digital Download' },
  { value: 'service', label: 'Service' },
  { value: 'ticket', label: 'Event Ticket' },
  { value: 'badge', label: 'Achievement Badge' },
  { value: 'merch', label: 'Merch' },
];

const CATEGORIES = ['Apparel', 'Accessories', 'Art', 'Music', 'Events', 'Experiences', 'Digital', 'Other'];

export default function ProductForm({ product, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(product || {
    name: '',
    description: '',
    price_xp: 1000,
    price_gbp: null,
    product_type: 'physical',
    category: '',
    tags: [],
    image_urls: [],
    status: 'draft',
    inventory_count: 1,
    min_xp_level: null,
    details: {},
  });
  
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      
      setFormData(prev => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), ...urls]
      }));
      
      toast.success(`${files.length} image(s) uploaded`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Product Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Product Type</Label>
          <Select value={formData.product_type} onValueChange={(value) => setFormData({ ...formData, product_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your product..."
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Price (XP)</Label>
          <Input
            type="number"
            value={formData.price_xp}
            onChange={(e) => setFormData({ ...formData, price_xp: parseInt(e.target.value) })}
            min="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Stock</Label>
          <Input
            type="number"
            value={formData.inventory_count}
            onChange={(e) => setFormData({ ...formData, inventory_count: parseInt(e.target.value) })}
            min="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add tags..."
          />
          <Button type="button" onClick={addTag}>Add</Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-[#FF1493]/20 border border-[#FF1493] rounded-lg text-sm flex items-center gap-2">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-[#FF1493]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Images</Label>
        <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            {uploading ? (
              <Loader2 className="w-12 h-12 text-white/40 mx-auto mb-2 animate-spin" />
            ) : (
              <Upload className="w-12 h-12 text-white/40 mx-auto mb-2" />
            )}
            <p className="text-white/60">Click to upload images</p>
          </label>
        </div>
        
        {formData.image_urls.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            {formData.image_urls.map((url, index) => (
              <div key={index} className="relative group">
                <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-black/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-[#FF1493] hover:bg-[#FF1493]/90">
          {product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </motion.form>
  );
}