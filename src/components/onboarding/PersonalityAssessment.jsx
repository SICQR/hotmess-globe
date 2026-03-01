import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const QUESTIONS = [
  {
    id: 'openness',
    question: "How would you describe your approach to new experiences?",
    low: "Prefer familiar routines",
    high: "Always seeking novelty"
  },
  {
    id: 'energy',
    question: "What's your typical energy level in social situations?",
    low: "Low-key & reserved",
    high: "High-octane & electric"
  },
  {
    id: 'social',
    question: "How do you prefer to spend your time?",
    low: "Solo or small groups",
    high: "Large crowds & parties"
  },
  {
    id: 'adventure',
    question: "How would you rate your spontaneity?",
    low: "Planned & structured",
    high: "Spontaneous & impulsive"
  },
  {
    id: 'intensity',
    question: "What level of intensity do you prefer in experiences?",
    low: "Chill & relaxed",
    high: "Intense & immersive"
  }
];

export default function PersonalityAssessment({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const currentQuestion = QUESTIONS[currentStep];

  const analyzePersonality = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();

      // Use AI to generate personality insights
      const prompt = `You are the HOTMESS OS Personality Analyzer. Based on these trait scores, generate a nuanced personality profile:

Openness: ${answers.openness}/100
Energy: ${answers.energy}/100
Social: ${answers.social}/100
Adventure: ${answers.adventure}/100
Intensity: ${answers.intensity}/100

Generate:
1. A vibe_score (0-100) representing overall personality strength
2. 3 key personality insights (short phrases in CAPS)
3. Recommended archetype matches (from: architect, hunter, collector, explorer, socialite, merchant, guardian, alchemist)

Format as JSON with: vibe_score, insights (array), recommended_archetypes (array)`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            vibe_score: { type: 'number' },
            insights: { type: 'array', items: { type: 'string' } },
            recommended_archetypes: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      // Update user profile
      await base44.auth.updateMe({
        personality_traits: answers,
        vibe_score: analysis.vibe_score,
        completed_personality_assessment: true,
        match_preferences: {
          ...user.match_preferences,
          preferred_archetypes: analysis.recommended_archetypes,
          min_vibe_score: Math.max(60, analysis.vibe_score - 20)
        }
      });

      return analysis;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['current-user']);
      toast.success('Personality profile complete!');
      onComplete?.(data);
    },
    onError: () => {
      toast.error('Failed to analyze personality');
    }
  });

  const handleAnswer = (value) => {
    setAnswers({ ...answers, [currentQuestion.id]: value[0] });
  };

  const handleNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setAnalyzing(true);
      analyzePersonality.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;
  const hasAnswer = answers[currentQuestion.id] !== undefined;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-[#C8962C] to-[#C8962C] mx-auto mb-6 flex items-center justify-center"
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(200, 150, 44, 0)',
                '0 0 0 20px rgba(200, 150, 44, 0)',
              ]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Sparkles className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl font-black uppercase mb-2">
            VIBE ASSESSMENT
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            Quick personality scan for better matches
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-white/40 mb-2">
            <span>Question {currentStep + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#C8962C] to-[#C8962C]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/5 border-2 border-white/20 p-8 mb-8"
          >
            <h2 className="text-2xl font-bold mb-8">
              {currentQuestion.question}
            </h2>

            <div className="space-y-6">
              <Slider
                value={[answers[currentQuestion.id] || 50]}
                onValueChange={handleAnswer}
                max={100}
                step={1}
                className="w-full"
              />

              <div className="flex justify-between text-sm">
                <span className="text-white/60">{currentQuestion.low}</span>
                <span className="text-white/60">{currentQuestion.high}</span>
              </div>

              {hasAnswer && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8962C]/20 border border-[#C8962C] rounded-lg">
                    <Sparkles className="w-4 h-4 text-[#C8962C]" />
                    <span className="text-sm font-bold">
                      {answers[currentQuestion.id]}/100
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            onClick={handleBack}
            disabled={currentStep === 0 || analyzing}
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!hasAnswer || analyzing}
            className="flex-1 bg-gradient-to-r from-[#C8962C] to-[#C8962C] hover:opacity-90 text-white font-black"
          >
            {analyzing ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                ANALYZING...
              </>
            ) : currentStep === QUESTIONS.length - 1 ? (
              <>
                Complete
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
