import React from 'react';

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    dot: 'bg-red-500',
    label: 'Critical',
  },
  HIGH: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    dot: 'bg-orange-500',
    label: 'High',
  },
  MEDIUM: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
    label: 'Medium',
  },
  LOW: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'Low',
  },
  INFO: {
    bg: 'bg-electric-500/10',
    border: 'border-electric-500/30',
    text: 'text-electric-400',
    dot: 'bg-electric-500',
    label: 'Info',
  },
};

export default function SeverityBadge({ severity = 'MEDIUM', size = 'md', showDot = true, className = '' }) {
  const normalized = String(severity).toUpperCase();
  const config = SEVERITY_CONFIG[normalized] || SEVERITY_CONFIG.MEDIUM;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wide',
    lg: 'text-sm px-3 py-1.5 font-bold tracking-wider',
  }[size] || 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${config.bg} ${config.border} ${config.text} ${sizeClasses} uppercase ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      )}
      <span>{config.label}</span>
    </span>
  );
}

