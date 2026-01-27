import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ChevronRight, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';

/**
 * Contextual Help Tooltip
 * Shows help information when clicking on help icons
 */
export function HelpTooltip({ 
  content, 
  title,
  learnMoreUrl,
  position = 'top', // top, bottom, left, right
  children 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  
  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);
  
  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };
  
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-white/20 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-white/20 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-white/20 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-white/20 border-y-transparent border-l-transparent',
  };
  
  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-white/40 hover:text-white/60 transition-colors"
        aria-label="Help"
        aria-expanded={isOpen}
      >
        {children || <HelpCircle className="w-4 h-4" />}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-50 w-72 ${positionClasses[position]}`}
          >
            <div className="bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl">
              {/* Arrow */}
              <div 
                className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
              />
              
              {/* Header */}
              {title && (
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#00D9FF]" />
                    <span className="font-semibold text-sm">{title}</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Content */}
              <div className="p-4 text-sm text-white/80">
                {content}
              </div>
              
              {/* Learn More Link */}
              {learnMoreUrl && (
                <div className="px-4 pb-3">
                  <a
                    href={learnMoreUrl}
                    className="text-sm text-[#00D9FF] hover:underline flex items-center gap-1"
                  >
                    Learn more
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Help Popover - Larger version for detailed help
 */
export function HelpPopover({
  title,
  content,
  steps,
  learnMoreUrl,
  trigger,
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <span onClick={() => setIsOpen(true)} className="cursor-pointer">
        {trigger || <HelpCircle className="w-5 h-5 text-white/40 hover:text-white/60" />}
      </span>
      
      <AnimatePresence>
        {isOpen && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-black border-2 border-white/20 rounded-xl max-w-md w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#00D9FF]/20 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-[#00D9FF]" />
                  </div>
                  <h3 className="text-lg font-bold">{title}</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6">
                {content && (
                  <p className="text-white/80 mb-4">{content}</p>
                )}
                
                {/* Steps */}
                {steps && steps.length > 0 && (
                  <div className="space-y-3">
                    {steps.map((step, idx) => (
                      <div 
                        key={idx}
                        className="flex gap-3 p-3 bg-white/5 rounded-lg"
                      >
                        <div className="w-6 h-6 bg-[#E62020] rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-black">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{step.title}</div>
                          {step.description && (
                            <p className="text-xs text-white/60 mt-1">{step.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                {learnMoreUrl ? (
                  <a
                    href={learnMoreUrl}
                    className="text-sm text-[#00D9FF] hover:underline flex items-center gap-1"
                  >
                    View full guide
                    <ChevronRight className="w-4 h-4" />
                  </a>
                ) : (
                  <div />
                )}
                <Button
                  onClick={() => setIsOpen(false)}
                  className="bg-white text-black hover:bg-white/90"
                >
                  Got it
                </Button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Feature Introduction
 * Shows a one-time introduction for new features
 */
export function FeatureIntro({
  id,
  title,
  description,
  image,
  steps,
  children,
}) {
  const [showIntro, setShowIntro] = useState(false);
  
  useEffect(() => {
    const seen = localStorage.getItem(`feature_intro_${id}`);
    if (!seen) {
      setShowIntro(true);
    }
  }, [id]);
  
  const dismiss = () => {
    localStorage.setItem(`feature_intro_${id}`, 'true');
    setShowIntro(false);
  };
  
  if (!showIntro) return children;
  
  return (
    <>
      {children}
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-gradient-to-br from-[#E62020]/20 to-[#B026FF]/20 border-2 border-[#E62020] rounded-xl max-w-lg w-full overflow-hidden"
          >
            {/* Image */}
            {image && (
              <div className="h-40 bg-black/50 flex items-center justify-center">
                <img src={image} alt="" className="max-h-full" />
              </div>
            )}
            
            {/* Content */}
            <div className="p-6 text-center">
              <h2 className="text-2xl font-black uppercase mb-2">{title}</h2>
              <p className="text-white/80 mb-6">{description}</p>
              
              {/* Steps */}
              {steps && (
                <div className="text-left space-y-2 mb-6">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 bg-[#E62020] rounded-full flex items-center justify-center text-xs font-bold text-black">
                        {idx + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <Button
                onClick={dismiss}
                className="w-full bg-[#E62020] hover:bg-[#E62020]/90 text-black font-bold"
              >
                Got it, let's go!
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

/**
 * Inline Help Text
 * Small help text that appears below form fields
 */
export function InlineHelp({ children, className = '' }) {
  return (
    <p className={`text-xs text-white/50 mt-1 flex items-start gap-1 ${className}`}>
      <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Help Badge
 * Small badge that indicates help is available
 */
export function HelpBadge({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-[#00D9FF] hover:underline"
    >
      <HelpCircle className="w-3 h-3" />
      Help
    </button>
  );
}

export default HelpTooltip;
