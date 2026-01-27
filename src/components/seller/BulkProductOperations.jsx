import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { 
  CheckSquare,
  Square,
  Trash2,
  Archive,
  Tag,
  DollarSign,
  Copy,
  Download,
  Upload,
  MoreHorizontal,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function BulkProductOperations({ 
  products, 
  selectedIds, 
  onSelectionChange,
  sellerEmail 
}) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [bulkEditData, setBulkEditData] = useState({});
  const queryClient = useQueryClient();

  const selectedProducts = products.filter(p => selectedIds.includes(p.id));
  const allSelected = products.length > 0 && selectedIds.length === products.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(products.map(p => p.id));
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedIds) {
        await base44.entities.Product.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-products']);
      onSelectionChange([]);
      toast.success(`${selectedIds.length} products deleted`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete products');
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (status) => {
      for (const id of selectedIds) {
        await base44.entities.Product.update(id, { status });
      }
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries(['seller-products']);
      onSelectionChange([]);
      toast.success(`${selectedIds.length} products marked as ${status}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update products');
    },
  });

  const bulkPriceMutation = useMutation({
    mutationFn: async ({ adjustment, type }) => {
      for (const id of selectedIds) {
        const product = products.find(p => p.id === id);
        if (!product) continue;

        let newPrice;
        if (type === 'percentage') {
          newPrice = Math.round(product.price_xp * (1 + adjustment / 100));
        } else if (type === 'fixed') {
          newPrice = Math.max(0, product.price_xp + adjustment);
        } else if (type === 'set') {
          newPrice = adjustment;
        }

        await base44.entities.Product.update(id, { price_xp: newPrice });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-products']);
      onSelectionChange([]);
      setBulkEditData({});
      toast.success(`Prices updated for ${selectedIds.length} products`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update prices');
    },
  });

  const bulkTagMutation = useMutation({
    mutationFn: async ({ tag, action }) => {
      for (const id of selectedIds) {
        const product = products.find(p => p.id === id);
        if (!product) continue;

        let newTags = [...(product.tags || [])];
        if (action === 'add' && !newTags.includes(tag)) {
          newTags.push(tag);
        } else if (action === 'remove') {
          newTags = newTags.filter(t => t !== tag);
        }

        await base44.entities.Product.update(id, { tags: newTags });
      }
    },
    onSuccess: (_, { tag, action }) => {
      queryClient.invalidateQueries(['seller-products']);
      onSelectionChange([]);
      setBulkEditData({});
      toast.success(`Tag "${tag}" ${action === 'add' ? 'added to' : 'removed from'} ${selectedIds.length} products`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update tags');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedIds) {
        const product = products.find(p => p.id === id);
        if (!product) continue;

        const { id: _, created_at, updated_at, created_date, updated_date, sales_count, ...productData } = product;
        await base44.entities.Product.create({
          ...productData,
          name: `${product.name} (Copy)`,
          status: 'draft',
          sales_count: 0,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['seller-products']);
      onSelectionChange([]);
      toast.success(`${selectedIds.length} products duplicated`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to duplicate products');
    },
  });

  const exportProducts = () => {
    const exportData = selectedProducts.map(p => ({
      name: p.name,
      description: p.description,
      price_xp: p.price_xp,
      price_gbp: p.price_gbp,
      product_type: p.product_type,
      category: p.category,
      tags: p.tags?.join(', '),
      inventory_count: p.inventory_count,
      status: p.status,
    }));

    const csv = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).map(v => `"${v || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Products exported to CSV');
  };

  const handleAction = (action) => {
    setPendingAction(action);
    if (['delete', 'archive'].includes(action)) {
      setShowConfirmDialog(true);
    } else if (action === 'price') {
      setBulkEditData({ type: 'price', adjustment: 0, adjustmentType: 'percentage' });
      setShowConfirmDialog(true);
    } else if (action === 'tag') {
      setBulkEditData({ type: 'tag', tag: '', action: 'add' });
      setShowConfirmDialog(true);
    }
  };

  const confirmAction = () => {
    switch (pendingAction) {
      case 'delete':
        bulkDeleteMutation.mutate();
        break;
      case 'archive':
        bulkStatusMutation.mutate('archived');
        break;
      case 'activate':
        bulkStatusMutation.mutate('active');
        break;
      case 'deactivate':
        bulkStatusMutation.mutate('draft');
        break;
      case 'price':
        bulkPriceMutation.mutate({
          adjustment: parseFloat(bulkEditData.adjustment),
          type: bulkEditData.adjustmentType,
        });
        break;
      case 'tag':
        bulkTagMutation.mutate({
          tag: bulkEditData.tag,
          action: bulkEditData.action,
        });
        break;
    }
    setShowConfirmDialog(false);
    setPendingAction(null);
  };

  if (products.length === 0) return null;

  return (
    <>
      {/* Selection Bar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          {/* Select All */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5 text-[#E62020]" />
            ) : someSelected ? (
              <div className="w-5 h-5 border-2 border-[#E62020] rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-[#E62020]" />
              </div>
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span>
              {selectedIds.length > 0 
                ? `${selectedIds.length} selected` 
                : `Select all (${products.length})`}
            </span>
          </button>

          {/* Bulk Actions */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                {/* Quick Actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => bulkStatusMutation.mutate('active')}
                  disabled={bulkStatusMutation.isPending}
                  className="text-[#39FF14] hover:bg-[#39FF14]/10"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Activate
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => bulkStatusMutation.mutate('draft')}
                  disabled={bulkStatusMutation.isPending}
                  className="text-white/60 hover:text-white"
                >
                  <Archive className="w-4 h-4 mr-1" />
                  Deactivate
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateMutation.mutate()}
                  disabled={duplicateMutation.isPending}
                  className="text-white/60 hover:text-white"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Duplicate
                </Button>

                {/* More Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black border-white/20">
                    <DropdownMenuItem 
                      onClick={() => handleAction('price')}
                      className="text-white hover:bg-white/10"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Bulk Price Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleAction('tag')}
                      className="text-white hover:bg-white/10"
                    >
                      <Tag className="w-4 h-4 mr-2" />
                      Add/Remove Tags
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={exportProducts}
                      className="text-white hover:bg-white/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem 
                      onClick={() => handleAction('delete')}
                      className="text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear Selection */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectionChange([])}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">
              {pendingAction === 'delete' && 'Delete Products'}
              {pendingAction === 'archive' && 'Archive Products'}
              {pendingAction === 'price' && 'Bulk Price Edit'}
              {pendingAction === 'tag' && 'Manage Tags'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {pendingAction === 'delete' && (
                <div className="flex items-start gap-3 text-red-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    This will permanently delete {selectedIds.length} product(s). 
                    This action cannot be undone.
                  </span>
                </div>
              )}
              {pendingAction === 'archive' && (
                `This will archive ${selectedIds.length} product(s). They won't be visible to buyers.`
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Price Edit Form */}
          {pendingAction === 'price' && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-xs text-white/60 mb-2 block">Adjustment Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'percentage', label: 'Percentage' },
                    { value: 'fixed', label: 'Fixed Amount' },
                    { value: 'set', label: 'Set Price' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBulkEditData(prev => ({ ...prev, adjustmentType: opt.value }))}
                      className={`p-2 text-xs font-bold border-2 transition-all ${
                        bulkEditData.adjustmentType === opt.value
                          ? 'bg-[#E62020] border-[#E62020] text-black'
                          : 'bg-white/5 border-white/20 text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">
                  {bulkEditData.adjustmentType === 'percentage' && 'Percentage Change (+ or -)'}
                  {bulkEditData.adjustmentType === 'fixed' && 'Amount to Add/Subtract XP'}
                  {bulkEditData.adjustmentType === 'set' && 'New Price (XP)'}
                </Label>
                <Input
                  type="number"
                  value={bulkEditData.adjustment || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, adjustment: e.target.value }))}
                  placeholder={bulkEditData.adjustmentType === 'percentage' ? '10 or -10' : '100'}
                  className="bg-white/5 border-white/20 text-white"
                />
                {bulkEditData.adjustmentType === 'percentage' && (
                  <p className="text-xs text-white/40 mt-1">
                    Enter positive number to increase, negative to decrease
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tag Edit Form */}
          {pendingAction === 'tag' && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-xs text-white/60 mb-2 block">Action</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'add', label: 'Add Tag' },
                    { value: 'remove', label: 'Remove Tag' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBulkEditData(prev => ({ ...prev, action: opt.value }))}
                      className={`p-2 text-xs font-bold border-2 transition-all ${
                        bulkEditData.action === opt.value
                          ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                          : 'bg-white/5 border-white/20 text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">Tag Name</Label>
                <Input
                  value={bulkEditData.tag || ''}
                  onChange={(e) => setBulkEditData(prev => ({ ...prev, tag: e.target.value }))}
                  placeholder="e.g. sale, new, limited"
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingAction(null);
                setBulkEditData({});
              }}
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={
                (pendingAction === 'price' && !bulkEditData.adjustment) ||
                (pendingAction === 'tag' && !bulkEditData.tag)
              }
              className={
                pendingAction === 'delete'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#E62020] hover:bg-[#E62020]/90 text-black'
              }
            >
              {pendingAction === 'delete' && `Delete ${selectedIds.length} Products`}
              {pendingAction === 'archive' && `Archive ${selectedIds.length} Products`}
              {pendingAction === 'price' && 'Update Prices'}
              {pendingAction === 'tag' && `${bulkEditData.action === 'add' ? 'Add' : 'Remove'} Tag`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Individual product checkbox component
export function ProductCheckbox({ productId, selectedIds, onSelectionChange }) {
  const isSelected = selectedIds.includes(productId);

  const toggle = (e) => {
    e.stopPropagation();
    if (isSelected) {
      onSelectionChange(selectedIds.filter(id => id !== productId));
    } else {
      onSelectionChange([...selectedIds, productId]);
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-1 hover:bg-white/10 rounded transition-colors"
    >
      {isSelected ? (
        <CheckSquare className="w-5 h-5 text-[#E62020]" />
      ) : (
        <Square className="w-5 h-5 text-white/40 hover:text-white" />
      )}
    </button>
  );
}
