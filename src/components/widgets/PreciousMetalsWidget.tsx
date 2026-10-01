import { useState } from 'react';
import { CommodityMetal } from '../../types';
import { Sparkles, ArrowUpRight, ArrowDownRight, Scale, Gauge } from 'lucide-react';

interface PreciousMetalsWidgetProps {
  metals: CommodityMetal[];
  flashSymbols: Set<string>;
}

export function PreciousMetalsWidget({ metals, flashSymbols }: PreciousMetalsWidgetProps) {
  const [filterCategory, setFilterCategory] = useState<'All' | 'Metals' | 'Energy'>('All');

  const filtered = metals.filter((m) => {
    if (filterCategory === 'All') return true;
    return m.category === filterCategory;
  });

  const gold = metals.find((m) => m.symbol === 'XAU/USD')?.last || 2658.65;
  const silver = metals.find((m) => m.symbol === 'XAG/USD')?.last || 31.44;
  const platinum = metals.find((m) => m.symbol === 'XPT/USD')?.last || 995.50;
  const goldSilverRatio = silver > 0 ? (gold / silver).toFixed(2) : '84.50';
  const platinumGoldRatio = gold > 0 ? (platinum / gold).toFixed(3) : '0.374';

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Top Ratios & Filters Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800/80">
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
          {(['All', 'Metals', 'Energy'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                filterCategory === cat
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Global Key Commodity Ratios */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0d141a] border border-neutral-800 text-[10px]">
            <Scale className="w-3 h-3 text-amber-400" />
            <span className="text-neutral-400">GOLD/SILVER RATIO:</span>
            <span className="font-bold text-amber-300">{goldSilverRatio}x</span>
            <span className="text-neutral-600">|</span>
            <span className="text-neutral-400">Pt/Au:</span>
            <span className="font-bold text-neutral-300">{platinumGoldRatio}</span>
          </div>
        </div>
      </div>

      {/* Metals & Commodities Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px] border-collapse">
          <thead>
            <tr className="text-neutral-500 text-[10px] border-b border-neutral-800 uppercase tracking-wider">
              <th className="py-1.5 px-2">ASSET / PAIR</th>
              <th className="py-1.5 px-2 text-right">BID</th>
              <th className="py-1.5 px-2 text-right">ASK</th>
              <th className="py-1.5 px-2 text-right">SPREAD</th>
              <th className="py-1.5 px-2 text-right">LAST</th>
              <th className="py-1.5 px-2 text-right">24H %</th>
              <th className="py-1.5 px-2 text-center">24H RANGE</th>
              <th className="py-1.5 px-2 text-right">TREND</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {filtered.map((m) => {
              const isPos = m.changePercent >= 0;
              const isFlashing = flashSymbols.has(m.symbol);
              const spread = Math.abs(m.ask - m.bid);
              const spreadFormatted = spread < 1 ? spread.toFixed(3) : spread.toFixed(2);

              const rangeDiff = m.high24h - m.low24h;
              const rangePct = rangeDiff > 0
                ? Math.min(Math.max(((m.last - m.low24h) / rangeDiff) * 100, 5), 95)
                : 50;

              return (
                <tr
                  key={m.symbol}
                  className={`hover:bg-neutral-800/30 transition-colors ${
                    isFlashing ? (isPos ? 'bg-emerald-950/40' : 'bg-rose-950/40') : ''
                  }`}
                >
                  {/* Symbol & Name */}
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-100">{m.symbol}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-400">
                        {m.unit}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400">{m.name}</div>
                  </td>

                  {/* Bid */}
                  <td className="py-2 px-2 text-right text-neutral-300 font-mono">
                    {m.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </td>

                  {/* Ask */}
                  <td className="py-2 px-2 text-right text-neutral-300 font-mono">
                    {m.ask.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </td>

                  {/* Spread */}
                  <td className="py-2 px-2 text-right text-neutral-500 font-mono text-[10px]">
                    {spreadFormatted}
                  </td>

                  {/* Last Price */}
                  <td className="py-2 px-2 text-right font-bold text-white font-mono">
                    ${m.last.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                  </td>

                  {/* 24h % */}
                  <td className="py-2 px-2 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isPos
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isPos ? '+' : ''}{m.changePercent.toFixed(2)}%
                    </span>
                  </td>

                  {/* 24H Range Bar */}
                  <td className="py-2 px-2 text-center min-w-[110px]">
                    <div className="flex items-center justify-between text-[9px] text-neutral-500 mb-0.5 font-mono">
                      <span>{m.low24h.toFixed(1)}</span>
                      <span>{m.high24h.toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 relative">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isPos ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${rangePct}%` }}
                      />
                    </div>
                  </td>

                  {/* Sparkline */}
                  <td className="py-2 px-2 text-right w-20">
                    <svg className="w-18 h-5 inline-block overflow-visible" viewBox="0 0 54 20">
                      {renderSparkline(m.sparkline, isPos)}
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

  const pts = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * 52 + 1;
      const y = 18 - ((val - min) / range) * 16;
      return `${x},${y}`;
    })
    .join(' ');

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
        cx={((points.length - 1) / (points.length - 1)) * 52 + 1}
        cy={18 - ((points[points.length - 1] - min) / range) * 16}
        r="2"
        fill={strokeColor}
      />
    </>
  );
}
