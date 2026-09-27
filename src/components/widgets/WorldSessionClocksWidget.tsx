import { WorldClockSession } from '../../types';
import { Clock, Globe, ShieldAlert } from 'lucide-react';

interface WorldSessionClocksWidgetProps {
  sessions: WorldClockSession[];
  utcHours: number; // e.g. 14.5
}

export function WorldSessionClocksWidget({ sessions, utcHours }: WorldSessionClocksWidgetProps) {
  const activeCount = sessions.filter((s) => s.status === 'OPEN').length;

  return (
    <div className="space-y-3">
      {/* Top summary row */}
      <div className="flex items-center justify-between text-[11px] font-mono pb-1 border-b border-neutral-800/80">
        <div className="flex items-center gap-2 text-neutral-400">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>ACTIVE EXCHANGES:</span>
          <span className="font-bold text-emerald-400">{activeCount} / {sessions.length}</span>
        </div>
        <div className="text-[10px] text-neutral-500">
          GLOBAL 24H SYNCHRONIZATION
        </div>
      </div>

      {/* 24-Hour Visual Session Overlap Ribbon */}
      <div className="bg-[#05080a] border border-neutral-800/80 rounded p-2.5">
        <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 mb-1">
          <span>00:00 UTC (ASIA)</span>
          <span>08:00 (EUROPE)</span>
          <span>14:00 (NY)</span>
          <span>20:00</span>
          <span>24:00 UTC</span>
        </div>

        {/* Timeline track container */}
        <div className="relative h-20 bg-neutral-950 rounded border border-neutral-900 overflow-hidden flex flex-col justify-around py-1 px-0.5">
          {/* Current UTC Time Marker Line */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 shadow-[0_0_8px_#10b981] z-20 pointer-events-none"
            style={{ left: `${Math.min(Math.max((utcHours / 24) * 100, 0), 100)}%` }}
          >
            <div className="absolute -top-1 -translate-x-1/2 bg-emerald-400 text-[8px] text-black font-bold px-1 rounded-xs">
              NOW
            </div>
          </div>

          {/* Individual market session bars */}
          {sessions.map((s) => {
            const startPct = (s.openUtcHour / 24) * 100;
            let widthPct = 0;
            if (s.closeUtcHour > s.openUtcHour) {
              widthPct = ((s.closeUtcHour - s.openUtcHour) / 24) * 100;
            } else {
              // cross midnight
              widthPct = ((24 - s.openUtcHour + s.closeUtcHour) / 24) * 100;
            }

            const isOpen = s.status === 'OPEN';
            return (
              <div key={s.id} className="relative h-2.5 w-full">
                <div 
                  className={`absolute top-0 bottom-0 rounded-xs text-[8px] flex items-center px-1.5 font-mono overflow-hidden transition-all ${
                    isOpen 
                      ? 'bg-emerald-500/30 border border-emerald-500 text-emerald-200 font-semibold' 
                      : 'bg-neutral-800/50 border border-neutral-700/50 text-neutral-400'
                  }`}
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                >
                  <span className="truncate">{s.city}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of Clock Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {sessions.map((s) => {
          const isOpen = s.status === 'OPEN';
          const isPre = s.status === 'PRE-MARKET';

          return (
            <div
              key={s.id}
              className={`p-2.5 rounded border transition-all ${
                isOpen
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.08)]'
                  : isPre
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-[#080d11] border-neutral-800/80 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{s.flag}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    isOpen
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isPre
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <div className="font-bold text-neutral-200 text-xs font-mono truncate">
                {s.city}
              </div>
              
              <div className="text-[10px] text-neutral-400 font-mono truncate mb-1">
                {s.exchange}
              </div>

              <div className="text-base font-bold font-mono text-emerald-300 tracking-wider">
                {s.localTime}
              </div>

              <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-neutral-400 pt-1 border-t border-neutral-800/60">
                <span>{s.hoursUntilEvent}</span>
                <span className="text-neutral-500">UTC{s.utcOffset >= 0 ? `+${s.utcOffset}` : s.utcOffset}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
