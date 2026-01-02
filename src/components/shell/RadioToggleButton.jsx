import React from 'react';
import { Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRadio } from './RadioContext';

export default function RadioToggleButton() {
  const { isRadioOpen, toggleRadio } = useRadio();

  return (
    <motion.button
      onClick={toggleRadio}
      whileTap={{ scale: 0.95 }}
      className={`
        relative p-2 rounded-lg transition-all
        ${isRadioOpen 
          ? 'bg-[#B026FF] text-white shadow-[0_0_20px_rgba(176,38,255,0.5)]' 
          : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
        }
      `}
      aria-label="Toggle radio"
      title="RAW Convict Radio"
    >
      <Radio className="w-5 h-5" />
      {isRadioOpen && (
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-[#B026FF] rounded-lg opacity-30"
        />
      )}
      {isRadioOpen && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#39FF14] rounded-full" />
      )}
    </motion.button>
  );
}