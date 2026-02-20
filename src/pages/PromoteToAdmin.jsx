import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Shield, Check } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function PromoteToAdmin() {
  const [promoted, setPromoted] = useState(false);
  const navigate = useNavigate();

  const { data: currentUser, refetch } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const promoteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.User.update(currentUser.id, { role: 'admin' });
    },
    onSuccess: () => {
      setPromoted(true);
      refetch();
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  if (currentUser.role === 'admin') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">Already Admin</h1>
          <p className="text-white/60 mb-6">You already have admin privileges</p>
          <Button onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {promoted ? (
          <div>
            <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black mb-2">Promoted to Admin!</h1>
            <p className="text-white/60">Redirecting to home...</p>
          </div>
        ) : (
          <div>
            <Shield className="w-16 h-16 text-[#FF1493] mx-auto mb-4" />
            <h1 className="text-3xl font-black mb-2">Promote to Admin</h1>
            <p className="text-white/60 mb-2">Current role: {currentUser.role}</p>
            <p className="text-white/60 mb-6">Email: {currentUser.email}</p>
            <Button
              onClick={() => promoteMutation.mutate()}
              disabled={promoteMutation.isPending}
              className="bg-[#FF1493] text-black font-black w-full"
            >
              {promoteMutation.isPending ? 'Promoting...' : 'Make Me Admin'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}