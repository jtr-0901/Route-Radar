import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Utility to create colored markers
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

const icons = {
  'Road Defect': createIcon('red'),
  'Rash Driving': createIcon('orange'),
  'Traffic Congestion': createIcon('violet'),
  'default': createIcon('blue')
};

const BACKEND_URL = "http://127.0.0.1:8000/api/events/";

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All'); // 'All', 'Road Defect', 'Rash Driving', 'Traffic Congestion'

  const fetchEvents = async () => {
    try {
      const response = await fetch(BACKEND_URL);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, []);

  const mapCenter = [12.9534, 77.6095];

  const filteredEvents = filter === 'All' ? events : events.filter(e => e.event_type.includes(filter));

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-96 bg-white shadow-lg flex flex-col z-10 relative">
        <div className="p-4 bg-gray-900 text-white">
          <h1 className="text-2xl font-bold tracking-tight">Smart Transit UI</h1>
          <p className="text-sm text-gray-400">PS124: Mobile Urban Sensing</p>
        </div>
        
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Filters</h2>
          <select 
            className="w-full p-2 border border-gray-300 rounded shadow-sm focus:ring focus:ring-blue-200 outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="All">All Events</option>
            <option value="Road Defect">Road Defects</option>
            <option value="Rash Driving">Rash Driving</option>
            <option value="Traffic">Traffic Congestion</option>
          </select>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Detections ({filteredEvents.length})
          </h2>
          
          {loading && events.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">No events match the current filter.</p>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className={`p-4 rounded-xl border-l-4 shadow-sm bg-white border ${
                  event.event_type.includes('Defect') ? 'border-l-red-500 hover:bg-red-50' : 
                  event.event_type.includes('Rash') ? 'border-l-orange-500 hover:bg-orange-50' : 
                  event.event_type.includes('Traffic') ? 'border-l-violet-500 hover:bg-violet-50' :
                  'border-l-blue-500'
                } transition-colors duration-200 cursor-pointer`}>
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900">{event.event_type}</h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                     <span>📍 {event.lat.toFixed(4)}, {event.lon.toFixed(4)}</span>
                  </div>
                  {event.image_data && (
                    <img 
                      src={`data:image/jpeg;base64,${event.image_data}`} 
                      alt="Detection" 
                      className="mt-3 w-full h-32 object-cover rounded-lg border border-gray-100 shadow-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative z-0">
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          
          {filteredEvents.map((event) => {
            let iconType = icons.default;
            if (event.event_type.includes('Defect')) iconType = icons['Road Defect'];
            else if (event.event_type.includes('Rash')) iconType = icons['Rash Driving'];
            else if (event.event_type.includes('Traffic')) iconType = icons['Traffic Congestion'];

            return (
              <Marker key={event.id} position={[event.lat, event.lon]} icon={iconType}>
                <Popup className="custom-popup">
                  <div className="w-56 p-1">
                    <h3 className="font-bold text-gray-900 mb-1">{event.event_type}</h3>
                    <p className="text-xs text-gray-500 mb-2">Timestamp: {new Date(event.timestamp).toLocaleTimeString()}</p>
                    {event.image_data && (
                      <img 
                        src={`data:image/jpeg;base64,${event.image_data}`} 
                        alt="Thumbnail" 
                        className="w-full h-auto rounded-md shadow-sm border border-gray-200"
                      />
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
