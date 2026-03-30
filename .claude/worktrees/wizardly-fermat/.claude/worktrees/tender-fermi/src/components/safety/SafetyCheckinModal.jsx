/**
 * Safety Check-in Modal
 * 
 * Displayed when user needs to respond to a safety check-in.
 * Shows response options and crisis resources if needed.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Heart,
  Phone,
  ExternalLink,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const RESPONSE_OPTIONS = [
  {
    id: 'all_good',
    label: "All good",
    icon: Check,
    color: '#39FF14',
    bgColor: 'bg-[#39FF14]/20',
    borderColor: 'border-[#39FF14]',
    description: "I'm fine, thanks for checking"
  },
  {
    id: 'need_minute',
    label: "Need a minute",
    icon: Heart,
    color: '#C8962C',
    bgColor: 'bg-[#C8962C]/20',
    borderColor: 'border-[#C8962C]',
    description: "Check back in 30 minutes"
  },
  {
    id: 'help',
    label: "Need help",
    icon: Phone,
    color: '#C8962C',
    bgColor: 'bg-[#C8962C]/20',
    borderColor: 'border-[#C8962C]',
    description: "Show me support resources"
  }
];

const CRISIS_RESOURCES = [
  {
    name: 'Emergency Services',
    phone: '999',
    description: 'For immediate danger',
    urgent: true
  },
  {
    name: 'Switchboard LGBT+',
    phone: '0300 330 0630',
    description: '10am-10pm daily',
    urgent: false
  },
  {
    name: 'Samaritans',
    phone: '116 123',
    description: '24/7, free, confidential',
    urgent: false
  },
  {
    name: 'Galop',
    phone: '0800 999 5428',
    description: 'LGBT+ anti-violence',
    urgent: false
  },
  {
    name: 'MindOut',
    url: 'https://mindout.org.uk',
    description: 'LGBTQ+ mental health',
    urgent: false
  }
];

export default function SafetyCheckinModal({ 
  isOpen, 
  onClose, 
  checkin,
  onRespond 
}) {
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showResources, setShowResources] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleRespond = async (responseId) => {
    setLoading(true);
    setSelectedResponse(responseId);

    try {
      const response = await fetch('/api/safety/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkinId: checkin?.id,
          response: responseId
        })
      });

      const data = await response.json();

      if (data.success) {
        if (responseId === 'help' || data.followUp === 'crisis_resources') {
          setShowResources(true);
        } else {
          setCompleted(true);
          setTimeout(() => {
            onClose?.();
            onRespond?.(responseId);
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Check-in response error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMessage = () => {
    if (!checkin) return "Hey, just checking in. You good?";
    
    const messages = {
      after_right_now: "You were out there earlier. How'd it go?",
      late_night: "Still up? Everything okay?",
      first_meetup: "First time meeting someone new. How was it?",
      missed: "You didn't respond earlier. Still doing okay?"
    };

    return messages[checkin.trigger_type] || "Hey, just checking in. You good? 💚";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-2 border-[#C8962C] p-0 max-w-md">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#C8962C]/20 rounded-full flex items-center justify-center border-2 border-[#C8962C]">
              <Shield className="w-6 h-6 text-[#C8962C]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white">Safety Check-in</DialogTitle>
              <p className="text-sm text-white/60">From HOTMESS Care</p>
            </div>
          </div>

          {!showResources && !completed ? (
            <>
              {/* Message */}
              <div className="bg-white/5 border border-white/10 p-4 mb-6">
                <p className="text-white text-lg">{getMessage()}</p>
              </div>

              {/* Response Options */}
              <div className="space-y-3">
                {RESPONSE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedResponse === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleRespond(option.id)}
                      disabled={loading}
                      className={`
                        w-full p-4 flex items-center gap-4 border-2 transition-all
                        ${isSelected ? option.borderColor : 'border-white/20'}
                        ${isSelected ? option.bgColor : 'bg-white/5'}
                        hover:border-white/40 disabled:opacity-50
                      `}
                    >
                      <div 
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${option.bgColor}`}
                        style={{ borderColor: option.color, borderWidth: 2 }}
                      >
                        <Icon className="w-5 h-5" style={{ color: option.color }} />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-white">{option.label}</p>
                        <p className="text-sm text-white/60">{option.description}</p>
                      </div>
                      {loading && isSelected && (
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer note */}
              <p className="text-xs text-white/40 text-center mt-6">
                Your response is private. We just want to make sure you're okay. 💚
              </p>
            </>
          ) : showResources ? (
            <>
              {/* Crisis Resources */}
              <div className="mb-4">
                <p className="text-white/80 mb-4">
                  I'm here for you. Here are some resources that can help:
                </p>
              </div>

              <div className="space-y-3">
                {CRISIS_RESOURCES.map((resource, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 border ${resource.urgent ? 'border-red-500 bg-red-500/10' : 'border-white/20 bg-white/5'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-bold ${resource.urgent ? 'text-red-400' : 'text-white'}`}>
                          {resource.name}
                        </p>
                        <p className="text-sm text-white/60">{resource.description}</p>
                      </div>
                      {resource.phone ? (
                        <a 
                          href={`tel:${resource.phone}`}
                          className={`px-4 py-2 font-bold text-sm flex items-center gap-2 ${
                            resource.urgent 
                              ? 'bg-red-500 text-white' 
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          <Phone className="w-4 h-4" />
                          {resource.phone}
                        </a>
                      ) : (
                        <a 
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-white/10 text-white font-bold text-sm flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  setShowResources(false);
                  onClose?.();
                }}
                className="w-full mt-6 bg-[#C8962C] hover:bg-[#C8962C]/80 text-white"
              >
                Close
              </Button>
            </>
          ) : (
            /* Completed state */
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-[#39FF14]/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-[#39FF14]">
                <Check className="w-8 h-8 text-[#39FF14]" />
              </div>
              <p className="text-xl font-bold text-white mb-2">Thanks for checking in!</p>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
