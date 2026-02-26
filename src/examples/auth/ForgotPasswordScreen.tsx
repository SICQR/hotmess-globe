import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContainer, BrandHeader, AuthInput, Button, TextLink } from '@/components/ui/design-system';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

interface ForgotPasswordScreenProps {
  onSubmit?: (email: string) => void;
  onBack?: () => void;
}

export function ForgotPasswordScreen({ onSubmit, onBack }: ForgotPasswordScreenProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        toast.error(error.message || 'Failed to send reset email');
        setError(error.message);
      } else {
        toast.success('Reset link sent! Check your inbox.');
        onSubmit?.(email);
        setSent(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    onBack?.();
    navigate('/examples/auth/login');
  };

  if (sent) {
    return (
      <AuthContainer onBack={handleBack}>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mb-6"
          >
            <span className="text-4xl">✉️</span>
          </motion.div>

          <h2 className="text-light text-xl font-bold mb-2">Check Your Email</h2>
          <p className="text-muted text-sm mb-6">
            We've sent a password reset link to <span className="text-gold">{email}</span>
          </p>

          <TextLink onClick={handleBack}>Back to Login</TextLink>
        </div>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer onBack={handleBack}>
      <BrandHeader title="Forgot Password" subtitle="Enter your email to reset" showLogo={false} />

      <motion.form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AuthInput
          label="Email Address"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          autoComplete="email"
        />

        <div className="flex-1" />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>

        <div className="text-center">
          <TextLink onClick={handleBack}>Back to Login</TextLink>
        </div>
      </motion.form>
    </AuthContainer>
  );
}

export default ForgotPasswordScreen;
