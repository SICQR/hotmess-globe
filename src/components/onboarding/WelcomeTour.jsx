import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, Zap, Users, Globe as GlobeIcon, ShoppingBag, MessageCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '../../utils';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to HOTMESS',
    description: "Queer men's OS — nightlife, care, connection. Built for gay men, by gay men. Trans men and bi men connecting with men are part of the room.",
    icon: Zap,
    color: '#C8962C'
  },
  {
    id: 'pulse',
    title: 'Pulse',
    description: "The live globe. Zoom in to your city and see who's around, what's open, where the night is. Drop a beacon when you're up for something.",
    icon: GlobeIcon,
    color: '#00C2E0',
    link: '/pulse'
  },
  {
    id: 'ghosted',
    title: 'Ghosted',
    description: "The grid. Tap a card for the full profile. Boo a boy you're into — when they boo you back, chat unlocks. No cold-messaging strangers.",
    icon: Users,
    color: '#C8962C',
    link: '/ghosted'
  },
  {
    id: 'care',
    title: 'Care',
    description: "Silent SOS, Trusted Contacts, aftercare beacons. Set up safety check-ins before you head out. Built for the comedown, not just the night.",
    icon: Shield,
    color: '#C8962C',
    link: '/care'
  },
  {
    id: 'market',
    title: 'Market',
    description: "HOTMESS apparel, HNH MESS care products, limited Drops, and Preloved (peer-to-peer resale). Checkout runs through Stripe.",
    icon: ShoppingBag,
    color: '#39FF14',
    link: '/market'
  },
  {
    id: 'inbox',
    title: 'Inbox',
    description: "Tap the inbox icon on Ghosted. Boos, mutuals, messages, system pings — one feed, filterable. Notification badges live here, not on the nav.",
    icon: MessageCircle,
    color: '#C8962C'
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

  const resolveLink = (value) => {
    const raw = String(value || '');
    return raw.startsWith('/') ? raw : createPageUrl(raw);
  };

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
                    href={resolveLink(currentStepData.link)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border-2 border-white/20 hover:border-[#C8962C] text-sm font-bold uppercase tracking-wider transition-colors mb-6"
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
                    className="bg-[#C8962C] hover:bg-white text-white hover:text-black font-black border-2 border-white"
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
