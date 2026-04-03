import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContainer, BrandHeader, AuthInput, PasswordInput, Button, TextLink } from '@/components/ui/design-system';
import { supabase } from '@/components/utils/supabaseClient';
import { FaUser, FaLock } from 'react-icons/fa';
import { toast } from 'sonner';

interface LoginScreenProps {
  onLogin?: (email: string, password: string) => void;
  onForgotPassword?: () => void;
  onBack?: () => void;
  onSignUp?: () => void;
}

export function LoginScreen({ onLogin, onForgotPassword, onBack, onSignUp }: LoginScreenProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        toast.error(error.message || 'Login failed');
        setErrors({ password: error.message });
      } else if (data.user) {
        toast.success('Welcome back! 🔥');
        onLogin?.(email, password);
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onForgotPassword?.();
    navigate('/examples/auth/forgot');
  };

  const handleSignUp = () => {
    onSignUp?.();
    navigate('/examples/auth/signup');
  };

  const handleBack = () => {
    onBack?.();
    navigate(-1);
  };

  return (
    <AuthContainer onBack={handleBack}>
      <BrandHeader title="Login to HOTMESS" showLogo={false} />

      <motion.form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AuthInput
          label="Email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
          icon={<FaUser />}
        />

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
          icon={<FaLock />}
        />

        <div className="text-right">
          <TextLink onClick={handleForgotPassword}>Forgot Password?</TextLink>
        </div>

        <div className="flex-1" />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <div className="text-center">
          <span className="text-muted text-sm">Don't have an account? </span>
          <TextLink onClick={handleSignUp}>Sign Up</TextLink>
        </div>
      </motion.form>
    </AuthContainer>
  );
}

export default LoginScreen;
