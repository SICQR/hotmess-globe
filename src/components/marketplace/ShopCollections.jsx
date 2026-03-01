import React from 'react';
import { motion } from 'framer-motion';

const COLLECTIONS = [
  {
    id: 'raw',
    name: 'RAW',
    tagline: 'Hardwear. Clean lines. Loud intent.',
    color: '#000000',
    textColor: '#FFFFFF',
  },
  {
    id: 'hung',
    name: 'HUNG',
    tagline: "Fit that doesn't ask permission.",
    color: '#C8962C',
    textColor: '#FFFFFF',
  },
  {
    id: 'high',
    name: 'HIGH',
    tagline: 'Club armour. Daylight optional.',
    color: '#C8962C',
    textColor: '#FFFFFF',
  },
  {
    id: 'super',
    name: 'SUPER',
    tagline: 'Limited. Unapologetic. Gone fast.',
    color: '#00D9FF',
    textColor: '#000000',
  },
];

export default function ShopCollections({ onSelectCollection }) {
  return (
    <div className="mb-8">
      <div className="text-xs uppercase tracking-widest text-white/40 mb-4 font-black">
        CORE COLLECTIONS
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {COLLECTIONS.map((collection, idx) => (
          <motion.button
            key={collection.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onSelectCollection(collection.id)}
            className="group relative aspect-square overflow-hidden transition-all hover:scale-105"
            style={{ backgroundColor: collection.color }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h3
                className="text-3xl font-black italic mb-2"
                style={{ color: collection.textColor }}
              >
                {collection.name}
              </h3>
              <p
                className="text-xs uppercase tracking-wider opacity-80"
                style={{ color: collection.textColor }}
              >
                {collection.tagline}
              </p>
            </div>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
