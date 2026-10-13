import React from 'react';

export default function RiskDistributionBar({ distribution = [] }) {
  const total = distribution.reduce((sum, item) => sum + (item.count || 0), 0) || 1;

  return (
    <div className="space-y-3">
      {/* Segmented bar */}
      <div className="h-3 w-full bg-navy-950 rounded-full overflow-hidden flex p-0.5 border border-navy-700/60">
        {distribution.map((item, idx) => {
          const widthPercent = ((item.count || 0) / total) * 100;
          if (widthPercent === 0) return null;
          return (
            <div
              key={item.level || idx}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: item.color,
              }}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 relative group"
              title={`${item.level}: ${item.count} PRs (${Math.round(widthPercent)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs font-mono">
        {distribution.map((item) => (
          <div key={item.level} className="flex items-center gap-2 bg-navy-900/50 p-2 rounded-lg border border-navy-700/40">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="truncate">
              <span className="text-slate-400 block text-[11px] truncate">{item.level}</span>
              <span className="text-slate-200 font-semibold">{item.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

