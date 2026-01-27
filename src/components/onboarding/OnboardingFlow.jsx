/**
 * Onboarding Flow Component
 * 
 * First-time user experience highlighting match scoring and key features.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  TrendingUp, 
  Users, 
  Shield, 
  MapPin, 
  Heart,
  ArrowRight,
  CheckCircle2,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { trackEvent } from '@/lib/analytics';

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to HOTMESS',
    subtitle: 'Compatibility-first discovery',
    description: 'We match you based on what actually matters - not just who\'s nearby.',
    icon: Sparkles,
    color: '#E62020',
    visual: (
      <div className="relative w-48 h-48 mx-auto">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E62020]/30 to-[#00D9FF]/30 rounded-full animate-pulse" />
        <div className="absolute inset-4 bg-gradient-to-br from-[#E62020]/50 to-[#00D9FF]/50 rounded-full" />
        <div className="absolute inset-8 bg-black rounded-full flex items-center justify-center">
          <span className="text-5xl font-black">87%</span>
        </div>
      </div>
    ),
  },
  {
    id: 'matching',
    title: 'Smart Match Scoring',
    subtitle: '8 dimensions of compatibility',
    description: 'We analyze role compatibility, interests, lifestyle, location, and more to show you real match percentages.',
    icon: TrendingUp,
    color: '#00D9FF',
    features: [
      { label: 'Role Compatibility', icon: Users },
      { label: 'Shared Interests', icon: Heart },
      { label: 'Travel Time', icon: MapPin },
      { label: 'Lifestyle Match', icon: CheckCircle2 },
    ],
  },
  {
    id: 'live',
    title: 'Go Live',
    subtitle: 'Real-time availability',
    description: 'Toggle "Right Now" to show you\'re available. Auto-expires after 2 hours - no ghosting.',
    icon: Zap,
    color: '#39FF14',
    visual: (
      <div className="relative">
        <div className="w-32 h-32 mx-auto bg-[#39FF14]/20 rounded-full flex items-center justify-center animate-pulse">
          <div className="w-24 h-24 bg-[#39FF14]/30 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 bg-[#39FF14] rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-black" />
            </div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-2 bg-[#39FF14] text-black px-4 py-2 font-black text-sm">
            <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
            LIVE NOW
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy First',
    subtitle: 'You control your data',
    description: 'Your sensitive preferences are only used for matching when you choose to share them.',
    icon: Shield,
    color: '#B026FF',
    features: [
      { label: 'Opt-in only', description: 'Share what you want' },
      { label: 'No selling data', description: 'Your info stays yours' },
      { label: 'Anonymous browsing', description: 'With PLUS membership' },
    ],
  },
  {
    id: 'ready',
    title: 'Ready to Match?',
    subtitle: 'Complete your profile to get started',
    description: 'The more you share, the better your matches will be.',
    icon: Heart,
    color: '#E62020',
    cta: true,
  },
];

const STORAGE_KEY = 'hotmess_onboarding_complete';

export function useOnboarding() {
  const [hasCompleted, setHasCompleted] = useState(true); // Default to true to avoid flash

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    setHasCompleted(completed === 'true');
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setHasCompleted(true);
    trackEvent('onboarding_completed');
  };

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasCompleted(false);
  };

  return { hasCompleted, completeOnboarding, resetOnboarding };
}

export function OnboardingModal({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const step = ONBOARDING_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    trackEvent('onboarding_step_completed', { step: step.id, stepIndex: currentStep });
    
    if (isLastStep) {
      onComplete?.();
      onClose?.();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    trackEvent('onboarding_skipped', { fromStep: step.id });
    onComplete?.();
    onClose?.();
  };

  const handleGoToProfile = () => {
    onComplete?.();
    onClose?.();
    navigate(createPageUrl('EditProfile'));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      >
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-lg bg-black border-2 border-white/10"
        >
          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/80 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-6 pb-4">
            {ONBOARDING_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentStep 
                    ? 'bg-white' 
                    : idx < currentStep 
                      ? 'bg-white/60' 
                      : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            {/* Icon */}
            <div 
              className="w-16 h-16 mx-auto mb-6 flex items-center justify-center"
              style={{ backgroundColor: `${step.color}20` }}
            >
              <Icon className="w-8 h-8" style={{ color: step.color }} />
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-widest text-white/50 mb-2">
                {step.subtitle}
              </p>
              <h2 className="text-3xl font-black uppercase mb-4" style={{ color: step.color }}>
                {step.title}
              </h2>
              <p className="text-white/70 text-sm leading-relaxed max-w-sm mx-auto">
                {step.description}
              </p>
            </div>

            {/* Visual content */}
            {step.visual && (
              <div className="mb-8">
                {step.visual}
              </div>
            )}

            {/* Features list */}
            {step.features && (
              <div className="grid grid-cols-2 gap-3 mb-8">
                {step.features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 p-3 bg-white/5 border border-white/10"
                  >
                    {feature.icon && <feature.icon className="w-4 h-4" style={{ color: step.color }} />}
                    <div>
                      <span className="text-sm font-medium">{feature.label}</span>
                      {feature.description && (
                        <p className="text-[10px] text-white/50">{feature.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            {step.cta ? (
              <div className="space-y-3">
                <Button
                  onClick={handleGoToProfile}
                  className="w-full font-black uppercase py-6 text-lg"
                  style={{ backgroundColor: step.color, color: '#000' }}
                >
                  Complete Profile
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  onClick={handleNext}
                  variant="ghost"
                  className="w-full text-white/50 hover:text-white"
                >
                  Skip for now
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleNext}
                className="w-full font-black uppercase py-6"
                style={{ backgroundColor: step.color, color: '#000' }}
              >
                {isLastStep ? 'Get Started' : 'Next'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Quick tooltip overlay for highlighting features
 */
export function OnboardingTooltip({ target, content, position = 'bottom', onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const positionStyles = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'bottom' ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`absolute ${positionStyles[position]} z-50 bg-[#E62020] text-black p-3 max-w-xs`}
    >
      <button
        onClick={handleDismiss}
        className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center"
      >
        <X className="w-3 h-3" />
      </button>
      <p className="text-sm font-medium">{content}</p>
    </motion.div>
  );
}

export default OnboardingModal;
