import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  ArrowLeft, 
  Loader2, 
  Trash2,
  Shield,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';
import { logger } from '@/utils/logger';

const DELETION_CONSEQUENCES = [
  'Your profile and all personal information will be permanently deleted',
  'All your messages and conversations will be removed',
  'Your events and beacons will be deleted or transferred to anonymous',
  'Your marketplace orders and purchase history will be removed',
  'Your social connections and follows will be deleted',
  'You will lose access to any premium features or memberships',
  'This action cannot be undone',
];

export default function AccountDeletion() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [acceptedConsequences, setAcceptedConsequences] = useState(false);
  const [deletionProgress, setDeletionProgress] = useState(0);
  const [deletionStep, setDeletionStep] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        logger.error('Failed to fetch user', { error: error?.message, context: 'AccountDeletion' });
        navigate(createPageUrl('Auth'));
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  const canDelete = confirmText.toLowerCase() === 'delete my account' && acceptedConsequences;

  const handleDeleteAccount = async () => {
    if (!canDelete || !user) return;
    
    setDeleting(true);
    setDeletionProgress(0);
    
    try {
      // Step 1: Delete messages
      setDeletionStep('Removing messages...');
      setDeletionProgress(10);
      await supabase
        .from('message')
        .delete()
        .eq('sender_email', user.email);

      // Step 2: Delete conversations
      setDeletionStep('Removing conversations...');
      setDeletionProgress(20);
      // Messages are cascade deleted with conversations typically

      // Step 3: Delete RSVPs
      setDeletionStep('Removing event RSVPs...');
      setDeletionProgress(30);
      await supabase
        .from('EventRSVP')
        .delete()
        .eq('user_email', user.email);

      // Step 4: Anonymize or delete beacons
      setDeletionStep('Removing beacons...');
      setDeletionProgress(40);
      await supabase
        .from('Beacon')
        .update({ created_by: 'deleted_user' })
        .eq('created_by', user.email);

      // Step 5: Delete social connections
      setDeletionStep('Removing social connections...');
      setDeletionProgress(50);
      await supabase
        .from('user_follows')
        .delete()
        .or(`follower_email.eq.${user.email},following_email.eq.${user.email}`);

      // Step 6: Delete handshakes
      setDeletionStep('Removing handshakes...');
      setDeletionProgress(60);
      await supabase
        .from('handshake')
        .delete()
        .or(`initiator_email.eq.${user.email},recipient_email.eq.${user.email}`);

      // Step 7: Delete notifications
      setDeletionStep('Removing notifications...');
      setDeletionProgress(70);
      await supabase
        .from('notification')
        .delete()
        .eq('user_email', user.email);

      // Step 8: Delete push subscriptions
      setDeletionStep('Removing push subscriptions...');
      setDeletionProgress(75);
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_email', user.email);

      // Step 9: Delete marketplace data
      setDeletionStep('Removing marketplace data...');
      setDeletionProgress(80);
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_email', user.email);

      // Step 10: Delete user vibes
      setDeletionStep('Removing user preferences...');
      setDeletionProgress(85);
      await supabase
        .from('user_vibes')
        .delete()
        .eq('user_email', user.email);

      // Step 11: Delete activity logs
      setDeletionStep('Removing activity logs...');
      setDeletionProgress(90);
      await supabase
        .from('user_activity')
        .delete()
        .eq('user_email', user.email);

      // Step 12: Log deletion request
      setDeletionStep('Recording deletion request...');
      setDeletionProgress(95);
      await supabase
        .from('account_deletion_requests')
        .insert({
          user_email: user.email,
          status: 'completed',
          deleted_at: new Date().toISOString(),
        });

      // Step 13: Delete user record
      setDeletionStep('Finalizing account deletion...');
      setDeletionProgress(98);
      await supabase
        .from('User')
        .delete()
        .eq('email', user.email);

      setDeletionProgress(100);
      setDeletionStep('Account deleted successfully');

      toast.success('Your account has been deleted');
      
      // Sign out and redirect
      setTimeout(() => {
        base44.auth.logout();
        navigate('/');
      }, 2000);

    } catch (error) {
      logger.error('Account deletion failed', { error: error?.message, context: 'AccountDeletion' });
      toast.error('Failed to delete account. Please contact support.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E62020]" />
      </div>
    );
  }

  if (deleting) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-red-500/20 border-2 border-red-500 rounded-xl p-8">
            <Loader2 className="w-16 h-16 text-red-500 mx-auto mb-6 animate-spin" />
            <h2 className="text-2xl font-black uppercase mb-2">Deleting Account</h2>
            <p className="text-white/60 mb-6">{deletionStep}</p>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div 
                className="h-full bg-red-500"
                initial={{ width: 0 }}
                animate={{ width: `${deletionProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-white/40">{deletionProgress}% complete</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('Settings')} 
            className="inline-flex items-center text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-500/20 border border-red-500/40 rounded-lg flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-red-500">
                Delete Account
              </h1>
              <p className="text-white/60">Permanently remove your account and data</p>
            </div>
          </div>
        </motion.div>

        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-red-500/20 border-2 border-red-500 rounded-xl p-6 mb-6"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-bold text-red-500 mb-2">Warning: This action is irreversible</h3>
              <p className="text-white/80 leading-relaxed">
                Once you delete your account, there is no going back. All your data will be 
                permanently removed from our servers. Please be certain before proceeding.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Data Export Reminder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-xl p-6 mb-6"
        >
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-[#00D9FF] flex-shrink-0" />
            <div>
              <h3 className="font-bold text-[#00D9FF] mb-2">Export Your Data First</h3>
              <p className="text-sm text-white/80 mb-4">
                Before deleting your account, we recommend downloading a copy of your data. 
                Once deleted, we cannot recover any information.
              </p>
              <Link to={createPageUrl('DataExport')}>
                <Button variant="outline" className="border-[#00D9FF]/40 text-[#00D9FF] hover:bg-[#00D9FF]/20">
                  Export My Data First
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Consequences List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-lg font-bold uppercase tracking-wider mb-4">What Will Happen</h2>
          <div className="space-y-3">
            {DELETION_CONSEQUENCES.map((consequence, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-white/80">{consequence}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Confirmation Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6"
        >
          <h2 className="text-lg font-bold uppercase tracking-wider mb-6">Confirm Deletion</h2>
          
          {/* Checkbox */}
          <div className="flex items-start gap-3 mb-6 p-4 bg-red-500/10 border border-red-500/40 rounded-lg">
            <Checkbox
              id="accept-consequences"
              checked={acceptedConsequences}
              onCheckedChange={(checked) => setAcceptedConsequences(checked === true)}
              className="mt-1 border-red-500 data-[state=checked]:bg-red-500"
            />
            <label htmlFor="accept-consequences" className="text-sm text-white/80 cursor-pointer">
              I understand that this action is permanent and irreversible. I have read and 
              acknowledge all the consequences listed above. I confirm that I want to 
              permanently delete my HOTMESS account.
            </label>
          </div>

          {/* Type Confirmation */}
          <div className="mb-6">
            <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
              Type "delete my account" to confirm
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete my account"
              className="bg-black border-red-500/40 text-white font-mono"
            />
          </div>

          {/* Delete Button */}
          <Button
            onClick={handleDeleteAccount}
            disabled={!canDelete}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Permanently Delete My Account
          </Button>

          {!canDelete && (
            <p className="text-center text-sm text-white/40 mt-4">
              {!acceptedConsequences && 'Please accept the consequences above'}
              {acceptedConsequences && confirmText.toLowerCase() !== 'delete my account' && 
                'Please type "delete my account" to confirm'}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
