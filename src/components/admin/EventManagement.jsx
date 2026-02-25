import React from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Eye, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function EventManagement() {
  const queryClient = useQueryClient();

  const { data: beacons = [] } = useQuery({
    queryKey: ['admin-beacons'],
    queryFn: () => base44.entities.Beacon.list('-created_date'),
  });

  const { data: rsvps = [] } = useQuery({
    queryKey: ['admin-rsvps'],
    queryFn: () => base44.entities.EventRSVP.list(),
  });

  const deleteBeaconMutation = useMutation({
    mutationFn: async (beaconId) => {
      await base44.entities.Beacon.delete(beaconId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-beacons']);
      toast.success('Beacon deleted');
    },
  });

  const toggleBeaconStatusMutation = useMutation({
    mutationFn: async ({ beaconId, active }) => {
      await base44.entities.Beacon.update(beaconId, { active: !active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-beacons']);
      toast.success('Status updated');
    },
  });

  const events = beacons.filter(b => b.kind === 'event');
  const activeEvents = events.filter(e => e.active);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">TOTAL BEACONS</p>
          <p className="text-4xl font-black">{beacons.length}</p>
        </div>
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">EVENTS</p>
          <p className="text-4xl font-black text-[#C8962C]">{events.length}</p>
        </div>
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">ACTIVE</p>
          <p className="text-4xl font-black text-[#00D9FF]">{activeEvents.length}</p>
        </div>
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">TOTAL RSVPS</p>
          <p className="text-4xl font-black text-[#FFEB3B]">{rsvps.length}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link to={createPageUrl('CreateBeacon')}>
          <Button className="bg-[#C8962C] hover:bg-white text-black border-2 border-white font-black">
            <Plus className="w-4 h-4 mr-2" />
            CREATE BEACON
          </Button>
        </Link>
      </div>

      {/* Beacon List */}
      <div className="bg-black border-2 border-white">
        <div className="border-b-2 border-white/20 p-4 grid grid-cols-12 gap-4 text-[10px] text-white/40 uppercase tracking-widest font-bold">
          <div className="col-span-3">TITLE</div>
          <div className="col-span-2">TYPE</div>
          <div className="col-span-2">CITY</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-1">RSVPS</div>
          <div className="col-span-2">ACTIONS</div>
        </div>
        <div className="divide-y-2 divide-white/10">
          {beacons.map((beacon, idx) => {
            const beaconRsvps = rsvps.filter(r => r.event_id === beacon.id);
            return (
              <motion.div
                key={beacon.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-white/5 transition-colors"
              >
                <div className="col-span-3">
                  <p className="font-black text-sm">{beacon.title}</p>
                  {beacon.event_date && (
                    <p className="text-xs text-white/40 font-mono">
                      {format(new Date(beacon.event_date), 'MMM d, HH:mm')}
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-1 text-xs font-black uppercase border-2 bg-[#B026FF]/20 border-[#B026FF] text-[#B026FF]">
                    {beacon.kind}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-bold">{beacon.city}</p>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => toggleBeaconStatusMutation.mutate({ 
                      beaconId: beacon.id, 
                      active: beacon.active 
                    })}
                    className={`px-2 py-1 text-xs font-black uppercase border-2 ${
                      beacon.active
                        ? 'bg-green-600/20 border-green-600 text-green-400'
                        : 'bg-red-600/20 border-red-600 text-red-400'
                    }`}
                  >
                    {beacon.active ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>
                <div className="col-span-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#00D9FF]" />
                    <span className="font-bold">{beaconRsvps.length}</span>
                  </div>
                </div>
                <div className="col-span-2 flex gap-1">
                  <Link to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link to={createPageUrl(`EditBeacon?id=${beacon.id}`)}>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-600/10"
                    onClick={() => {
                      if (confirm('Delete this beacon?')) {
                        deleteBeaconMutation.mutate(beacon.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}