import React from 'react';
import * as THREE from 'three';

// Apply fuzzy GPS: snap to 0.005 grid (~500m accuracy)
function applyFuzzyGPS(lat, lng) {
  const gridSize = 0.005;
  return {
    lat: Math.round(lat / gridSize) * gridSize,
    lng: Math.round(lng / gridSize) * gridSize
  };
}

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export function createMoodBlobs(userIntents, globeRadius, scene) {
  const moodBlobGroup = new THREE.Group();
  
  // Intent colors
  const INTENT_COLORS = {
    dancing: 0xFF1493,
    hosting: 0xB026FF,
    exploring: 0x00D9FF,
    vibing: 0xFFEB3B,
    connecting: 0x39FF14
  };

  // Group intents by fuzzy location
  const locationGroups = new Map();
  
  userIntents.forEach(intent => {
    if (!intent.lat || !intent.lng || !intent.visible) return;
    
    // Apply fuzzy GPS
    const fuzzy = applyFuzzyGPS(intent.lat, intent.lng);
    const key = `${fuzzy.lat.toFixed(3)}_${fuzzy.lng.toFixed(3)}`;
    
    if (!locationGroups.has(key)) {
      locationGroups.set(key, {
        lat: fuzzy.lat,
        lng: fuzzy.lng,
        intents: [],
        count: 0
      });
    }
    
    const group = locationGroups.get(key);
    group.intents.push(intent.intent);
    group.count++;
  });

  // Create mood blobs for each location group
  locationGroups.forEach(({ lat, lng, intents, count }) => {
    const pos = latLngToVector3(lat, lng, globeRadius * 1.015);
    
    // Determine dominant intent
    const intentCounts = {};
    intents.forEach(i => {
      intentCounts[i] = (intentCounts[i] || 0) + 1;
    });
    const dominantIntent = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    const color = INTENT_COLORS[dominantIntent] || 0xFF1493;
    
    // Size based on user count
    const baseSize = 0.04;
    const size = baseSize + (count * 0.015);
    
    // Create blob (soft sphere with glow)
    const blobGeo = new THREE.SphereGeometry(size, 16, 16);
    const blobMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const blob = new THREE.Mesh(blobGeo, blobMat);
    blob.position.copy(pos);
    blob.userData = { 
      type: 'mood_blob',
      intent: dominantIntent,
      userCount: count,
      intents: intents
    };
    moodBlobGroup.add(blob);

    // Outer glow
    const glowGeo = new THREE.SphereGeometry(size * 1.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(pos);
    moodBlobGroup.add(glow);

    // Pulsing sprite
    const spriteMat = new THREE.SpriteMaterial({
      color: color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(size * 2, size * 2, 1);
    sprite.position.copy(pos);
    sprite.userData = { pulsePhase: Math.random() * Math.PI * 2 };
    moodBlobGroup.add(sprite);
  });

  scene.add(moodBlobGroup);
  return moodBlobGroup;
}

// Animate mood blobs
export function animateMoodBlobs(moodBlobGroup, time) {
  if (!moodBlobGroup) return;
  
  moodBlobGroup.children.forEach(child => {
    if (child instanceof THREE.Sprite && child.userData.pulsePhase !== undefined) {
      const phase = child.userData.pulsePhase;
      const scale = 1 + Math.sin(time * 2 + phase) * 0.2;
      const baseScale = child.scale.x / (1 + Math.sin((time - 0.016) * 2 + phase) * 0.2);
      child.scale.set(baseScale * scale, baseScale * scale, 1);
    }
  });
}