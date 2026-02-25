/**
 * HOTMESS OS — useGlobeBeacons Hook
 * 
 * React hook to connect Supabase beacons to the BeaconManager.
 * Usage: Call this in your Globe component with the Three.js scene.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useBeacons } from '../../core/beacons';
import { BeaconManager } from './GlobeBeacons';
import type { SupabaseClient } from '@supabase/supabase-js';
import type * as THREE from 'three';

interface UseGlobeBeaconsOptions {
  supabase: SupabaseClient;
  scene: THREE.Scene | null;
  globeGroup?: THREE.Group;
  globeRadius?: number;
  enabled?: boolean;
}

/**
 * Hook to manage Globe beacons with Supabase realtime
 */
export function useGlobeBeacons({
  supabase,
  scene,
  globeGroup,
  globeRadius = 1.4,
  enabled = true,
}: UseGlobeBeaconsOptions) {
  const managerRef = useRef<BeaconManager | null>(null);
  
  // Get beacons from Supabase
  // Use 'beacons' table as the canonical source for events (the 'events' table may not exist)
  const beacons = useBeacons(supabase, { eventsTable: 'beacons' });

  // Initialize BeaconManager when scene is ready
  useEffect(() => {
    if (!scene || !enabled) return;

    managerRef.current = new BeaconManager({
      scene,
      globeGroup,
      globeRadius,
    });

    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
    };
  }, [scene, globeGroup, globeRadius, enabled]);

  // Update beacons when data changes
  useEffect(() => {
    if (managerRef.current && beacons.length > 0) {
      managerRef.current.updateBeacons(beacons);
    }
  }, [beacons]);

  // Get beacon at click position
  const getBeaconAt = useCallback(
    (mouse: THREE.Vector2, camera: THREE.Camera) => {
      return managerRef.current?.getBeaconAtPosition(mouse, camera) ?? null;
    },
    []
  );

  return {
    beacons,
    beaconCount: beacons.length,
    getBeaconAt,
  };
}

export default useGlobeBeacons;
