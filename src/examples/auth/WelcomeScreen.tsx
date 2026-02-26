import React from 'react';
import { motion } from 'framer-motion';
import { AuthContainer, BrandHeader, Button, TextLink } from '@/components/ui/design-system';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function WelcomeScreen({ onGetStarted, onLogin }: WelcomeScreenProps) {
  return (
    <AuthContainer>
      {/* Centered branding */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <BrandHeader
            title="Welcome to HOTMESS"
            subtitle="The nightlife app for the bold"
          />
        </motion.div>

        {/* Hero visual placeholder */}
        <motion.div
          className="w-64 h-64 rounded-full bg-gradient-to-br from-gold/20 to-accent/20 flex items-center justify-center my-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <span className="text-6xl">🔥</span>
        </motion.div>
      </div>

      {/* Action buttons */}
      <motion.div
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Button variant="primary" size="lg" fullWidth onClick={onGetStarted}>
          Get Started
        </Button>

        <div className="text-center">
          <span className="text-muted text-sm">Already have an account? </span>
          <TextLink onClick={onLogin}>Login</TextLink>
        </div>
      </motion.div>
    </AuthContainer>
  );
}

export default WelcomeScreen;
