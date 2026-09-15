import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Import Leaflet CSS here so it loads before any Tailwind resets
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in Vite/ESM (require() doesn't work)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const getMarkerColor = (severity) => {
  switch (severity) {
    case 'CRITICAL': return 'red';
    case 'HIGH': return 'orange';
    case 'MODERATE': return 'gold';
    case 'LOW': return 'green';
    default: return 'blue';
  }
};

const createIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const MapCenterUpdater = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const MapView = ({ events, selectedEvent, onEventSelect }) => {
  const defaultCenter = [12.9716, 77.5946];
  
  const mapCenter = selectedEvent && selectedEvent.lat && selectedEvent.lon 
    ? [selectedEvent.lat, selectedEvent.lon] 
    : (events.length > 0 && events[0].lat ? [events[0].lat, events[0].lon] : defaultCenter);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={mapCenter} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        className="dark-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        
        <MapCenterUpdater center={mapCenter} />

        {events.map((event) => {
          if (!event.lat || !event.lon) return null;
          
          const isSelected = selectedEvent?.id === event.id;
          const color = getMarkerColor(event.severity_label);
          const icon = createIcon(color);
          
          return (
            <Marker 
              key={event.id} 
              position={[event.lat, event.lon]} 
              icon={icon}
              eventHandlers={{
                click: () => onEventSelect(event)
              }}
            >
              <Popup>
                <div style={{ padding: '4px', minWidth: '160px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                    {event.event_id} — {event.severity_label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>
                    Priority: {event.action_priority}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    Risk: {event.risk_score}/100
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
