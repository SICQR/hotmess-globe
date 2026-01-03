import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const nextUrl = searchParams.get('next');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await auth.signUp(email, password, {
          full_name: fullName,
        });

        if (error) throw error;

        toast.success('Account created! Logging you in...');
        
        const { error: signInError } = await auth.signIn(email, password);
        if (signInError) throw signInError;

        setTimeout(() => {
          window.location.href = nextUrl || createPageUrl('Home');
        }, 500);
      } else {
        const { error } = await auth.signIn(email, password);
        if (error) throw error;

        toast.success('Welcome back!');
        setTimeout(() => {
          window.location.href = nextUrl || createPageUrl('Home');
        }, 500);
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">
            HOT<span className="text-[#FF1493]">MESS</span>
          </h1>
          <p className="text-white/40 uppercase text-sm tracking-wider">LONDON OS</p>
        </div>

        <div className="bg-white/5 border-2 border-white/10 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black uppercase mb-2">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-white/60 text-sm">
              {isSignUp ? 'Join the mess' : 'Sign in to continue'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="bg-black/50 border-white/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-black/50 border-white/20"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                minLength={6}
                className="bg-black/50 border-white/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase py-6 text-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Sign Up
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-white/10 mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <span className="text-[#00D9FF] font-bold">Sign In</span>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <span className="text-[#00D9FF] font-bold">Sign Up</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6 uppercase tracking-wider">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}