import React, { useState, useEffect } from 'react';
import { Star, Bell, BellOff, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

const SAVED_KEY = 'hotmess_saved_searches';
const ALERTS_KEY = 'hotmess_search_alerts';

/**
 * Saved Searches Component
 * Full management interface for saved searches
 */
export default function SavedSearches({ onSearch }) {
  const [savedSearches, setSavedSearches] = useState([]);
  const [alerts, setAlerts] = useState({});
  
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(SAVED_KEY);
      const alertsData = localStorage.getItem(ALERTS_KEY);
      
      if (savedData) setSavedSearches(JSON.parse(savedData));
      if (alertsData) setAlerts(JSON.parse(alertsData));
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  }, []);
  
  const toggleAlert = (searchQuery) => {
    const updated = { ...alerts, [searchQuery]: !alerts[searchQuery] };
    setAlerts(updated);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
  };
  
  const removeSearch = (searchQuery) => {
    const updated = savedSearches.filter(s => s.query !== searchQuery);
    setSavedSearches(updated);
    localStorage.setItem(SAVED_KEY, JSON.stringify(updated));
    
    // Also remove alert
    const updatedAlerts = { ...alerts };
    delete updatedAlerts[searchQuery];
    setAlerts(updatedAlerts);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(updatedAlerts));
  };
  
  const clearAll = () => {
    setSavedSearches([]);
    setAlerts({});
    localStorage.removeItem(SAVED_KEY);
    localStorage.removeItem(ALERTS_KEY);
  };
  
  if (savedSearches.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="w-12 h-12 mx-auto mb-4 text-white/20" />
        <h3 className="text-lg font-bold mb-2">No Saved Searches</h3>
        <p className="text-white/60 text-sm max-w-xs mx-auto">
          Save your favorite searches to quickly find events, people, and products.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold uppercase tracking-wider">Saved Searches</h2>
        <Button
          onClick={clearAll}
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      </div>
      
      {/* Saved Searches List */}
      <div className="space-y-2">
        {savedSearches.map((search, idx) => (
          <div
            key={idx}
            className="bg-white/5 border border-white/10 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => onSearch(search)}
                className="flex-1 text-left flex items-center gap-2 hover:text-[#C8962C] transition-colors"
              >
                <Star className="w-4 h-4 text-[#C8962C] fill-[#C8962C]" />
                <span className="font-semibold">{search.query}</span>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>
              
              <button
                onClick={() => removeSearch(search.query)}
                className="p-2 text-white/40 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Filters display */}
            {search.filters && Object.keys(search.filters).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(search.filters)
                  .filter(([, value]) => value)
                  .map(([key, value]) => (
                    <span 
                      key={key}
                      className="text-xs bg-white/10 px-2 py-1 rounded"
                    >
                      {key}: {value}
                    </span>
                  ))}
              </div>
            )}
            
            {/* Alert toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-white/60">
                {alerts[search.query] ? (
                  <Bell className="w-4 h-4 text-[#00D9FF]" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                <span>Alert me for new results</span>
              </div>
              <Switch
                checked={alerts[search.query] || false}
                onCheckedChange={() => toggleAlert(search.query)}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Info */}
      <div className="bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-lg p-4 text-sm">
        <div className="flex items-start gap-2">
          <Bell className="w-4 h-4 text-[#00D9FF] mt-0.5" />
          <p className="text-white/80">
            Enable alerts to get notified when new events or content matches your saved searches.
          </p>
        </div>
      </div>
    </div>
  );
}
