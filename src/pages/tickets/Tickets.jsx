import React, { useState, useMemo } from 'react';
import { useTicketListings } from '@/hooks/useTickets';
import TicketCard from '@/components/tickets/TicketCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, SortAsc, SortDesc, Calendar, X, ChevronDown } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: SortDesc },
  { value: 'oldest', label: 'Oldest First', icon: SortAsc },
  { value: 'price_low', label: 'Price: Low to High', icon: SortAsc },
  { value: 'price_high', label: 'Price: High to Low', icon: SortDesc },
  { value: 'date', label: 'Event Date', icon: Calendar },
];

const PRICE_FILTERS = [
  { value: 'all', label: 'All Prices' },
  { value: 'under25', label: 'Under £25' },
  { value: '25to50', label: '£25 - £50' },
  { value: '50to100', label: '£50 - £100' },
  { value: 'over100', label: '£100+' },
];

export default function Tickets() {
  const navigate = useNavigate();
  const { listings, isLoading, error } = useTicketListings();
  
  // Filters and sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [priceFilter, setPriceFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    if (!listings) return [];
    
    let result = [...listings];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.event_name?.toLowerCase().includes(query) ||
        l.venue_name?.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query)
      );
    }
    
    // Price filter
    if (priceFilter !== 'all') {
      result = result.filter(l => {
        const price = l.price_gbp || 0;
        switch (priceFilter) {
          case 'under25': return price < 25;
          case '25to50': return price >= 25 && price < 50;
          case '50to100': return price >= 50 && price < 100;
          case 'over100': return price >= 100;
          default: return true;
        }
      });
    }
    
    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'price_low':
          return (a.price_gbp || 0) - (b.price_gbp || 0);
        case 'price_high':
          return (b.price_gbp || 0) - (a.price_gbp || 0);
        case 'date':
          return new Date(a.event_date || 0) - new Date(b.event_date || 0);
        case 'newest':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });
    
    return result;
  }, [listings, searchQuery, sortBy, priceFilter]);

  const activeFiltersCount = [
    searchQuery.trim() ? 1 : 0,
    priceFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setSearchQuery('');
    setPriceFilter('all');
    setSortBy('newest');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl p-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Tickets</h1>
            <p className="text-sm text-white/60">Buy & sell event tickets securely</p>
          </div>
          <Button
            variant="hot"
            onClick={() => navigate('/tickets/new')}
          >
            Sell Ticket
          </Button>
        </div>

        {/* Search and Filters Bar */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, venues..."
                className="bg-white/5 border-white/20 pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`border-white/20 ${showFilters || activeFiltersCount > 0 ? 'bg-[#C8962C]/20 border-[#C8962C]' : ''}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-[#C8962C] text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            
            {/* Sort Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="border-white/20"
              >
                {SORT_OPTIONS.find(o => o.value === sortBy)?.icon && (
                  React.createElement(SORT_OPTIONS.find(o => o.value === sortBy).icon, { className: 'w-4 h-4 mr-2' })
                )}
                Sort
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-black border border-white/20 rounded-lg overflow-hidden z-50"
                  >
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-white/10 ${
                          sortBy === option.value ? 'bg-[#C8962C]/20 text-[#C8962C]' : 'text-white'
                        }`}
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex flex-wrap gap-4">
                    {/* Price Filter */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-xs text-white/60 uppercase mb-2 block">Price Range</label>
                      <div className="flex flex-wrap gap-2">
                        {PRICE_FILTERS.map(filter => (
                          <button
                            key={filter.value}
                            onClick={() => setPriceFilter(filter.value)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              priceFilter === filter.value
                                ? 'bg-[#00D9FF] text-black'
                                : 'bg-white/10 text-white/60 hover:bg-white/20'
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {activeFiltersCount > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-sm text-white/60">
                        {filteredListings.length} results
                      </span>
                      <button
                        onClick={clearFilters}
                        className="text-sm text-[#C8962C] hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info banner */}
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🎟️</div>
            <div>
              <div className="font-semibold text-white">Peer-to-Peer Resale</div>
              <div className="text-sm text-white/70">
                All sales require chat first. We verify tickets and hold payment in escrow until transfer is confirmed.
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-red-400">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredListings?.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-4xl mb-4">🎫</div>
            <div className="text-lg font-semibold text-white mb-2">
              {listings?.length > 0 ? 'No tickets match your filters' : 'No tickets listed yet'}
            </div>
            <div className="text-sm text-white/60 mb-4">
              {listings?.length > 0 ? 'Try adjusting your search or filters' : 'Be the first to list a ticket for resale'}
            </div>
            {listings?.length > 0 ? (
              <Button variant="outline" onClick={clearFilters} className="border-white/20">
                Clear Filters
              </Button>
            ) : (
              <Button variant="cyan" onClick={() => navigate('/tickets/new')}>
                List Your Ticket
              </Button>
            )}
          </div>
        )}

        {/* Listings grid */}
        {!isLoading && !error && filteredListings?.length > 0 && (
          <motion.div 
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            layout
          >
            <AnimatePresence mode="popLayout">
              {filteredListings.map((listing) => (
                <motion.div
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <TicketCard
                    listing={listing}
                    onClick={() => navigate(`/tickets/${listing.id}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
