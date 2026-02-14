/**
 * Live Location Sharing Component
 * 
 * Safety feature allowing users to share their real-time location
 * with trusted contacts for a specified duration
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Users,
  Shield,
  X,
  Check,
  AlertTriangle,
  Navigation,
  Radio,
  Loader2,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';

// =============================================================================
// DURATION OPTIONS
// =============================================================================

const DURATION_OPTIONS = [
  { value: 15, label: '15 min', description: 'Quick check' },
  { value: 30, label: '30 min', description: 'Short meetup' },
  { value: 60, label: '1 hour', description: 'Date night' },
  { value: 120, label: '2 hours', description: 'Extended' },
  { value: 480, label: '8 hours', description: 'All night' },
];

// =============================================================================
// LOCATION UTILITIES
// =============================================================================

const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function LiveLocationShare({
  currentUser,
  trustedContacts = [],
  onShareStart,
  onShareEnd,
  className
}) {
  const [isSharing, setIsSharing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [shareId, setShareId] = useState(null);

  const watchIdRef = useRef(null);
  const timerRef = useRef(null);
  const channelRef = useRef(null);

  // Check if currently sharing on mount
  useEffect(() => {
    checkActiveShare();
    return () => {
      stopLocationWatch();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isSharing && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            stopSharing();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isSharing, remainingTime]);

  // Check for active share session
  const checkActiveShare = async () => {
    if (!currentUser?.id) return;

    try {
      const { data } = await supabase
        .from('location_shares')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('active', true)
        .single();

      if (data) {
        const endTime = new Date(data.end_time).getTime();
        const now = Date.now();
        const remaining = Math.floor((endTime - now) / 1000);

        if (remaining > 0) {
          setIsSharing(true);
          setShareId(data.id);
          setRemainingTime(remaining);
          setSelectedContacts(data.contact_ids || []);
          startLocationWatch();
        } else {
          // Expired, clean up
          await stopSharing();
        }
      }
    } catch (error) {
      // No active share
    }
  };

  // Start watching location
  const startLocationWatch = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        setCurrentLocation(location);
        broadcastLocation(location);
      },
      (error) => {
        logger.error('Location error:', error);
        setLocationError('Unable to get location');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  };

  // Stop watching location
  const stopLocationWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Broadcast location to contacts
  const broadcastLocation = async (location) => {
    if (!shareId || !currentUser?.id) return;

    try {
      // Update location in database
      await supabase
        .from('location_shares')
        .update({
          current_lat: location.lat,
          current_lng: location.lng,
          last_update: new Date().toISOString(),
        })
        .eq('id', shareId);

      // Also broadcast via realtime channel
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'location_update',
          payload: {
            user_id: currentUser.id,
            ...location,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to broadcast location:', error);
    }
  };

  // Start sharing
  const startSharing = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    setLoading(true);
    setLocationError('');

    try {
      // Get initial location
      const location = await getCurrentPosition();
      setCurrentLocation(location);

      // Create share record
      const endTime = new Date(Date.now() + selectedDuration * 60 * 1000);
      
      const { data, error } = await supabase
        .from('location_shares')
        .insert({
          user_id: currentUser.id,
          contact_ids: selectedContacts,
          start_time: new Date().toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: selectedDuration,
          current_lat: location.lat,
          current_lng: location.lng,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setShareId(data.id);
      setIsSharing(true);
      setRemainingTime(selectedDuration * 60);
      setShowConfirm(false);

      // Start location watch
      startLocationWatch();

      // Set up realtime channel
      channelRef.current = supabase.channel(`location-share-${data.id}`);
      channelRef.current.subscribe();

      // Notify contacts
      await notifyContacts('start');

      toast.success('Location sharing started');
      onShareStart?.(data);

    } catch (error) {
      logger.error('Failed to start sharing:', error);
      setLocationError(error.message || 'Failed to start location sharing');
      toast.error('Failed to start location sharing');
    } finally {
      setLoading(false);
    }
  };

  // Stop sharing
  const stopSharing = async () => {
    setLoading(true);

    try {
      if (shareId) {
        await supabase
          .from('location_shares')
          .update({ active: false })
          .eq('id', shareId);

        // Notify contacts
        await notifyContacts('end');
      }

      stopLocationWatch();

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      setIsSharing(false);
      setShareId(null);
      setRemainingTime(0);
      setCurrentLocation(null);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      toast.success('Location sharing stopped');
      onShareEnd?.();

    } catch (error) {
      logger.error('Failed to stop sharing:', error);
      toast.error('Failed to stop sharing');
    } finally {
      setLoading(false);
    }
  };

  // Notify contacts
  const notifyContacts = async (type) => {
    // In production, this would send push notifications/SMS to contacts
    logger.info(`Notifying contacts: ${type}`, selectedContacts);
  };

  // Toggle contact selection
  const toggleContact = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Format remaining time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          isSharing ? "bg-[#39FF14]/20" : "bg-[#FF1493]/20"
        )}>
          {isSharing ? (
            <Radio className="w-6 h-6 text-[#39FF14] animate-pulse" />
          ) : (
            <MapPin className="w-6 h-6 text-[#FF1493]" />
          )}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            {isSharing ? 'Sharing Location' : 'Live Location'}
          </h3>
          <p className="text-sm text-white/60">
            {isSharing 
              ? `${formatTime(remainingTime)} remaining` 
              : 'Share with trusted contacts'}
          </p>
        </div>
      </div>

      {/* Error message */}
      {locationError && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">{locationError}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Active sharing view */}
        {isSharing && (
          <motion.div
            key="sharing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Status card */}
            <div className="p-4 bg-[#39FF14]/10 border border-[#39FF14]/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#39FF14] font-bold uppercase">Live Now</span>
                <span className="text-2xl font-mono text-[#39FF14]">
                  {formatTime(remainingTime)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#39FF14]"
                  initial={{ width: '100%' }}
                  animate={{ 
                    width: `${(remainingTime / (selectedDuration * 60)) * 100}%` 
                  }}
                  transition={{ duration: 1 }}
                />
              </div>

              {/* Location info */}
              {currentLocation && (
                <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                  <Navigation className="w-3 h-3" />
                  <span>
                    {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                  </span>
                  <span className="text-white/20">•</span>
                  <span>±{Math.round(currentLocation.accuracy)}m</span>
                </div>
              )}
            </div>

            {/* Sharing with */}
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
                <Users className="w-4 h-4" />
                <span>Sharing with {selectedContacts.length} contacts</span>
              </div>
            </div>

            {/* Stop button */}
            <Button
              onClick={stopSharing}
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Stop Sharing
            </Button>
          </motion.div>
        )}

        {/* Setup view */}
        {!isSharing && !showConfirm && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Duration selection */}
            <div>
              <label className="text-sm text-white/60 uppercase tracking-wider mb-3 block">
                Duration
              </label>
              <div className="grid grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDuration(option.value)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-center",
                      selectedDuration === option.value
                        ? "border-[#FF1493] bg-[#FF1493]/20"
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <div className="text-sm font-bold">{option.label}</div>
                    <div className="text-[10px] text-white/40">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact selection */}
            <div>
              <label className="text-sm text-white/60 uppercase tracking-wider mb-3 block">
                Share With
              </label>
              {trustedContacts.length === 0 ? (
                <div className="p-4 bg-white/5 rounded-lg text-center">
                  <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">No trusted contacts yet</p>
                  <Button
                    variant="link"
                    className="text-[#FF1493] text-sm mt-2"
                    onClick={() => window.location.href = '/safety'}
                  >
                    Add Trusted Contacts
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {trustedContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                        selectedContacts.includes(contact.id)
                          ? "border-[#FF1493] bg-[#FF1493]/10"
                          : "border-white/10 hover:border-white/30"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        {contact.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-xs text-white/40">{contact.phone || contact.email}</div>
                      </div>
                      {selectedContacts.includes(contact.id) && (
                        <Check className="w-5 h-5 text-[#FF1493]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Start button */}
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={selectedContacts.length === 0 || trustedContacts.length === 0}
              className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold py-6"
            >
              <Share2 className="w-5 h-5 mr-2" />
              Start Sharing Location
            </Button>
          </motion.div>
        )}

        {/* Confirmation view */}
        {!isSharing && showConfirm && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-400">Confirm Location Sharing</p>
                  <p className="text-sm text-white/60 mt-1">
                    Your real-time location will be shared with {selectedContacts.length} contact(s) 
                    for {DURATION_OPTIONS.find(o => o.value === selectedDuration)?.label}.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowConfirm(false)}
                variant="outline"
                className="flex-1 border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={startSharing}
                disabled={loading}
                className="flex-1 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Confirm
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy note */}
      <div className="flex items-start gap-2 text-[10px] text-white/30">
        <Shield className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <p>
          Location data is encrypted and only shared with your selected contacts. 
          Sharing automatically stops after the selected duration.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT LOCATION SHARE BUTTON
// =============================================================================

export function LocationShareButton({ currentUser, trustedContacts, className }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className={cn("bg-[#FF1493]/20 hover:bg-[#FF1493]/30 text-[#FF1493]", className)}
      >
        <MapPin className="w-4 h-4 mr-2" />
        Share Location
      </Button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-black border-2 border-[#FF1493] p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase">Live Location</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <LiveLocationShare
                currentUser={currentUser}
                trustedContacts={trustedContacts}
                onShareStart={() => {}}
                onShareEnd={() => setShowModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
