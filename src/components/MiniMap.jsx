// MiniMap — Leaflet map with dark CartoDB tiles, shows character's real-world location
// Updates live as Claude reports location changes in the SYSTEM STATUS WINDOW

import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { geocodeLocation, getZoomForLocation } from '../utils/geocoder';

// Fix Leaflet's default icon image paths broken by webpack
// We use a custom canvas-drawn marker instead of image files
function createPulseIcon(L) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 14px;
        height: 14px;
      ">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #4A90D9;
          box-shadow: 0 0 8px 3px rgba(74,144,217,0.7);
          animation: mapPulse 2s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          background: #ffffff;
        "></div>
        <style>
          @keyframes mapPulse {
            0%, 100% { box-shadow: 0 0 6px 2px rgba(74,144,217,0.7); }
            50% { box-shadow: 0 0 14px 6px rgba(74,144,217,0.4); }
          }
        </style>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function MiniMap({ location, hometownCoords, currentCoords, onCoordsUpdate }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const homePinRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'offline'
  const lastLocationRef = useRef('');

  // ── Initialize map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let L;
    try {
      L = require('leaflet');
    } catch {
      setStatus('offline');
      return;
    }

    // Use hometown if available, otherwise a neutral world view (no Seoul default)
    const defaultCoords = hometownCoords || { lat: 20, lng: 0 };
    const defaultZoom = hometownCoords ? 10 : 2;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView([defaultCoords.lat, defaultCoords.lng], defaultZoom);

    // Dark CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      errorTileUrl: '',
    }).addTo(map);

    // Tile load success → set ready
    map.once('load', () => setStatus('ready'));
    setTimeout(() => setStatus('ready'), 2000); // fallback

    // Home pin (subtle)
    if (hometownCoords) {
      const homeIcon = L.divIcon({
        className: '',
        html: `<div style="
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(200,169,81,0.6);
          box-shadow: 0 0 5px rgba(200,169,81,0.5);
          border: 1px solid rgba(200,169,81,0.8);
        "></div>`,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });
      homePinRef.current = L.marker([hometownCoords.lat, hometownCoords.lng], { icon: homeIcon }).addTo(map);
    }

    // Current location marker
    const icon = createPulseIcon(L);
    markerRef.current = L.marker([defaultCoords.lat, defaultCoords.lng], { icon }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      homePinRef.current = null;
    };
  }, []);

  // ── Update marker when location string changes ────────────────────────────
  useEffect(() => {
    if (!location || location === lastLocationRef.current) return;
    // Don't try to geocode the default empty string or placeholder
    if (location === 'Seoul, South Korea' && !hometownCoords) return;
    if (!mapRef.current || !markerRef.current) return;
    lastLocationRef.current = location;

    async function updateLocation() {
      // First try passed-in currentCoords
      if (currentCoords) {
        moveMarker(currentCoords);
        return;
      }

      // Geocode the location string
      const coords = await geocodeLocation(location);
      if (coords) {
        moveMarker(coords);
        onCoordsUpdate?.(coords);
      } else if (hometownCoords) {
        // Fall back to hometown if geocoding fails (inside a dungeon, etc.)
        moveMarker(hometownCoords);
      }
    }

    updateLocation();
  }, [location, currentCoords, hometownCoords]);

  // ── Update hometown pin when hometownCoords first becomes available ───────
  useEffect(() => {
    if (!mapRef.current || !hometownCoords) return;
    let L;
    try { L = require('leaflet'); } catch { return; }

    // Remove old home pin if it exists
    if (homePinRef.current) {
      homePinRef.current.remove();
    }

    const homeIcon = L.divIcon({
      className: '',
      html: `<div style="
        width: 8px; height: 8px; border-radius: 50%;
        background: rgba(200,169,81,0.6);
        box-shadow: 0 0 5px rgba(200,169,81,0.5);
        border: 1px solid rgba(200,169,81,0.8);
      "></div>`,
      iconSize: [8, 8],
      iconAnchor: [4, 4],
    });

    homePinRef.current = L.marker([hometownCoords.lat, hometownCoords.lng], { icon: homeIcon })
      .addTo(mapRef.current);

    // Fly to hometown on first load
    if (!location || location === 'Seoul, South Korea') {
      mapRef.current.setView([hometownCoords.lat, hometownCoords.lng], 10);
      markerRef.current?.setLatLng([hometownCoords.lat, hometownCoords.lng]);
    }
  }, [hometownCoords]);

  function moveMarker(coords) {
    if (!mapRef.current || !markerRef.current) return;
    const { lat, lng } = coords;
    markerRef.current.setLatLng([lat, lng]);
    const zoom = getZoomForLocation(location || '');
    mapRef.current.flyTo([lat, lng], zoom, { duration: 1.2, easeLinearity: 0.4 });
  }

  return (
    <div className="relative" style={{ width: '100%', height: '160px' }}>
      {/* Map container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#05050f',
        }}
      />

      {/* Blue scan-line overlay for system aesthetic */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(180deg, transparent 0%, rgba(74,144,217,0.04) 50%, transparent 100%)',
        backgroundSize: '100% 4px',
      }} />

      {/* Corner brackets */}
      {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
        <div key={i} className={`absolute ${pos} pointer-events-none`} style={{ width: 10, height: 10, zIndex: 999 }}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            {i === 0 && <><line x1="0" y1="10" x2="0" y2="0" stroke="#4A90D9" strokeWidth="1" opacity="0.6"/><line x1="0" y1="0" x2="10" y2="0" stroke="#4A90D9" strokeWidth="1" opacity="0.6"/></>}
            {i === 1 && <><line x1="10" y1="10" x2="10" y2="0" stroke="#4A90D9" strokeWidth="1" opacity="0.6"/><line x1="10" y1="0" x2="0" y2="0" stroke="#4A90D9" strokeWidth="1" opacity="0.6"/></>}
            {i === 2 && <><line x1="0" y1="0" x2="0" y2="10" stroke="#4A90D9" strokeWidth="1" opacity="0.6"/><line x1="0" y1="10" x2="10" y2="10" stroke="#4A90D9" strokeWidth="1" opacity="0.6"/></>}
            {i === 3 && <><line x1="10" y1="0" x2="10" y2="10" stroke="#4A90D9" strokeWidth="1" opacity="0.6"/><line x1="10" y1="10" x2="0" y2="10" stroke="#4A90D9" strokeWidth="1" opacity="0.6"/></>}
          </svg>
        </div>
      ))}

      {/* Location label */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,10,0.85))', padding: '8px 6px 4px', zIndex: 999 }}>
        <div className="font-mono text-[9px] text-system-blue truncate"
          style={{ textShadow: '0 0 6px rgba(74,144,217,0.8)' }}>
          {location || 'Location unknown'}
        </div>
      </div>

      {/* Offline fallback */}
      {status === 'offline' && (
        <div className="absolute inset-0 flex items-center justify-center bg-system-bg">
          <div className="font-mono text-[9px] text-system-text-dim text-center">
            [ MAP OFFLINE ]<br />
            <span className="text-[8px]">Requires network</span>
          </div>
        </div>
      )}
    </div>
  );
}
