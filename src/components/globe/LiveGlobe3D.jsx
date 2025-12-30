// HOTMESS NIGHTLIFE CONTROL GLOBE
// Interactive 3D globe with beacons, cities, heat zones, and trails

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// Default cities data
const DEFAULT_CITIES = [
  { name: "LONDON", lat: 51.5074, lng: -0.1278, tier: 1, active: true },
  { name: "BERLIN", lat: 52.52, lng: 13.405, tier: 1 },
  { name: "PARIS", lat: 48.8566, lng: 2.3522, tier: 1 },
  { name: "AMSTERDAM", lat: 52.3676, lng: 4.9041, tier: 1 },
  { name: "NEW YORK", lat: 40.7128, lng: -74.006, tier: 1 },
  { name: "LOS ANGELES", lat: 34.0522, lng: -118.2437, tier: 1 },
  { name: "MIAMI", lat: 25.7617, lng: -80.1918, tier: 1 },
  { name: "TOKYO", lat: 35.6762, lng: 139.6503, tier: 1 },
  { name: "DUBAI", lat: 25.2048, lng: 55.2708, tier: 1 },
  { name: "SYDNEY", lat: -33.8688, lng: 151.2093, tier: 1 },
  { name: "SÃO PAULO", lat: -23.5505, lng: -46.6333, tier: 1 },
  { name: "SINGAPORE", lat: 1.3521, lng: 103.8198, tier: 1 },
  { name: "HONG KONG", lat: 22.3193, lng: 114.1694, tier: 1 },
  { name: "SEOUL", lat: 37.5665, lng: 126.978, tier: 1 },
  { name: "BANGKOK", lat: 13.7563, lng: 100.5018, tier: 1 },
  { name: "TEL AVIV", lat: 32.0853, lng: 34.7818, tier: 1 },
  { name: "CAPE TOWN", lat: -33.9249, lng: 18.4241, tier: 1 },
  { name: "MADRID", lat: 40.4168, lng: -3.7038, tier: 1 },
  { name: "ROME", lat: 41.9028, lng: 12.4964, tier: 1 },
  { name: "TORONTO", lat: 43.6532, lng: -79.3832, tier: 1 },
  { name: "MANCHESTER", lat: 53.4808, lng: -2.2426, tier: 2 },
  { name: "GLASGOW", lat: 55.8642, lng: -4.2518, tier: 2 },
  { name: "DUBLIN", lat: 53.3498, lng: -6.2603, tier: 2 },
  { name: "COPENHAGEN", lat: 55.6761, lng: 12.5683, tier: 2 },
  { name: "STOCKHOLM", lat: 59.3293, lng: 18.0686, tier: 2 },
  { name: "VIENNA", lat: 48.2082, lng: 16.3738, tier: 2 },
  { name: "PRAGUE", lat: 50.0755, lng: 14.4378, tier: 2 },
  { name: "ISTANBUL", lat: 41.0082, lng: 28.9784, tier: 2 },
  { name: "SAN FRANCISCO", lat: 37.7749, lng: -122.4194, tier: 2 },
  { name: "LAS VEGAS", lat: 36.1699, lng: -115.1398, tier: 2 },
  { name: "VANCOUVER", lat: 49.2827, lng: -123.1207, tier: 2 },
  { name: "BOGOTÁ", lat: 4.711, lng: -74.0721, tier: 2 },
  { name: "BEIJING", lat: 39.9042, lng: 116.4074, tier: 2 },
  { name: "SHANGHAI", lat: 31.2304, lng: 121.4737, tier: 2 },
  { name: "MUMBAI", lat: 19.076, lng: 72.8777, tier: 2 },
];

const DEFAULT_LAYERS = {
  pins: true,
  heat: false,
  trails: false,
  cities: true,
};

