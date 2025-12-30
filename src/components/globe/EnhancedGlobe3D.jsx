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
  onBeaconClick,
  className = ''
}) {
  const mountRef = useRef(null);
  const hoveredArcRef = useRef(null);
  const [arcTooltip, setArcTooltip] = React.useState(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000000');
    scene.fog = new THREE.Fog('#000000', 8, 12);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
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

    // Sphere with Earth texture
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 128, 128);

    // Load Earth textures
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg');
    const bumpTexture = textureLoader.load('https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png');

    const sphereMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.05,
      roughness: 0.7,
      metalness: 0.1
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    globe.add(sphere);

    // Atmosphere glow
    const atmosphereGeo = new THREE.SphereGeometry(globeRadius * 1.1, 64, 64);
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

    // Beacons
    const beaconGeo = new THREE.SphereGeometry(0.015, 16, 16);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      emissive: 0xff1493,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      metalness: 0.2
    });

    beacons.forEach(beacon => {
      const pos = latLngToVector3(beacon.lat, beacon.lng, globeRadius * 1.01);
      const mesh = new THREE.Mesh(beaconGeo, beaconMat);
      mesh.position.copy(pos);
      mesh.userData = { type: 'beacon', beacon };
      globe.add(mesh);

      // Glow sprite
      const spriteMat = new THREE.SpriteMaterial({
        color: 0xff1493,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.25, 0.25, 1);
      sprite.position.copy(pos);
      globe.add(sprite);
    });

    // Animated arcs with shader
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

    const arcs = [];
    if (beacons.length >= 2) {
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
        // Arc hover detection
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
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
        }
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.002, 2.5, 6.0);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Animation
    let animationId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth rotation
      if (!isDragging) {
        targetRotationY += 0.002;
        velocity.x *= 0.96;
        velocity.y *= 0.96;
      }
      
      globe.rotation.y += (targetRotationY - globe.rotation.y) * 0.1;
      globe.rotation.x += (targetRotationX - globe.rotation.x) * 0.1;

      // Update arc shaders
      arcs.forEach(arc => {
        if (arc.userData.material?.uniforms?.uTime) {
          arc.userData.material.uniforms.uTime.value = time;
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

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [beacons, cities]);

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