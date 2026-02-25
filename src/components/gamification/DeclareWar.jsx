import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Swords, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function DeclareWar({ venueId, kingData, currentUser }) {
  const queryClient = useQueryClient();

  const warMutation = useMutation({
    mutationFn: async () => {
      // Update king data to trigger war
      await base44.entities.VenueKing.update(kingData.id, {
        war_active: true,
        war_started_at: new Date().toISOString(),
        war_started_by: currentUser.email,
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['venue-king']);
      toast.success('WAR DECLARED! 24 hours of war mode!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to declare war');
    },
  });

  const canDeclareWar = !!currentUser;
  const isWarActive = kingData?.war_active && kingData?.war_started_at && 
    (Date.now() - new Date(kingData.war_started_at).getTime() < 24 * 60 * 60 * 1000);

  if (!kingData || isWarActive) return null;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          disabled={!canDeclareWar}
          className="w-full bg-red-500 hover:bg-red-600 text-black font-black border-2 border-red-600"
        >
          <Swords className="w-4 h-4 mr-2" />
          DECLARE WAR
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-black border-2 border-red-500 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black uppercase flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            DECLARE WAR?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/80">
            Trigger a 24-hour WAR state at this venue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="bg-red-500/20 border border-red-500 p-4 my-4">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="w-5 h-5 text-red-500" />
            <p className="font-black uppercase text-sm">WAR EFFECTS</p>
          </div>
          <ul className="space-y-2 text-sm text-white/80">
            <li>• War mode active for all scans at this venue</li>
            <li>• Lasts for 24 hours</li>
            <li>• Challenge the crown</li>
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/20">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => warMutation.mutate()}
            disabled={warMutation.isPending}
            className="bg-red-500 hover:bg-red-600 text-black font-black"
          >
            {warMutation.isPending ? 'DECLARING...' : 'DECLARE WAR'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}