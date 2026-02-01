/**
 * UberShareButton - Book Uber AND auto-share trip with the person you're meeting
 * 
 * When clicked:
 * 1. Opens Uber with destination pre-filled
 * 2. Sends a message to the person you're traveling to
 * 3. Optionally notifies your trusted contacts
 * 4. Updates your status to "En Route"
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Share2, 
  Shield, 
  Clock, 
  MapPin, 
  Check, 
  X,
  Users,
  MessageCircle,
  Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

interface UberShareButtonProps {
  /** Profile you're traveling to meet */
  targetProfile: {
    id: string;
    profileName?: string;
    email?: string;
    geoLat?: number;
    geoLng?: number;
    locationLabel?: string;
  };
  /** Your current location */
  viewerLocation?: { lat: number; lng: number } | null;
  /** Your email/user info */
  viewerEmail?: string;
  viewerName?: string;
  /** Callback after booking */
  onBooked?: (tripDetails: TripDetails) => void;
  /** Show compact version */
  compact?: boolean;
  className?: string;
}

interface TripDetails {
  targetProfileId: string;
  targetName: string;
  targetEmail?: string;
  destinationLat: number;
  destinationLng: number;
  destinationLabel?: string;
  estimatedArrival?: string;
  sharedWith: string[];
  bookedAt: string;
}

export default function UberShareButton({
  targetProfile,
  viewerLocation,
  viewerEmail,
  viewerName,
  onBooked,
  compact = false,
  className
}: UberShareButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [shareWithTarget, setShareWithTarget] = useState(true);
  const [shareWithTrusted, setShareWithTrusted] = useState(true);
  const [isBooking, setIsBooking] = useState(false);

  const canBook = targetProfile.geoLat && targetProfile.geoLng;

  const buildUberUrl = useCallback(() => {
    if (!targetProfile.geoLat || !targetProfile.geoLng) return null;

    const params = new URLSearchParams();
    params.set('action', 'setPickup');
    
    // Add pickup location if available
    if (viewerLocation) {
      params.set('pickup[latitude]', String(viewerLocation.lat));
      params.set('pickup[longitude]', String(viewerLocation.lng));
      params.set('pickup[nickname]', 'Current Location');
    }
    
    // Set destination
    params.set('dropoff[latitude]', String(targetProfile.geoLat));
    params.set('dropoff[longitude]', String(targetProfile.geoLng));
    params.set('dropoff[nickname]', targetProfile.profileName || 'Destination');

    return `https://m.uber.com/ul/?${params.toString()}`;
  }, [targetProfile, viewerLocation]);

  const handleBookUber = useCallback(async () => {
    if (!canBook) return;
    
    setIsBooking(true);
    const sharedWith: string[] = [];
    const now = new Date();
    
    try {
      // 1. Send message to target profile
      if (shareWithTarget && targetProfile.email && viewerEmail) {
        try {
          // Create or get existing thread
          const threads = await base44.entities.ChatThread.filter({ active: true });
          let thread = threads.find(t => 
            Array.isArray(t.participant_emails) &&
            t.participant_emails.includes(viewerEmail) &&
            t.participant_emails.includes(targetProfile.email)
          );

          if (!thread) {
            thread = await base44.entities.ChatThread.create({
              participant_emails: [viewerEmail, targetProfile.email],
              active: true,
              created_date: now.toISOString(),
              updated_date: now.toISOString(),
            });
          }

          // Send auto-share message
          const arrivalTime = new Date(now.getTime() + 15 * 60 * 1000); // Estimate 15 min
          const message = `🚗 I'm on my way to meet you!\n\n📍 Destination: ${targetProfile.locationLabel || 'Your location'}\n⏰ ETA: ~${arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\nThis trip was shared automatically for safety.`;

          await base44.entities.ChatMessage.create({
            thread_id: thread.id,
            sender_email: viewerEmail,
            content: message,
            message_type: 'travel_share',
            created_date: now.toISOString(),
          });

          // Update thread
          await base44.entities.ChatThread.update(thread.id, {
            last_message: '🚗 On my way!',
            updated_date: now.toISOString(),
          });

          sharedWith.push(targetProfile.email);
          toast.success(`Trip shared with ${targetProfile.profileName || 'them'}`, {
            icon: '📤'
          });
        } catch (err) {
          console.error('Failed to send trip message:', err);
          // Continue anyway - don't block Uber booking
        }
      }

      // 2. Notify trusted contacts
      if (shareWithTrusted && viewerEmail) {
        try {
          const trustedContacts = await base44.entities.TrustedContact.filter({
            user_email: viewerEmail,
            active: true
          });

          for (const contact of trustedContacts.slice(0, 3)) { // Max 3 contacts
            if (!contact.contact_email) continue;

            await base44.entities.NotificationOutbox.create({
              recipient_email: contact.contact_email,
              sender_email: viewerEmail,
              notification_type: 'trip_share',
              title: `${viewerName || 'Your contact'} is traveling`,
              body: `📍 Going to meet: ${targetProfile.profileName || 'Someone'}\n⏰ Started: ${now.toLocaleTimeString()}`,
              created_date: now.toISOString(),
            });

            sharedWith.push(contact.contact_email);
          }

          if (trustedContacts.length > 0) {
            toast.success(`${trustedContacts.length} trusted contact(s) notified`, {
              icon: '🛡️'
            });
          }
        } catch (err) {
          console.error('Failed to notify trusted contacts:', err);
        }
      }

      // 3. Create safety check-in
      if (viewerEmail) {
        try {
          await base44.entities.SafetyCheckIn.create({
            user_email: viewerEmail,
            check_in_type: 'trip_started',
            location_lat: viewerLocation?.lat,
            location_lng: viewerLocation?.lng,
            destination_lat: targetProfile.geoLat,
            destination_lng: targetProfile.geoLng,
            destination_label: targetProfile.locationLabel || targetProfile.profileName,
            meeting_profile_id: targetProfile.id,
            status: 'active',
            created_date: now.toISOString(),
            expected_arrival: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 min window
          });
        } catch (err) {
          console.error('Failed to create safety check-in:', err);
        }
      }

      // 4. Open Uber
      const uberUrl = buildUberUrl();
      if (uberUrl) {
        window.open(uberUrl, '_blank', 'noopener,noreferrer');
      }

      // 5. Callback with trip details
      const tripDetails: TripDetails = {
        targetProfileId: targetProfile.id,
        targetName: targetProfile.profileName || 'Unknown',
        targetEmail: targetProfile.email,
        destinationLat: targetProfile.geoLat!,
        destinationLng: targetProfile.geoLng!,
        destinationLabel: targetProfile.locationLabel,
        sharedWith,
        bookedAt: now.toISOString(),
      };

      onBooked?.(tripDetails);
      setShowConfirm(false);

      toast.success('Uber opened! Have a safe trip 🚗', {
        duration: 5000,
      });

    } catch (err) {
      console.error('Booking error:', err);
      toast.error('Something went wrong');
    } finally {
      setIsBooking(false);
    }
  }, [
    canBook,
    shareWithTarget,
    shareWithTrusted,
    targetProfile,
    viewerLocation,
    viewerEmail,
    viewerName,
    buildUberUrl,
    onBooked
  ]);

  if (!canBook) {
    return null;
  }

  // Compact button version
  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 bg-black border border-white/30 rounded-full',
            'hover:bg-white/10 transition-colors',
            className
          )}
        >
          <Car className="w-4 h-4 text-white" />
          <span className="text-sm font-bold text-white">Uber</span>
          <Share2 className="w-3 h-3 text-pink-500" />
        </button>

        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          targetProfile={targetProfile}
          shareWithTarget={shareWithTarget}
          setShareWithTarget={setShareWithTarget}
          shareWithTrusted={shareWithTrusted}
          setShareWithTrusted={setShareWithTrusted}
          isBooking={isBooking}
          onConfirm={handleBookUber}
        />
      </>
    );
  }

  // Full button version
  return (
    <>
      <motion.button
        type="button"
        onClick={() => setShowConfirm(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'w-full flex items-center justify-between p-4 bg-black border border-white/20 rounded-xl',
          'hover:border-pink-500/50 hover:bg-pink-500/5 transition-all',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-black border border-white/30 rounded-xl flex items-center justify-center">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Book Uber</span>
              <span className="px-2 py-0.5 bg-pink-500/20 text-pink-500 text-[10px] font-black uppercase rounded-full">
                Auto-share
              </span>
            </div>
            <p className="text-xs text-white/60">
              Trip shared with {targetProfile.profileName || 'them'} + trusted contacts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          <Navigation className="w-5 h-5 text-white/60" />
        </div>
      </motion.button>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        targetProfile={targetProfile}
        shareWithTarget={shareWithTarget}
        setShareWithTarget={setShareWithTarget}
        shareWithTrusted={shareWithTrusted}
        setShareWithTrusted={setShareWithTrusted}
        isBooking={isBooking}
        onConfirm={handleBookUber}
      />
    </>
  );
}

// Confirmation modal component
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProfile: { profileName?: string; locationLabel?: string };
  shareWithTarget: boolean;
  setShareWithTarget: (v: boolean) => void;
  shareWithTrusted: boolean;
  setShareWithTrusted: (v: boolean) => void;
  isBooking: boolean;
  onConfirm: () => void;
}

