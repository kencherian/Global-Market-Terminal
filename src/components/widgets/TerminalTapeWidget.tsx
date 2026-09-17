import { useState } from 'react';
import { TerminalAlert } from '../../types';
import { Terminal, Shield, Zap, Pause, Play, Trash2 } from 'lucide-react';

interface TerminalTapeWidgetProps {
  alerts: TerminalAlert[];
  onClearAlerts: () => void;
}

export function TerminalTapeWidget({ alerts, onClearAlerts }: TerminalTapeWidgetProps) {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'ORDER' | 'SPIKE' | 'INFO'>('ALL');
  const [isFrozen, setIsFrozen] = useState(false);

  const filtered = alerts.filter((a) => {
    if (filterLevel === 'ALL') return true;
    if (filterLevel === 'ORDER') return a.level === 'NOTICE';
    if (filterLevel === 'SPIKE') return a.level === 'SPIKE';
    return a.level === 'INFO';
  });

  return (
    <div className="space-y-2 font-mono text-xs">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-neutral-800/80">
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
          {(['ALL', 'ORDER', 'SPIKE', 'INFO'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                filterLevel === lvl
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] ${
              isFrozen ? 'bg-amber-950/50 border-amber-600 text-amber-300' : 'bg-neutral-900 border-neutral-800 text-neutral-400'
            }`}
          >
            {isFrozen ? <Play className="w-2.5 h-2.5" /> : <Pause className="w-2.5 h-2.5" />}
            <span>{isFrozen ? 'RESUME' : 'FREEZE'}</span>
          </button>
          <button
            onClick={onClearAlerts}
            className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400"
            title="Clear Log"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal log output */}
      <div className="h-44 overflow-y-auto bg-black/70 border border-neutral-800 rounded p-2 text-[11px] font-mono space-y-1">
        {filtered.length === 0 ? (
          <div className="text-neutral-600 py-4 text-center">NO TICKS IN CURRENT FILTER BUFFER</div>
        ) : (
          filtered.slice(0, 40).map((a) => {
            let color = 'text-neutral-300';
            let badgeColor = 'bg-neutral-800 text-neutral-400';
            if (a.level === 'SPIKE') {
              color = 'text-emerald-300 font-bold';
              badgeColor = 'bg-emerald-950 text-emerald-400 border border-emerald-800';
            } else if (a.level === 'NOTICE') {
              color = 'text-cyan-300';
              badgeColor = 'bg-cyan-950 text-cyan-400 border border-cyan-800';
            } else if (a.level === 'WARNING') {
              color = 'text-amber-300 font-bold';
              badgeColor = 'bg-amber-950 text-amber-400 border border-amber-800';
            }

            return (
              <div key={a.id} className="flex items-start gap-2 hover:bg-neutral-900/50 px-1 py-0.5 rounded transition-colors">
                <span className="text-neutral-500 shrink-0 text-[10px]">{a.timestamp}</span>
                <span className={`text-[9px] px-1 py-0.2 rounded shrink-0 ${badgeColor}`}>
                  {a.source}
                </span>
                <span className={`break-all ${color}`}>{a.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
