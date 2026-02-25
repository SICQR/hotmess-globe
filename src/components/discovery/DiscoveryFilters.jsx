import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function DiscoveryFilters({ isOpen, onClose, filters, onFiltersChange }) {
  const quickToggles = [
    { id: 'onlineNow', label: 'Online now' },
    { id: 'nearMe', label: 'Near me' },
    { id: 'hasFace', label: 'Has face pic' },
    { id: 'chemFree', label: 'Chem-free' }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="bg-black border-l-2 border-white/10 text-white overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-black uppercase text-white">Filters</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick toggles */}
          <div>
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Quick filters</p>
            <div className="space-y-2">
              {quickToggles.map(toggle => (
                <div key={toggle.id} className="flex items-center gap-2">
                  <Checkbox
                    id={toggle.id}
                    checked={filters[toggle.id] || false}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ ...filters, [toggle.id]: checked })
                    }
                  />
                  <Label htmlFor={toggle.id} className="text-sm cursor-pointer">
                    {toggle.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Coming soon sections */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">More filters coming soon</p>
            <p className="text-sm text-white/60">Age range, tribes, tags, logistics, and more.</p>
          </div>

          {/* Actions */}
          <div className="border-t border-white/10 pt-6 flex gap-2">
            <Button
              onClick={() => onFiltersChange({})}
              variant="outline"
              className="flex-1 border-white/20 text-white"
            >
              Clear all
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-[#C8962C] text-black font-black"
            >
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}