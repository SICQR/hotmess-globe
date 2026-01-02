import React from 'react';
import { motion } from 'framer-motion';

/**
 * AI-generated match explanation that appears on hover
 */
export default function AIMatchExplanation({ explanation }) {
  if (!explanation) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent p-4 pt-8"
    >
      <div className="flex items-start gap-2">
        <span className="text-[#00D9FF] text-xl flex-shrink-0">✨</span>
        <p className="text-xs text-white/90 leading-relaxed">
          {explanation}
        </p>
      </div>
    </motion.div>
  );
}