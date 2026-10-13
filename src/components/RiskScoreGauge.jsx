import React from 'react';

export default function RiskScoreGauge({ score = 0, size = 120, strokeWidth = 10 }) {
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return { stroke: '#EF4444', text: 'text-red-400', label: 'CRITICAL RISK', glow: 'shadow-red-500/20' };
    if (s >= 60) return { stroke: '#F97316', text: 'text-orange-400', label: 'HIGH RISK', glow: 'shadow-orange-500/20' };
    if (s >= 35) return { stroke: '#EAB308', text: 'text-amber-400', label: 'MEDIUM RISK', glow: 'shadow-amber-500/20' };
    return { stroke: '#10B981', text: 'text-emerald-400', label: 'LOW RISK', glow: 'shadow-emerald-500/20' };
  };

  const { stroke, text, label } = getColor(normalizedScore);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#192339"
            strokeWidth={strokeWidth}
          />
          {/* Animated Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-3xl font-bold tracking-tight ${text}`}>
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
            / 100
          </span>
        </div>
      </div>
      <span className={`mt-2 text-xs font-mono font-semibold tracking-wider ${text}`}>
        {label}
      </span>
    </div>
  );
}

