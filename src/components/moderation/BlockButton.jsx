import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { Ban, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function BlockButton({ userEmail }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await supabase.auth.getSession().then(r => !!r.data.session);
        if (!isAuth) {
          setCurrentUser(null);
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
      if (!user) { user = null; } else { const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(); user = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email }; };
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }
    };
    fetchUser();
  }, []);

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks', currentUser?.email],
    queryFn: () => base44.entities.UserBlock.filter({ blocker_email: currentUser.email }),
    enabled: !!currentUser
  });

  const isBlocked = blocks.some(b => b.blocked_email === userEmail);

  const blockMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.UserBlock.create({
        blocker_email: currentUser.email,
        blocked_email: userEmail
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blocks']);
      toast.success('User blocked');
    }
  });

  const unblockMutation = useMutation({
    mutationFn: async () => {
      const block = blocks.find(b => b.blocked_email === userEmail);
      if (block) {
        await base44.entities.UserBlock.delete(block.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blocks']);
      toast.success('User unblocked');
    }
  });

  if (!currentUser) return null;

  return (
    <Button
      onClick={() => isBlocked ? unblockMutation.mutate() : blockMutation.mutate()}
      variant="outline"
      size="sm"
      className={isBlocked ? 'border-[#39FF14] text-[#39FF14]' : 'border-red-600 text-red-600'}
      disabled={blockMutation.isPending || unblockMutation.isPending}
    >
      {isBlocked ? <Check className="w-4 h-4 mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
      {isBlocked ? 'Unblock' : 'Block'}
    </Button>
  );
}