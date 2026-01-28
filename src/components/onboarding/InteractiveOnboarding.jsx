import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, X, Star, Zap, 
  User, MapPin, Users, Calendar,
  Sparkles, Gift, Target, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

// Onboarding step configurations
const DEFAULT_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to HOTMESS',
    description: 'The nightlife OS for London\'s underground scene. Let\'s get you set up in just a few steps.',
    icon: Sparkles,
    color: '#FF1493',
    content: null, // Will use default welcome content
  },
  {
    id: 'profile',
    title: 'Set Up Your Profile',
    description: 'Let others know who you are. A great profile helps you connect with like-minded people.',
    icon: User,
    color: '#00D9FF',
    features: [
      { icon: User, label: 'Add a photo', description: 'Stand out in the crowd' },
      { icon: MapPin, label: 'Set your city', description: 'Find local events' },
      { icon: Heart, label: 'Choose interests', description: 'Match with your vibe' },
    ],
  },
  {
    id: 'discover',
    title: 'Discover Your Scene',
    description: 'From underground raves to intimate gatherings - find your people and your places.',
    icon: MapPin,
    color: '#B026FF',
    features: [
      { icon: Calendar, label: 'Browse Events', description: 'Never miss a party' },
      { icon: Users, label: 'Connect', description: 'Meet your match' },
      { icon: MapPin, label: 'Drop Beacons', description: 'Share locations' },
    ],
  },
  {
    id: 'gamification',
    title: 'Earn As You Explore',
    description: 'Level up, unlock achievements, and climb the leaderboard. Every action counts.',
    icon: Zap,
    color: '#FFEB3B',
    features: [
      { icon: Zap, label: 'Earn XP', description: 'For everything you do' },
      { icon: Star, label: 'Achievements', description: 'Unlock rare badges' },
      { icon: Target, label: 'Challenges', description: 'Daily & weekly goals' },
    ],
  },
  {
    id: 'ready',
    title: 'You\'re All Set!',
    description: 'Welcome to the mess. Your journey starts now.',
    icon: Gift,
    color: '#39FF14',
    reward: { xp: 500, label: 'Welcome Bonus' },
  },
];

// Progress indicator
function StepProgress({ currentStep, totalSteps, colors }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const color = colors[idx] || '#FF1493';
        
        return (
          <motion.div
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "h-2 rounded-full transition-all",
              isCurrent ? "w-8" : "w-2"
            )}
            style={{
              backgroundColor: isCompleted || isCurrent ? color : 'rgba(255,255,255,0.2)',
            }}
          />
        );
      })}
    </div>
  );
}

// Feature highlight card
function FeatureCard({ icon: Icon, label, description, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg"
    >
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <h4 className="font-bold text-sm">{label}</h4>
        <p className="text-xs text-white/60">{description}</p>
      </div>
    </motion.div>
  );
}

// Interactive highlight element (points to UI elements)
function Highlight({ targetSelector, label, position = 'bottom' }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (targetSelector) {
      const el = document.querySelector(targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTarget(rect);
      }
    }
  }, [targetSelector]);

  if (!target) return null;

  const positions = {
    top: { top: target.top - 60, left: target.left + target.width / 2 },
    bottom: { top: target.bottom + 10, left: target.left + target.width / 2 },
    left: { top: target.top + target.height / 2, left: target.left - 10 },
    right: { top: target.top + target.height / 2, left: target.right + 10 },
  };

  const pos = positions[position];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[200] pointer-events-none"
      style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, 0)' }}
    >
      <div className="bg-[#FF1493] text-black px-3 py-1.5 rounded-lg text-sm font-bold">
        {label}
      </div>
      <div className="w-3 h-3 bg-[#FF1493] rotate-45 absolute left-1/2 -translate-x-1/2 -top-1.5" />
    </motion.div>
  );
}

