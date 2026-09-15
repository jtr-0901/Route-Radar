import React from 'react';
import RiskBadge from './RiskBadge';

const PotholeCard = ({ event, isSelected, onClick }) => {
  return (
    <div 
      onClick={() => onClick(event)}
      className={`p-4 rounded-xl border mb-3 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-slate-800 border-blue-500 shadow-lg shadow-blue-900/20' 
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/80 hover:border-slate-500'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono text-slate-400">{event.event_id}</span>
          <h3 className="font-bold text-slate-100">{event.event_type}</h3>
        </div>
        <span className="text-xs font-medium text-slate-400 bg-slate-900 px-2 py-1 rounded">
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>
      </div>
      
      <div className="flex gap-2 mb-3 flex-wrap">
        <RiskBadge type="severity" value={event.severity_label} />
        <RiskBadge type="priority" value={event.action_priority} />
      </div>

      <div className="text-xs text-slate-400 mb-2">
        <div className="flex justify-between">
          <span>Risk Score:</span>
          <span className="font-bold text-slate-200">{event.risk_score}/100</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Road:</span>
          <span className="text-slate-300">{event.road_type}</span>
        </div>
      </div>
      
      {event.image_data && (
        <img 
          src={`data:image/jpeg;base64,${event.image_data}`} 
          alt="Detection snapshot" 
          className="w-full h-32 object-cover rounded-lg border border-slate-700"
        />
      )}
    </div>
  );
};

export default PotholeCard;
