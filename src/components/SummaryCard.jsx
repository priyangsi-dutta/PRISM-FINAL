import React from 'react';

export default function SummaryCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendPositive = true,
  badge,
  badgeVariant = 'default',
  className = '',
}) {
  const badgeStyles = {
    default: 'bg-navy-750 text-slate-300 border-navy-600',
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    electric: 'bg-electric-500/10 text-electric-400 border-electric-500/30',
  }[badgeVariant] || 'bg-navy-750 text-slate-300 border-navy-600';

  return (
    <div
      className={`bg-navy-850 hover:bg-navy-800/90 border border-navy-700/70 hover:border-navy-600 rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-medium text-slate-400 tracking-wide uppercase font-mono">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-navy-900 border border-navy-700/60 flex items-center justify-center text-electric-400 flex-shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 mt-1">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
        {badge && (
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${badgeStyles}`}>
            {badge}
          </span>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-2.5 pt-2.5 border-t border-navy-750/80 flex items-center justify-between text-xs text-slate-400">
          {subtext && <span className="truncate">{subtext}</span>}
          {trend && (
            <span
              className={`font-mono font-medium ${
                trendPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

