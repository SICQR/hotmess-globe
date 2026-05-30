/**
 * ShakeSOS
 *
 * Invisible component that mounts the shake detection hook and renders
 * the 5-second countdown banner when a shake pattern is detected.
 *
 * Renders at z-[195] — above SOSButton (z-190), below SOSOverlay (z-200).
 * When not counting down: renders null.
 *
 * This component needs to be a sibling of SOSButton inside SOSProvider.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSOSContext } from '@/contexts/SOSContext';
import { useShakeSOS } from '@/hooks/useShakeSOS';

export default function ShakeSOS() {
  const { triggerSOS } = useSOSContext();
  useShakeSOS(triggerSOS);

  return null; // Silent component
}

/**
 * Re-export the hook so SafetyFAB can import from one place.
 * Usage: import { useShakeSOS } from '@/components/sos/ShakeSOS'
 */
export { useShakeSOS } from '@/hooks/useShakeSOS';
