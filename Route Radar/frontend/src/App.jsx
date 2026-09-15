import React, { useState, useEffect } from 'react';
import PotholeCard from './components/PotholeCard';
import StatsPanel from './components/StatsPanel';
import RiskBadge from './components/RiskBadge';
import MapView from './components/MapView';

const BACKEND_URL = "http://127.0.0.1:8000/api/events/";

function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const response = await fetch(BACKEND_URL);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        
        // If we have a selected event, update its data if it changed
        if (selectedEvent) {
          const updated = data.find(e => e.id === selectedEvent.id);
          if (updated) setSelectedEvent(updated);
        }
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, [selectedEvent]);

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-200">
      
      {/* LEFT SIDEBAR - INCIDENT FEED */}
      <div className="w-[400px] flex flex-col bg-slate-900 border-r border-slate-800 shadow-xl z-10 relative">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
            <h1 className="text-xl font-bold tracking-tight text-white">Route Radar</h1>
          </div>
          <p className="text-xs text-slate-400 ml-6 uppercase tracking-wider font-semibold">Indian Road Safety DSS</p>
        </div>

        <div className="p-4 border-b border-slate-800">
          <StatsPanel events={events} />
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Live Feed</h2>
          
          {loading && events.length === 0 ? (
            <div className="flex justify-center p-10">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center p-10 text-slate-500 border border-dashed border-slate-700 rounded-lg">
              No anomalies detected yet.
            </div>
          ) : (
            <div>
              {events.map((event) => (
                <PotholeCard 
                  key={event.id} 
                  event={event} 
                  isSelected={selectedEvent?.id === event.id}
                  onClick={setSelectedEvent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CENTER - MAP */}
      <div className="flex-1 relative">
        <MapView 
          events={events} 
          selectedEvent={selectedEvent} 
          onEventSelect={setSelectedEvent} 
        />
      </div>

      {/* RIGHT SIDEBAR - DETAIL PANEL */}
      {selectedEvent && (
        <div className="w-[450px] flex flex-col bg-slate-900 border-l border-slate-800 shadow-2xl z-10 absolute right-0 top-0 bottom-0 animate-in slide-in-from-right-full duration-300">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
            <h2 className="font-bold text-lg text-white">Incident Details</h2>
            <button 
              onClick={() => setSelectedEvent(null)}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-black text-white">{selectedEvent.event_id}</h1>
              <RiskBadge type="severity" value={selectedEvent.severity_label} />
            </div>

            {selectedEvent.image_data && (
              <div className="mb-6 rounded-lg overflow-hidden border border-slate-700 relative group">
                <img 
                  src={`data:image/jpeg;base64,${selectedEvent.image_data}`} 
                  alt="Detection" 
                  className="w-full object-contain bg-black"
                />
                <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-mono text-white backdrop-blur-sm">
                  Frame Snapshot
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Action Box */}
              <div className="bg-slate-800/80 rounded-lg p-4 border border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommendation</h3>
                <div className="flex items-center gap-2 mb-2">
                  <RiskBadge type="priority" value={selectedEvent.action_priority} />
                </div>
                <p className="text-slate-200 text-sm">{selectedEvent.recommended_action}</p>
              </div>

              {/* Risk Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Risk Score Assessment</span>
                  <span className="text-lg font-black text-white">{selectedEvent.risk_score}/100</span>
                </h3>
                <ul className="space-y-2 bg-slate-800/30 rounded-lg p-3 border border-slate-800">
                  {selectedEvent.reason_breakdown ? 
                    JSON.parse(selectedEvent.reason_breakdown).map((reason, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{reason}</span>
                      </li>
                    )) : 
                    <li className="text-sm text-slate-500 italic">No breakdown available</li>
                  }
                </ul>
              </div>

              {/* Indian Standards Applied */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Indian Standards & Rules Applied
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.matched_rules ? 
                    JSON.parse(selectedEvent.matched_rules).map((rule, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs font-mono text-slate-300">
                        {rule}
                      </span>
                    )) : 
                    <span className="text-sm text-slate-500 italic">No rules matched</span>
                  }
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Time Detected</div>
                  <div className="text-sm text-slate-300">{new Date(selectedEvent.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Location</div>
                  <div className="text-sm text-slate-300 font-mono">
                    {selectedEvent.lat?.toFixed(5)}, {selectedEvent.lon?.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
