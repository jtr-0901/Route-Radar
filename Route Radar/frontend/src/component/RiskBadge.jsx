import React from 'react';

const SEVERITY_DOT = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MODERATE: '#f59e0b',
  LOW:      '#22c55e',
};

const PRIORITY_DOT = {
  IMMEDIATE:  '#ef4444',
  PRIORITIZE: '#f97316',
  SCHEDULE:   '#3b82f6',
  MONITOR:    '#64748b',
};

const RiskBadge = ({ type, value }) => {
  let style = {};
  let dotColor = '#64748b';

  if (type === 'severity') {
    dotColor = SEVERITY_DOT[value] ?? '#64748b';
    const map = {
      CRITICAL: { bg: 'rgba(239,68,68,0.12)',  text: '#fca5a5', border: 'rgba(239,68,68,0.35)' },
      HIGH:     { bg: 'rgba(249,115,22,0.12)', text: '#fdba74', border: 'rgba(249,115,22,0.35)' },
      MODERATE: { bg: 'rgba(245,158,11,0.12)', text: '#fcd34d', border: 'rgba(245,158,11,0.35)' },
      LOW:      { bg: 'rgba(34,197,94,0.12)',  text: '#86efac', border: 'rgba(34,197,94,0.35)' },
    };
    const t = map[value] ?? { bg: 'rgba(255,255,255,0.06)', text: '#8ba3c1', border: 'rgba(255,255,255,0.10)' };
    style = { background: t.bg, color: t.text, border: `1px solid ${t.border}` };

  } else if (type === 'priority') {
    dotColor = PRIORITY_DOT[value] ?? '#64748b';
    const map = {
      IMMEDIATE:  { bg: 'rgba(239,68,68,0.15)',  text: '#fca5a5', border: 'rgba(239,68,68,0.4)' },
      PRIORITIZE: { bg: 'rgba(249,115,22,0.12)', text: '#fdba74', border: 'rgba(249,115,22,0.35)' },
      SCHEDULE:   { bg: 'rgba(59,130,246,0.12)', text: '#93c5fd', border: 'rgba(59,130,246,0.35)' },
      MONITOR:    { bg: 'rgba(100,116,139,0.12)',text: '#94a3b8', border: 'rgba(100,116,139,0.35)' },
    };
    const t = map[value] ?? { bg: 'rgba(255,255,255,0.06)', text: '#8ba3c1', border: 'rgba(255,255,255,0.10)' };
    style = { background: t.bg, color: t.text, border: `1px solid ${t.border}` };
  }

  const isPulse = type === 'priority' && value === 'IMMEDIATE';

  return (
    <span
      style={{
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        fontSize: '10px',
        fontWeight: 600,
        borderRadius: '99px',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        fontFamily: 'Inter, sans-serif',
        animation: isPulse ? 'badgePulse 1.5s ease-in-out infinite' : 'none',
      }}
    >
      <span style={{
        width: '5px', height: '5px', borderRadius: '50%',
        background: dotColor,
        boxShadow: `0 0 4px ${dotColor}`,
        flexShrink: 0,
      }} />
      {value}
    </span>
  );
};

export default RiskBadge;
