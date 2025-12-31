import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, Lock } from 'lucide-react';
import { taxonomyConfig } from './taxonomyConfig';

/**
 * Normalize input using synonym engine
 */
function normalizeTag(input) {
  const normalized = input.toLowerCase().trim().replace(/\s+/g, ' ');
  const synonym = taxonomyConfig.synonyms.find(s => s.input === normalized);
  return synonym ? synonym.tagId : null;
}

export default function TagSelector({ 
  selectedTagIds = [], 
  onTagsChange, 
  categoryFilter = null,
  allowedTagIds = null,
  maxTags = 10,
  showEssentials = false,
  essentialTagIds = [],
  onEssentialsChange,
  showDealbreakers = false,
  dealbreakerTagIds = [],
  onDealbbreakersChange
}) {
  const [search, setSearch] = useState('');

  // Filter tags
  let availableTags = taxonomyConfig.tags;
  
  if (categoryFilter) {
    availableTags = availableTags.filter(t => 
      categoryFilter.includes(t.categoryId)
    );
  }
  
  if (allowedTagIds) {
    availableTags = availableTags.filter(t => allowedTagIds.includes(t.id));
  }

  // Search with synonym resolution
  const searchResults = search.trim() 
    ? availableTags.filter(t => {
        const normalized = normalizeTag(search);
        return t.label.toLowerCase().includes(search.toLowerCase()) ||
               t.id === normalized;
      })
    : availableTags;

  const handleToggleTag = (tagId) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else if (selectedTagIds.length < maxTags) {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleToggleEssential = (tagId) => {
    if (essentialTagIds.includes(tagId)) {
      onEssentialsChange(essentialTagIds.filter(id => id !== tagId));
    } else {
      onEssentialsChange([...essentialTagIds, tagId]);
    }
  };

  const handleToggleDealbreaker = (tagId) => {
    if (dealbreakerTagIds.includes(tagId)) {
      onDealbbreakersChange(dealbreakerTagIds.filter(id => id !== tagId));
    } else {
      onDealbbreakersChange([...dealbreakerTagIds, tagId]);
    }
  };

  const selectedTags = availableTags.filter(t => selectedTagIds.includes(t.id));
  const categoryGroups = {};
  
  searchResults.forEach(tag => {
    const category = taxonomyConfig.tagCategories.find(c => c.id === tag.categoryId);
    const categoryLabel = category?.label || 'Other';
    if (!categoryGroups[categoryLabel]) {
      categoryGroups[categoryLabel] = [];
    }
    categoryGroups[categoryLabel].push(tag);
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags (e.g., cali sober, aftercare, 420)"
          className="pl-10 bg-black border-white/20 text-white"
        />
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded">
          {selectedTags.map(tag => (
            <div key={tag.id} className="flex items-center gap-2">
              <Badge className="bg-[#00D9FF] text-black font-bold">
                {tag.label}
                <button
                  onClick={() => handleToggleTag(tag.id)}
                  className="ml-2 hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
              
              {showEssentials && (
                <button
                  onClick={() => handleToggleEssential(tag.id)}
                  className={`px-2 py-1 text-[10px] font-bold uppercase border ${
                    essentialTagIds.includes(tag.id)
                      ? 'bg-[#39FF14] border-[#39FF14] text-black'
                      : 'border-white/20 text-white/60'
                  }`}
                  title="Mark as essential"
                >
                  Essential
                </button>
              )}
              
              {showDealbreakers && essentialTagIds.includes(tag.id) && (
                <button
                  onClick={() => handleToggleDealbreaker(tag.id)}
                  className={`px-2 py-1 text-[10px] font-bold uppercase border ${
                    dealbreakerTagIds.includes(tag.id)
                      ? 'bg-[#FF073A] border-[#FF073A] text-white'
                      : 'border-white/20 text-white/60'
                  }`}
                  title="Make this a dealbreaker"
                >
                  Dealbreaker
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-white/40">
        {selectedTagIds.length} / {maxTags} tags selected
      </p>

      {/* Available tags by category */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(categoryGroups).map(([categoryLabel, tags]) => (
          <div key={categoryLabel}>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
              {categoryLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                const isSensitive = tag.isSensitive;
                
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    disabled={!isSelected && selectedTagIds.length >= maxTags}
                    className={`px-3 py-1.5 text-xs font-bold uppercase border transition-all ${
                      isSelected
                        ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                        : 'border-white/20 text-white hover:border-white/40'
                    } ${isSensitive ? 'flex items-center gap-1' : ''}`}
                  >
                    {isSensitive && <Lock className="w-3 h-3" />}
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}