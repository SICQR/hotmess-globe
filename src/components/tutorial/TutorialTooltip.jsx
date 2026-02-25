import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TUTORIAL_STEPS = {
  'home': [
    { id: 'home-1', target: 'globe', content: 'This is the live globe - see events and activity in real-time' },
    { id: 'home-2', target: 'nav', content: 'Navigate between features using the sidebar' }
  ],
  'connect': [
    { id: 'connect-1', target: 'filters', content: 'Use filters to find compatible people' },
    { id: 'connect-2', target: 'compatibility', content: 'Green badges mean high compatibility' }
  ],
  'marketplace': [
    { id: 'market-1', target: 'xp', content: 'Products can be purchased with XP' },
    { id: 'market-2', target: 'cart', content: 'Add items to cart and checkout' }
  ]
};

export default function TutorialTooltip({ page }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  const steps = TUTORIAL_STEPS[page] || [];

  useEffect(() => {
    const tutorialKey = `tutorial_${page}_completed`;
    const completed = localStorage.getItem(tutorialKey);
    
    if (!completed && steps.length > 0) {
      setTimeout(() => setShow(true), 1000);
    }
  }, [page]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`tutorial_${page}_completed`, 'true');
    setShow(false);
  };

  const handleComplete = () => {
    localStorage.setItem(`tutorial_${page}_completed`, 'true');
    setShow(false);
  };

  if (!show || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[110] max-w-sm w-[calc(100vw-2rem)] md:w-auto"
      >
        <div className="bg-black border-2 border-[#C8962C] rounded-xl p-6 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#C8962C] flex items-center justify-center text-black font-black text-sm">
                {currentStep + 1}
              </div>
              <span className="text-xs text-white/40 uppercase">
                {currentStep + 1} of {steps.length}
              </span>
            </div>
            <button onClick={handleSkip} className="text-white/40 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-white mb-6">{step.content}</p>

          <div className="flex gap-2">
            {currentStep < steps.length - 1 ? (
              <>
                <Button onClick={handleSkip} variant="outline" className="flex-1 border-white/20">
                  Skip
                </Button>
                <Button onClick={handleNext} className="flex-1 bg-[#C8962C] text-black font-black">
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            ) : (
              <Button onClick={handleComplete} className="w-full bg-[#C8962C] text-black font-black">
                Got it!
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}