function ConfirmModal({
  isOpen,
  onClose,
  targetProfile,
  shareWithTarget,
  setShareWithTarget,
  shareWithTrusted,
  setShareWithTrusted,
  isBooking,
  onConfirm
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-black border border-white/20 rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                  <Car className="w-5 h-5 text-pink-500" />
                </div>
                <div>
                  <h3 className="font-black text-white">BOOK & SHARE</h3>
                  <p className="text-xs text-white/60">Your trip will be shared automatically</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Destination */}
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <MapPin className="w-5 h-5 text-pink-500" />
                <div>
                  <p className="text-sm text-white/60">Going to meet</p>
                  <p className="font-bold text-white">{targetProfile.profileName || 'Someone'}</p>
                  {targetProfile.locationLabel && (
                    <p className="text-xs text-white/50">{targetProfile.locationLabel}</p>
                  )}
                </div>
              </div>

              {/* Share options */}
              <div className="space-y-3">
                <p className="text-xs text-white/60 uppercase font-bold">Share trip with:</p>
                
                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={shareWithTarget}
                    onChange={(e) => setShareWithTarget(e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-transparent checked:bg-pink-500 checked:border-pink-500"
                  />
                  <MessageCircle className="w-5 h-5 text-cyan" />
                  <div className="flex-1">
                    <p className="font-bold text-white">{targetProfile.profileName || 'The person'}</p>
                    <p className="text-xs text-white/50">They'll know you're on your way</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={shareWithTrusted}
                    onChange={(e) => setShareWithTrusted(e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-transparent checked:bg-green-500 checked:border-green-500"
                  />
                  <Users className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="font-bold text-white">Trusted Contacts</p>
                    <p className="text-xs text-white/50">For your safety</p>
                  </div>
                  <Shield className="w-4 h-4 text-green-500" />
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isBooking}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl font-bold text-white transition-colors disabled:opacity-50"
              >
                {isBooking ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Car className="w-5 h-5" />
                    <span>Open Uber</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
