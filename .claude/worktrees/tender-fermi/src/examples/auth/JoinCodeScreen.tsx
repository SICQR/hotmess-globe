import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContainer, BrandHeader, CodeInput, Button, TextLink } from '@/components/ui/design-system';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

interface JoinCodeScreenProps {
  onJoin?: (code: string) => void;
  onResend?: () => void;
  onBack?: () => void;
  type?: 'invite' | 'squad' | 'event';
}

export function JoinCodeScreen({ onJoin, onResend, onBack, type = 'invite' }: JoinCodeScreenProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const titles = {
    invite: 'Enter Invite Code',
    squad: 'Join Squad',
    event: 'Event Access Code',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length < 6) {
      setError('Enter the full 6-digit code');
      return;
    }

    setLoading(true);

    try {
      // Look up the code in the database
      const { data, error: lookupError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (lookupError || !data) {
        toast.error('Invalid or expired code');
        setError('Invalid or expired code');
      } else {
        // Get current user and process the join
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && data.squad_id) {
          // Add user to squad
          await supabase
            .from('squad_members')
            .insert({ squad_id: data.squad_id, user_id: user.id });
        }

        toast.success('Welcome to the squad! 🔥');
        onJoin?.(code);
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    onResend?.();
    toast.info('Code request sent');
  };

  const handleBack = () => {
    onBack?.();
    navigate(-1);
  };

  return (
    <AuthContainer onBack={handleBack}>
      <BrandHeader title={titles[type]} subtitle="Enter your 6-digit code" showLogo={false} />

      <motion.form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mt-8">
          <CodeInput length={6} value={code} onChange={setCode} error={error} />
        </div>

        <TextLink onClick={handleResend}>Resend Code</TextLink>

        <div className="flex-1" />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading || code.length < 6}>
          {loading ? 'Verifying...' : 'Join'}
        </Button>
      </motion.form>
    </AuthContainer>
  );
}

export default JoinCodeScreen;
