import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Users, Tag, Zap, Check } from 'lucide-react';
import { taxonomyConfig } from '../components/discovery/taxonomyConfig';
import TagSelector from '../components/discovery/TagSelector';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [tribes, setTribes] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [essentialTagIds, setEssentialTagIds] = useState([]);
  const [lookingFor, setLookingFor] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        // Skip if already onboarded
        if (user.onboarding_completed) {
          navigate(createPageUrl('Home'));
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, [navigate]);

  const handleComplete = async () => {
    if (!currentUser) return;

    // Save tribes
    for (const tribeId of tribes) {
      const tribe = taxonomyConfig.tribes.find(t => t.id === tribeId);
      if (tribe) {
        await base44.entities.UserTribe.create({
          user_email: currentUser.email,
          tribe_id: tribeId,
          tribe_label: tribe.label
        });
      }
    }

    // Save tags
    for (const tagId of selectedTagIds) {
      const tag = taxonomyConfig.tags.find(t => t.id === tagId);
      if (tag) {
        await base44.entities.UserTag.create({
          user_email: currentUser.email,
          tag_id: tagId,
          tag_label: tag.label,
          category_id: tag.categoryId,
          is_essential: essentialTagIds.includes(tagId),
          visibility: tag.isSensitive ? 'nobody' : 'public'
        });
      }
    }

    // Save intent
    await base44.auth.updateMe({ 
      looking_for: lookingFor,
      onboarding_completed: true 
    });

    navigate(createPageUrl('Home'));
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <Zap className="w-20 h-20 text-[#FF1493] mx-auto mb-6" />
              <h1 className="text-5xl font-black uppercase mb-4">Welcome to HOTMESS</h1>
              <p className="text-xl text-white/60 mb-8">London's nightlife OS. Let's get you set up.</p>
              <Button
                onClick={() => setStep(2)}
                className="bg-[#FF1493] text-black font-black text-lg px-8 py-6"
              >
                Let's go <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Users className="w-16 h-16 text-[#00D9FF] mb-4" />
              <h2 className="text-3xl font-black uppercase mb-2">Pick Your Tribes</h2>
              <p className="text-white/60 mb-6">Select up to 3 tribes that vibe with you</p>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {taxonomyConfig.tribes.map(tribe => (
                  <button
                    key={tribe.id}
                    type="button"
                    onClick={() => {
                      if (tribes.includes(tribe.id)) {
                        setTribes(tribes.filter(t => t !== tribe.id));
                      } else if (tribes.length < 3) {
                        setTribes([...tribes, tribe.id]);
                      }
                    }}
                    disabled={!tribes.includes(tribe.id) && tribes.length >= 3}
                    className={`px-4 py-3 text-sm font-bold uppercase border-2 transition-all ${
                      tribes.includes(tribe.id)
                        ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                        : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40 disabled:opacity-30'
                    }`}
                  >
                    {tribe.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-white/40 mb-6">{tribes.length}/3 selected</p>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="border-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="flex-1 bg-[#00D9FF] text-black font-black"
                  disabled={tribes.length === 0}
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Tag className="w-16 h-16 text-[#39FF14] mb-4" />
              <h2 className="text-3xl font-black uppercase mb-2">Add Your Tags</h2>
              <p className="text-white/60 mb-6">Tags help others understand your vibe</p>
              
              <TagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
                maxTags={8}
                showEssentials={true}
                essentialTagIds={essentialTagIds}
                onEssentialsChange={setEssentialTagIds}
              />

              <div className="flex gap-3 mt-8">
                <Button onClick={() => setStep(2)} variant="outline" className="border-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button 
                  onClick={() => setStep(4)} 
                  className="flex-1 bg-[#39FF14] text-black font-black"
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Check className="w-16 h-16 text-[#FF1493] mb-4" />
              <h2 className="text-3xl font-black uppercase mb-2">What Are You Looking For?</h2>
              <p className="text-white/60 mb-6">You can always change this later</p>
              
              <div className="flex flex-wrap gap-3 mb-8">
                {['Chat', 'Dates', 'Mates', 'Play', 'Friends', 'Something ongoing'].map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (lookingFor.includes(option)) {
                        setLookingFor(lookingFor.filter(o => o !== option));
                      } else {
                        setLookingFor([...lookingFor, option]);
                      }
                    }}
                    className={`px-4 py-3 text-sm font-bold uppercase border-2 ${
                      lookingFor.includes(option)
                        ? 'bg-[#FF1493] border-[#FF1493] text-black'
                        : 'bg-white/5 border-white/20 text-white/60'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(3)} variant="outline" className="border-white/20">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button 
                  onClick={handleComplete} 
                  className="flex-1 bg-[#FF1493] text-black font-black"
                >
                  <Check className="w-4 h-4 mr-2" /> Complete Setup
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-12">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${s <= step ? 'bg-[#FF1493]' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}