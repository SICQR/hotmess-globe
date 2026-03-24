/**
 * BlockedScreen — Hard block for under-18 or non-male users.
 * No back button. No logo tap. No escape.
 */
import React from 'react';

const MESSAGES = {
  age: 'HOTMESS is for men 18 and over.',
  gender: 'HOTMESS is a men-only space.',
};

export default function BlockedScreen({ reason = 'age' }) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center px-6">
      <p className="text-white text-lg font-bold text-center tracking-tight">
        {MESSAGES[reason] || MESSAGES.age}
      </p>
    </div>
  );
}
