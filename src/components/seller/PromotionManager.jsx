import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Tag, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function PromotionManager({ promotions, products, sellerEmail }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_purchase: '',
    max_uses: '',
    valid_from: '',
    valid_until: '',
    applicable_products: []
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Promotion.create({
      ...data,
      seller_email: sellerEmail,
      active: true,
      used_count: 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['promotions']);
      setShowForm(false);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_purchase: '',
        max_uses: '',
        valid_from: '',
        valid_until: '',
        applicable_products: []
      });
      toast.success('Promotion created');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Promotion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['promotions']);
      toast.success('Promotion deleted');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      discount_value: parseFloat(formData.discount_value),
      min_purchase: formData.min_purchase ? parseFloat(formData.min_purchase) : 0,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
    };
    createMutation.mutate(data);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black uppercase">Promotions & Coupons</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#E62020] hover:bg-[#E62020]/90 text-black">
          <Plus className="w-4 h-4 mr-2" />
          Create Promo
        </Button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">Promo Code</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                required
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">Discount Type</label>
              <Select value={formData.discount_type} onValueChange={(val) => setFormData({ ...formData, discount_type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed_xp">Fixed XP Off</SelectItem>
                  <SelectItem value="fixed_gbp">Fixed £ Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">Discount Value</label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                placeholder={formData.discount_type === 'percentage' ? '20' : '1000'}
                required
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">Min Purchase</label>
              <Input
                type="number"
                value={formData.min_purchase}
                onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                placeholder="5000"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">Max Uses</label>
              <Input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                placeholder="100"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">Valid From</label>
              <Input
                type="datetime-local"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-white/60 mb-2 block">Valid Until</label>
              <Input
                type="datetime-local"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#E62020] hover:bg-[#E62020]/90 text-black">
              Create
            </Button>
          </div>
        </motion.form>
      )}

      {/* Promotions List */}
      <div className="space-y-2">
        {promotions.map((promo, idx) => {
          const isExpired = promo.valid_until && new Date(promo.valid_until) < new Date();
          const isMaxedOut = promo.max_uses && promo.used_count >= promo.max_uses;
          
          return (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-white/5 border border-white/10 rounded-xl p-4 ${
                !promo.active || isExpired || isMaxedOut ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Tag className="w-5 h-5 text-[#FFEB3B]" />
                    <code className="text-xl font-black">{promo.code}</code>
                    <Button variant="ghost" size="icon" onClick={() => copyCode(promo.code)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-white/40 text-xs uppercase">Discount</p>
                      <p className="font-bold">
                        {promo.discount_type === 'percentage'
                          ? `${promo.discount_value}%`
                          : promo.discount_type === 'fixed_xp'
                          ? `${promo.discount_value} XP`
                          : `£${promo.discount_value}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase">Uses</p>
                      <p className="font-bold">
                        {promo.used_count}/{promo.max_uses || '∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase">Valid Until</p>
                      <p className="font-bold">
                        {promo.valid_until ? format(new Date(promo.valid_until), 'MMM d') : 'No limit'}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase">Status</p>
                      <p className={`font-bold ${
                        isExpired || isMaxedOut ? 'text-red-500' : 
                        promo.active ? 'text-green-500' : 'text-white/40'
                      }`}>
                        {isExpired ? 'Expired' : isMaxedOut ? 'Maxed' : promo.active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(promo.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}

        {promotions.length === 0 && (
          <div className="text-center py-12 text-white/40">
            <Tag className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No promotions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}