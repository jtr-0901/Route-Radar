import React from 'react';

const StatsPanel = ({ events }) => {
  const total = events.length;
  const critical = events.filter(e => e.severity_label === 'CRITICAL').length;
  const high = events.filter(e => e.severity_label === 'HIGH').length;
  const avgRisk = total > 0 
    ? Math.round(events.reduce((acc, e) => acc + (e.risk_score || 0), 0) / total) 
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
        <div className="text-slate-400 text-xs mb-1">Total Anomalies</div>
        <div className="text-2xl font-bold text-slate-100">{total}</div>
      </div>
      <div className="bg-red-900/20 p-3 rounded-lg border border-red-900/50">
        <div className="text-red-400 text-xs mb-1">Immediate Action</div>
        <div className="text-2xl font-bold text-red-500">{critical}</div>
      </div>
      <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-900/50">
        <div className="text-orange-400 text-xs mb-1">Prioritize</div>
        <div className="text-2xl font-bold text-orange-500">{high}</div>
      </div>
      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
        <div className="text-slate-400 text-xs mb-1">Avg Risk Score</div>
        <div className="text-2xl font-bold text-blue-400">{avgRisk}</div>
      </div>
    </div>
  );
};

export default StatsPanel;
