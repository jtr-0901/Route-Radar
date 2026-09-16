import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import PotholeCard from './components/PotholeCard';
import StatsPanel from './components/StatsPanel';
import RiskBadge from './components/RiskBadge';
import MapView from './components/MapView';

const BACKEND_URL = 'http://127.0.0.1:8000/api/events/';
const POLL_MS = 2000;

// ─── helpers ─────────────────────────────────────────────────────────────────
const getRiskBarColor = (score) => {
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#f97316';
  if (score >= 25) return '#f59e0b';
  return '#22c55e';
};

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  const [events, setEvents]               = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [connError, setConnError]         = useState(false);

  // Keep selectedEvent accessible inside the interval callback without
  // recreating the interval — this fixes the polling bug.
  const selectedEventRef = useRef(selectedEvent);
  useEffect(() => { selectedEventRef.current = selectedEvent; }, [selectedEvent]);

  // ── Polling ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const fetchEvents = async () => {
      try {
        const res  = await fetch(BACKEND_URL);
        if (!res.ok) throw new Error('non-2xx');
        const data = await res.json();
        if (!active) return;

        setEvents(data);
        setConnError(false);

        // Keep selected event data fresh without re-triggering the interval
        const sel = selectedEventRef.current;
        if (sel) {
          const updated = data.find(e => e.id === sel.id);
          if (updated) setSelectedEvent(updated);
        }
      } catch {
        if (active) setConnError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEvents();
    const id = setInterval(fetchEvents, POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, []); // ← empty dep array: interval is created once and never torn down

  // ── Close detail panel on Escape ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedEvent(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-deep)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
    }}>

      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
      <div style={{
        width: '380px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border-subtle)',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(59,130,246,0.06) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            {/* Logo mark */}
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0,
              boxShadow: '0 0 16px rgba(59,130,246,0.4)',
            }}>
              🛣️
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: '#f0f6ff' }}>
                Route Radar
              </h1>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Indian Road Safety DSS
              </p>
            </div>

            {/* Live indicator */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {connError ? (
                <span style={{
                  fontSize: '9px', fontWeight: 600, color: '#ef4444',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase',
                }}>Offline</span>
              ) : (
                <>
                  <div className="live-dot" />
                  <span style={{ fontSize: '9px', fontWeight: 600, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <StatsPanel events={events} />
        </div>

        {/* Feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }} className="custom-scrollbar">
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '12px',
          }}>
            <h2 style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Incident Feed
            </h2>
            {events.length > 0 && (
              <span style={{
                fontSize: '10px', fontWeight: 600, color: 'var(--accent-blue)',
                background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)',
                padding: '2px 8px', borderRadius: '99px',
              }}>
                {events.length} events
              </span>
            )}
          </div>

          {loading && events.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: '12px' }}>
              <div style={{
                width: '28px', height: '28px',
                border: '2px solid rgba(59,130,246,0.2)',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Connecting to backend…</span>
            </div>
          ) : events.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 16px',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '12px', color: 'var(--text-muted)',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📡</div>
              <div style={{ fontSize: '12px', fontWeight: 500 }}>No anomalies detected yet</div>
              <div style={{ fontSize: '10px', marginTop: '4px', color: 'var(--text-muted)' }}>
                Pipeline will surface events in real time
              </div>
            </div>
          ) : (
            events.map((event) => (
              <PotholeCard
                key={event.id}
                event={event}
                isSelected={selectedEvent?.id === event.id}
                onClick={setSelectedEvent}
              />
            ))
          )}
        </div>
      </div>

      {/* ── CENTER MAP ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapView
          events={events}
          selectedEvent={selectedEvent}
          onEventSelect={setSelectedEvent}
        />

        {/* Map overlay — top-right attribution badge */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px', zIndex: 1000,
          background: 'rgba(6,11,20,0.75)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px', padding: '6px 10px',
          fontSize: '10px', color: 'var(--text-muted)',
          fontWeight: 500,
          pointerEvents: 'none',
        }}>
          🗺 Bengaluru, Karnataka
        </div>
      </div>

      {/* ── RIGHT DETAIL PANEL ─────────────────────────────────────────── */}
      {selectedEvent && (
        <div
          className="slide-in-panel"
          style={{
            width: '420px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-base)',
            borderLeft: '1px solid var(--border-subtle)',
            position: 'absolute',
            right: 0, top: 0, bottom: 0,
            zIndex: 20,
            boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Panel header */}
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(59,130,246,0.05) 0%, transparent 100%)',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
                Incident Details
              </div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em', color: '#f0f6ff' }}>
                {selectedEvent.event_id}
              </h2>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '13px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#f0f6ff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }} className="custom-scrollbar">

            {/* Severity + badge row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <RiskBadge type="severity" value={selectedEvent.severity_label} />
              <RiskBadge type="priority" value={selectedEvent.action_priority} />
            </div>

            {/* Thumbnail */}
            {selectedEvent.image_data && (
              <div style={{
                marginBottom: '18px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.07)',
                position: 'relative',
              }}>
                <img
                  src={`data:image/jpeg;base64,${selectedEvent.image_data}`}
                  alt="Detection"
                  style={{ width: '100%', display: 'block', objectFit: 'contain', background: '#000' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', bottom: '8px', left: '10px',
                  fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Frame Snapshot
                </div>
              </div>
            )}

            {/* Risk score */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Risk Score
                </span>
                <span style={{
                  fontSize: '22px', fontWeight: 900, letterSpacing: '-0.03em',
                  color: getRiskBarColor(selectedEvent.risk_score ?? 0),
                }}>
                  {selectedEvent.risk_score ?? 0}
                  <span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.6 }}>/100</span>
                </span>
              </div>
              <div className="risk-bar-track">
                <div
                  className="risk-bar-fill"
                  style={{
                    width: `${selectedEvent.risk_score ?? 0}%`,
                    background: `linear-gradient(90deg, ${getRiskBarColor(selectedEvent.risk_score ?? 0)}88, ${getRiskBarColor(selectedEvent.risk_score ?? 0)})`,
                    boxShadow: `0 0 8px ${getRiskBarColor(selectedEvent.risk_score ?? 0)}66`,
                  }}
                />
              </div>
            </div>

            {/* Recommendation */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '14px',
              marginBottom: '14px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Recommendation
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selectedEvent.recommended_action}
              </p>
            </div>

            {/* Risk breakdown */}
            {selectedEvent.reason_breakdown && (() => {
              let reasons = [];
              try { reasons = JSON.parse(selectedEvent.reason_breakdown); } catch { return null; }
              if (!reasons.length) return null;
              return (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '14px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                    Risk Factors
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {reasons.map((reason, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span style={{ color: '#3b82f6', marginTop: '2px', flexShrink: 0 }}>›</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Matched rules */}
            {selectedEvent.matched_rules && (() => {
              let rules = [];
              try { rules = JSON.parse(selectedEvent.matched_rules); } catch { return null; }
              if (!rules.length) return null;
              return (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '14px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
                    Indian Standards Applied
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {rules.map((rule, i) => (
                      <span key={i} style={{
                        fontSize: '10px', fontWeight: 600,
                        fontFamily: 'JetBrains Mono, monospace',
                        padding: '3px 8px', borderRadius: '6px',
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        color: '#93c5fd',
                      }}>
                        {rule}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Metadata grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-subtle)',
            }}>
              {[
                ['🕐 Detected',  new Date(selectedEvent.timestamp).toLocaleString()],
                ['📍 Location',  `${selectedEvent.lat?.toFixed(5)}, ${selectedEvent.lon?.toFixed(5)}`],
                ['🛣️ Road',      selectedEvent.road_type ?? '—'],
                ['🏷️ Type',      selectedEvent.event_type ?? '—'],
              ].map(([label, value]) => (
                <div key={label} style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px',
                }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: label.includes('Location') ? 'JetBrains Mono, monospace' : 'inherit', wordBreak: 'break-all' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes badgePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
    </div>
  );
}

export default App;
