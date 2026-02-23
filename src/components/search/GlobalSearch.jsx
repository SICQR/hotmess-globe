import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44, supabase } from '@/api/base44Client';
import { Search, User, MapPin, ShoppingBag, X, Clock, Loader2, Star, TrendingUp, Sliders } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { addToSearchHistory, getPopularSearches, getTrendingSearches } from './SearchHistory';
import { trackEvent } from '@/components/utils/analytics';

const RECENT_SEARCHES_KEY = 'hotmess_search_history';
const SAVED_SEARCHES_KEY = 'hotmess_saved_searches';

// Custom debounce hook for search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all', // all, people, events, products
    city: '',
    dateRange: '', // today, this-week, this-month
    sortBy: 'relevance', // relevance, date, popularity
  });
  const [savedSearches, setSavedSearches] = useState([]);
  const [popularSearches] = useState(getPopularSearches());
  const [trendingSearches] = useState(getTrendingSearches());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      const savedSearchesData = localStorage.getItem(SAVED_SEARCHES_KEY);
      
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentSearches(parsed.map(s => typeof s === 'string' ? { query: s } : s));
      }
      if (savedSearchesData) {
        setSavedSearches(JSON.parse(savedSearchesData));
      }
    } catch {
      setRecentSearches([]);
    }
  }, [isOpen]);

  const saveRecentSearch = (searchQuery) => {
    if (!searchQuery?.trim()) return;
    addToSearchHistory(searchQuery, filters);
    
    // Track search analytics
    trackEvent('search', {
      query: searchQuery,
      filters,
      results_count: filteredUsers.length + filteredBeacons.length + filteredProducts.length,
    });
    
    // Update local state
    const updated = [
      { query: searchQuery, filters, timestamp: Date.now() },
      ...recentSearches.filter(s => s.query !== searchQuery)
    ].slice(0, 10);
    setRecentSearches(updated);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const saveSearch = () => {
    if (!query.trim()) return;
    
    const newSaved = [
      { query, filters, timestamp: Date.now() },
      ...savedSearches.filter(s => s.query !== query)
    ].slice(0, 10);
    
    setSavedSearches(newSaved);
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(newSaved));
  };

  const isSearchSaved = savedSearches.some(s => s.query === query);

  // Backend full-text search for users (Supabase RPC)
  // Note: No default value - undefined means query is disabled, null means error occurred
  const { data: backendUsers, isLoading: backendUsersLoading } = useQuery({
    queryKey: ['search-users', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery?.trim()) return null;
      const { data, error } = await supabase.rpc('search_users', {
        search_query: debouncedQuery,
        limit_count: 10,
      });
      if (error) {
        console.warn('[GlobalSearch] Backend user search failed, falling back to client-side:', error.message);
        return null; // Signal to use fallback
      }
      return data || [];
    },
    enabled: isOpen && !!debouncedQuery?.trim() && (filters.type === 'all' || filters.type === 'people'),
    staleTime: 10000,
  });

  // Backend full-text search for beacons (Supabase RPC)
  const { data: backendBeacons, isLoading: backendBeaconsLoading } = useQuery({
    queryKey: ['search-beacons', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery?.trim()) return null;
      const { data, error } = await supabase.rpc('search_beacons', {
        search_query: debouncedQuery,
        limit_count: 10,
      });
      if (error) {
        console.warn('[GlobalSearch] Backend beacon search failed, falling back to client-side:', error.message);
        return null;
      }
      return data || [];
    },
    enabled: isOpen && !!debouncedQuery?.trim() && (filters.type === 'all' || filters.type === 'events'),
    staleTime: 10000,
  });

  // Determine if we need client-side fallback:
  // - backendUsers === undefined: query disabled (no search query or wrong filter type)
  // - backendUsers === null: query ran but failed
  const needUsersFallback = backendUsers === undefined || backendUsers === null;
  const needBeaconsFallback = backendBeacons === undefined || backendBeacons === null;

  // Fallback: Load all data for client-side filtering (when backend search unavailable or for products)
  const { data: allUsers = [], isLoading: allUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isOpen && needUsersFallback,
    staleTime: 30000,
  });

  const { data: allBeacons = [], isLoading: allBeaconsLoading } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.list(),
    enabled: isOpen && needBeaconsFallback,
    staleTime: 30000,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    enabled: isOpen,
    staleTime: 30000,
  });

  const isLoading = backendUsersLoading || backendBeaconsLoading || allUsersLoading || allBeaconsLoading || productsLoading;
  const isSearching = query !== debouncedQuery;

  // Use backend results when available, otherwise fall back to client-side filtering
  const filteredUsers = useMemo(() => {
    if (!debouncedQuery || (filters.type !== 'all' && filters.type !== 'people')) return [];

    // Use backend search results if available (Array.isArray checks for valid array, not null/undefined)
    if (Array.isArray(backendUsers)) {
      let results = backendUsers;
      if (filters.city) {
        results = results.filter(u => u.city?.toLowerCase().includes(filters.city.toLowerCase()));
      }
      return results.slice(0, 5);
    }

    // Fallback to client-side filtering
    const lowerQuery = debouncedQuery.toLowerCase();
    let results = allUsers.filter(u => 
      u.full_name?.toLowerCase().includes(lowerQuery) ||
      u.email?.toLowerCase().includes(lowerQuery) ||
      u.display_name?.toLowerCase().includes(lowerQuery)
    );
    
    if (filters.city) {
      results = results.filter(u => u.city?.toLowerCase().includes(filters.city.toLowerCase()));
    }
    
    return results.slice(0, 5);
  }, [backendUsers, allUsers, debouncedQuery, filters]);

  const filteredBeacons = useMemo(() => {
    if (!debouncedQuery || (filters.type !== 'all' && filters.type !== 'events')) return [];

    // Use backend search results if available (Array.isArray checks for valid array, not null/undefined)
    let results;
    if (Array.isArray(backendBeacons)) {
      results = [...backendBeacons];
    } else {
      // Fallback to client-side filtering
      const lowerQuery = debouncedQuery.toLowerCase();
      results = allBeacons.filter(b => 
        b.title?.toLowerCase().includes(lowerQuery) ||
        b.city?.toLowerCase().includes(lowerQuery) ||
        b.description?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Apply additional filters
    if (filters.city) {
      results = results.filter(b => b.city?.toLowerCase().includes(filters.city.toLowerCase()));
    }
    
    // Filter by date range
    if (filters.dateRange) {
      const now = Date.now(); // Use timestamp to avoid mutation issues
      let cutoffDate;
      
      switch (filters.dateRange) {
        case 'today': {
          // End of today: create new Date, set to end of day
          const endOfToday = new Date(now);
          endOfToday.setHours(23, 59, 59, 999);
          cutoffDate = endOfToday;
          results = results.filter(b => {
            const eventDate = new Date(b.start_time || b.event_date);
            return eventDate >= new Date(now) && eventDate <= cutoffDate;
          });
          break;
        }
        case 'this-week':
          cutoffDate = new Date(now + 7 * 24 * 60 * 60 * 1000);
          results = results.filter(b => {
            const eventDate = new Date(b.start_time || b.event_date);
            return eventDate >= new Date(now) && eventDate <= cutoffDate;
          });
          break;
        case 'this-month':
          cutoffDate = new Date(now + 30 * 24 * 60 * 60 * 1000);
          results = results.filter(b => {
            const eventDate = new Date(b.start_time || b.event_date);
            return eventDate >= new Date(now) && eventDate <= cutoffDate;
          });
          break;
      }
    }
    
    // Sort results
    if (filters.sortBy === 'date') {
      results.sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
    }
    
    return results.slice(0, 5);
  }, [backendBeacons, allBeacons, debouncedQuery, filters]);

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery || (filters.type !== 'all' && filters.type !== 'products')) return [];
    const lowerQuery = debouncedQuery.toLowerCase();
    
    let results = products.filter(p => 
      p.name?.toLowerCase().includes(lowerQuery) ||
      p.description?.toLowerCase().includes(lowerQuery) ||
      p.category?.toLowerCase().includes(lowerQuery)
    );
    
    // Sort by popularity or price
    if (filters.sortBy === 'popularity') {
      results.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
    }
    
    return results.slice(0, 5);
  }, [products, debouncedQuery, filters]);

  const hasResults = filteredUsers.length > 0 || filteredBeacons.length > 0 || filteredProducts.length > 0;
  const totalResults = filteredUsers.length + filteredBeacons.length + filteredProducts.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-2 border-white text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-6 h-6 text-[#FF1493]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                saveRecentSearch(query.trim());
              }
            }}
            placeholder="Search people, events, products..."
            className="bg-white/5 border-white/20 text-white text-lg"
            autoFocus
          />
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-[#FF1493] text-black' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Sliders className="w-5 h-5" />
          </button>
          {query && !isSearchSaved && (
            <button 
              onClick={saveSearch}
              className="p-2 text-white/60 hover:text-[#FF1493] transition-colors"
              title="Save search"
            >
              <Star className="w-5 h-5" />
            </button>
          )}
          {isSearchSaved && (
            <Star className="w-5 h-5 text-[#FF1493] fill-[#FF1493]" />
          )}
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div>
              <label className="text-xs text-white/40 uppercase mb-1 block">Type</label>
              <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                <SelectTrigger className="bg-black border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="people">People</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-white/40 uppercase mb-1 block">City</label>
              <Input
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                placeholder="Any city"
                className="bg-black border-white/20"
              />
            </div>
            
            <div>
              <label className="text-xs text-white/40 uppercase mb-1 block">When</label>
              <Select value={filters.dateRange} onValueChange={(v) => setFilters({ ...filters, dateRange: v })}>
                <SelectTrigger className="bg-black border-white/20">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This week</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs text-white/40 uppercase mb-1 block">Sort by</label>
              <Select value={filters.sortBy} onValueChange={(v) => setFilters({ ...filters, sortBy: v })}>
                <SelectTrigger className="bg-black border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-6 max-h-96 overflow-y-auto">
          {!query && recentSearches.length > 0 && (
            <div className="space-y-6">
              {/* Recent Searches */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-white/40" />
                    <h3 className="text-xs uppercase tracking-wider text-white/40">Recent Searches</h3>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-white/40 hover:text-white/60 uppercase"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.slice(0, 8).map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(search.query || search);
                        if (search.filters) setFilters(search.filters);
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm transition-colors flex items-center gap-2"
                    >
                      <Clock className="w-3 h-3 text-white/40" />
                      {search.query || search}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Searches */}
              {savedSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-[#FF1493]" />
                    <h3 className="text-xs uppercase tracking-wider text-white/40">Saved Searches</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {savedSearches.slice(0, 5).map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setQuery(search.query);
                          if (search.filters) setFilters(search.filters);
                        }}
                        className="px-3 py-1.5 bg-[#FF1493]/10 hover:bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-full text-sm transition-colors flex items-center gap-2"
                      >
                        <Star className="w-3 h-3 text-[#FF1493]" />
                        {search.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!query && recentSearches.length === 0 && (
            <div className="py-8">
              {/* Popular Searches */}
              {popularSearches.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Popular Searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(search.query)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm transition-colors"
                      >
                        {search.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trending Searches */}
              {trendingSearches.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#39FF14]" />
                    Trending Now
                  </h3>
                  <div className="space-y-2">
                    {trendingSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(search.query)}
                        className="flex items-center justify-between w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                      >
                        <span className="font-medium">{search.query}</span>
                        <span className="text-xs text-[#39FF14]">+{search.change}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {popularSearches.length === 0 && trendingSearches.length === 0 && (
                <p className="text-center text-white/40">Start typing to search...</p>
              )}
            </div>
          )}

          {(isLoading || isSearching) && query && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#FF1493] animate-spin" />
              <span className="ml-2 text-white/40">Searching...</span>
            </div>
          )}

          {query && !isLoading && !isSearching && !hasResults && (
            <p className="text-center text-white/40 py-8">No results found for "{debouncedQuery}"</p>
          )}

          {filteredUsers.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">People</h3>
              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <Link
                    key={user.id || user.email}
                    to={createPageUrl(`Profile?uid=${user.auth_user_id || user.id}`)}
                    onClick={() => {
                      saveRecentSearch(query);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <User className="w-5 h-5 text-[#FF1493]" />
                    <div>
                      <div className="font-bold">{user.full_name}</div>
                      {user.username && <div className="text-xs text-white/60">@{user.username}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredBeacons.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Events</h3>
              <div className="space-y-2">
                {filteredBeacons.map(beacon => (
                  <Link
                    key={beacon.id}
                    to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}
                    onClick={() => {
                      saveRecentSearch(query);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <MapPin className="w-5 h-5 text-[#00D9FF]" />
                    <div>
                      <div className="font-bold">{beacon.title}</div>
                      <div className="text-xs text-white/60">{beacon.city}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/40 mb-3">Products</h3>
              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <Link
                    key={product.id}
                    to={createPageUrl(`ProductDetail?id=${product.id}`)}
                    onClick={() => {
                      saveRecentSearch(query);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <ShoppingBag className="w-5 h-5 text-[#39FF14]" />
                    <div>
                      <div className="font-bold">{product.name}</div>
                      <div className="text-xs text-white/60">{product.price_xp} XP</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}