import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Search bar for filtering messages in a conversation
 */
export default function ChatSearchBar({
  searchQuery,
  setSearchQuery,
  resultCount,
  onClose,
}) {
  return (
    <div className="bg-black border-b-2 border-white/20 p-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-white/40" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="SEARCH IN CONVERSATION..."
          className="flex-1 bg-black border-2 border-white/20 text-white placeholder:text-white/40 placeholder:uppercase placeholder:font-mono placeholder:text-xs"
          autoFocus
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchQuery('')}
            className="text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {searchQuery && (
        <p className="text-xs text-white/40 mt-2 font-mono">
          {resultCount} {resultCount === 1 ? 'result' : 'results'} found
        </p>
      )}
    </div>
  );
}
