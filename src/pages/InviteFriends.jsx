import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Gift, 
  Users, 
  Copy, 
  Check, 
  Share2,
  Mail,
  MessageCircle,
  QrCode,
  Smartphone,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../utils';
import { trackEvent } from '@/components/utils/analytics';

export default function InviteFriends() {
  const [user, setUser] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [stats, setStats] = useState({ sent: 0, joined: 0, xpEarned: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Generate referral code if not exists
        const code = currentUser.referral_code || generateReferralCode(currentUser.email);
        setReferralCode(code);

        // Save referral code if new
        if (!currentUser.referral_code) {
          await supabase
            .from('User')
            .update({ referral_code: code })
            .eq('email', currentUser.email);
        }

        // Fetch invitation stats
        const { data: invites } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_email', currentUser.email);

        if (invites) {
          const joined = invites.filter(i => i.status === 'completed').length;
          setStats({
            sent: invites.length,
            joined,
            xpEarned: joined * 500,
          });
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const generateReferralCode = (email) => {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${base.slice(0, 6)}${random}`;
  };

  const referralUrl = `${window.location.origin}/auth/sign-up?ref=${referralCode}`;

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Referral link copied!');
      trackEvent('invite_copy_link', { method: 'button' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join HOTMESS',
          text: `${user?.full_name || 'Your friend'} invited you to HOTMESS! Join using my referral link.`,
          url: referralUrl,
        });
        trackEvent('invite_share', { method: 'native' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyReferralLink();
        }
      }
    } else {
      copyReferralLink();
    }
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(
      `Hey! Join me on HOTMESS - the ultimate nightlife discovery app 🎉\n\nJoin using my referral link:\n${referralUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    trackEvent('invite_share', { method: 'whatsapp' });
  };

  const shareViaSMS = () => {
    const text = encodeURIComponent(
      `Join me on HOTMESS! Use my referral link: ${referralUrl}`
    );
    window.location.href = `sms:?body=${text}`;
    trackEvent('invite_share', { method: 'sms' });
  };

  const sendEmailInvites = async () => {
    const emailList = emails
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (emailList.length === 0) {
      toast.error('Please enter at least one valid email address');
      return;
    }

    setSendingInvites(true);
    try {
      // Track invites in database
      const inviteRecords = emailList.map(email => ({
        referrer_email: user.email,
        referred_email: email,
        referral_code: referralCode,
        status: 'pending',
        created_at: new Date().toISOString(),
      }));

      await supabase
        .from('referrals')
        .upsert(inviteRecords, { 
          onConflict: 'referrer_email,referred_email',
          ignoreDuplicates: true 
        });

      // Send invite emails via API
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invite',
          emails: emailList,
          referrerName: user.full_name || user.email.split('@')[0],
          referralUrl,
        }),
      });

      if (response.ok) {
        toast.success(`Invitations sent to ${emailList.length} people!`);
        setEmails('');
        trackEvent('invite_email', { count: emailList.length });
        
        // Update stats
        setStats(prev => ({ ...prev, sent: prev.sent + emailList.length }));
      } else {
        toast.error('Failed to send some invitations');
      }
    } catch (error) {
      console.error('Failed to send invites:', error);
      toast.error('Failed to send invitations');
    } finally {
      setSendingInvites(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-[#C8962C] rounded-full animate-spin" />
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
            to={createPageUrl('Social')} 
            className="inline-flex items-center text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-[#C8962C] to-[#B026FF] rounded-xl flex items-center justify-center">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                Invite Friends
              </h1>
              <p className="text-white/60">Earn rewards when your friends join HOTMESS</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-[#00D9FF]" />
            <div className="text-2xl font-black">{stats.sent}</div>
            <div className="text-xs text-white/60">Invited</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <Check className="w-6 h-6 mx-auto mb-2 text-[#39FF14]" />
            <div className="text-2xl font-black">{stats.joined}</div>
            <div className="text-xs text-white/60">Joined</div>
          </div>
        </motion.div>

        {/* Rewards Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-[#C8962C]/20 to-[#B026FF]/20 border-2 border-[#C8962C] rounded-xl p-6 mb-6"
        >
          <div className="flex items-center gap-4">
            <Zap className="w-10 h-10 text-[#C8962C]" />
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Invite Your People!</h3>
              <p className="text-sm text-white/80">
                Help grow the HOTMESS community — every friend you bring makes it better.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Share Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6"
        >
          <h3 className="font-bold uppercase tracking-wider mb-4">Your Referral Link</h3>
          
          <div className="flex gap-2 mb-4">
            <Input
              value={referralUrl}
              readOnly
              className="bg-black border-white/20 font-mono text-sm"
            />
            <Button
              onClick={copyReferralLink}
              variant="outline"
              className="border-white/20 px-4"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <Button
            onClick={shareReferral}
            className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-bold"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Link
          </Button>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              onClick={shareToWhatsApp}
              variant="outline"
              className="border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              onClick={shareViaSMS}
              variant="outline"
              className="border-[#00D9FF]/40 text-[#00D9FF] hover:bg-[#00D9FF]/10"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              SMS
            </Button>
          </div>

          {/* Referral Code */}
          <div className="mt-4 p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xs text-white/60 mb-1">Your referral code</div>
            <div className="font-mono font-bold text-2xl tracking-wider">{referralCode}</div>
          </div>
        </motion.div>

        {/* Email Invites */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6"
        >
          <h3 className="font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#00D9FF]" />
            Invite by Email
          </h3>
          
          <Textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="Enter email addresses (one per line or comma-separated)"
            className="bg-black border-white/20 min-h-[100px] mb-4"
          />
          
          <Button
            onClick={sendEmailInvites}
            disabled={sendingInvites || !emails.trim()}
            className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-bold"
          >
            {sendingInvites ? (
              <>
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Invitations
              </>
            )}
          </Button>
        </motion.div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6"
        >
          <h3 className="font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#B026FF]" />
            Share QR Code
          </h3>
          
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralUrl)}&bgcolor=ffffff&color=000000`}
                alt="QR Code"
                className="w-[200px] h-[200px]"
              />
            </div>
            <p className="text-sm text-white/60 text-center">
              Show this QR code to friends so they can scan and sign up instantly
            </p>
          </div>
        </motion.div>

        {/* Referral Program Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 text-center"
        >
          <Link 
            to={createPageUrl('ReferralProgram')} 
            className="text-[#C8962C] hover:underline text-sm"
          >
            View full referral program details & milestones →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
