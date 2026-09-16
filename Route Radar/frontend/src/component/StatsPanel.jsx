import React from 'react';

const STAT_CONFIGS = [
  {
    key: 'total',
    label: 'Total Detected',
    icon: '📍',
    getValue: (events) => events.length,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
  },
  {
    key: 'critical',
    label: 'Critical',
    icon: '🔴',
    getValue: (events) => events.filter(e => e.severity_label === 'CRITICAL').length,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
  },
  {
    key: 'high',
    label: 'High Priority',
    icon: '🟠',
    getValue: (events) => events.filter(e => e.severity_label === 'HIGH').length,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
  },
  {
    key: 'avgRisk',
    label: 'Avg Risk',
    icon: '📊',
    getValue: (events) => events.length > 0
      ? Math.round(events.reduce((acc, e) => acc + (e.risk_score || 0), 0) / events.length)
      : 0,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
    suffix: '/100',
  },
];

const StatsPanel = ({ events }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      {STAT_CONFIGS.map(({ key, label, icon, getValue, color, bg, border, suffix }) => {
        const value = getValue(events);
        return (
          <div
            key={key}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: '10px',
              padding: '10px 12px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background glow orb */}
            <div style={{
              position: 'absolute',
              bottom: '-12px',
              right: '-8px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: color,
              opacity: 0.08,
              filter: 'blur(16px)',
              pointerEvents: 'none',
            }} />

            <div style={{ fontSize: '14px', marginBottom: '4px' }}>{icon}</div>
            <div style={{
              fontSize: '22px',
              fontWeight: 800,
              color,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'baseline',
              gap: '2px',
            }}>
              {value}
              {suffix && (
                <span style={{ fontSize: '11px', fontWeight: 500, color: `${color}88` }}>
                  {suffix}
                </span>
              )}
            </div>
            <div style={{
              fontSize: '9px',
              fontWeight: 600,
              color: '#4a6080',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginTop: '3px',
            }}>
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsPanel;
