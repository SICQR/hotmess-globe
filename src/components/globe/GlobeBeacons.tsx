/**
 * HOTMESS OS — Globe Beacons Component
 * 
 * R3F render loop: Instanced mesh + per-instance color/intensity + pulse shader.
 * The Globe never decides. It only subscribes and renders.
 */

import * as THREE from 'three';
import React, { useEffect, useMemo, useRef } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import type { Beacon } from '../../core/beacons';
import { SHADER_VERTEX, SHADER_FRAGMENT } from '../../core/intensityToShaders';

// ═══════════════════════════════════════════════════════════════════════════════
// SHADER MATERIAL
// ═══════════════════════════════════════════════════════════════════════════════

const BeaconPulseMaterial = shaderMaterial(
  { uTime: 0 },
  SHADER_VERTEX,
  SHADER_FRAGMENT
);

extend({ BeaconPulseMaterial });

// TypeScript declaration for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      beaconPulseMaterial: {
        uTime?: number;
        transparent?: boolean;
        depthWrite?: boolean;
        side?: THREE.Side;
        ref?: React.Ref<THREE.ShaderMaterial>;
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR POLICY (type → color)
// ═══════════════════════════════════════════════════════════════════════════════

const BEACON_COLORS: Record<Beacon['type'], THREE.Color> = {
  SAFETY: new THREE.Color('#ff2a2a'),
  SOCIAL: new THREE.Color('#39FF14'),
  EVENT: new THREE.Color('#00D9FF'),
  MARKET: new THREE.Color('#FFD700'),
  RADIO: new THREE.Color('#B026FF'),
};

function colorForType(type: Beacon['type']): THREE.Color {
  return BEACON_COLORS[type] || new THREE.Color('#ffffff');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface GlobeBeaconsProps {
  beacons: Beacon[];
  latLngToGlobeVec3: (lat: number, lng: number) => THREE.Vector3;
  maxInstances?: number;
  size?: number;
}

export function GlobeBeacons({
  beacons,
  latLngToGlobeVec3,
  maxInstances = 2000,
  size = 0.012,
}: GlobeBeaconsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial & { uTime: number }>(null!);

  // Geometry (sphere for each beacon)
  const geom = useMemo(() => new THREE.SphereGeometry(size, 8, 8), [size]);
  
  // Dummy object for matrix transforms
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Instance attributes
  const aIntensity = useMemo(() => new Float32Array(maxInstances), [maxInstances]);
  const aColor = useMemo(() => new Float32Array(maxInstances * 3), [maxInstances]);

  const intensityAttr = useMemo(
    () => new THREE.InstancedBufferAttribute(aIntensity, 1),
    [aIntensity]
  );
  const colorAttr = useMemo(
    () => new THREE.InstancedBufferAttribute(aColor, 3),
    [aColor]
  );

  // Attach attributes to geometry
  useEffect(() => {
    geom.setAttribute('aIntensity', intensityAttr);
    geom.setAttribute('aColor', colorAttr);
  }, [geom, intensityAttr, colorAttr]);

  // Update instances when beacons change
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const count = Math.min(beacons.length, maxInstances);

    // Sort by z-priority (SAFETY on top)
    const sortedBeacons = [...beacons].sort((a, b) => {
      const priorityOrder: Record<Beacon['type'], number> = {
        RADIO: 1,
        MARKET: 2,
        EVENT: 3,
        SOCIAL: 4,
        SAFETY: 5,
      };
      return (priorityOrder[a.type] || 0) - (priorityOrder[b.type] || 0);
    });

    for (let i = 0; i < count; i++) {
      const beacon = sortedBeacons[i];
      
      // Position
      const pos = latLngToGlobeVec3(beacon.lat, beacon.lng);
      dummy.position.copy(pos);
      
      // Scale based on intensity
      const scale = 1 + beacon.intensity * 0.5;
      dummy.scale.setScalar(scale);
      
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Intensity attribute
      aIntensity[i] = beacon.intensity;

      // Color attribute
      const color = colorForType(beacon.type);
      aColor[i * 3 + 0] = color.r;
      aColor[i * 3 + 1] = color.g;
      aColor[i * 3 + 2] = color.b;
    }

    // Hide unused instances
    for (let i = count; i < maxInstances; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      aIntensity[i] = 0;
      aColor[i * 3 + 0] = 0;
      aColor[i * 3 + 1] = 0;
      aColor[i * 3 + 2] = 0;
    }

    mesh.instanceMatrix.needsUpdate = true;
    intensityAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    mesh.count = count;
  }, [beacons, latLngToGlobeVec3, maxInstances, aIntensity, aColor, intensityAttr, colorAttr, dummy]);

  // Animate time uniform for pulse effect
  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uTime = state.clock.elapsedTime;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geom, undefined, maxInstances]}
      frustumCulled={false}
    >
      <beaconPulseMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Default lat/lng to globe vector (assumes unit sphere)
// ═══════════════════════════════════════════════════════════════════════════════

export function defaultLatLngToGlobeVec3(
  lat: number,
  lng: number,
  radius: number = 1
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTERING (client-side only)
// ═══════════════════════════════════════════════════════════════════════════════

interface Cluster {
  key: string;
  beacons: Beacon[];
  center: { lat: number; lng: number };
  intensity: number;
  dominantType: Beacon['type'];
}

export function clusterBeacons(
  beacons: Beacon[],
  precision: number = 2
): Cluster[] {
  const clusters = new Map<string, Beacon[]>();

  // Group by grid cell
  for (const beacon of beacons) {
    const key = `${beacon.lat.toFixed(precision)}:${beacon.lng.toFixed(precision)}`;
    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(beacon);
  }

  // Convert to cluster objects
  const result: Cluster[] = [];
  
  for (const [key, group] of clusters) {
    // Calculate center
    const center = {
      lat: group.reduce((sum, b) => sum + b.lat, 0) / group.length,
      lng: group.reduce((sum, b) => sum + b.lng, 0) / group.length,
    };

    // Combined intensity (soft cap)
    const totalIntensity = group.reduce((sum, b) => sum + b.intensity, 0);
    const intensity = Math.min(1.5, totalIntensity / Math.sqrt(group.length));

    // Dominant type (highest priority wins)
    const priority: Record<Beacon['type'], number> = {
      SAFETY: 100,
      SOCIAL: 40,
      EVENT: 30,
      MARKET: 20,
      RADIO: 10,
    };
    const dominantType = group.reduce((best, b) => 
      (priority[b.type] || 0) > (priority[best.type] || 0) ? b : best
    ).type;

    result.push({
      key,
      beacons: group,
      center,
      intensity,
      dominantType,
    });
  }

  return result;
}

export default GlobeBeacons;
