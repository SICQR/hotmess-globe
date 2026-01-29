/**
 * Two-Factor Authentication Setup Component
 * 
 * Implements MFA via TOTP (Time-based One-Time Password) as recommended
 * in the security strategy for Grindr-surpassing app security.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Smartphone, 
  Key, 
  Copy, 
  Check, 
  AlertTriangle,
  QrCode,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// =============================================================================
// MOCK TOTP GENERATION (In production, use a library like otpauth)
// =============================================================================

function generateSecretKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(
      Math.random().toString(36).substring(2, 6).toUpperCase() + 
      '-' + 
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
  }
  return codes;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function TwoFactorSetup({ onComplete, onCancel }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Check current 2FA status
  const { data: mfaStatus } = useQuery({
    queryKey: ['mfa-status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('mfa_enabled, mfa_setup_at')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Enable 2FA mutation
  const enableMutation = useMutation({
    mutationFn: async ({ secret, backupCodes }) => {
      // In production, verify the TOTP code server-side
      const { error } = await supabase
        .from('profiles')
        .update({
          mfa_enabled: true,
          mfa_secret: secret, // Should be encrypted in production
          mfa_backup_codes: backupCodes, // Should be hashed in production
          mfa_setup_at: new Date().toISOString(),
        })
        .eq('id', user?.id);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mfa-status']);
      setStep(4); // Success step
    },
    onError: (err) => {
      setError(err.message || 'Failed to enable 2FA');
    },
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          mfa_enabled: false,
          mfa_secret: null,
          mfa_backup_codes: null,
          mfa_setup_at: null,
        })
        .eq('id', user?.id);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mfa-status']);
      onComplete?.();
    },
  });

  // Initialize setup
  const startSetup = () => {
    const newSecret = generateSecretKey();
    const newBackupCodes = generateBackupCodes();
    setSecret(newSecret);
    setBackupCodes(newBackupCodes);
    setStep(2);
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verify code and complete setup
  const verifyAndEnable = () => {
    // In production, verify TOTP code server-side
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    
    enableMutation.mutate({ secret, backupCodes });
  };

  // If already enabled, show disable option
  if (mfaStatus?.mfa_enabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-emerald-400">
          <Shield className="w-8 h-8" />
          <div>
            <h3 className="text-lg font-bold text-white">2FA is Enabled</h3>
            <p className="text-sm text-white/60">
              Your account is protected with two-factor authentication
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <Check className="w-4 h-4" />
            <span>Enabled on {new Date(mfaStatus.mfa_setup_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowBackupCodes(!showBackupCodes)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span>View Backup Codes</span>
            </span>
            {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showBackupCodes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                  <p className="text-sm text-white/60 mb-3">
                    Store these codes securely. Each can only be used once.
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.length > 0 ? backupCodes.map((code, i) => (
                      <div key={i} className="p-2 bg-white/5 rounded">
                        {code}
                      </div>
                    )) : (
                      <p className="col-span-2 text-white/40">Codes hidden for security</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => disableMutation.mutate()}
            disabled={disableMutation.isPending}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Unlock className="w-5 h-5" />
            {disableMutation.isPending ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              step >= s ? 'bg-hot-500' : 'bg-white/20'
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Introduction */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-hot-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-hot-500" />
              </div>
              <h3 className="text-xl font-bold">Enable Two-Factor Authentication</h3>
              <p className="text-white/60 text-sm">
                Add an extra layer of security to your HOTMESS account
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <Smartphone className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Authenticator App Required</p>
                  <p className="text-xs text-white/60">
                    Use Google Authenticator, Authy, or 1Password
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <Key className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Backup Codes Provided</p>
                  <p className="text-xs text-white/60">
                    10 one-time codes in case you lose your device
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <Lock className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Enhanced Security</p>
                  <p className="text-xs text-white/60">
                    Protect against unauthorized access even if password is compromised
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startSetup}
                className="flex-1 px-4 py-3 rounded-xl bg-hot-500 text-white font-bold hover:bg-hot-600 transition-colors"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Scan QR Code */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">Scan QR Code</h3>
              <p className="text-white/60 text-sm">
                Open your authenticator app and scan this code
              </p>
            </div>

            {/* Mock QR Code placeholder */}
            <div className="mx-auto w-48 h-48 bg-white rounded-xl p-4 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300 rounded flex items-center justify-center">
                <QrCode className="w-24 h-24 text-gray-600" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-white/40 mb-2">Can't scan? Enter this key manually:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="px-3 py-2 bg-white/5 rounded font-mono text-sm">
                  {secret.match(/.{1,4}/g)?.join(' ')}
                </code>
                <button
                  onClick={() => copyToClipboard(secret)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 px-4 py-3 rounded-xl bg-hot-500 text-white font-bold hover:bg-hot-600 transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Verify Code */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold">Verify Setup</h3>
              <p className="text-white/60 text-sm">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(val);
                  setError('');
                }}
                placeholder="000000"
                className="w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.5em] rounded-xl bg-white/5 border-2 border-white/20 focus:border-hot-500 focus:outline-none transition-colors"
                autoFocus
              />

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            {/* Backup Codes Preview */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-amber-400">Save Your Backup Codes</p>
                  <p className="text-xs text-white/60 mt-1">
                    Store these codes somewhere safe. If you lose access to your authenticator, 
                    you'll need these to recover your account.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
                {backupCodes.slice(0, 4).map((code, i) => (
                  <div key={i} className="p-2 bg-black/20 rounded">
                    {code}
                  </div>
                ))}
              </div>
              <button
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
                className="mt-2 flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300"
              >
                <Copy className="w-3 h-3" />
                Copy all 10 codes
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                Back
              </button>
              <button
                onClick={verifyAndEnable}
                disabled={verificationCode.length !== 6 || enableMutation.isPending}
                className="flex-1 px-4 py-3 rounded-xl bg-hot-500 text-white font-bold hover:bg-hot-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enableMutation.isPending ? (
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin" />
                ) : (
                  'Enable 2FA'
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center"
            >
              <Check className="w-10 h-10 text-emerald-400" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">2FA Enabled!</h3>
              <p className="text-white/60 text-sm">
                Your account is now protected with two-factor authentication
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left">
              <p className="text-sm font-medium mb-2">What happens now:</p>
              <ul className="space-y-1 text-sm text-white/60">
                <li>• You'll need your authenticator code when logging in</li>
                <li>• New devices will always require verification</li>
                <li>• Keep your backup codes safe for emergencies</li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="w-full px-4 py-3 rounded-xl bg-hot-500 text-white font-bold hover:bg-hot-600 transition-colors"
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
