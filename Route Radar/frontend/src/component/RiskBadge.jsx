import React from 'react';

const RiskBadge = ({ type, value }) => {
  let colorClass = "bg-slate-700 text-slate-300";
  
  if (type === "severity") {
    switch (value) {
      case "CRITICAL": colorClass = "bg-red-900/50 text-red-400 border border-red-700"; break;
      case "HIGH": colorClass = "bg-orange-900/50 text-orange-400 border border-orange-700"; break;
      case "MODERATE": colorClass = "bg-yellow-900/50 text-yellow-400 border border-yellow-700"; break;
      case "LOW": colorClass = "bg-green-900/50 text-green-400 border border-green-700"; break;
    }
  } else if (type === "priority") {
    switch (value) {
      case "IMMEDIATE": colorClass = "bg-red-600 text-white font-bold animate-pulse"; break;
      case "PRIORITIZE": colorClass = "bg-orange-600 text-white"; break;
      case "SCHEDULE": colorClass = "bg-blue-600 text-white"; break;
      case "MONITOR": colorClass = "bg-slate-600 text-white"; break;
    }
  }

  return (
    <span className={`px-2 py-1 text-xs rounded-md ${colorClass}`}>
      {value}
    </span>
  );
};

export default RiskBadge;
