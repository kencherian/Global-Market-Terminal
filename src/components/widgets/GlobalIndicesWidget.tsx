import { useState } from 'react';
import { MarketIndex } from '../../types';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Filter } from 'lucide-react';

interface GlobalIndicesWidgetProps {
  indices: MarketIndex[];
  flashSymbols: Set<string>;
}

export function GlobalIndicesWidget({ indices, flashSymbols }: GlobalIndicesWidgetProps) {
  const [selectedRegion, setSelectedRegion] = useState<'All' | 'Americas' | 'Europe' | 'Asia-Pacific'>('All');
  const [sortBy, setSortBy] = useState<'default' | 'changeDesc' | 'changeAsc'>('default');

  const filtered = indices.filter((idx) => {
    if (selectedRegion === 'All') return true;
    return idx.region === selectedRegion;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'changeDesc') return b.changePercent - a.changePercent;
    if (sortBy === 'changeAsc') return a.changePercent - b.changePercent;
    return 0;
  });

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono pb-2 border-b border-neutral-800/80">
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
          {(['All', 'Americas', 'Europe', 'Asia-Pacific'] as const).map((reg) => (
            <button
              key={reg}
              onClick={() => setSelectedRegion(reg)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                selectedRegion === reg
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {reg.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-neutral-500 text-[10px]">SORT:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] text-neutral-300 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="default">Default</option>
            <option value="changeDesc">Gainers First</option>
            <option value="changeAsc">Losers First</option>
          </select>
        </div>
      </div>

      {/* Indices Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px] border-collapse">
          <thead>
            <tr className="text-neutral-500 text-[10px] border-b border-neutral-800 uppercase tracking-wider">
              <th className="py-1.5 px-2">INDEX / REGION</th>
              <th className="py-1.5 px-2 text-right">LAST</th>
              <th className="py-1.5 px-2 text-right">NET CHG</th>
              <th className="py-1.5 px-2 text-right">% CHG</th>
              <th className="py-1.5 px-2 text-center">SESSION RANGE</th>
              <th className="py-1.5 px-2 text-right">TREND (7D)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {sorted.map((idx) => {
              const isPositive = idx.changePercent >= 0;
              const isFlashing = flashSymbols.has(idx.symbol);

              // Calculate range % for bar
              const rangeDiff = idx.dayHigh - idx.dayLow;
              const rangePct = rangeDiff > 0 
                ? Math.min(Math.max(((idx.price - idx.dayLow) / rangeDiff) * 100, 5), 95)
                : 50;

              return (
                <tr
                  key={idx.symbol}
                  className={`hover:bg-neutral-800/30 transition-colors ${
                    isFlashing ? (isPositive ? 'bg-emerald-950/40' : 'bg-rose-950/40') : ''
                  }`}
                >
                  {/* Symbol & Name */}
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-100">{idx.symbol}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400">
                        {idx.region}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate max-w-[130px]">
                      {idx.name}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-2 px-2 text-right font-bold text-neutral-100">
                    {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Net Change */}
                  <td className={`py-2 px-2 text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className="inline-flex items-center gap-0.5">
                      {isPositive ? '+' : ''}{idx.change.toFixed(2)}
                    </span>
                  </td>

                  {/* % Change */}
                  <td className="py-2 px-2 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isPositive 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isPositive ? '+' : ''}{idx.changePercent.toFixed(2)}%
                    </span>
                  </td>

                  {/* Day Range Bar */}
                  <td className="py-2 px-2 text-center min-w-[120px]">
                    <div className="flex items-center justify-between text-[9px] text-neutral-500 mb-0.5 font-mono">
                      <span>{idx.dayLow.toFixed(0)}</span>
                      <span>{idx.dayHigh.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${rangePct}%` }}
                      />
                    </div>
                  </td>

                  {/* Mini Sparkline SVG */}
                  <td className="py-2 px-2 text-right w-24">
                    <svg className="w-20 h-5 inline-block overflow-visible" viewBox="0 0 60 20">
                      {renderSparkline(idx.sparkline, isPositive)}
                    </svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderSparkline(points: number[], isPositive: boolean) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const strokeColor = isPositive ? '#10b981' : '#f43f5e';

  const pts = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * 58 + 1;
    const y = 18 - ((val - min) / range) * 16;
    return `${x},${y}`;
  }).join(' ');

  return (
    <>
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
      <circle
        cx={(points.length - 1) / (points.length - 1) * 58 + 1}
        cy={18 - ((points[points.length - 1] - min) / range) * 16}
        r="2"
        fill={strokeColor}
      />
    </>
  );
}
