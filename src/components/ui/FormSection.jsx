/**
 * FormSection - Collapsible form section with progress
 * 
 * Use to organize long forms into digestible chunks
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FormSection({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = false,
  isComplete = false,
  required = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border border-white/10 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-4 p-4 text-left transition-colors',
          isOpen ? 'bg-white/5' : 'hover:bg-white/5'
        )}
      >
        {/* Icon */}
        {Icon && (
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            isComplete ? 'bg-[#39FF14]/20' : 'bg-white/10'
          )}>
            {isComplete ? (
              <Check className="w-5 h-5 text-[#39FF14]" />
            ) : (
              <Icon className="w-5 h-5 text-white/60" />
            )}
          </div>
        )}

        {/* Title & Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-black uppercase text-sm">{title}</h3>
            {required && (
              <span className="text-[10px] text-[#FF1493] font-bold">Required</span>
            )}
          </div>
          {description && (
            <p className="text-xs text-white/40 mt-0.5 truncate">{description}</p>
          )}
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-white/40" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Progress indicator for forms
export function FormProgress({ sections, currentSection }) {
  const completedCount = sections.filter(s => s.isComplete).length;
  const progress = (completedCount / sections.length) * 100;

  return (
    <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/10 p-4">
      {/* Progress bar */}
      <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-gradient-to-r from-[#FF1493] to-[#B026FF]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Section dots */}
      <div className="flex items-center justify-between gap-1">
        {sections.map((section, idx) => (
          <div
            key={section.id}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1 rounded transition-colors',
              currentSection === section.id ? 'bg-white/10' : ''
            )}
          >
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                section.isComplete ? 'bg-[#39FF14]' : 'bg-white/20'
              )}
            />
            <span className={cn(
              'text-[9px] font-bold uppercase hidden sm:block',
              currentSection === section.id ? 'text-white' : 'text-white/40'
            )}>
              {section.label}
            </span>
          </div>
        ))}
      </div>

      {/* Completion text */}
      <p className="text-center text-xs text-white/40 mt-2">
        {completedCount} of {sections.length} sections complete
      </p>
    </div>
  );
}

// Inline field with label
export function FormField({ label, required, hint, error, children, className = '' }) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-white/80">{label}</label>
          {required && <span className="text-[10px] text-[#FF1493]">*</span>}
        </div>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-white/40">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

// Auto-save indicator
export function AutoSaveIndicator({ status }) {
  const statusConfig = {
    saved: { text: 'Saved', color: 'text-[#39FF14]', icon: '✓' },
    saving: { text: 'Saving...', color: 'text-white/60', icon: '○' },
    error: { text: 'Error saving', color: 'text-red-400', icon: '!' },
    idle: { text: '', color: '', icon: '' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  if (!config.text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-center gap-2 text-xs', config.color)}
    >
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </motion.div>
  );
}

export default FormSection;
