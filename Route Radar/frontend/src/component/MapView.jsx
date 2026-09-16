import React, { useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Fix Leaflet default icon (Vite/ESM) ─────────────────────────────────────
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

// ─── Severity config ─────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  CRITICAL: { color: '#ef4444', glow: 'rgba(239,68,68,0.6)',   ring: '#7f1d1d', label: '⚠' },
  HIGH:     { color: '#f97316', glow: 'rgba(249,115,22,0.5)',  ring: '#7c2d12', label: '▲' },
  MODERATE: { color: '#f59e0b', glow: 'rgba(245,158,11,0.45)', ring: '#78350f', label: '●' },
  LOW:      { color: '#22c55e', glow: 'rgba(34,197,94,0.4)',   ring: '#14532d', label: '●' },
  DEFAULT:  { color: '#3b82f6', glow: 'rgba(59,130,246,0.4)',  ring: '#1e3a8a', label: '●' },
};

// ─── SVG DivIcon (no CDN dependency) ─────────────────────────────────────────
const createSvgIcon = (severity, isSelected = false) => {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.DEFAULT;
  const size  = isSelected ? 38 : 30;
  const inner = isSelected ? 12 : 9;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${cfg.ring}" stroke="${cfg.color}" stroke-width="2"
        style="filter:drop-shadow(0 0 6px ${cfg.glow})"/>
      <circle cx="${size/2}" cy="${size/2}" r="${inner}" fill="${cfg.color}"
        style="filter:drop-shadow(0 0 4px ${cfg.glow})"/>
    </svg>`;

  return L.divIcon({
    html:      svg,
    className: '',
    iconSize:     [size, size],
    iconAnchor:   [size / 2, size / 2],
    popupAnchor:  [0, -(size / 2 + 4)],
  });
};

// ─── Map centre updater — FIXES THE SHIVER ────────────────────────────────────
// Only calls flyTo when lat/lon values actually change beyond a tiny epsilon.
const EPSILON = 0.00005;
const MapCenterUpdater = ({ center, animate }) => {
  const map     = useMap();
  const prevRef = useRef(null);

  React.useEffect(() => {
    if (!center) return;
    const [lat, lon] = center;
    if (!lat || !lon) return;

    const prev = prevRef.current;
    const moved = !prev
      || Math.abs(prev[0] - lat) > EPSILON
      || Math.abs(prev[1] - lon) > EPSILON;

    if (moved) {
      prevRef.current = [lat, lon];
      if (animate) {
        map.flyTo([lat, lon], Math.max(map.getZoom(), 15), { animate: true, duration: 0.8 });
      } else {
        map.setView([lat, lon], map.getZoom(), { animate: false });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.[0], center?.[1], animate]);

  return null;
};

// ─── MapView ──────────────────────────────────────────────────────────────────
const MapView = ({ events, selectedEvent, onEventSelect }) => {
  const DEFAULT_CENTER = [12.9716, 77.5946];

  // Value-stable center — array only changes when actual coord values differ
  const mapCenter = useMemo(() => {
    if (selectedEvent?.lat && selectedEvent?.lon)
      return [selectedEvent.lat, selectedEvent.lon];
    const first = events.find(e => e.lat && e.lon);
    return first ? [first.lat, first.lon] : DEFAULT_CENTER;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent?.lat, selectedEvent?.lon, events.length === 0]);

  // Only animate fly-to when the user explicitly selects an event
  const shouldAnimate = !!(selectedEvent?.lat && selectedEvent?.lon);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}>
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {/* Dark CartoDB tile — matches the dark UI */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          subdomains="abcd"
        />

        {/* Stable centre updater — only fires when coords actually change */}
        <MapCenterUpdater center={mapCenter} animate={shouldAnimate} />

        {events.map((event) => {
          if (!event.lat || !event.lon) return null;
          const isSelected = selectedEvent?.id === event.id;
          const icon = createSvgIcon(event.severity_label, isSelected);
          const cfg  = SEVERITY_CONFIG[event.severity_label] ?? SEVERITY_CONFIG.DEFAULT;

          return (
            <Marker
              key={event.id}
              position={[event.lat, event.lon]}
              icon={icon}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{ click: () => onEventSelect(event) }}
            >
              <Popup>
                <div style={{
                  padding: '12px 14px',
                  minWidth: '200px',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: cfg.color, boxShadow: `0 0 6px ${cfg.glow}`,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#f0f6ff' }}>
                      {event.event_id}
                    </span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '10px', fontWeight: 600,
                      padding: '2px 7px', borderRadius: '99px',
                      background: `${cfg.color}22`, color: cfg.color,
                      border: `1px solid ${cfg.color}55`,
                    }}>
                      {event.severity_label}
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[
                      ['Priority', event.action_priority],
                      ['Risk',     `${event.risk_score}/100`],
                      ['Road',     event.road_type],
                      ['Type',     event.event_type],
                    ].map(([label, val]) => (
                      <div key={label} style={{
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '6px',
                        padding: '5px 7px',
                      }}>
                        <div style={{ fontSize: '9px', color: '#4a6080', marginBottom: '1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#8ba3c1' }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* GPS */}
                  <div style={{ marginTop: '8px', fontSize: '10px', color: '#4a6080', fontFamily: 'JetBrains Mono, monospace' }}>
                    {event.lat?.toFixed(5)}, {event.lon?.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
