/**
 * TicketMarketplace - Browse and search ticket listings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Ticket,
  Star,
  Shield,
  ChevronDown,
  X,
  SlidersHorizontal,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import TicketListingCard from './TicketListingCard';
import TicketPurchaseModal from './TicketPurchaseModal';

const TICKET_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'general_admission', label: 'General Admission' },
  { value: 'vip', label: 'VIP' },
  { value: 'early_bird', label: 'Early Bird' },
  { value: 'table', label: 'Table Booking' },
  { value: 'backstage', label: 'Backstage' },
];

const SORT_OPTIONS = [
  { value: 'event_date', label: 'Event Date', order: 'asc' },
  { value: 'asking_price_gbp', label: 'Price (Low to High)', order: 'asc' },
  { value: 'asking_price_gbp', label: 'Price (High to Low)', order: 'desc' },
  { value: 'created_at', label: 'Newest First', order: 'desc' },
  { value: 'view_count', label: 'Most Popular', order: 'desc' },
];

export default function TicketMarketplace({ eventId = null, initialCity = '' }) {
  const { user, token } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    city: initialCity,
    ticket_type: '',
    date_from: '',
    date_to: '',
    min_price: '',
    max_price: '',
    sort: 'event_date',
    order: 'asc',
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchListings = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (eventId) params.append('event_id', eventId);
      if (filters.search) params.append('event_name', filters.search);
      if (filters.city) params.append('city', filters.city);
      if (filters.ticket_type) params.append('ticket_type', filters.ticket_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      params.append('sort', filters.sort);
      params.append('order', filters.order);
      params.append('page', page.toString());
      params.append('limit', pagination.limit.toString());
      
      const res = await fetch(`/api/ticket-reseller/listings?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch listings');
      }
      
      setListings(data.listings || []);
      setPagination(data.pagination || pagination);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId, filters, pagination.limit]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (index) => {
    const option = SORT_OPTIONS[index];
    setFilters(prev => ({
      ...prev,
      sort: option.value,
      order: option.order,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      city: '',
      ticket_type: '',
      date_from: '',
      date_to: '',
      min_price: '',
      max_price: '',
      sort: 'event_date',
      order: 'asc',
    });
  };

  const hasActiveFilters = filters.city || filters.ticket_type || 
    filters.date_from || filters.date_to || 
    filters.min_price || filters.max_price;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          {/* Search Bar */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search events, venues..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                  : 'border-gray-700 hover:bg-gray-800'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-pink-500 rounded-full" />
              )}
            </button>
          </div>
          
          {/* Expandable Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4">
                  {/* City */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">City</label>
                    <input
                      type="text"
                      value={filters.city}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                      placeholder="Any city"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm"
                    />
                  </div>
                  
                  {/* Ticket Type */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    <select
                      value={filters.ticket_type}
                      onChange={(e) => handleFilterChange('ticket_type', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm"
                    >
                      {TICKET_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Date From */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">From Date</label>
                    <input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm"
                    />
                  </div>
                  
                  {/* Date To */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">To Date</label>
                    <input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm"
                    />
                  </div>
                  
                  {/* Min Price */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Min Price</label>
                    <input
                      type="number"
                      value={filters.min_price}
                      onChange={(e) => handleFilterChange('min_price', e.target.value)}
                      placeholder="£0"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm"
                    />
                  </div>
                  
                  {/* Max Price */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Max Price</label>
                    <input
                      type="number"
                      value={filters.max_price}
                      onChange={(e) => handleFilterChange('max_price', e.target.value)}
                      placeholder="No max"
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm"
                    />
                  </div>
                  
                  {/* Sort */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Sort By</label>
                    <select
                      value={SORT_OPTIONS.findIndex(o => o.value === filters.sort && o.order === filters.order)}
                      onChange={(e) => handleSortChange(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm"
                    >
                      {SORT_OPTIONS.map((option, i) => (
                        <option key={i} value={i}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Clear Filters */}
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                      className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>
              {pagination.total} ticket{pagination.total !== 1 ? 's' : ''} available
            </span>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400">Buyer Protection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="container mx-auto px-4 py-6">
        {loading && listings.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchListings()}
              className="px-4 py-2 bg-pink-500 rounded-lg hover:bg-pink-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
            <p className="text-gray-400 mb-4">
              {hasActiveFilters 
                ? 'Try adjusting your filters'
                : 'Be the first to list tickets for this event'
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {listings.map(listing => (
                  <TicketListingCard
                    key={listing.id}
                    listing={listing}
                    onSelect={() => setSelectedListing(listing)}
                  />
                ))}
              </AnimatePresence>
            </div>
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => fetchListings(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchListings(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 border border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Purchase Modal */}
      <AnimatePresence>
        {selectedListing && (
          <TicketPurchaseModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            onSuccess={() => {
              setSelectedListing(null);
              fetchListings();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