// Inject CSS for city labels
function injectStylesOnce(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

const HOTMESS_CSS = `
:root{
  --hm-ink:#050505;
  --hm-text:rgba(255,255,255,.92);
  --hm-live:#ff1744;
}
.hm-city-stamp{position:relative;will-change:transform,opacity;user-select:none;}
.hm-city-inner{transform:scale(var(--hm-scale,1));transform-origin:center center;}
.hm-city-pill{
  display:inline-flex;align-items:center;gap:8px;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.30);
  background:rgba(0,0,0,.86);
  box-shadow:0 10px 30px rgba(0,0,0,.45);
}
.hm-city-dot{width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.85);box-shadow:0 0 0 1px rgba(0,0,0,.65) inset;}
.hm-city-name{color:rgba(255,255,255,.92);font-size:10px;letter-spacing:.28em;text-transform:uppercase;line-height:1;white-space:nowrap;}
.hm-city-pill--active{border-color:rgba(255,23,68,.55);}
.hm-city-dot--active{background:var(--hm-live);box-shadow:0 0 18px rgba(255,23,68,.65);}
.hm-city-badges{display:flex;gap:6px;margin-top:6px;padding-left:14px;}
.hm-badge{
  display:inline-flex;align-items:center;
  padding:3px 7px;border-radius:999px;
  font-size:8px;letter-spacing:.24em;text-transform:uppercase;
  border:1px solid rgba(255,255,255,.38);
  background:rgba(0,0,0,.75);
  color:rgba(255,255,255,.92);
}
.hm-badge--active{background:var(--hm-live);border-color:rgba(255,255,255,.65);box-shadow:0 0 18px rgba(255,23,68,.55);}
.hm-badge--sponsored{background:#fff;border-color:#fff;color:#000;}
`;

// Convert lat/lng to 3D position
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Filter cities by zoom level
function getCitiesByZoom(cameraZ, cities) {
  if (cameraZ > 3.5) return cities.filter((c) => c.tier === 1);
  if (cameraZ > 2.5) return cities.filter((c) => c.tier <= 2);
  return cities;
}

// Create procedural satellite texture
function makeProceduralSatelliteTexture(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.random();
    const v = 18 + n * 55;
    d[i] = v * 0.9;
    d[i + 1] = v * 1.05;
    d[i + 2] = v * 1.1;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const blobs = 95;
  for (let i = 0; i < blobs; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const r = 18 + Math.random() * 110;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(70,85,70,0.55)");
    grd.addColorStop(0.6, "rgba(35,45,35,0.30)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 14; i++) {
    const y = (i / 14) * canvas.height + (Math.random() - 0.5) * 20;
    ctx.fillStyle = "white";
    ctx.fillRect(0, y, canvas.width, 8 + Math.random() * 12);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Create radial glow texture for sprites
function makeRadialSpriteTexture(size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grd.addColorStop(0.6, "rgba(255,255,255,0.15)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Great-circle arc between two points
function greatCircleArc(a, b, radius, segments = 64) {
  const va = latLngToVector3(a.lat, a.lng, 1).normalize();
  const vb = latLngToVector3(b.lat, b.lng, 1).normalize();
  const omega = Math.acos(THREE.MathUtils.clamp(va.dot(vb), -1, 1));
  const sinOmega = Math.sin(omega);
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const s1 = sinOmega === 0 ? 1 - t : Math.sin((1 - t) * omega) / sinOmega;
    const s2 = sinOmega === 0 ? t : Math.sin(t * omega) / sinOmega;
    const v = new THREE.Vector3().copy(va).multiplyScalar(s1).add(new THREE.Vector3().copy(vb).multiplyScalar(s2)).normalize();
    const lift = 0.05 + 0.20 * (omega / Math.PI);
    pts.push(v.multiplyScalar(radius * (1 + lift * Math.sin(Math.PI * t))));
  }
  return pts;
}

export default function LiveGlobe3D({
  className,
  layers,
  beacons,
  cities,
  mode = 'hotmess',
  onBeaconClick,
  onCityClick,
}) {
  const mountRef = useRef(null);

  const layersResolved = useMemo(() => ({ ...DEFAULT_LAYERS, ...(layers ?? {}) }), [layers]);
  const citiesResolved = useMemo(() => cities ?? DEFAULT_CITIES, [cities]);
  const beaconsResolved = useMemo(() =>
    beacons ?? [
      { id: 'b1', title: 'HOTMESS LONDON', kind: 'event', lat: 51.5074, lng: -0.1278, city: 'LONDON', intensity: 1, ts: Date.now() },
      { id: 'b2', title: 'BERLIN DROP', kind: 'drop', lat: 52.52, lng: 13.405, city: 'BERLIN', intensity: 0.6, ts: Date.now() - 1000 * 60 * 25 },
      { id: 'b3', title: 'NYC SPONSOR', kind: 'sponsor', lat: 40.7128, lng: -74.006, city: 'NEW YORK', sponsored: true, intensity: 0.8, ts: Date.now() - 1000 * 60 * 90 },
      { id: 'b4', title: 'TOKYO RAVE', kind: 'event', lat: 35.6762, lng: 139.6503, city: 'TOKYO', intensity: 0.9, ts: Date.now() - 1000 * 60 * 5 },
      { id: 'b5', title: 'MIAMI HEAT', kind: 'checkin', lat: 25.7617, lng: -80.1918, city: 'MIAMI', intensity: 0.7, ts: Date.now() - 1000 * 60 * 45 },
    ],
    [beacons]
  );

  const onBeaconClickRef = useRef(onBeaconClick);
  const onCityClickRef = useRef(onCityClick);
  useEffect(() => { onBeaconClickRef.current = onBeaconClick; }, [onBeaconClick]);
  useEffect(() => { onCityClickRef.current = onCityClick; }, [onCityClick]);

  const layersRef = useRef(layersResolved);
  const citiesRef = useRef(citiesResolved);
  const beaconsRef = useRef(beaconsResolved);
  useEffect(() => { layersRef.current = layersResolved; }, [layersResolved]);
  useEffect(() => { citiesRef.current = citiesResolved; }, [citiesResolved]);
  useEffect(() => { beaconsRef.current = beaconsResolved; }, [beaconsResolved]);

  useEffect(() => injectStylesOnce('hotmess-globe-css2d', HOTMESS_CSS), []);

  // Refs for Three.js objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const labelRendererRef = useRef(null);
  const globeRef = useRef(null);
  const sphereRef = useRef(null);
  const pinsGroupRef = useRef(null);
  const heatGroupRef = useRef(null);
  const trailsGroupRef = useRef(null);
  const citiesGroupRef = useRef(null);
  const globeRadiusRef = useRef(1.35);
  const oceanMatRef = useRef(null);
  const satelliteMatRef = useRef(null);
  const gridMatRef = useRef(null);
  const beaconGeoRef = useRef(null);
  const beaconMatRef = useRef(null);
  const beaconHotMatRef = useRef(null);
  const glowTexRef = useRef(null);
  const heatTexRef = useRef(null);
  const trailMatRef = useRef(null);
  const glowSpritesRef = useRef([]);
  const cityLabelsRef = useRef([]);
  const beaconByIdRef = useRef(new Map());

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.inset = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(labelRenderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    labelRendererRef.current = labelRenderer;

    // Resize handler
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(6, 8, 6);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xffffff, 0.55);
    rim.position.set(-10, 2, -10);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xffffff, 0.18);
    fill.position.set(0, -6, 8);
    scene.add(fill);

    // Globe group
    const globe = new THREE.Group();
    scene.add(globe);
    globeRef.current = globe;

    const globeRadius = globeRadiusRef.current;

    // Ocean material
    const oceanMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0a4a7a'),
      roughness: 0.85,
      metalness: 0.08,
    });
    oceanMatRef.current = oceanMat;

    // Satellite material
    const satelliteFallback = makeProceduralSatelliteTexture(1024);
    const satelliteMat = new THREE.MeshStandardMaterial({
      map: satelliteFallback,
      color: new THREE.Color('#3b3b3b'),
      roughness: 0.95,
      metalness: 0,
    });
    satelliteMatRef.current = satelliteMat;

    // Globe sphere
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 64, 64);
    const sphere = new THREE.Mesh(sphereGeo, oceanMat);
    globe.add(sphere);
    sphereRef.current = sphere;

    // Grid lines
    const gridGroup = new THREE.Group();
    globe.add(gridGroup);

    const gridMat = new THREE.LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.12,
    });
    gridMatRef.current = gridMat;

    const ringCount = 18;
    for (let i = 1; i < ringCount; i++) {
      const lat = -80 + (160 * i) / ringCount;
      const r = globeRadius * Math.cos((lat * Math.PI) / 180);
      const y = globeRadius * Math.sin((lat * Math.PI) / 180);
      const pts = new Array(128).fill(0).map((_, idx) => {
        const t = (idx / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r);
      });
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.LineLoop(geo, gridMat));
    }

    const lonCount = 24;
    for (let i = 0; i < lonCount; i++) {
      const lng = (i / lonCount) * Math.PI * 2;
      const pts = new Array(128).fill(0).map((_, idx) => {
        const t = (idx / 127) * Math.PI - Math.PI / 2;
        return new THREE.Vector3(
          Math.cos(t) * Math.cos(lng) * globeRadius,
          Math.sin(t) * globeRadius,
          Math.cos(t) * Math.sin(lng) * globeRadius
        );
      });
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      gridGroup.add(new THREE.Line(geo, gridMat));
    }

    // Layer groups
    const layerRoot = new THREE.Group();
    globe.add(layerRoot);

    const pinsGroup = new THREE.Group();
    const heatGroup = new THREE.Group();
    const trailsGroup = new THREE.Group();
    const citiesGroup = new THREE.Group();
    layerRoot.add(pinsGroup, heatGroup, trailsGroup, citiesGroup);

    pinsGroupRef.current = pinsGroup;
    heatGroupRef.current = heatGroup;
    trailsGroupRef.current = trailsGroup;
    citiesGroupRef.current = citiesGroup;

    // Beacon materials
    const beaconGeo = new THREE.SphereGeometry(0.015, 16, 16);
    beaconGeoRef.current = beaconGeo;

    const beaconMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.55,
      metalness: 0.15,
      emissive: new THREE.Color('#111111'),
      emissiveIntensity: 0.25,
    });
    beaconMatRef.current = beaconMat;

    const beaconHotMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      roughness: 0.35,
      metalness: 0.15,
      emissive: new THREE.Color('#ff1744'),
      emissiveIntensity: 0.85,
    });
    beaconHotMatRef.current = beaconHotMat;

    const glowTex = makeRadialSpriteTexture(128);
    glowTexRef.current = glowTex;

    const heatTex = makeRadialSpriteTexture(128);
    heatTexRef.current = heatTex;

    const trailMat = new THREE.LineBasicMaterial({
      color: 0xff1744,
      transparent: true,
      opacity: 0.18,
    });
    trailMatRef.current = trailMat;

    // Helper functions
    const clearGroup = (g) => {
      while (g.children.length) {
        const child = g.children.pop();
        g.remove(child);
        child.traverse((o) => {
          if (o.geometry && o.geometry !== beaconGeoRef.current) {
            o.geometry.dispose?.();
          }
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
              if (m === beaconMatRef.current || m === beaconHotMatRef.current || m === trailMatRef.current) continue;
              m.dispose?.();
            }
          }
        });
      }
    };

    const rebuildPins = (list) => {
      clearGroup(pinsGroup);
      glowSpritesRef.current = [];
      const map = new Map();
      for (const b of list) map.set(b.id, b);
      beaconByIdRef.current = map;

      for (const b of list) {
        const intensity = THREE.MathUtils.clamp(b.intensity ?? 0.6, 0.05, 1);
        const isHot = intensity > 0.75 || b.kind === 'event' || b.kind === 'drop';
        const p = latLngToVector3(b.lat, b.lng, globeRadius * 1.01);

        const root = new THREE.Group();
        root.position.copy(p);
        root.lookAt(new THREE.Vector3(0, 0, 0));
        root.rotateX(Math.PI);

        const pin = new THREE.Mesh(beaconGeo, isHot ? beaconHotMat : beaconMat);
        root.add(pin);

        const baseOpacity = b.sponsored ? 0.38 : 0.55;
        const spriteMat = new THREE.SpriteMaterial({
          map: glowTex,
          color: new THREE.Color(b.sponsored ? '#ffffff' : '#ff1744'),
          transparent: true,
          opacity: baseOpacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        const s = 0.22 + intensity * 0.25;
        sprite.scale.set(s, s, 1);
        sprite.userData = { baseOpacity, intensity, type: 'beacon', beaconId: b.id };
        root.add(sprite);
        glowSpritesRef.current.push(sprite);

        const towerGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.09 + intensity * 0.22, 10);
        const towerMat = new THREE.MeshBasicMaterial({
          color: b.sponsored ? 0xffffff : 0xff1744,
          transparent: true,
          opacity: b.sponsored ? 0.22 : 0.18,
          depthWrite: false,
        });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.set(0, 0.05 + intensity * 0.06, 0);
        tower.userData = { type: 'beacon', beaconId: b.id };
        root.add(tower);

        root.userData = { type: 'beacon', beaconId: b.id };
        pin.userData = { type: 'beacon', beaconId: b.id };

        pinsGroup.add(root);
      }
    };

    const rebuildHeat = (list) => {
      clearGroup(heatGroup);
      for (const b of list) {
        const intensity = THREE.MathUtils.clamp(b.intensity ?? 0.5, 0.05, 1);
        const p = latLngToVector3(b.lat, b.lng, globeRadius * 1.002);
        const smudgeMat = new THREE.SpriteMaterial({
          map: heatTex,
          color: new THREE.Color('#ff1744'),
          transparent: true,
          opacity: 0.08 + intensity * 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const smudge = new THREE.Sprite(smudgeMat);
        smudge.position.copy(p);
        const s = 0.35 + intensity * 0.65;
        smudge.scale.set(s, s, 1);
        heatGroup.add(smudge);
      }
    };

    const rebuildTrails = (list) => {
      clearGroup(trailsGroup);
      const sorted = [...list].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
      if (sorted.length < 2) return;
      const last = sorted.slice(Math.max(0, sorted.length - 12));
      for (let i = 0; i < last.length - 1; i++) {
        const a = last[i];
        const b = last[i + 1];
        const pts = greatCircleArc(a, b, globeRadius * 1.01, 72);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, trailMat);
        trailsGroup.add(line);
      }
    };

    const makeCityEl = (city) => {
      const outer = document.createElement('div');
      outer.className = 'hm-city-stamp';
      outer.dataset.tier = String(city.tier);
      outer.style.pointerEvents = 'auto';
      outer.style.cursor = 'pointer';

      const inner = document.createElement('div');
      inner.className = 'hm-city-inner';

      const active = !!city.active;
      const sponsored = !!city.sponsored;

      inner.innerHTML = `
        <div class="hm-city-pill ${active ? 'hm-city-pill--active' : ''}">
          <span class="hm-city-dot ${active ? 'hm-city-dot--active' : ''}"></span>
          <span class="hm-city-name">${city.name}</span>
        </div>
        <div class="hm-city-badges" style="display:${active || sponsored ? 'flex' : 'none'}">
          ${active ? '<span class="hm-badge hm-badge--active">ACTIVE</span>' : ''}
          ${sponsored ? '<span class="hm-badge hm-badge--sponsored">SPONSORED</span>' : ''}
        </div>
      `;

      outer.appendChild(inner);
      outer.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onCityClickRef.current?.(city);
      });
      return outer;
    };

    const rebuildCities = (list) => {
      for (const { obj } of cityLabelsRef.current) {
        citiesGroup.remove(obj);
      }
      cityLabelsRef.current = [];
      for (const city of list) {
        const el = makeCityEl(city);
        const obj = new CSS2DObject(el);
        obj.position.copy(latLngToVector3(city.lat, city.lng, globeRadius * 1.02));
        citiesGroup.add(obj);
        cityLabelsRef.current.push({ city, obj, el });
      }
    };

    // Initial build
    pinsGroup.visible = !!layersRef.current.pins;
    heatGroup.visible = !!layersRef.current.heat;
    trailsGroup.visible = !!layersRef.current.trails;
    citiesGroup.visible = !!layersRef.current.cities;

    rebuildCities(citiesRef.current);
    rebuildPins(beaconsRef.current);
    rebuildHeat(beaconsRef.current);
    rebuildTrails(beaconsRef.current);

    // Interaction state
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let velX = 0;
    let velY = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerMove = (e) => {
      if (!isDragging || !globeRef.current) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const rotSpeed = 0.004;
      globeRef.current.rotation.y += dx * rotSpeed;
      globeRef.current.rotation.x += dy * rotSpeed;
      globeRef.current.rotation.x = THREE.MathUtils.clamp(globeRef.current.rotation.x, -0.9, 0.9);
      velX = dx * rotSpeed * 0.35;
      velY = dy * rotSpeed * 0.35;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + Math.sign(e.deltaY) * 0.18, 2.1, 5.6);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Raycaster for beacon clicks
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (e) => {
      if (Math.abs(velX) > 0.001 || Math.abs(velY) > 0.001) return;
      const l = layersRef.current;
      if (!l.pins) return;
      if (!pinsGroup.visible) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointer.set(x, y);

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(pinsGroup.children, true);
      if (!intersects.length) return;
      const hit = intersects[0].object;
      const bid = hit.userData?.beaconId;
      if (!bid) return;
      const b = beaconByIdRef.current.get(bid);
      if (!b) return;
      onBeaconClickRef.current?.(b);
    };

    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    let raf = 0;
    const t0 = performance.now();
    const tmp = new THREE.Vector3();
    const camDir = new THREE.Vector3();

    const animate = () => {
      raf = requestAnimationFrame(animate);

      if (globeRef.current) {
        if (!isDragging) {
          globeRef.current.rotation.y += velX;
          globeRef.current.rotation.x += velY;
          velX *= 0.93;
          velY *= 0.93;
        }
      }

      // Animate glow sprites
      const t = (performance.now() - t0) / 1000;
      for (const spr of glowSpritesRef.current) {
        const ud = spr.userData || {};
        const baseOpacity = ud.baseOpacity ?? 0.5;
        const intensity = ud.intensity ?? 0.6;
        const pulse = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(t * (1.8 + intensity)));
        spr.material.opacity = THREE.MathUtils.clamp(baseOpacity * pulse, 0.05, 0.95);
      }

      // Update city label visibility
      const cityLayerOn = layersRef.current.cities;
      const list = citiesRef.current;
      camDir.copy(camera.position).normalize();
      const visibleCities = getCitiesByZoom(camera.position.z, list);
      const dist = camera.position.length();
      const scale = THREE.MathUtils.clamp(4.8 / dist, 0.78, 1.12);

      for (const { obj, el, city } of cityLabelsRef.current) {
        if (!cityLayerOn) {
          el.style.display = 'none';
          continue;
        }

        obj.getWorldPosition(tmp);
        const front = tmp.normalize().dot(camDir) > 0.25;
        const tierAllowed = visibleCities.includes(city);
        const shouldShow = front && tierAllowed;

        el.style.display = shouldShow ? 'block' : 'none';
        if (shouldShow) {
          el.style.setProperty('--hm-scale', String(scale));
        }
      }

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();

      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);

      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(labelRenderer.domElement)) mount.removeChild(labelRenderer.domElement);

      sphereGeo.dispose();
      gridMat.dispose();
      clearGroup(pinsGroup);
      clearGroup(heatGroup);
      clearGroup(trailsGroup);

      beaconGeo.dispose();
      beaconMat.dispose();
      beaconHotMat.dispose();
      trailMat.dispose();
      glowTex.dispose();
      heatTex.dispose();
      oceanMat.dispose();
      satelliteMat.dispose();
      satelliteFallback.dispose();

      renderer.dispose();
    };
  }, []);

  // Update layer visibility
  useEffect(() => {
    const pins = pinsGroupRef.current;
    const heat = heatGroupRef.current;
    const trails = trailsGroupRef.current;
    const citiesG = citiesGroupRef.current;
    if (!pins || !heat || !trails || !citiesG) return;
    pins.visible = !!layersResolved.pins;
    heat.visible = !!layersResolved.heat;
    trails.visible = !!layersResolved.trails;
    citiesG.visible = !!layersResolved.cities;
  }, [layersResolved]);

  // Rebuild beacons when data changes
  useEffect(() => {
    const pins = pinsGroupRef.current;
    const heat = heatGroupRef.current;
    const trails = trailsGroupRef.current;
    if (!pins || !heat || !trails) return;
    if (!beaconGeoRef.current || !beaconMatRef.current || !beaconHotMatRef.current || !glowTexRef.current || !heatTexRef.current || !trailMatRef.current) {
      return;
    }

    const globeRadius = globeRadiusRef.current;
    const list = beaconsResolved;

    // Clear and rebuild pins
    const clearGroup = (g) => {
      while (g.children.length) {
        const child = g.children.pop();
        g.remove(child);
        child.traverse((o) => {
          if (o.geometry && o.geometry !== beaconGeoRef.current) {
            o.geometry.dispose?.();
          }
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
              if (m === beaconMatRef.current || m === beaconHotMatRef.current || m === trailMatRef.current) continue;
              m.dispose?.();
            }
          }
        });
      }
    };

    const map = new Map();
    for (const b of list) map.set(b.id, b);
    beaconByIdRef.current = map;

    // Rebuild pins
    clearGroup(pins);
    glowSpritesRef.current = [];

    for (const b of list) {
      const intensity = THREE.MathUtils.clamp(b.intensity ?? 0.6, 0.05, 1);
      const isHot = intensity > 0.75 || b.kind === 'event' || b.kind === 'drop';
      const p = latLngToVector3(b.lat, b.lng, globeRadius * 1.01);
      const root = new THREE.Group();
      root.position.copy(p);
      root.lookAt(new THREE.Vector3(0, 0, 0));
      root.rotateX(Math.PI);

      const pin = new THREE.Mesh(beaconGeoRef.current, isHot ? beaconHotMatRef.current : beaconMatRef.current);
      root.add(pin);

      const baseOpacity = b.sponsored ? 0.38 : 0.55;
      const spriteMat = new THREE.SpriteMaterial({
        map: glowTexRef.current,
        color: new THREE.Color(b.sponsored ? '#ffffff' : '#ff1744'),
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      const s = 0.22 + intensity * 0.25;
      sprite.scale.set(s, s, 1);
      sprite.userData = { baseOpacity, intensity, type: 'beacon', beaconId: b.id };
      root.add(sprite);
      glowSpritesRef.current.push(sprite);

      const towerGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.09 + intensity * 0.22, 10);
      const towerMat = new THREE.MeshBasicMaterial({
        color: b.sponsored ? 0xffffff : 0xff1744,
        transparent: true,
        opacity: b.sponsored ? 0.22 : 0.18,
        depthWrite: false,
      });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(0, 0.05 + intensity * 0.06, 0);
      tower.userData = { type: 'beacon', beaconId: b.id };
      root.add(tower);

      root.userData = { type: 'beacon', beaconId: b.id };
      pin.userData = { type: 'beacon', beaconId: b.id };

      pins.add(root);
    }

    // Rebuild heat
    clearGroup(heat);
    for (const b of list) {
      const intensity = THREE.MathUtils.clamp(b.intensity ?? 0.5, 0.05, 1);
      const p = latLngToVector3(b.lat, b.lng, globeRadius * 1.002);
      const smudgeMat = new THREE.SpriteMaterial({
        map: heatTexRef.current,
        color: new THREE.Color('#ff1744'),
        transparent: true,
        opacity: 0.08 + intensity * 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const smudge = new THREE.Sprite(smudgeMat);
      smudge.position.copy(p);
      const s = 0.35 + intensity * 0.65;
      smudge.scale.set(s, s, 1);
      heat.add(smudge);
    }

    // Rebuild trails
    clearGroup(trails);
    const sorted = [...list].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
    if (sorted.length >= 2) {
      const last = sorted.slice(Math.max(0, sorted.length - 12));
      for (let i = 0; i < last.length - 1; i++) {
        const a = last[i];
        const b = last[i + 1];
        const pts = greatCircleArc(a, b, globeRadius * 1.01, 72);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, trailMatRef.current);
        trails.add(line);
      }
    }
  }, [beaconsResolved]);

  return (
    <div className={className ?? ''} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={mountRef}
        aria-label="Interactive 3D globe showing nightlife beacons, city labels, and activity trails"
        style={{
          width: '100%',
          height: '100%',
          background: '#050505',
          overflow: 'hidden',
          position: 'relative',
        }}
      />
    </div>
  );
}