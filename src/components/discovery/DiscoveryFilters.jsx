import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PROFILE_TYPES = [
  { id: 'standard', label: 'Standard' },
  { id: 'seller', label: 'Seller' },
  { id: 'creator', label: 'Creator' },
  { id: 'organizer', label: 'Organizer' },
  { id: 'premium', label: 'Premium' },
];

const DISTANCE_OPTIONS = [
  { value: 1, label: '1 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: -1, label: 'Unlimited' },
];

export default function DiscoveryFilters({ isOpen, onClose, filters, onFiltersChange }) {
  const quickToggles = [
    { id: 'onlineNow', label: 'Online now' },
    { id: 'nearMe', label: 'Near me' },
    { id: 'hasFace', label: 'Has face pic' },
    { id: 'chemFree', label: 'Chem-free' },
    { id: 'hasPremiumContent', label: 'Has premium content' },
    { id: 'verified', label: 'Verified only' },
  ];

  const handleAgeChange = (values) => {
    onFiltersChange({ 
      ...filters, 
      ageMin: values[0], 
      ageMax: values[1] 
    });
  };

  const handleDistanceChange = (value) => {
    onFiltersChange({ 
      ...filters, 
      distanceKm: value === '-1' ? null : parseInt(value, 10)
    });
  };

  const handleProfileTypeToggle = (typeId) => {
    const currentTypes = filters.profileTypes || [];
    const newTypes = currentTypes.includes(typeId)
      ? currentTypes.filter(t => t !== typeId)
      : [...currentTypes, typeId];
    onFiltersChange({ ...filters, profileTypes: newTypes });
  };

  const ageMin = filters.ageMin || 18;
  const ageMax = filters.ageMax || 99;
  const distanceKm = filters.distanceKm || -1;
  const profileTypes = filters.profileTypes || [];

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

          {/* Age Range */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Age Range</p>
            <div className="px-2">
              <Slider
                value={[ageMin, ageMax]}
                onValueChange={handleAgeChange}
                min={18}
                max={99}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-sm text-white/60">
                <span>{ageMin}</span>
                <span>{ageMax === 99 ? '99+' : ageMax}</span>
              </div>
            </div>
          </div>

          {/* Distance */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Distance</p>
            <Select 
              value={String(distanceKm)} 
              onValueChange={handleDistanceChange}
            >
              <SelectTrigger className="w-full bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Select distance" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20">
                {DISTANCE_OPTIONS.map(option => (
                  <SelectItem 
                    key={option.value} 
                    value={String(option.value)}
                    className="text-white hover:bg-white/10"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Profile Types */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Profile Types</p>
            <div className="grid grid-cols-2 gap-2">
              {PROFILE_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleProfileTypeToggle(type.id)}
                  className={`px-3 py-2 text-xs font-bold uppercase border-2 transition-all ${
                    profileTypes.includes(type.id)
                      ? 'bg-[#E62020] border-[#E62020] text-black'
                      : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-2">
              {profileTypes.length === 0 ? 'Showing all types' : `Showing ${profileTypes.length} type(s)`}
            </p>
          </div>

          {/* Looking For */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Looking For</p>
            <div className="flex flex-wrap gap-2">
              {['Chat', 'Dates', 'Friends', 'Networking', 'Fun'].map(item => {
                const lookingFor = filters.lookingFor || [];
                const isSelected = lookingFor.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      const newLookingFor = isSelected
                        ? lookingFor.filter(l => l !== item)
                        : [...lookingFor, item];
                      onFiltersChange({ ...filters, lookingFor: newLookingFor });
                    }}
                    className={`px-3 py-1.5 text-xs font-bold uppercase border transition-all ${
                      isSelected
                        ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                        : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort By */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-3">Sort By</p>
            <Select 
              value={filters.sortBy || 'match'} 
              onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value })}
            >
              <SelectTrigger className="w-full bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20">
                <SelectItem value="match" className="text-white hover:bg-white/10">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
                    Best Match
                  </span>
                </SelectItem>
                <SelectItem value="distance" className="text-white hover:bg-white/10">Distance</SelectItem>
                <SelectItem value="lastActive" className="text-white hover:bg-white/10">Last Active</SelectItem>
                <SelectItem value="newest" className="text-white hover:bg-white/10">Newest</SelectItem>
              </SelectContent>
            </Select>
            {filters.sortBy === 'match' && (
              <p className="text-xs text-white/40 mt-2">
                Sorted by compatibility score based on your preferences
              </p>
            )}
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
              className="flex-1 bg-[#E62020] text-black font-black"
            >
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
