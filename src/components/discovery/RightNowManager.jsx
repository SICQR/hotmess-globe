import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, History, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RightNowModal from './RightNowModal';
import RightNowIndicator from './RightNowIndicator';
import RightNowHistory from './RightNowHistory';
import { toast } from 'sonner';

export default function RightNowManager({ currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: activeStatus } = useQuery({
    queryKey: ['right-now-active', currentUser?.email],
    queryFn: async () => {
      const statuses = await base44.entities.RightNowStatus.filter({
        user_email: currentUser.email,
        active: true
      });
      const active = statuses.find(s => new Date(s.expires_at) > new Date());
      return active || null;
    },
    enabled: !!currentUser,
    refetchInterval: 10000 // Check every 10s
  });

  const endNowMutation = useMutation({
    mutationFn: async () => {
      if (!activeStatus) return;
      await base44.entities.RightNowStatus.update(activeStatus.id, { active: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['right-now-active']);
      queryClient.invalidateQueries(['right-now-status']);
      queryClient.invalidateQueries(['right-now-history']);
      toast.success('Right Now status ended');
    }
  });

  return (
    <div className="bg-black border-2 border-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#FF1493]" />
          <h2 className="text-xl font-black uppercase">RIGHT NOW</h2>
        </div>
        
        {activeStatus ? (
          <Button
            onClick={async () => {
              const ok = await base44.auth.requireProfile(window.location.href);
              if (!ok) return;
              endNowMutation.mutate();
            }}
            disabled={endNowMutation.isPending}
            variant="outline"
            size="sm"
            className="border-red-500/40 text-red-400 hover:bg-red-500/20"
          >
            <Power className="w-4 h-4 mr-2" />
            End Now
          </Button>
        ) : (
          <Button
            onClick={async () => {
              const ok = await base44.auth.requireProfile(window.location.href);
              if (!ok) return;
              setShowModal(true);
            }}
            className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black"
          >
            <Zap className="w-4 h-4 mr-2" />
            Go Live
          </Button>
        )}
      </div>

      {activeStatus && <RightNowIndicator status={activeStatus} />}

      {!activeStatus && (
        <div className="bg-white/5 border-2 border-white/10 p-6 text-center">
          <p className="text-white/60 text-sm mb-4">
            Set your Right Now status to show you're available for connections.
          </p>
          <ul className="text-left text-xs text-white/40 space-y-2 mb-4">
            <li>• Choose 30min–Tonight duration</li>
            <li>• Set logistics (host, travel, hotel)</li>
            <li>• Auto-expires, no ghost status</li>
            <li>• Appears in Connect discovery</li>
          </ul>
          <Button
            onClick={async () => {
              const ok = await base44.auth.requireProfile(window.location.href);
              if (!ok) return;
              setShowModal(true);
            }}
            className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black w-full"
          >
            <Zap className="w-4 h-4 mr-2" />
            Go Right Now
          </Button>
        </div>
      )}

      <Tabs defaultValue="history" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 w-full">
          <TabsTrigger value="history" className="flex-1">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="mt-4">
          <RightNowHistory userEmail={currentUser.email} />
        </TabsContent>
      </Tabs>

      <RightNowModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        currentUser={currentUser}
      />
    </div>
  );
}