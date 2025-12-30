import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// HOTMESS Dark Theme for Mapbox
const HOTMESS_STYLE = {
  version: 8,
  name: 'HOTMESS Night',
  sources: {
    'mapbox-streets': {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8'
    }
  },
  glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#000000'
      }
    },
    {
      id: 'water',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'water',
      paint: {
        'fill-color': '#0a0a0a',
        'fill-opacity': 0.8
      }
    },
    {
      id: 'land',
      type: 'fill',
      source: 'mapbox-streets',
      'source-layer': 'landuse',
      paint: {
        'fill-color': '#1a1a1a',
        'fill-opacity': 0.6
      }
    },
    {
      id: 'boundaries',
      type: 'line',
      source: 'mapbox-streets',
      'source-layer': 'admin',
      paint: {
        'line-color': '#2a2a2a',
        'line-width': 1,
        'line-opacity': 0.4
      }
    }
  ]
};

// Beacon type colors
const BEACON_COLORS = {
  event: '#FF1493',      // Hot pink
  venue: '#FF1493',
  hookup: '#FF073A',     // Neon red
  drop: '#FF6B35',       // Neon orange
  popup: '#B026FF',      // Neon purple
  private: '#00D9FF',    // Neon blue
  ticket: '#FFEB3B',     // Neon yellow
  care: '#39FF14'        // Neon green
};

export default function NightPulseGlobe({
  mapboxToken,
  beacons = [],
  cities = [],
  activeLayer = 'pins',
  onBeaconClick,
  onCityClick,
  className = ''
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  // Initialize Mapbox
  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: HOTMESS_STYLE,
      projection: 'globe',
      center: [-0.1278, 51.5074], // London
      zoom: 1.5,
      pitch: 0,
      bearing: 0,
      antialias: true
    });

    // Globe atmosphere
    map.on('style.load', () => {
      map.setFog({
        color: '#000000',
        'high-color': '#1a1a1a',
        'horizon-blend': 0.05,
        'space-color': '#000000',
        'star-intensity': 0.3
      });
    });

    // Smooth rotation on idle
    let userInteracting = false;
    let spinEnabled = true;

    const spinGlobe = () => {
      if (spinEnabled && !userInteracting) {
        const center = map.getCenter();
        center.lng += 0.05;
        map.easeTo({ center, duration: 100, easing: (t) => t });
      }
      requestAnimationFrame(spinGlobe);
    };

    map.on('mousedown', () => { userInteracting = true; });
    map.on('mouseup', () => { userInteracting = false; });
    map.on('dragend', () => { userInteracting = false; });
    map.on('pitchend', () => { userInteracting = false; });
    map.on('rotateend', () => { userInteracting = false; });
    map.on('moveend', () => {
      const zoom = map.getZoom();
      spinEnabled = zoom < 3;
    });

    spinGlobe();

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  // Update beacon markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (activeLayer !== 'pins' && activeLayer !== 'all') return;

    // Add beacon markers
    beacons.forEach(beacon => {
      const color = BEACON_COLORS[beacon.kind || 'event'] || '#FF1493';
      
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'beacon-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 0 20px ${color}80, 0 0 40px ${color}40;
        cursor: pointer;
        transition: transform 0.2s;
      `;

      // Pulse animation
      el.style.animation = 'beacon-pulse 2s ease-in-out infinite';

      // Add pulsing animation if high intensity
      if (beacon.intensity && beacon.intensity > 0.7) {
        el.style.animation = 'beacon-pulse 1s ease-in-out infinite';
      }

      // Hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Click handler
      el.addEventListener('click', () => {
        onBeaconClick?.(beacon);
      });

      // Create marker
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([beacon.lng, beacon.lat])
        .addTo(map);

      // Add popup on hover
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 15,
        className: 'beacon-popup'
      }).setHTML(`
        <div style="
          background: #000;
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid ${color};
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        ">
          ${beacon.title || 'BEACON'}
        </div>
      `);

      el.addEventListener('mouseenter', () => {
        popup.setLngLat([beacon.lng, beacon.lat]).addTo(map);
      });
      el.addEventListener('mouseleave', () => {
        popup.remove();
      });

      markersRef.current.push(marker);
    });
  }, [beacons, activeLayer, onBeaconClick]);

  // Add heat layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (activeLayer === 'heat' || activeLayer === 'all') {
      // Convert beacons to GeoJSON
      const heatData = {
        type: 'FeatureCollection',
        features: beacons.map(beacon => ({
          type: 'Feature',
          properties: {
            intensity: beacon.intensity || 0.5
          },
          geometry: {
            type: 'Point',
            coordinates: [beacon.lng, beacon.lat]
          }
        }))
      };

      if (!map.getSource('heat-source')) {
        map.addSource('heat-source', {
          type: 'geojson',
          data: heatData
        });

        map.addLayer({
          id: 'heat-layer',
          type: 'heatmap',
          source: 'heat-source',
          paint: {
            'heatmap-weight': ['get', 'intensity'],
            'heatmap-intensity': 1,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(0, 0, 0, 0)',
              0.2, 'rgba(255, 20, 147, 0.2)',
              0.4, 'rgba(255, 20, 147, 0.4)',
              0.6, 'rgba(255, 107, 53, 0.6)',
              0.8, 'rgba(255, 7, 58, 0.8)',
              1, 'rgba(255, 7, 58, 1)'
            ],
            'heatmap-radius': 30,
            'heatmap-opacity': 0.7
          }
        });
      } else {
        map.getSource('heat-source').setData(heatData);
      }

      map.setLayoutProperty('heat-layer', 'visibility', 'visible');
    } else {
      if (map.getLayer('heat-layer')) {
        map.setLayoutProperty('heat-layer', 'visibility', 'none');
      }
    }
  }, [beacons, activeLayer]);

  // Add city labels
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    cities.forEach(city => {
      // Create city marker
      const el = document.createElement('div');
      el.className = 'city-label';
      el.style.cssText = `
        padding: 4px 12px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 999px;
        color: ${city.active ? '#FF1493' : 'rgba(255, 255, 255, 0.6)'};
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        cursor: pointer;
        white-space: nowrap;
        backdrop-filter: blur(10px);
        ${city.active ? 'box-shadow: 0 0 20px rgba(255, 20, 147, 0.4);' : ''}
      `;
      el.textContent = city.name;

      el.addEventListener('click', () => {
        onCityClick?.(city);
        map.flyTo({
          center: [city.lng, city.lat],
          zoom: 10,
          duration: 2000
        });
      });

      new mapboxgl.Marker({ element: el })
        .setLngLat([city.lng, city.lat])
        .addTo(map);
    });
  }, [cities, onCityClick]);

  return (
    <>
      <style>{`
        @keyframes beacon-pulse {
          0%, 100% {
            box-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
            opacity: 1;
          }
          50% {
            box-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
            opacity: 0.8;
          }
        }
        .mapboxgl-popup-content {
          padding: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
      `}</style>
      <div 
        ref={mapContainerRef} 
        className={className}
        style={{ width: '100%', height: '100%' }}
      />
    </>
  );
}