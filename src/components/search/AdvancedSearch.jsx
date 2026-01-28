import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  X, 
  Save, 
  Clock, 
  Trash2,
  MapPin,
  Sliders,
  Star,
  Bookmark
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { debounce } from '@/utils/performance';

const SEARCH_HISTORY_KEY = 'hotmess_search_history';
const SAVED_SEARCHES_KEY = 'hotmess_saved_searches';
const MAX_HISTORY = 20;
const MAX_SAVED = 10;

const DEFAULT_FILTERS = {
  query: '',
  category: 'all',
  location: '',
  distance: 50, // km
  dateRange: 'any',
  priceRange: [0, 10000],
  rating: 0,
  verified: false,
  tags: [],
  sortBy: 'relevance',
};

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'profiles', label: 'People' },
  { value: 'events', label: 'Events' },
  { value: 'products', label: 'Products' },
  { value: 'beacons', label: 'Beacons' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'any', label: 'Any Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'distance', label: 'Nearest' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

export default function AdvancedSearch({ 
  onSearch, 
  initialFilters = {},
  showSavedSearches = true,
  showHistory = true,
  placeholder = "Search hotmess...",
  className = "",
}) {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initialFilters });
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveName, setSaveName] = useState('');
  const queryClient = useQueryClient();

  // Load history and saved searches from localStorage
  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
      const saved = JSON.parse(localStorage.getItem(SAVED_SEARCHES_KEY) || '[]');
      setSearchHistory(history);
      setSavedSearches(saved);
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((searchFilters) => {
      if (onSearch) {
        onSearch(searchFilters);
      }
    }, 300),
    [onSearch]
  );

  // Add to history
  const addToHistory = useCallback((searchFilters) => {
    if (!searchFilters.query.trim()) return;

    const historyEntry = {
      id: Date.now(),
      query: searchFilters.query,
      filters: searchFilters,
      timestamp: new Date().toISOString(),
    };

    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.query !== searchFilters.query);
      const newHistory = [historyEntry, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Save search
  const saveSearch = useCallback(() => {
    if (!saveName.trim()) {
      toast.error('Please enter a name for this search');
      return;
    }

    const savedEntry = {
      id: Date.now(),
      name: saveName,
      filters,
      createdAt: new Date().toISOString(),
    };

    setSavedSearches(prev => {
      if (prev.length >= MAX_SAVED) {
        toast.error(`Maximum ${MAX_SAVED} saved searches allowed`);
        return prev;
      }
      const newSaved = [savedEntry, ...prev];
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(newSaved));
      return newSaved;
    });

    setSaveName('');
    toast.success('Search saved!');
  }, [filters, saveName]);

  // Delete saved search
  const deleteSavedSearch = useCallback((id) => {
    setSavedSearches(prev => {
      const newSaved = prev.filter(s => s.id !== id);
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(newSaved));
      return newSaved;
    });
    toast.success('Saved search deleted');
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    toast.success('Search history cleared');
  }, []);

  // Apply saved search
  const applySavedSearch = useCallback((saved) => {
    setFilters(saved.filters);
    debouncedSearch(saved.filters);
    setShowSuggestions(false);
  }, [debouncedSearch]);

  // Handle filter change
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      debouncedSearch(newFilters);
      return newFilters;
    });
  }, [debouncedSearch]);

  // Handle search submit
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    addToHistory(filters);
    if (onSearch) {
      onSearch(filters);
    }
    setShowSuggestions(false);
  }, [filters, addToHistory, onSearch]);

  // Toggle tag
  const toggleTag = useCallback((tag) => {
    setFilters(prev => {
      const newTags = prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag];
      const newFilters = { ...prev, tags: newTags };
      debouncedSearch(newFilters);
      return newFilters;
    });
  }, [debouncedSearch]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    debouncedSearch(DEFAULT_FILTERS);
  }, [debouncedSearch]);

  const hasActiveFilters = useMemo(() => {
    return filters.category !== 'all' ||
           filters.location ||
           filters.distance !== 50 ||
           filters.dateRange !== 'any' ||
           filters.priceRange[0] > 0 ||
           filters.priceRange[1] < 10000 ||
           filters.rating > 0 ||
           filters.verified ||
           filters.tags.length > 0 ||
           filters.sortBy !== 'relevance';
  }, [filters]);

  return (
    <div className={`relative ${className}`}>
      {/* Main Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder={placeholder}
              className="pl-10 pr-10 bg-white/5 border-white/20 text-white h-12"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => updateFilter('query', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={`h-12 px-4 border-white/20 ${
                  hasActiveFilters ? 'bg-[#E62020]/20 border-[#E62020]' : ''
                }`}
              >
                <Sliders className="w-5 h-5" />
                {hasActiveFilters && (
                  <span className="ml-2 w-2 h-2 bg-[#E62020] rounded-full" />
                )}
              </Button>
            </SheetTrigger>

            <SheetContent className="bg-black border-white/20 text-white w-[400px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-white font-black uppercase">Filters</SheetTitle>
                <SheetDescription className="text-white/60">
                  Refine your search results
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Category */}
                <div>
                  <Label className="text-xs uppercase text-white/60 mb-2 block">Category</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateFilter('category', opt.value)}
                        className={`p-2 text-sm font-bold border-2 transition-all ${
                          filters.category === opt.value
                            ? 'bg-[#E62020] border-[#E62020] text-black'
                            : 'bg-white/5 border-white/20 text-white hover:border-white/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <Label className="text-xs uppercase text-white/60 mb-2 block">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      value={filters.location}
                      onChange={(e) => updateFilter('location', e.target.value)}
                      placeholder="City or area..."
                      className="pl-10 bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <Label className="text-xs uppercase text-white/60 mb-2 flex justify-between">
                    <span>Distance</span>
                    <span className="text-white">{filters.distance} km</span>
                  </Label>
                  <Slider
                    value={[filters.distance]}
                    onValueChange={([v]) => updateFilter('distance', v)}
                    min={1}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Date Range */}
                <div>
                  <Label className="text-xs uppercase text-white/60 mb-2 block">Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DATE_RANGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateFilter('dateRange', opt.value)}
                        className={`p-2 text-sm font-bold border-2 transition-all ${
                          filters.dateRange === opt.value
                            ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                            : 'bg-white/5 border-white/20 text-white hover:border-white/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <Label className="text-xs uppercase text-white/60 mb-2 flex justify-between">
                    <span>Price Range (XP)</span>
                    <span className="text-white">{filters.priceRange[0]} - {filters.priceRange[1]}</span>
                  </Label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(v) => updateFilter('priceRange', v)}
                    min={0}
                    max={10000}
                    step={100}
                    className="w-full"
                  />
                </div>

                {/* Rating */}
                <div>
                  <Label className="text-xs uppercase text-white/60 mb-2 block">Minimum Rating</Label>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => updateFilter('rating', rating)}
                        className={`p-2 transition-all ${
                          filters.rating >= rating ? 'text-[#FFEB3B]' : 'text-white/20'
                        }`}
                      >
                        <Star className={`w-6 h-6 ${filters.rating >= rating ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verified Only */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.verified}
                      onChange={(e) => updateFilter('verified', e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <span className="font-bold">Verified Only</span>
                  </label>
                </div>

                {/* Sort By */}
                <div>
                  <Label className="text-xs uppercase text-white/60 mb-2 block">Sort By</Label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="w-full p-3 bg-white/5 border-2 border-white/20 text-white rounded-lg"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Save Search */}
                <div className="border-t border-white/10 pt-4">
                  <Label className="text-xs uppercase text-white/60 mb-2 block">Save This Search</Label>
                  <div className="flex gap-2">
                    <Input
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Search name..."
                      className="bg-white/5 border-white/20 text-white"
                    />
                    <Button
                      type="button"
                      onClick={saveSearch}
                      disabled={!saveName.trim()}
                      className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={resetFilters}
                    variant="outline"
                    className="flex-1 border-white/20 text-white"
                  >
                    Reset All
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      handleSubmit();
                      setIsOpen(false);
                    }}
                    className="flex-1 bg-[#E62020] hover:bg-[#E62020]/90 text-black font-bold"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Button
            type="submit"
            className="h-12 px-6 bg-[#E62020] hover:bg-[#E62020]/90 text-black font-bold"
          >
            Search
          </Button>
        </div>
      </form>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (searchHistory.length > 0 || savedSearches.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/20 rounded-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto"
          >
            {/* Saved Searches */}
            {showSavedSearches && savedSearches.length > 0 && (
              <div className="p-3 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase text-white/60 font-bold flex items-center gap-2">
                    <Bookmark className="w-4 h-4" />
                    Saved Searches
                  </span>
                </div>
                {savedSearches.map(saved => (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group"
                  >
                    <button
                      onClick={() => applySavedSearch(saved)}
                      className="flex-1 text-left"
                    >
                      <span className="font-bold text-white">{saved.name}</span>
                      <span className="text-xs text-white/40 block">{saved.filters.query || 'All'}</span>
                    </button>
                    <button
                      onClick={() => deleteSavedSearch(saved.id)}
                      className="p-1 text-white/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search History */}
            {showHistory && searchHistory.length > 0 && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase text-white/60 font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent Searches
                  </span>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-white/40 hover:text-white"
                  >
                    Clear All
                  </button>
                </div>
                {searchHistory.slice(0, 5).map(history => (
                  <button
                    key={history.id}
                    onClick={() => {
                      setFilters(history.filters);
                      debouncedSearch(history.filters);
                      setShowSuggestions(false);
                    }}
                    className="w-full p-2 text-left hover:bg-white/5 rounded-lg flex items-center gap-2"
                  >
                    <Search className="w-4 h-4 text-white/40" />
                    <span className="text-white">{history.query}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3">
          {filters.category !== 'all' && (
            <Badge variant="secondary" className="bg-[#E62020]/20 text-[#E62020] border-[#E62020]/40">
              {CATEGORY_OPTIONS.find(c => c.value === filters.category)?.label}
              <button onClick={() => updateFilter('category', 'all')} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF]/40">
              <MapPin className="w-3 h-3 mr-1" />
              {filters.location}
              <button onClick={() => updateFilter('location', '')} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.verified && (
            <Badge variant="secondary" className="bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/40">
              Verified Only
              <button onClick={() => updateFilter('verified', false)} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {filters.rating > 0 && (
            <Badge variant="secondary" className="bg-[#FFEB3B]/20 text-[#FFEB3B] border-[#FFEB3B]/40">
              {filters.rating}+ Stars
              <button onClick={() => updateFilter('rating', 0)} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Click outside to close suggestions */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}

// Export filter utilities
export { DEFAULT_FILTERS, CATEGORY_OPTIONS, SORT_OPTIONS };
