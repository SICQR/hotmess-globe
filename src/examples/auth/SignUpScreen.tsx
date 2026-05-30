import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContainer, BrandHeader, AuthInput, PasswordInput, Button, Checkbox, TextLink } from '@/components/ui/design-system';
import { supabase } from '@/components/utils/supabaseClient';
import { FaEnvelope, FaUser, FaLock } from 'react-icons/fa';
import { toast } from 'sonner';

interface SignUpScreenProps {
  onSignUp?: (data: { email: string; username: string; password: string }) => void;
  onBack?: () => void;
  onLogin?: () => void;
}

export function SignUpScreen({ onSignUp, onBack, onLogin }: SignUpScreenProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!form.email) newErrors.email = 'Email is required';
    if (!form.username) newErrors.username = 'Username is required';
    if (form.username && form.username.length < 3) newErrors.username = 'Min 3 characters';
    if (!form.password) newErrors.password = 'Password is required';
    if (form.password && form.password.length < 8) newErrors.password = 'Min 8 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords don\'t match';
    if (!consent) newErrors.consent = 'You must accept the terms';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            username: form.username,
            display_name: form.username,
          },
        },
      });

      if (error) {
        toast.error(error.message || 'Signup failed');
        setErrors({ email: error.message });
      } else if (data.user) {
        toast.success('Account created! Check your email to confirm. 🔥');
        onSignUp?.({ email: form.email, username: form.username, password: form.password });
        navigate('/examples/auth/profile-setup');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    onBack?.();
    navigate(-1);
  };

  const handleLogin = () => {
    onLogin?.();
    navigate('/examples/auth/login');
  };

  return (
    <AuthContainer onBack={handleBack}>
      <BrandHeader title="Create Account" showLogo={false} />

      <motion.form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AuthInput
          label="Email"
          type="email"
          placeholder="your@email.com"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
          autoComplete="email"
          icon={<FaEnvelope />}
        />

        <AuthInput
          label="Username"
          type="text"
          placeholder="hotmess_user"
          value={form.username}
          onChange={handleChange('username')}
          error={errors.username}
          autoComplete="username"
          icon={<FaUser />}
        />

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange('password')}
          error={errors.password}
          autoComplete="new-password"
          icon={<FaLock />}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={errors.confirmPassword}
          autoComplete="new-password"
          icon={<FaLock />}
        />

        <div className="mt-2">
          <Checkbox
            checked={consent}
            onChange={setConsent}
            label={
              <span>
                I accept the <TextLink href="/terms">Terms of Service</TextLink> and{' '}
                <TextLink href="/privacy">Privacy Policy</TextLink>
              </span>
            }
          />
          {errors.consent && <p className="text-red-500 text-xs mt-1">{errors.consent}</p>}
        </div>

        <div className="flex-1" />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Button>

        <div className="text-center">
          <span className="text-muted text-sm">Already have an account? </span>
          <TextLink onClick={handleLogin}>Login</TextLink>
        </div>
      </motion.form>
    </AuthContainer>
  );
}

export default SignUpScreen;
