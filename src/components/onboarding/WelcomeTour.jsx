import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Zap, Users, Globe as GlobeIcon, ShoppingBag, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '../../utils';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to HOTMESS',
    description: 'Your social operating system for London nightlife, events, and connections.',
    icon: Zap,
    color: '#FF1493'
  },
  {
    id: 'connect',
    title: 'Discover People',
    description: 'Use Connect to find your tribe. Filter by interests, tags, and activity. Go "Right Now" when you\'re available.',
    icon: Users,
    color: '#00D9FF',
    link: 'Connect'
  },
  {
    id: 'globe',
    title: 'Explore the Globe',
    description: 'See real-time events, beacons, and activity happening around the world. Click to explore.',
    icon: GlobeIcon,
    color: '#B026FF',
    link: 'Globe'
  },
  {
    id: 'events',
    title: 'Events & Beacons',
    description: 'RSVP to events, check in at venues, create your own beacons. Earn XP and unlock achievements.',
    icon: Zap,
    color: '#FFEB3B',
    link: 'Events'
  },
  {
    id: 'marketplace',
    title: 'Shop & Trade',
    description: 'Buy and sell with XP or real money. Tickets, merch, services—all in one place.',
    icon: ShoppingBag,
    color: '#39FF14',
    link: 'Marketplace'
  },
  {
    id: 'messages',
    title: 'Stay Connected',
    description: 'Message your connections, join squads, and stay in the loop.',
    icon: MessageCircle,
    color: '#FF1493',
    link: 'Messages'
  }
];

export default function WelcomeTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hotmess_welcome_tour_completed');
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hotmess_welcome_tour_completed', 'true');
    setIsOpen(false);
    if (onComplete) onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('hotmess_welcome_tour_completed', 'true');
    setIsOpen(false);
  };

  const currentStepData = TOUR_STEPS[currentStep];
  const Icon = currentStepData.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Tour Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-black border-2 border-white max-w-lg w-full pointer-events-auto">
              {/* Header */}
              <div className="p-6 border-b-2 border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 border-2 border-white flex items-center justify-center"
                      style={{ backgroundColor: `${currentStepData.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: currentStepData.color }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black uppercase">{currentStepData.title}</h2>
                      <p className="text-xs text-white/40">Step {currentStep + 1} of {TOUR_STEPS.length}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/10">
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: currentStepData.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-white/80 leading-relaxed mb-6">
                  {currentStepData.description}
                </p>

                {currentStepData.link && (
                  <a
                    href={createPageUrl(currentStepData.link)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border-2 border-white/20 hover:border-[#FF1493] text-sm font-bold uppercase tracking-wider transition-colors mb-6"
                  >
                    Go to {currentStepData.title}
                    <ChevronRight className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t-2 border-white/20 flex items-center justify-between">
                <Button
                  onClick={handleSkip}
                  variant="ghost"
                  className="text-white/60 hover:text-white"
                >
                  Skip Tour
                </Button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      onClick={handlePrev}
                      variant="outline"
                      className="border-white/20"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    className="bg-[#FF1493] hover:bg-white text-white hover:text-black font-black border-2 border-white"
                  >
                    {currentStep === TOUR_STEPS.length - 1 ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Get Started
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}