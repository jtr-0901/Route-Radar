import React from 'react';
import RiskBadge from './RiskBadge';

const SEVERITY_ACCENT = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MODERATE: '#f59e0b',
  LOW:      '#22c55e',
  DEFAULT:  '#3b82f6',
};

const getRiskColor = (score) => {
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#f97316';
  if (score >= 25) return '#f59e0b';
  return '#22c55e';
};

const PotholeCard = ({ event, isSelected, onClick }) => {
  const accent = SEVERITY_ACCENT[event.severity_label] ?? SEVERITY_ACCENT.DEFAULT;
  const riskColor = getRiskColor(event.risk_score ?? 0);

  return (
    <div
      onClick={() => onClick(event)}
      style={{
        borderLeft: `3px solid ${isSelected ? accent : 'transparent'}`,
        transition: 'all 0.2s ease',
      }}
      className={`
        rounded-xl border mb-2.5 cursor-pointer p-4
        ${isSelected
          ? 'bg-[#162035] border-[rgba(255,255,255,0.12)] shadow-lg'
          : 'bg-[#0d1520] border-[rgba(255,255,255,0.06)] hover:bg-[#111d2e] hover:border-[rgba(255,255,255,0.10)]'
        }
      `}
    >
      {/* Top row */}
      <div className="flex justify-between items-start mb-2.5">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] font-mono text-[#4a6080] tracking-wider uppercase">
            {event.event_id}
          </span>
          <h3 className="font-semibold text-sm text-[#f0f6ff] truncate">{event.event_type}</h3>
        </div>
        <span className="text-[10px] font-medium text-[#4a6080] bg-[rgba(255,255,255,0.04)] px-2 py-1 rounded-md shrink-0 ml-2">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Badges */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <RiskBadge type="severity" value={event.severity_label} />
        <RiskBadge type="priority" value={event.action_priority} />
      </div>

      {/* Risk score bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-[#4a6080] uppercase tracking-wider">Risk Score</span>
          <span className="text-xs font-bold" style={{ color: riskColor }}>{event.risk_score ?? 0}/100</span>
        </div>
        <div className="risk-bar-track">
          <div
            className="risk-bar-fill"
            style={{
              width: `${event.risk_score ?? 0}%`,
              background: `linear-gradient(90deg, ${riskColor}aa, ${riskColor})`,
              boxShadow: `0 0 6px ${riskColor}66`,
            }}
          />
        </div>
      </div>

      {/* Road type */}
      <div className="flex justify-between items-center text-[10px] text-[#4a6080] mb-2">
        <span>Road type</span>
        <span className="text-[#8ba3c1] font-medium">{event.road_type ?? '—'}</span>
      </div>

      {/* Thumbnail */}
      {event.image_data && (
        <div className="relative rounded-lg overflow-hidden border border-[rgba(255,255,255,0.06)] mt-1">
          <img
            src={`data:image/jpeg;base64,${event.image_data}`}
            alt="Detection snapshot"
            className="w-full h-28 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-white/60">Frame snapshot</div>
        </div>
      )}
    </div>
  );
};

export default PotholeCard;
