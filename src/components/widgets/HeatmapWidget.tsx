import { useState } from 'react';
import { HeatmapStock } from '../../types';
import { Layers, Info, Cpu, Flame, Building2, X } from 'lucide-react';

interface HeatmapWidgetProps {
  stocks: HeatmapStock[];
  flashTickers: Set<string>;
}

export function HeatmapWidget({ stocks, flashTickers }: HeatmapWidgetProps) {
  const [selectedSector, setSelectedSector] = useState<'All' | 'AI & Semiconductors' | 'Energy' | 'Financials'>('All');
  const [selectedStock, setSelectedStock] = useState<HeatmapStock | null>(null);
  const [viewMode, setViewMode] = useState<'proportional' | 'compact'>('proportional');

  const filteredStocks = stocks.filter((s) => {
    if (selectedSector === 'All') return true;
    return s.sector === selectedSector;
  });

  // Calculate sector summaries
  const sectorSummary = {
    ai: stocks.filter((s) => s.sector === 'AI & Semiconductors'),
    energy: stocks.filter((s) => s.sector === 'Energy'),
    financials: stocks.filter((s) => s.sector === 'Financials'),
  };

  const getAvgChange = (list: HeatmapStock[]) => {
    if (!list.length) return 0;
    const sum = list.reduce((acc, s) => acc + s.changePercent, 0);
    return sum / list.length;
  };

  return (
    <div className="space-y-3 font-mono">
      {/* Top filter and view controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pb-2 border-b border-neutral-800/80">
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
          <button
            onClick={() => setSelectedSector('All')}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              selectedSector === 'All'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ALL SECTORS
          </button>
          <button
            onClick={() => setSelectedSector('AI & Semiconductors')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
              selectedSector === 'AI & Semiconductors'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>AI & SEMIS ({getAvgChange(sectorSummary.ai) >= 0 ? '+' : ''}{getAvgChange(sectorSummary.ai).toFixed(2)}%)</span>
          </button>
          <button
            onClick={() => setSelectedSector('Energy')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
              selectedSector === 'Energy'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>ENERGY ({getAvgChange(sectorSummary.energy) >= 0 ? '+' : ''}{getAvgChange(sectorSummary.energy).toFixed(2)}%)</span>
          </button>
          <button
            onClick={() => setSelectedSector('Financials')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
              selectedSector === 'Financials'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Building2 className="w-3 h-3 text-indigo-400" />
            <span>FINANCIALS ({getAvgChange(sectorSummary.financials) >= 0 ? '+' : ''}{getAvgChange(sectorSummary.financials).toFixed(2)}%)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Color Scale Legend */}
          <div className="hidden lg:flex items-center gap-1 text-[9px] text-neutral-500">
            <span>-3%</span>
            <div className="flex h-2 w-16 rounded overflow-hidden">
              <span className="w-1/4 bg-rose-600" />
              <span className="w-1/4 bg-rose-900" />
              <span className="w-1/4 bg-emerald-950" />
              <span className="w-1/4 bg-emerald-500" />
            </div>
            <span>+3%</span>
          </div>

          <button
            onClick={() => setViewMode(viewMode === 'proportional' ? 'compact' : 'proportional')}
            className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 hover:text-neutral-100"
          >
            VIEW: {viewMode.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Heatmap Grid Display */}
      <div 
        className={`grid gap-2 transition-all ${
          viewMode === 'proportional'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 auto-rows-[82px]'
            : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 auto-rows-[64px]'
        }`}
      >
        {filteredStocks.map((stock) => {
          const isPos = stock.changePercent >= 0;
          const isFlashing = flashTickers.has(stock.ticker);
          const abs = Math.abs(stock.changePercent);

          // Calculate color styling
          let bgClass = '';
          let borderClass = '';
          if (isPos) {
            if (abs >= 3.0) {
              bgClass = 'bg-emerald-500/35 text-emerald-200';
              borderClass = 'border-emerald-500/80';
            } else if (abs >= 1.5) {
              bgClass = 'bg-emerald-600/25 text-emerald-300';
              borderClass = 'border-emerald-600/60';
            } else {
              bgClass = 'bg-emerald-950/40 text-emerald-400';
              borderClass = 'border-emerald-800/40';
            }
          } else {
            if (abs >= 3.0) {
              bgClass = 'bg-rose-600/35 text-rose-200';
              borderClass = 'border-rose-500/80';
            } else if (abs >= 1.5) {
              bgClass = 'bg-rose-700/25 text-rose-300';
              borderClass = 'border-rose-600/60';
            } else {
              bgClass = 'bg-rose-950/40 text-rose-400';
              borderClass = 'border-rose-800/40';
            }
          }

          // Span larger if mega-cap in proportional mode
          const isMegaCap = viewMode === 'proportional' && stock.marketCap >= 1000;
          const isLargeCap = viewMode === 'proportional' && stock.marketCap >= 400 && stock.marketCap < 1000;

          return (
            <div
              key={stock.ticker}
              onClick={() => setSelectedStock(stock)}
              className={`relative rounded p-2 border cursor-pointer select-none flex flex-col justify-between transition-all duration-150 hover:scale-[1.02] hover:z-10 hover:shadow-lg ${bgClass} ${borderClass} ${
                isMegaCap ? 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2' : isLargeCap ? 'col-span-1 sm:col-span-2 row-span-1' : ''
              } ${isFlashing ? 'ring-2 ring-white/70' : ''}`}
            >
              <div className="flex items-start justify-between">
                <span className={`font-bold tracking-wider text-white ${isMegaCap ? 'text-lg' : 'text-xs'}`}>
                  {stock.ticker}
                </span>
                <span className="text-[9px] text-neutral-400 opacity-80">
                  ${stock.marketCap >= 1000 ? `${(stock.marketCap / 1000).toFixed(1)}T` : `${stock.marketCap}B`}
                </span>
              </div>

              <div className="text-[10px] text-neutral-300/80 truncate">
                {stock.company}
              </div>

              <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-white/5">
                <span className={`font-bold font-mono ${isMegaCap ? 'text-base' : 'text-xs'}`}>
                  ${stock.price.toFixed(2)}
                </span>
                <span className={`font-bold text-[10px] ${isPos ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isPos ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Fundamentals Detail Modal / Panel */}
      {selectedStock && (
        <div className="p-3 bg-[#0d1419] border border-neutral-700 rounded-md text-xs relative">
          <button
            onClick={() => setSelectedStock(null)}
            className="absolute top-2 right-2 text-neutral-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-2 pb-2 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white">{selectedStock.ticker}</span>
                <span className="text-neutral-400 font-semibold">{selectedStock.company}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {selectedStock.sector}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-sm font-bold text-white">${selectedStock.price.toFixed(2)}</span>
              <span
                className={`font-bold ${
                  selectedStock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div className="bg-neutral-900/60 p-1.5 rounded border border-neutral-800">
              <div className="text-neutral-500">MARKET CAP</div>
              <div className="font-bold text-neutral-200">${selectedStock.marketCap} Billion</div>
            </div>
            <div className="bg-neutral-900/60 p-1.5 rounded border border-neutral-800">
              <div className="text-neutral-500">P/E RATIO</div>
              <div className="font-bold text-neutral-200">{selectedStock.peRatio}x</div>
            </div>
            <div className="bg-neutral-900/60 p-1.5 rounded border border-neutral-800">
              <div className="text-neutral-500">SESSION VOLUME</div>
              <div className="font-bold text-neutral-200">{selectedStock.volume}</div>
            </div>
            <div className="bg-neutral-900/60 p-1.5 rounded border border-neutral-800">
              <div className="text-neutral-500">52-WEEK RANGE</div>
              <div className="font-bold text-neutral-200">${selectedStock.low52w} - ${selectedStock.high52w}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
