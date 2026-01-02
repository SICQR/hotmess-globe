import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Convert lat/lng to 3D position
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Create great circle arc
function createArc(from, to, radius) {
  const va = latLngToVector3(from.lat, from.lng, 1).normalize();
  const vb = latLngToVector3(to.lat, to.lng, 1).normalize();
  const angle = Math.acos(THREE.MathUtils.clamp(va.dot(vb), -1, 1));
  const points = [];
  
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const sin_angle = Math.sin(angle);
    const a = sin_angle === 0 ? 1 - t : Math.sin((1 - t) * angle) / sin_angle;
    const b = sin_angle === 0 ? t : Math.sin(t * angle) / sin_angle;
    
    const v = new THREE.Vector3()
      .copy(va).multiplyScalar(a)
      .add(new THREE.Vector3().copy(vb).multiplyScalar(b))
      .normalize();
    
    const lift = 0.05 + 0.15 * Math.sin(Math.PI * t);
    points.push(v.multiplyScalar(radius * (1 + lift)));
  }
  
  return points;
}

export default function EnhancedGlobe3D({
  beacons = [],
  cities = [],
  activeLayers = ['pins'],
  userActivities = [],
  userIntents = [],
  onBeaconClick,
  highlightedIds = [],
  className = ''
}) {
  const mountRef = useRef(null);
  const hoveredArcRef = useRef(null);
  const [arcTooltip, setArcTooltip] = React.useState(null);
  
  const showPins = activeLayers.includes('pins');
  const showHeat = activeLayers.includes('heat');
  const showActivity = activeLayers.includes('activity');
  const showCities = activeLayers.includes('cities');

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');
    scene.fog = new THREE.Fog('#000000', 8, 12);

    // Starfield background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: window.devicePixelRatio < 2, // Disable AA on high DPI
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(5, 3, 5);
    scene.add(directional);

    // Globe
    const globeRadius = 1.4;
    const globe = new THREE.Group();
    scene.add(globe);

    // Sphere with Earth texture - LOD optimization
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 64, 64); // Reduced from 128 to 64

    // Load Earth textures
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg');
    const bumpTexture = textureLoader.load('https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png');

    // Day/night shader material
    const sphereMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: earthTexture },
        bumpTexture: { value: bumpTexture },
        sunDirection: { value: new THREE.Vector3(1, 0, 0.3).normalize() }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D bumpTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vec4 dayColor = texture2D(dayTexture, vUv);
          float intensity = max(dot(vNormal, sunDirection), 0.0);
          float nightMix = smoothstep(0.0, 0.2, intensity);
          
          vec3 nightColor = dayColor.rgb * 0.15 + vec3(0.1, 0.15, 0.2) * 0.3;
          vec3 finalColor = mix(nightColor, dayColor.rgb, nightMix);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globe.add(sphere);

    // Atmosphere glow - LOD optimization
    const atmosphereGeo = new THREE.SphereGeometry(globeRadius * 1.1, 32, 32); // Reduced segments
    const atmosphereMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    globe.add(atmosphere);

    // Subtle grid lines overlay
    const gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 });
    // Latitude lines
    for (let i = 1; i < 18; i++) {
      const lat = -80 + (160 * i) / 18;
      const r = (globeRadius * 1.002) * Math.cos((lat * Math.PI) / 180);
      const y = (globeRadius * 1.002) * Math.sin((lat * Math.PI) / 180);
      const points = [];
      for (let j = 0; j <= 128; j++) {
        const angle = (j / 128) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      globe.add(new THREE.LineLoop(geo, gridMat));
    }
    // Longitude lines
    for (let i = 0; i < 24; i++) {
      const lng = (i / 24) * Math.PI * 2;
      const points = [];
      for (let j = 0; j <= 64; j++) {
        const lat = -Math.PI / 2 + (j / 64) * Math.PI;
        const x = (globeRadius * 1.002) * Math.cos(lat) * Math.cos(lng);
        const y = (globeRadius * 1.002) * Math.sin(lat);
        const z = (globeRadius * 1.002) * Math.cos(lat) * Math.sin(lng);
        points.push(new THREE.Vector3(x, y, z));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      globe.add(new THREE.Line(geo, gridMat));
    }

    // Clustering logic for beacons when zoomed out
    const createClusters = (beacons, zoomLevel) => {
      // Don't cluster if zoomed in close (z < 3.5)
      if (zoomLevel < 3.5) return beacons.map(b => ({ ...b, isCluster: false, count: 1 }));

      const clusterRadius = 5; // degrees
      const clusters = new Map();

      beacons.forEach(beacon => {
        const key = `${Math.floor(beacon.lat / clusterRadius)}_${Math.floor(beacon.lng / clusterRadius)}`;
        if (!clusters.has(key)) {
          clusters.set(key, []);
        }
        clusters.get(key).push(beacon);
      });

      const result = [];
      clusters.forEach((clusterBeacons) => {
        if (clusterBeacons.length === 1) {
          result.push({ ...clusterBeacons[0], isCluster: false, count: 1 });
        } else {
          const avgLat = clusterBeacons.reduce((sum, b) => sum + b.lat, 0) / clusterBeacons.length;
          const avgLng = clusterBeacons.reduce((sum, b) => sum + b.lng, 0) / clusterBeacons.length;
          result.push({
            ...clusterBeacons[0],
            lat: avgLat,
            lng: avgLng,
            isCluster: true,
            count: clusterBeacons.length,
            clusterBeacons
          });
        }
      });

      return result;
    };

    // Beacon pins layer with clustering
    const beaconGeo = new THREE.SphereGeometry(0.015, 8, 8);
    const beaconMeshes = [];
    let currentClusters = [];
    
    const updateBeaconClusters = () => {
      // Clear existing beacon meshes
      beaconMeshes.forEach(mesh => {
        globe.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
      beaconMeshes.length = 0;

      if (!showPins) return;

      // Create clusters based on camera zoom
      currentClusters = createClusters(beacons, camera.position.z);

      currentClusters.forEach(beacon => {
        const isHighlighted = highlightedIds.includes(beacon.id);
        const isCareBeacon = beacon.mode === 'care';
        const isRightNow = beacon.isRightNow;
        const isCluster = beacon.isCluster;

        const color = isCareBeacon ? 0x00d9ff : isHighlighted ? 0xffeb3b : isRightNow ? 0x39ff14 : 0xff1493;
        const emissiveIntensity = isCareBeacon ? 1.5 : isHighlighted ? 1.2 : 0.8;
        
        // Scale up clusters
        const scale = isCluster ? Math.min(1 + (beacon.count * 0.1), 3) : isHighlighted ? 1.5 : 1;

        const beaconMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity,
          roughness: 0.4,
          metalness: 0.2
        });

        const mesh = new THREE.Mesh(beaconGeo, beaconMat);
        const pos = latLngToVector3(beacon.lat, beacon.lng, globeRadius * 1.01);
        mesh.position.copy(pos);
        mesh.userData = { type: 'beacon', beacon };
        mesh.scale.setScalar(scale);

        globe.add(mesh);
        beaconMeshes.push(mesh);

        // Cluster label
        if (isCluster && beacon.count > 1) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 64;
          canvas.height = 64;
          ctx.fillStyle = '#FF1493';
          ctx.font = 'bold 32px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(beacon.count.toString(), 32, 32);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMat = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.9
          });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.set(0.08, 0.08, 1);
          sprite.position.copy(pos);
          sprite.position.y += 0.05;
          globe.add(sprite);
          beaconMeshes.push(sprite);
        }

        // Glow sprite for special beacons
        if (isCareBeacon || isHighlighted || isRightNow) {
          const spriteMat = new THREE.SpriteMaterial({
            color,
            transparent: true,
            opacity: isRightNow ? 1.0 : isCareBeacon ? 1.0 : 0.9,
            blending: THREE.AdditiveBlending
          });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.scale.set(isRightNow ? 0.06 : 0.04, isRightNow ? 0.06 : 0.04, 1);
          sprite.position.copy(pos);
          globe.add(sprite);
          
          // Pulsing effect for Right Now
          if (isRightNow) {
            const pulseSprite = new THREE.Sprite(new THREE.SpriteMaterial({
              color: 0x39ff14,
              transparent: true,
              opacity: 0.3,
              blending: THREE.AdditiveBlending
            }));
            pulseSprite.scale.set(0.1, 0.1, 1);
            pulseSprite.position.copy(pos);
            pulseSprite.userData = { isPulse: true, baseScale: 0.1 };
            globe.add(pulseSprite);
          }
        }
      });
    }

    updateBeaconClusters();

    // Heatmap layer - beacon density visualization
    const heatmapGroup = new THREE.Group();
    if (showHeat && beacons.length > 0) {
      // Create density clusters
      const clusters = new Map();
      const clusterRadius = 5; // degrees
      
      beacons.forEach(beacon => {
        const key = `${Math.floor(beacon.lat / clusterRadius)}_${Math.floor(beacon.lng / clusterRadius)}`;
        if (!clusters.has(key)) {
          clusters.set(key, []);
        }
        clusters.get(key).push(beacon);
      });

      // Render heat zones
      clusters.forEach((clusterBeacons, key) => {
        const avgLat = clusterBeacons.reduce((sum, b) => sum + b.lat, 0) / clusterBeacons.length;
        const avgLng = clusterBeacons.reduce((sum, b) => sum + b.lng, 0) / clusterBeacons.length;
        const density = clusterBeacons.length;
        const avgIntensity = clusterBeacons.reduce((sum, b) => sum + (b.intensity || 0.5), 0) / clusterBeacons.length;
        
        const pos = latLngToVector3(avgLat, avgLng, globeRadius * 1.01);
        
        // Heat zone sphere
        const heatSize = Math.min(0.1 + (density * 0.02), 0.4);
        const heatGeo = new THREE.SphereGeometry(heatSize, 16, 16);
        const heatMat = new THREE.MeshBasicMaterial({
          color: density > 5 ? 0xff073a : density > 2 ? 0xff6b35 : 0xff1493,
          transparent: true,
          opacity: 0.3 + (avgIntensity * 0.3),
          blending: THREE.AdditiveBlending
        });
        const heatMesh = new THREE.Mesh(heatGeo, heatMat);
        heatMesh.position.copy(pos);
        heatmapGroup.add(heatMesh);

        // Outer glow
        const glowGeo = new THREE.SphereGeometry(heatSize * 1.5, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
          color: density > 5 ? 0xff073a : density > 2 ? 0xff6b35 : 0xff1493,
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.copy(pos);
        heatmapGroup.add(glowMesh);
      });
      
      globe.add(heatmapGroup);
    }

    // City tier overlay layer
    const cityGroup = new THREE.Group();
    if (showCities && cities.length > 0) {
      cities.forEach(city => {
        const pos = latLngToVector3(city.lat, city.lng, globeRadius * 1.02);
        
        // Tier ring size based on tier (1=large, 3=small)
        const ringSize = city.tier === 1 ? 0.08 : city.tier === 2 ? 0.05 : 0.03;
        const ringColor = city.tier === 1 ? 0x00d9ff : city.tier === 2 ? 0xb026ff : 0xff6b35;
        
        // Ring geometry
        const ringGeo = new THREE.RingGeometry(ringSize * 0.8, ringSize, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: ringColor,
          transparent: true,
          opacity: city.active ? 0.6 : 0.3,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(camera.position);
        cityGroup.add(ring);

        // City marker
        const markerGeo = new THREE.SphereGeometry(0.02, 16, 16);
        const markerMat = new THREE.MeshStandardMaterial({
          color: ringColor,
          emissive: ringColor,
          emissiveIntensity: city.active ? 1.0 : 0.5
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(pos);
        cityGroup.add(marker);

        // Glow for active cities
        if (city.active) {
          const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            color: ringColor,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
          }));
          glowSprite.scale.set(ringSize * 3, ringSize * 3, 1);
          glowSprite.position.copy(pos);
          cityGroup.add(glowSprite);
        }
      });
      
      globe.add(cityGroup);
    }

    // Mood blobs - fuzzy GPS user intents (removed)

    // User activity trails - real-time user actions
    const userTrails = [];
    if (userActivities.length > 0) {
      userActivities.forEach((activity, idx) => {
        if (!activity.location || !activity.location.lat || !activity.location.lng) return;

        const pos = latLngToVector3(activity.location.lat, activity.location.lng, globeRadius * 1.015);
        
        // Activity pulse
        const age = Date.now() - new Date(activity.created_date).getTime();
        const ageSeconds = age / 1000;
        const opacity = Math.max(0, 1 - (ageSeconds / 60)); // Fade over 60 seconds
        
        if (opacity <= 0) return;

        // Color based on action type
        const colors = {
          search: 0x00d9ff,
          filter: 0xb026ff,
          beacon_click: 0xff1493,
          city_click: 0xffeb3b,
          layer_toggle: 0x39ff14
        };
        const color = colors[activity.action_type] || 0x00d9ff;

        // Create pulsing ring
        const ringGeo = new THREE.RingGeometry(0.02, 0.03, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: opacity * 0.6,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(camera.position);
        globe.add(ring);
        userTrails.push(ring);

        // Expanding wave effect
        const waveSize = 0.03 + (ageSeconds * 0.01);
        const waveGeo = new THREE.RingGeometry(waveSize * 0.8, waveSize, 32);
        const waveMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: opacity * 0.3,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        });
        const wave = new THREE.Mesh(waveGeo, waveMat);
        wave.position.copy(pos);
        wave.lookAt(camera.position);
        globe.add(wave);
        userTrails.push(wave);

        // User indicator
        const markerGeo = new THREE.SphereGeometry(0.012, 16, 16);
        const markerMat = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: opacity
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(pos);
        globe.add(marker);
        userTrails.push(marker);
      });
    }

    // Activity streams layer - animated arcs
    const arcs = [];
    if (showActivity && beacons.length >= 2) {
      const arcMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0xff1493) },
          uHover: { value: 0.0 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uHover;
          varying vec2 vUv;
          
          void main() {
            float progress = mod(uTime * 0.5 + vUv.x * 2.0, 1.0);
            float glow = smoothstep(0.0, 0.1, progress) * smoothstep(0.3, 0.2, progress);
            float fade = (1.0 - vUv.x) * 0.8;
            float baseAlpha = 0.4 + uHover * 0.4;
            float alpha = (baseAlpha + glow * 0.6) * fade;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const sorted = [...beacons].sort((a, b) => (a.ts || 0) - (b.ts || 0));
      const recent = sorted.slice(-12);
      
      for (let i = 0; i < recent.length - 1; i++) {
        const from = recent[i];
        const to = recent[i + 1];
        const points = createArc(from, to, globeRadius * 1.02);
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.012, 8, false);
        const arcMat = arcMaterial.clone();
        const tube = new THREE.Mesh(tubeGeo, arcMat);
        tube.userData = { type: 'arc', from, to, material: arcMat };
        globe.add(tube);
        arcs.push(tube);
      }
    }

    // Interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationY = 0;
    let targetRotationX = 0;
    let velocity = { x: 0, y: 0 };
    let targetCameraZ = 4.5;
    
    // Touch support
    let touchStartDistance = 0;
    let initialCameraZ = camera.position.z;

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
        targetRotationX = THREE.MathUtils.clamp(targetRotationX, -0.8, 0.8);
        velocity.x = deltaX * 0.005;
        velocity.y = deltaY * 0.005;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Check beacons first
        const beaconIntersects = raycaster.intersectObjects(beaconMeshes);
        if (beaconIntersects.length > 0) {
          renderer.domElement.style.cursor = 'pointer';
          return;
        }

        // Then check arcs
        const intersects = raycaster.intersectObjects(arcs);

        if (hoveredArcRef.current && intersects.length === 0) {
          hoveredArcRef.current.userData.material.uniforms.uHover.value = 0.0;
          hoveredArcRef.current = null;
          renderer.domElement.style.cursor = 'grab';
          setArcTooltip(null);
        }

        if (intersects.length > 0) {
          const arc = intersects[0].object;
          if (hoveredArcRef.current !== arc) {
            if (hoveredArcRef.current) {
              hoveredArcRef.current.userData.material.uniforms.uHover.value = 0.0;
            }
            hoveredArcRef.current = arc;
            arc.userData.material.uniforms.uHover.value = 1.0;
            renderer.domElement.style.cursor = 'pointer';

            setArcTooltip({
              x: e.clientX,
              y: e.clientY,
              from: arc.userData.from,
              to: arc.userData.to
            });
          } else {
            setArcTooltip({
              x: e.clientX,
              y: e.clientY,
              from: arc.userData.from,
              to: arc.userData.to
            });
          }
        } else {
          renderer.domElement.style.cursor = 'grab';
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = (e) => {
      if (Math.abs(e.clientX - previousMousePosition.x) > 10 || 
          Math.abs(e.clientY - previousMousePosition.y) > 10) {
        return; // Was dragging, not clicking
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(beaconMeshes);

      if (intersects.length > 0 && onBeaconClick) {
        const beacon = intersects[0].object.userData.beacon;
        
        // If cluster, zoom in to expand it
        if (beacon.isCluster && beacon.count > 1) {
          const beaconPos = latLngToVector3(beacon.lat, beacon.lng, globeRadius);
          const direction = beaconPos.clone().normalize();
          targetRotationY = Math.atan2(direction.x, direction.z);
          targetRotationX = Math.asin(direction.y);
          targetCameraZ = Math.max(2.5, targetCameraZ - 1.5); // Zoom in to expand cluster
        } else {
          // Smooth camera transition to beacon
          const beaconPos = latLngToVector3(beacon.lat, beacon.lng, globeRadius);
          const direction = beaconPos.clone().normalize();
          targetRotationY = Math.atan2(direction.x, direction.z);
          targetRotationX = Math.asin(direction.y);
          targetCameraZ = 3.5; // Zoom in slightly
          
          onBeaconClick(beacon);
        }
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      // Smoother zoom with reduced sensitivity
      const zoomSpeed = 0.001;
      targetCameraZ = THREE.MathUtils.clamp(targetCameraZ + e.deltaY * zoomSpeed, 2.5, 6.0);
    };

    // Touch handlers
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        initialCameraZ = camera.position.z;
      } else if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scale = touchStartDistance / distance;
        targetCameraZ = THREE.MathUtils.clamp(initialCameraZ * scale, 2.5, 6.0);
      } else if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
        targetRotationX = THREE.MathUtils.clamp(targetRotationX, -0.8, 0.8);
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
      touchStartDistance = 0;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    
    // Touch events
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });

    // Animation
    let animationId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth rotation
      if (!isDragging) {
        targetRotationY += 0.0005; // Much slower auto-rotation
        velocity.x *= 0.85; // Faster decay
        velocity.y *= 0.85;
      }
      
      // Smooth rotation with easing
      globe.rotation.y += (targetRotationY - globe.rotation.y) * 0.15;
      globe.rotation.x += (targetRotationX - globe.rotation.x) * 0.15;
      
      // Smooth camera zoom with easing
      const zoomDiff = targetCameraZ - camera.position.z;
      camera.position.z += zoomDiff * 0.12;

      // Re-cluster beacons when zoom level changes significantly
      const zoomThresholds = [3, 4, 5];
      const currentZoomLevel = Math.round(camera.position.z);
      if (zoomThresholds.includes(currentZoomLevel) && Math.abs(zoomDiff) < 0.01) {
        updateBeaconClusters();
      }

      // Update arc shaders
      arcs.forEach(arc => {
        if (arc.userData.material?.uniforms?.uTime) {
          arc.userData.material.uniforms.uTime.value = time;
        }
      });

      // Pulse Right Now beacons
      scene.traverse(obj => {
        if (obj.userData?.isPulse) {
          const scale = obj.userData.baseScale * (1 + Math.sin(time * 2) * 0.3);
          obj.scale.set(scale, scale, 1);
          obj.material.opacity = 0.2 + Math.sin(time * 2) * 0.15;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup - CRITICAL: Prevent memory leaks
    return () => {
      // Stop animation loop immediately
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      // Remove all event listeners
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('wheel', onWheel);
        renderer.domElement.removeEventListener('touchstart', onTouchStart);
        renderer.domElement.removeEventListener('touchmove', onTouchMove);
        renderer.domElement.removeEventListener('touchend', onTouchEnd);
      }
      
      // Dispose geometries
      if (beaconGeo) beaconGeo.dispose();
      if (sphereGeo) sphereGeo.dispose();
      if (atmosphereGeo) atmosphereGeo.dispose();
      if (starsGeo) starsGeo.dispose();
      
      // Dispose materials
      if (sphereMat) {
        if (sphereMat.map) sphereMat.map.dispose();
        if (sphereMat.bumpMap) sphereMat.bumpMap.dispose();
        sphereMat.dispose();
      }
      if (atmosphereMat) atmosphereMat.dispose();
      if (gridMat) gridMat.dispose();
      if (starsMat) starsMat.dispose();
      
      // Dispose textures
      if (earthTexture) earthTexture.dispose();
      if (bumpTexture) bumpTexture.dispose();
      
      // Dispose beacon meshes and sprites
      beaconMeshes.forEach(mesh => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) mesh.material.dispose();
      });
      
      // Dispose heatmap group
      if (heatmapGroup) {
        heatmapGroup.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
      
      // Dispose city group
      if (cityGroup) {
        cityGroup.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
      }
      
      // Dispose user trails
      userTrails.forEach(trail => {
        if (trail.geometry) trail.geometry.dispose();
        if (trail.material) trail.material.dispose();
      });
      
      // Dispose arcs and shaders
      arcs.forEach(arc => {
        if (arc.geometry) arc.geometry.dispose();
        if (arc.material) {
          if (arc.material.uniforms) {
            // Dispose shader uniforms
            Object.values(arc.material.uniforms).forEach(uniform => {
              if (uniform.value?.dispose) uniform.value.dispose();
            });
          }
          arc.material.dispose();
        }
      });
      
      // Clear scene
      while(scene.children.length > 0) {
        const object = scene.children[0];
        scene.remove(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
      
      // Dispose renderer and remove canvas
      if (mount && renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      renderer.forceContextLoss();
      
      // Clear references
      scene.clear();
    };
  }, [beacons, cities, activeLayers, highlightedIds, userActivities]);

  return (
    <>
      <div 
        ref={mountRef} 
        className={className}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      />
      {arcTooltip && (
        <div
          style={{
            position: 'fixed',
            left: arcTooltip.x + 15,
            top: arcTooltip.y - 40,
            zIndex: 1000,
            pointerEvents: 'none'
          }}
          className="px-4 py-3 bg-black/95 border border-[#FF1493]/40 rounded-xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-white/50 text-xs tracking-wider uppercase">FROM</span>
              <span className="text-white font-bold tracking-wide">{arcTooltip.from.city || arcTooltip.from.title}</span>
            </div>
            <div className="text-[#FF1493] text-lg">→</div>
            <div className="flex flex-col items-start">
              <span className="text-white/50 text-xs tracking-wider uppercase">TO</span>
              <span className="text-white font-bold tracking-wide">{arcTooltip.to.city || arcTooltip.to.title}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-4 text-xs">
            <span className="text-white/40 tracking-wide uppercase">Connection</span>
            <span className="text-[#FF1493] font-semibold">{arcTooltip.to.kind || 'EVENT'}</span>
          </div>
        </div>
      )}
    </>
  );
}