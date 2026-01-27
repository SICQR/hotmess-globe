import React from 'react';

const REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥', '💯', '🎉'];

/**
 * Emoji reaction picker component
 */
export default function ReactionPicker({ onSelect, onClose }) {
  return (
    <div className="absolute z-10 mt-1 p-2 bg-black border-2 border-white rounded-lg flex gap-2">
      {REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="text-xl hover:scale-125 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export { REACTIONS };
