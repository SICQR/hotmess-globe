import React, { useState, useEffect } from 'react';
import { Clock, X, Star, StarOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HISTORY_KEY = 'hotmess_search_history';
const SAVED_KEY = 'hotmess_saved_searches';
const MAX_HISTORY = 20;
const MAX_SAVED = 10;

/**
 * Search History Item
 */
function SearchHistoryItem({ search, isSaved, onSelect, onSave, onRemove }) {
  return (
    <div 
      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
    >
      <button
        onClick={() => onSelect(search)}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <Clock className="w-4 h-4 text-white/40" />
        <div>
          <div className="font-medium">{search.query}</div>
          {search.filters && Object.keys(search.filters).length > 0 && (
            <div className="text-xs text-white/40">
              {Object.entries(search.filters)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')}
            </div>
          )}
        </div>
      </button>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onSave(search)}
          className="p-1.5 hover:bg-white/10 rounded"
          title={isSaved ? 'Remove from saved' : 'Save search'}
        >
          {isSaved ? (
            <Star className="w-4 h-4 text-[#FF1493] fill-[#FF1493]" />
          ) : (
            <StarOff className="w-4 h-4 text-white/40" />
          )}
        </button>
        <button
          onClick={() => onRemove(search)}
          className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-red-500"
          title="Remove from history"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Search History Component
 */
export function SearchHistory({ onSelectSearch }) {
  const [history, setHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  
  // Load from localStorage
  useEffect(() => {
    try {
      const historyData = localStorage.getItem(HISTORY_KEY);
      const savedData = localStorage.getItem(SAVED_KEY);
      
      if (historyData) setHistory(JSON.parse(historyData));
      if (savedData) setSavedSearches(JSON.parse(savedData));
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  }, []);
  
  const handleSelectSearch = (search) => {
    onSelectSearch(search);
  };
  
  const handleSaveSearch = (search) => {
    const isSaved = savedSearches.some(s => s.query === search.query);
    
    let updated;
    if (isSaved) {
      updated = savedSearches.filter(s => s.query !== search.query);
    } else {
      updated = [search, ...savedSearches].slice(0, MAX_SAVED);
    }
    
    setSavedSearches(updated);
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
  };
  
  const handleRemoveFromHistory = (search) => {
    const updated = history.filter(s => s.query !== search.query || s.timestamp !== search.timestamp);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };
  
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };
  
  const clearSaved = () => {
    setSavedSearches([]);
    localStorage.removeItem(SAVED_KEY);
  };
  
  const isSearchSaved = (search) => {
    return savedSearches.some(s => s.query === search.query);
  };
  
  if (history.length === 0 && savedSearches.length === 0) {
    return (
      <div className="text-center py-8 text-white/40">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No search history yet</p>
        <p className="text-xs mt-1">Your recent searches will appear here</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#FF1493]" />
              <h3 className="text-xs uppercase tracking-wider text-white/60">Saved Searches</h3>
            </div>
            <button
              onClick={clearSaved}
              className="text-xs text-white/40 hover:text-white/60 uppercase flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
          
          <div className="space-y-2">
            {savedSearches.map((search, idx) => (
              <SearchHistoryItem
                key={`saved-${idx}`}
                search={search}
                isSaved={true}
                onSelect={handleSelectSearch}
                onSave={handleSaveSearch}
                onRemove={() => handleSaveSearch(search)} // Remove from saved
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Recent Searches */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/40" />
              <h3 className="text-xs uppercase tracking-wider text-white/60">Recent</h3>
            </div>
            <button
              onClick={clearHistory}
              className="text-xs text-white/40 hover:text-white/60 uppercase flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
          
          <div className="space-y-2">
            {history.slice(0, 10).map((search, idx) => (
              <SearchHistoryItem
                key={`history-${idx}`}
                search={search}
                isSaved={isSearchSaved(search)}
                onSelect={handleSelectSearch}
                onSave={handleSaveSearch}
                onRemove={handleRemoveFromHistory}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Add a search to history
 */
export function addToSearchHistory(query, filters = {}) {
  if (!query?.trim()) return;
  
  try {
    const historyData = localStorage.getItem(HISTORY_KEY);
    let history = historyData ? JSON.parse(historyData) : [];
    
    // Remove duplicate
    history = history.filter(s => s.query !== query);
    
    // Add to front
    history.unshift({
      query: query.trim(),
      filters,
      timestamp: Date.now(),
    });
    
    // Limit size
    history = history.slice(0, MAX_HISTORY);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

/**
 * Get popular searches (could be from analytics)
 */
export function getPopularSearches() {
  // In a real app, this would fetch from analytics
  return [
    { query: 'tonight', count: 1240 },
    { query: 'techno', count: 890 },
    { query: 'warehouse party', count: 756 },
    { query: 'free events', count: 645 },
    { query: 'afterparty', count: 534 },
  ];
}

/**
 * Get trending searches
 */
export function getTrendingSearches() {
  return [
    { query: 'nye 2027', trend: 'up', change: 234 },
    { query: 'summer festival', trend: 'up', change: 156 },
    { query: 'boat party', trend: 'up', change: 89 },
  ];
}

export default SearchHistory;
