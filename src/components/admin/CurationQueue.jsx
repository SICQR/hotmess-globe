import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { CheckCircle, MapPin, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function CurationQueue() {
  const queryClient = useQueryClient();

  const { data: shadowBeacons = [], isLoading } = useQuery({
    queryKey: ['shadow-beacons'],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.list();
      return beacons.filter(b => b.is_shadow === true);
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (beacon) => {
      await base44.entities.Beacon.update(beacon.id, {
        is_shadow: false,
        is_verified: true
      });
      return beacon;
    },
    onSuccess: (beacon) => {
      queryClient.invalidateQueries(['shadow-beacons']);
      queryClient.invalidateQueries(['beacons']);
      toast.success(`${beacon.title} verified!`);
    },
    onError: () => {
      toast.error('Verification failed');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black uppercase mb-2">Curation Queue</h2>
        <p className="text-sm text-white/60 uppercase">
          Shadow beacons pending verification ({shadowBeacons.length})
        </p>
      </div>

      {shadowBeacons.length === 0 ? (
        <div className="text-center py-12 bg-white/5 border border-white/10">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <p className="text-white/60 text-sm uppercase">All beacons verified</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shadowBeacons.map((beacon, idx) => (
            <motion.div
              key={beacon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-black border-2 border-[#FFEB3B] p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-[#FFEB3B]/20 border border-[#FFEB3B] text-[#FFEB3B] text-[10px] font-black uppercase">
                      SHADOW
                    </span>
                    <span className="px-2 py-1 bg-white/5 border border-white/20 text-white/60 text-[10px] font-black uppercase">
                      {beacon.kind}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-black mb-2">{beacon.title}</h3>
                  
                  {beacon.description && (
                    <p className="text-sm text-white/80 mb-3 line-clamp-2">{beacon.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-white/60">
                    {beacon.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{beacon.city}</span>
                      </div>
                    )}
                    {beacon.event_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(beacon.event_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>Created {format(new Date(beacon.created_date), 'MMM d')}</span>
                    </div>
                  </div>

                  {beacon.image_url && (
                    <img
                      src={beacon.image_url}
                      alt={beacon.title}
                      className="w-full h-32 object-cover mt-3 border border-white/10"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => verifyMutation.mutate(beacon)}
                    disabled={verifyMutation.isPending}
                    className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black border-2 border-white whitespace-nowrap"
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        VERIFY
                      </>
                    )}
                  </Button>
                  <Link to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white/60 hover:text-white hover:border-white/40 text-xs"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}