import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Send, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/components/utils/supabaseClient';
import { base44 } from '@/api/base44Client';

const APPEAL_REASONS = [
  { value: 'false_positive', label: 'Content was flagged incorrectly' },
  { value: 'context', label: 'Context was misunderstood' },
  { value: 'edited', label: 'I have edited the content' },
  { value: 'policy_unclear', label: 'Policy was unclear' },
  { value: 'other', label: 'Other reason' },
];

/**
 * Appeal Form Component
 * Allows users to appeal moderation decisions
 */
export default function AppealForm({ 
  moderationAction, 
  contentId, 
  contentType,
  onBack,
  onSuccess 
}) {
  const [reason, setReason] = useState('');
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason || !explanation.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const user = await base44.auth.me();
      
      await supabase
        .from('moderation_appeals')
        .insert({
          user_email: user.email,
          content_id: contentId,
          content_type: contentType,
          moderation_action_id: moderationAction?.id,
          appeal_reason: reason,
          explanation: explanation.trim(),
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      
      toast.success('Appeal submitted successfully');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to submit appeal:', error);
      toast.error('Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl p-6"
    >
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <div className="flex items-start gap-4 mb-6">
        <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Appeal Moderation Decision</h3>
          <p className="text-sm text-white/60">
            If you believe this moderation action was made in error, you can submit an appeal.
          </p>
        </div>
      </div>

      {moderationAction && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-4 mb-6">
          <div className="text-sm text-white/60 mb-1">Original Decision</div>
          <div className="font-semibold text-red-400">{moderationAction.action}</div>
          {moderationAction.reason && (
            <div className="text-sm text-white/60 mt-2">
              Reason: {moderationAction.reason}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-white/60 uppercase mb-2 block">
            Why are you appealing?
          </label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="bg-black border-white/20">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {APPEAL_REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-white/60 uppercase mb-2 block">
            Please explain
          </label>
          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Provide details about why you believe this decision should be reconsidered..."
            className="bg-black border-white/20 min-h-[120px]"
            maxLength={1000}
          />
          <div className="text-xs text-white/40 mt-1 text-right">
            {explanation.length}/1000
          </div>
        </div>

        <div className="bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-lg p-4">
          <p className="text-sm text-white/80">
            Appeals are typically reviewed within 24-48 hours. You will receive a notification 
            when a decision has been made. Please note that submitting false appeals may result 
            in account restrictions.
          </p>
        </div>

        <Button
          type="submit"
          disabled={submitting || !reason || !explanation.trim()}
          className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
        >
          {submitting ? 'Submitting...' : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Appeal
            </>
          )}
        </Button>
      </form>
    </motion.div>
  );
}
