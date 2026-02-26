import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthContainer, BrandHeader, CodeInput, Button, TextLink } from '@/components/ui/design-system';

interface JoinCodeScreenProps {
  onJoin: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  type?: 'invite' | 'squad' | 'event';
}

export function JoinCodeScreen({ onJoin, onResend, onBack, type = 'invite' }: JoinCodeScreenProps) {
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
    await onJoin(code);
    setLoading(false);
  };

  return (
    <AuthContainer onBack={onBack}>
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

        <TextLink onClick={onResend}>Resend Code</TextLink>

        <div className="flex-1" />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading || code.length < 6}>
          {loading ? 'Verifying...' : 'Join'}
        </Button>
      </motion.form>
    </AuthContainer>
  );
}

export default JoinCodeScreen;
