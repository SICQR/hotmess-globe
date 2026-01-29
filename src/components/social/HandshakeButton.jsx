import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Zap, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// Generate 16-character token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default function HandshakeButton({ targetUser, currentUser, variant = 'default', className = '' }) {
  const [connecting, setConnecting] = useState(false);
  const queryClient = useQueryClient();

  const createHandshakeMutation = useMutation({
    mutationFn: async () => {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      const session = await base44.entities.BotSession.create({
        token,
        initiator_email: currentUser.email,
        target_email: targetUser.email,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      });

      return session;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries(['bot-sessions']);
      
      // Deep-link to Telegram bot with token
      const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'HOTMESS_ADMIN_BOT';
      const telegramUrl = `https://t.me/${botUsername}?start=${session.token}`;
      
      // Open Telegram
      window.open(telegramUrl, '_blank');
      
      toast.success(`Handshake sent! Opening Telegram...`, {
        description: `Connect with ${targetUser.full_name} anonymously`
      });
    },
    onError: (error) => {
      console.error('Handshake failed:', error);
      toast.error('Failed to create handshake');
    }
  });

  const handleConnect = async () => {
    if (!currentUser || !targetUser) return;

    const ok = await base44.auth.requireProfile(window.location.href);
    if (!ok) return;
    
    if (currentUser.email === targetUser.email) {
      toast.error('Cannot connect with yourself');
      return;
    }

    setConnecting(true);
    try {
      await createHandshakeMutation.mutateAsync();
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={connecting || createHandshakeMutation.isPending}
      variant={variant}
      className={className}
    >
      <Zap className="w-4 h-4 mr-2" />
      {connecting ? 'CONNECTING...' : 'CONNECT'}
      <ExternalLink className="w-3 h-3 ml-2" />
    </Button>
  );
}