// Single step content
function StepContent({ step, onAction }) {
  const Icon = step.icon;

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="text-center"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.1 }}
        className="relative mx-auto mb-6 w-24 h-24"
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: `${step.color}20` }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div 
          className="w-full h-full rounded-full flex items-center justify-center border-2"
          style={{ 
            borderColor: step.color,
            backgroundColor: 'black',
          }}
        >
          <Icon className="w-12 h-12" style={{ color: step.color }} />
        </div>
      </motion.div>

      {/* Title & Description */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 
          className="text-2xl font-black uppercase mb-2"
          style={{ color: step.color }}
        >
          {step.title}
        </h2>
        <p className="text-white/60 mb-6 max-w-md mx-auto">
          {step.description}
        </p>
      </motion.div>

      {/* Features grid */}
      {step.features && (
        <div className="grid gap-3 mb-6 max-w-md mx-auto">
          {step.features.map((feature, idx) => (
            <FeatureCard
              key={feature.label}
              {...feature}
              color={step.color}
              delay={0.3 + idx * 0.1}
            />
          ))}
        </div>
      )}

      {/* Reward display */}
      {step.reward && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.3 }}
          className="inline-flex items-center gap-3 px-6 py-4 rounded-xl mb-6"
          style={{ 
            backgroundColor: `${step.color}20`,
            border: `2px solid ${step.color}`,
          }}
        >
          <Zap className="w-8 h-8" style={{ color: step.color }} />
          <div className="text-left">
            <p className="text-xs text-white/60 uppercase">{step.reward.label}</p>
            <p 
              className="text-2xl font-black"
              style={{ color: step.color }}
            >
              +{step.reward.xp} XP
            </p>
          </div>
        </motion.div>
      )}

      {/* Interactive action */}
      {step.action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={() => onAction?.(step.action)}
            style={{ backgroundColor: step.color, color: 'black' }}
            className="font-bold"
          >
            {step.action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// Main Interactive Onboarding component
export default function InteractiveOnboarding({
  steps = DEFAULT_STEPS,
  onComplete,
  onSkip,
  onStepComplete,
  showSkip = true,
  autoAdvance = false,
  autoAdvanceDelay = 5000,
  className,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const stepColors = steps.map(s => s.color);

  // Auto advance
  useEffect(() => {
    if (autoAdvance && !isLastStep) {
      const timer = setTimeout(() => {
        handleNext();
      }, autoAdvanceDelay);
      return () => clearTimeout(timer);
    }
  }, [currentStep, autoAdvance, autoAdvanceDelay, isLastStep]);

  // Celebrate on final step
  useEffect(() => {
    if (isLastStep) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF1493', '#FFEB3B', '#00D9FF', '#B026FF', '#39FF14'],
        zIndex: 9999,
      });
    }
  }, [isLastStep]);

  const handleNext = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setCompletedSteps(prev => [...prev, step.id]);
    onStepComplete?.(step);
    
    if (isLastStep) {
      onComplete?.();
    } else {
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    }
  }, [isAnimating, step, isLastStep, onComplete, onStepComplete]);

  const handleBack = useCallback(() => {
    if (isAnimating || isFirstStep) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setIsAnimating(false);
    }, 300);
  }, [isAnimating, isFirstStep]);

  const handleAction = useCallback((action) => {
    // Handle interactive actions like opening modals, starting tutorials, etc.
    console.log('Action triggered:', action);
  }, []);

  return (
    <div className={cn(
      "fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6",
      className
    )}>
      {/* Skip button */}
      {showSkip && !isLastStep && (
        <button
          onClick={onSkip}
          className="absolute top-6 right-6 flex items-center gap-1 text-white/40 hover:text-white transition-colors"
        >
          <span className="text-sm">Skip</span>
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Progress indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <StepProgress 
          currentStep={currentStep} 
          totalSteps={steps.length} 
          colors={stepColors}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center w-full max-w-lg">
        <AnimatePresence mode="wait">
          <StepContent 
            key={step.id}
            step={step} 
            onAction={handleAction}
          />
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-4">
        {!isFirstStep && (
          <Button
            onClick={handleBack}
            variant="outline"
            className="font-bold border-white/20 text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        )}
        
        <Button
          onClick={handleNext}
          style={{ backgroundColor: step.color, color: 'black' }}
          className="font-black uppercase tracking-wider min-w-[140px]"
        >
          {isLastStep ? (
            <>
              <Gift className="w-4 h-4 mr-2" />
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

      {/* Step indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/40">
        Step {currentStep + 1} of {steps.length}
      </div>
    </div>
  );
}

// Hook for managing onboarding state
export function useOnboarding(userId) {
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const key = userId ? `onboarding_completed_${userId}` : 'onboarding_completed_guest';
    try {
      const completed = localStorage.getItem(key);
      setHasCompleted(completed === 'true');
      setIsVisible(!completed);
    } catch {
      setIsVisible(true);
    }
  }, [userId]);

  const markComplete = useCallback(() => {
    const key = userId ? `onboarding_completed_${userId}` : 'onboarding_completed_guest';
    try {
      localStorage.setItem(key, 'true');
    } catch {
      // Ignore
    }
    setHasCompleted(true);
    setIsVisible(false);
  }, [userId]);

  const reset = useCallback(() => {
    const key = userId ? `onboarding_completed_${userId}` : 'onboarding_completed_guest';
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
    setHasCompleted(false);
    setIsVisible(true);
  }, [userId]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  return {
    hasCompleted,
    isVisible,
    markComplete,
    reset,
    dismiss,
  };
}

// Compact step indicator for headers
export function OnboardingProgress({ steps, completedSteps, className }) {
  const total = steps.length;
  const completed = completedSteps.length;
  const percentage = (completed / total) * 100;

  if (completed >= total) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="h-full bg-gradient-to-r from-[#FF1493] to-[#FFEB3B] rounded-full"
        />
      </div>
      <span className="text-xs text-white/40">
        {completed}/{total}
      </span>
    </div>
  );
}
