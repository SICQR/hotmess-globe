/**
 * GlobeActivityLayer — Three.js mesh helpers for the Living Globe
 *
 * Pure functions (no React) called from EnhancedGlobe3D's imperative useEffect.
 *
 * Sub-layer A: Seed Heat  — 8 gold circles at nightlife zones
 * Sub-layer B: Venue Glow — smaller gold dots per venue
 * Sub-layer C: Activity Flashes — (stubbed, wired during AI Trigger session)
 *
 * Render order: Seed heat (radius×1.003) → Venue glow (radius×1.006) →
 *   [existing grid, beacons, labels above]
 */

import * as THREE from 'three';
import type { SeedZone, VenueGlow, GlobeActivityEvent } from '@/hooks/useGlobeActivity';

// ── Coordinate helper (mirrors EnhancedGlobe3D's latLngToVector3) ───────────

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// ── Brand colour ─────────────────────────────────────────────────────────────

const GOLD = 0xC8962C;

// ── Sub-layer A: Seed Heat ──────────────────────────────────────────────────

/**
 * Create 8 gold radial-gradient circles on the globe surface for seed heat.
 * Returns a Group; call `animateSeedHeat` each frame.
 */
export function createSeedHeatGroup(
  globeRadius: number,
  seedZones: SeedZone[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'seedHeat';

  const circleGeo = new THREE.CircleGeometry(1, 32); // unit circle, scaled per zone

  for (const zone of seedZones) {
    if (zone.currentIntensity <= 0.01) continue;

    const mat = new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: zone.currentIntensity * 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(circleGeo, mat);

    // Position just above the globe surface
    const pos = latLngToVector3(zone.lat, zone.lng, globeRadius * 1.003);
    mesh.position.copy(pos);

    // Orient flat against the surface (look outward from globe centre)
    mesh.lookAt(pos.clone().multiplyScalar(2));

    // Scale by zone radius (in globe units — roughly 0.009–0.014)
    const s = zone.radius * globeRadius;
    mesh.scale.set(s, s, s);

    mesh.userData = {
      isSeedHeat: true,
      baseScale: s,
      baseOpacity: zone.currentIntensity * 0.35,
      phase: Math.random() * Math.PI * 2,
    };

    group.add(mesh);
  }

  return group;
}

/**
 * Animate seed heat circles — very gentle pulse.
 * Called once per frame from the animation loop.
 */
export function animateSeedHeat(group: THREE.Group, time: number): void {
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    const ud = child.userData;
    if (!ud.isSeedHeat) continue;

    const base = ud.baseScale ?? 1;
    const pulse = base * (1 + 0.03 * Math.sin(time * 0.3 + (ud.phase ?? 0)));
    child.scale.set(pulse, pulse, pulse);

    // Gentle opacity breathe
    const mat = child.material as THREE.MeshBasicMaterial;
    mat.opacity = (ud.baseOpacity ?? 0.2) * (0.9 + 0.1 * Math.sin(time * 0.25 + (ud.phase ?? 0)));
  }
}

// ── Sub-layer B: Venue Glow ─────────────────────────────────────────────────

/**
 * Create gold glow dots for each venue. Brighter = more activity.
 * Returns a Group; call `animateVenueGlow` each frame.
 */
export function createVenueGlowGroup(
  globeRadius: number,
  venueGlows: VenueGlow[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'venueGlow';

  // Shared geometry — small circle
  const dotGeo = new THREE.CircleGeometry(1, 24);

  for (let i = 0; i < venueGlows.length; i++) {
    const v = venueGlows[i];
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;

    // Dot size scales with intensity (0.005 – 0.018 globe-units)
    const size = (0.005 + v.intensity * 0.013) * globeRadius;

    const mat = new THREE.MeshBasicMaterial({
      color: GOLD,
      transparent: true,
      opacity: v.intensity * 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(dotGeo, mat);
    const pos = latLngToVector3(v.lat, v.lng, globeRadius * 1.006);
    mesh.position.copy(pos);
    mesh.lookAt(pos.clone().multiplyScalar(2));
    mesh.scale.set(size, size, size);

    mesh.userData = {
      isVenueGlow: true,
      baseScale: size,
      baseOpacity: v.intensity * 0.5,
      venueIndex: i,
    };

    group.add(mesh);

    // Outer halo for high-activity venues (intensity > 0.4)
    if (v.intensity > 0.4) {
      const haloMat = new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: v.intensity * 0.15,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(dotGeo, haloMat);
      halo.position.copy(pos);
      halo.lookAt(pos.clone().multiplyScalar(2));
      const haloSize = size * 2.2;
      halo.scale.set(haloSize, haloSize, haloSize);
      halo.userData = { isVenueHalo: true, baseScale: haloSize, baseOpacity: v.intensity * 0.15, venueIndex: i };
      group.add(halo);
    }
  }

  return group;
}

/**
 * Animate venue glow dots — subtle scale pulse.
 */
export function animateVenueGlow(group: THREE.Group, time: number): void {
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    const ud = child.userData;
    if (!ud.isVenueGlow && !ud.isVenueHalo) continue;

    const idx = ud.venueIndex ?? 0;
    const speed = ud.isVenueHalo ? 0.5 : 0.8;
    const base = ud.baseScale ?? 1;
    const s = base * (1 + 0.05 * Math.sin(time * speed + idx * 0.7));
    child.scale.set(s, s, s);
  }
}

// ── Sub-layer C: Activity Flashes (stub) ────────────────────────────────────

/**
 * Placeholder for ephemeral flash effects (purchases, messages, SOS).
 * Will be wired during the AI Trigger Wiring session.
 */
export function createActivityFlashGroup(
  _globeRadius: number,
  _events: GlobeActivityEvent[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'activityFlashes';
  // Layer C implementation deferred
  return group;
}

export function animateActivityFlashes(_group: THREE.Group, _time: number): void {
  // Layer C implementation deferred
}

// ── Disposal ────────────────────────────────────────────────────────────────

/** Recursively dispose all geometries and materials in a group. */
export function disposeActivityGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry?.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
  group.clear();
}
