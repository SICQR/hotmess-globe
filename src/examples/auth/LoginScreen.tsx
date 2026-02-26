import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthContainer, BrandHeader, AuthInput, PasswordInput, Button, TextLink } from '@/components/ui/design-system';
import { FaUser, FaLock } from 'react-icons/fa';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onBack: () => void;
  onSignUp: () => void;
}

export function LoginScreen({ onLogin, onForgotPassword, onBack, onSignUp }: LoginScreenProps) {
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
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <AuthContainer onBack={onBack}>
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
          <TextLink onClick={onForgotPassword}>Forgot Password?</TextLink>
        </div>

        <div className="flex-1" />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </Button>

        <div className="text-center">
          <span className="text-muted text-sm">Don't have an account? </span>
          <TextLink onClick={onSignUp}>Sign Up</TextLink>
        </div>
      </motion.form>
    </AuthContainer>
  );
}

export default LoginScreen;
