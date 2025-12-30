import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, MapPin, Camera, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Scan() {
  const [beaconId, setBeaconId] = useState('');
  const [scannedBeacon, setScannedBeacon] = useState(null);
  const queryClient = useQueryClient();

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }),
  });

  const scanMutation = useMutation({
    mutationFn: async (beacon) => {
      const user = await base44.auth.me();
      const newXp = (user.xp || 0) + (beacon.xp_scan || 100);
      await base44.auth.updateMe({ xp: newXp });
      
      // Track interaction
      await base44.entities.UserInteraction.create({
        user_email: user.email,
        interaction_type: 'scan',
        beacon_id: beacon.id,
        beacon_kind: beacon.kind,
        beacon_mode: beacon.mode
      });
      
      return { beacon, earnedXp: beacon.xp_scan || 100 };
    },
    onSuccess: (data) => {
      setScannedBeacon(data);
      queryClient.invalidateQueries(['user']);
      setTimeout(() => {
        setScannedBeacon(null);
        setBeaconId('');
      }, 3000);
    }
  });

  const handleScan = () => {
    const beacon = beacons.find(b => b.id === beaconId);
    if (beacon) {
      scanMutation.mutate(beacon);
    } else {
      alert('Beacon not found');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border-2 border-[#FFEB3B]/40 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-10 h-10 text-[#FFEB3B]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
            Scan Beacon
          </h1>
          <p className="text-white/60">Enter beacon ID or scan QR code to earn XP</p>
        </motion.div>

        {/* Scan Success */}
        {scannedBeacon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-[#39FF14]/20 to-[#00D9FF]/20 border border-[#39FF14]/40 rounded-2xl p-8 mb-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-[#39FF14] mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2">Success!</h2>
            <p className="text-lg text-white/80 mb-4">
              Scanned <span className="font-bold">{scannedBeacon.beacon.title}</span>
            </p>
            <div className="text-4xl font-black text-[#FFEB3B]">
              +{scannedBeacon.earnedXp} XP
            </div>
          </motion.div>
        )}

        {/* Scan Interface */}
        {!scannedBeacon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-8"
          >
            <div className="mb-6">
              <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                Beacon ID
              </label>
              <Input
                value={beaconId}
                onChange={(e) => setBeaconId(e.target.value)}
                placeholder="Enter beacon ID..."
                className="bg-black border-white/20 text-white text-lg"
              />
            </div>

            <Button
              onClick={handleScan}
              disabled={!beaconId || scanMutation.isPending}
              className="w-full bg-[#FFEB3B] hover:bg-[#FFEB3B]/90 text-black font-bold text-lg py-6"
            >
              <Zap className="w-5 h-5 mr-2" />
              {scanMutation.isPending ? 'Scanning...' : 'Scan Beacon'}
            </Button>

            <div className="mt-6 pt-6 border-t border-white/10">
              <Button
                variant="ghost"
                className="w-full text-white/60 hover:text-white"
                disabled
              >
                <Camera className="w-5 h-5 mr-2" />
                Scan QR Code (Coming Soon)
              </Button>
            </div>
          </motion.div>
        )}

        {/* Nearby Beacons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <h2 className="text-xl font-black uppercase tracking-tight mb-4">Nearby Beacons</h2>
          <div className="space-y-3">
            {beacons.slice(0, 5).map((beacon) => (
              <motion.button
                key={beacon.id}
                onClick={() => setBeaconId(beacon.id)}
                whileHover={{ scale: 1.02 }}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">{beacon.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span>{beacon.city}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#FFEB3B] font-bold">+{beacon.xp_scan || 100} XP</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}