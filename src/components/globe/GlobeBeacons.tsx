/**
 * HOTMESS OS — Globe Beacons (Vanilla Three.js)
 * 
 * Creates and manages beacon instances for the existing Three.js globe.
 * The Globe never decides. It only subscribes and renders.
 */

import * as THREE from 'three';
import type { Beacon } from '../../core/beacons';

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR POLICY (type → hex)
// ═══════════════════════════════════════════════════════════════════════════════

const BEACON_COLORS: Record<Beacon['type'], number> = {
  SAFETY: 0xff2a2a,
  SOCIAL: 0x39FF14,
  EVENT: 0x00D9FF,
  MARKET: 0xFFD700,
  RADIO: 0xB026FF,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAT/LNG TO 3D VECTOR (match existing globe's coordinate system)
// ═══════════════════════════════════════════════════════════════════════════════

export function latLngToVector3(lat: number, lng: number, radius: number = 1.4): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEACON MANAGER (for vanilla Three.js scenes)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BeaconManagerOptions {
  scene: THREE.Scene;
  globeGroup?: THREE.Group;
  globeRadius?: number;
  maxBeacons?: number;
  beaconSize?: number;
}

export class BeaconManager {
  private scene: THREE.Scene;
  private globeGroup: THREE.Group | null;
  private globeRadius: number;
  private maxBeacons: number;
  private beaconSize: number;
  
  private beaconGroup: THREE.Group;
  private beaconMeshes: Map<string, THREE.Mesh>;
  private glowMeshes: Map<string, THREE.Mesh>;
  private animationId: number | null = null;
  private clock: THREE.Clock;

  constructor(options: BeaconManagerOptions) {
    this.scene = options.scene;
    this.globeGroup = options.globeGroup || null;
    this.globeRadius = options.globeRadius ?? 1.4;
    this.maxBeacons = options.maxBeacons ?? 500;
    this.beaconSize = options.beaconSize ?? 0.02;
    
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.name = 'beacons';
    this.beaconMeshes = new Map();
    this.glowMeshes = new Map();
    this.clock = new THREE.Clock();

    // Add to scene or globe group
    if (this.globeGroup) {
      this.globeGroup.add(this.beaconGroup);
    } else {
      this.scene.add(this.beaconGroup);
    }

    this.startAnimation();
  }

  /**
   * Update beacons from realtime data
   */
  updateBeacons(beacons: Beacon[]): void {
    const currentIds = new Set(beacons.map(b => b.id));

    // Remove beacons that no longer exist
    for (const [id] of this.beaconMeshes) {
      if (!currentIds.has(id)) {
        this.removeBeacon(id);
      }
    }

    // Add or update beacons
    for (const beacon of beacons.slice(0, this.maxBeacons)) {
      if (this.beaconMeshes.has(beacon.id)) {
        this.updateBeacon(beacon);
      } else {
        this.addBeacon(beacon);
      }
    }
  }

  private addBeacon(beacon: Beacon): void {
    const color = BEACON_COLORS[beacon.type] || 0xffffff;
    const position = latLngToVector3(beacon.lat, beacon.lng, this.globeRadius * 1.01);
    const size = this.beaconSize * (1 + beacon.intensity * 0.5);

    // Main beacon sphere
    const geometry = new THREE.SphereGeometry(size, 12, 12);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8 + beacon.intensity * 0.2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { beacon, startTime: this.clock.getElapsedTime() };
    
    this.beaconGroup.add(mesh);
    this.beaconMeshes.set(beacon.id, mesh);

    // Glow effect
    const glowSize = size * 2.5;
    const glowGeometry = new THREE.SphereGeometry(glowSize, 12, 12);
    const glowMaterial = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: beacon.intensity },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uTime;
        varying vec3 vNormal;
        void main() {
          float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + uIntensity * 6.28);
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float alpha = intensity * (0.3 + 0.4 * uIntensity) * pulse;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(position);
    
    this.beaconGroup.add(glowMesh);
    this.glowMeshes.set(beacon.id, glowMesh);
  }

  private updateBeacon(beacon: Beacon): void {
    const mesh = this.beaconMeshes.get(beacon.id);
    const glow = this.glowMeshes.get(beacon.id);
    if (!mesh || !glow) return;

    const position = latLngToVector3(beacon.lat, beacon.lng, this.globeRadius * 1.01);
    mesh.position.copy(position);
    glow.position.copy(position);

    // Update intensity
    mesh.userData.beacon = beacon;
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.8 + beacon.intensity * 0.2;

    const glowMaterial = glow.material as THREE.ShaderMaterial;
    glowMaterial.uniforms.uIntensity.value = beacon.intensity;
  }

  private removeBeacon(id: string): void {
    const mesh = this.beaconMeshes.get(id);
    const glow = this.glowMeshes.get(id);

    if (mesh) {
      this.beaconGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.beaconMeshes.delete(id);
    }

    if (glow) {
      this.beaconGroup.remove(glow);
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
      this.glowMeshes.delete(id);
    }
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const time = this.clock.getElapsedTime();

      // Update glow shaders with time
      for (const glow of this.glowMeshes.values()) {
        const material = glow.material as THREE.ShaderMaterial;
        if (material.uniforms?.uTime) {
          material.uniforms.uTime.value = time;
        }
      }

      // Pulse beacon sizes based on intensity
      for (const mesh of this.beaconMeshes.values()) {
        const beacon = mesh.userData.beacon as Beacon;
        if (!beacon) continue;

        const baseScale = 1 + beacon.intensity * 0.5;
        const pulse = 1 + 0.2 * Math.sin(time * 3 + beacon.intensity * 6.28);
        mesh.scale.setScalar(baseScale * pulse);
      }
    };

    animate();
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    // Remove all beacons
    for (const id of this.beaconMeshes.keys()) {
      this.removeBeacon(id);
    }

    // Remove group from scene
    if (this.globeGroup) {
      this.globeGroup.remove(this.beaconGroup);
    } else {
      this.scene.remove(this.beaconGroup);
    }
  }

  /**
   * Get beacon at screen position (for click handling)
   */
  getBeaconAtPosition(
    mouse: THREE.Vector2,
    camera: THREE.Camera
  ): Beacon | null {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(
      Array.from(this.beaconMeshes.values())
    );

    if (intersects.length > 0) {
      const beacon = intersects[0].object.userData.beacon as Beacon;
      return beacon || null;
    }

    return null;
  }
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

export default BeaconManager;
