import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * BPM-driven visual effects for the globe
 * Syncs building heights and city pulses with music BPM
 */
export const useBPMVisualization = (scene, currentTrack, cities, beacons) => {
  const animationRef = useRef(null);
  const pulseDataRef = useRef({});
  const buildingMeshesRef = useRef([]);

  useEffect(() => {
    if (!scene || !currentTrack || !currentTrack.bpm) return;

    const bpm = currentTrack.bpm;
    const beatDuration = 60 / bpm; // seconds per beat

    // Initialize pulse data for each city
    cities.forEach(city => {
      if (!pulseDataRef.current[city.name]) {
        pulseDataRef.current[city.name] = {
          phase: Math.random() * Math.PI * 2, // Random initial phase
          intensity: 0
        };
      }
    });

    // Create or update building meshes for beacons
    const existingBeaconIds = new Set(buildingMeshesRef.current.map(m => m.userData.beaconId));
    
    beacons.forEach(beacon => {
      if (!existingBeaconIds.has(beacon.id) && beacon.lat && beacon.lng) {
        // Convert lat/lng to 3D coordinates
        const phi = (90 - beacon.lat) * (Math.PI / 180);
        const theta = (beacon.lng + 180) * (Math.PI / 180);
        const radius = 1.01; // Slightly above globe surface

        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        // Create building geometry
        const height = 0.02; // Base height
        const geometry = new THREE.BoxGeometry(0.01, height, 0.01);
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color('#FF1493'),
          transparent: true,
          opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.set(x, y, z);
        mesh.lookAt(0, 0, 0); // Point towards globe center
        mesh.userData = {
          beaconId: beacon.id,
          baseHeight: height,
          bpm: currentTrack.bpm,
          intensity: beacon.intensity || 0.5
        };

        scene.add(mesh);
        buildingMeshesRef.current.push(mesh);
      }
    });

    // Animation loop
    let lastBeatTime = Date.now() / 1000;
    let beatCount = 0;

    const animate = () => {
      const currentTime = Date.now() / 1000;
      const timeSinceLastBeat = currentTime - lastBeatTime;

      // Trigger on beat
      if (timeSinceLastBeat >= beatDuration) {
        lastBeatTime = currentTime;
        beatCount++;

        // Update city pulse intensities
        cities.forEach(city => {
          const cityBeacons = beacons.filter(b => b.city === city.name && b.active);
          const avgIntensity = cityBeacons.reduce((sum, b) => sum + (b.intensity || 0.5), 0) / (cityBeacons.length || 1);
          
          if (pulseDataRef.current[city.name]) {
            pulseDataRef.current[city.name].intensity = avgIntensity;
          }
        });
      }

      // Smooth pulse wave based on BPM
      const pulsePhase = (currentTime % beatDuration) / beatDuration;
      const pulseWave = Math.sin(pulsePhase * Math.PI * 2) * 0.5 + 0.5;

      // Update building heights based on BPM
      buildingMeshesRef.current.forEach(mesh => {
        if (mesh.userData.baseHeight) {
          const intensity = mesh.userData.intensity || 0.5;
          const heightMultiplier = 1 + (pulseWave * intensity * 2); // Pulse between 1x and 3x
          
          mesh.scale.y = heightMultiplier;
          mesh.material.opacity = 0.6 + (pulseWave * 0.4); // Pulse opacity
        }
      });

      // City glow pulses (can be used to update other visual elements)
      cities.forEach(city => {
        const data = pulseDataRef.current[city.name];
        if (data) {
          data.phase = (data.phase + 0.05) % (Math.PI * 2);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scene, currentTrack, cities, beacons]);

  // Cleanup function
  const cleanup = () => {
    buildingMeshesRef.current.forEach(mesh => {
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }
      mesh.geometry?.dispose();
      mesh.material?.dispose();
    });
    buildingMeshesRef.current = [];
    pulseDataRef.current = {};
  };

  return { cleanup, pulseData: pulseDataRef.current };
};

// Helper function to get current pulse intensity for a city
export const getCityPulseIntensity = (cityName, pulseData) => {
  const data = pulseData[cityName];
  if (!data) return 0;
  
  const wave = Math.sin(data.phase) * 0.5 + 0.5;
  return wave * data.intensity;
};