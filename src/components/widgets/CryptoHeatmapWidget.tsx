import { useState, useMemo } from 'react';
import { CryptoAsset, CryptoCategory, TerminalTheme } from '../../types';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Layers, 
  Radio, 
  X, 
  Clock, 
  Filter, 
  Flame, 
  Cpu, 
  Boxes, 
  Coins, 
  Grid3X3,
  Network
} from 'lucide-react';

interface CryptoHeatmapWidgetProps {
  assets: CryptoAsset[];
  flashSymbols: Set<string>;
  onBroadcastAlert?: (alert: { level: 'INFO' | 'NOTICE' | 'SPIKE' | 'WARNING'; source: string; text: string }) => void;
  theme?: TerminalTheme;
}

type TimeframeOption = '1H' | '24H' | '7D';
type LayoutMode = 'treemap' | 'sectors' | 'grid';

export function CryptoHeatmapWidget({
  assets,
  flashSymbols,
  onBroadcastAlert,
  theme = 'deep-space',
}: CryptoHeatmapWidgetProps) {
  const isLight = theme === 'financial-paper';

  const [timeframe, setTimeframe] = useState<TimeframeOption>('24H');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | CryptoCategory>('ALL');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('treemap');
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
  const [broadcastedSymbol, setBroadcastedSymbol] = useState<string | null>(null);

  // Helper to retrieve percentage change by timeframe
  const getChange = (asset: CryptoAsset): number => {
    switch (timeframe) {
      case '1H':
        return asset.change1h;
      case '7D':
        return asset.change7d;
      case '24H':
      default:
        return asset.change24h;
    }
  };

  // Helper to format crypto price
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    }
    if (price >= 0.001) {
      return `$${price.toFixed(4)}`;
    }
    return `$${price.toFixed(8)}`;
  };

  // Calculate sector aggregate performances
  const sectorAggregates = useMemo(() => {
    const categories: CryptoCategory[] = ['L1', 'DeFi', 'AI & Data', 'L2', 'Memes', 'Infrastructure'];
    return categories.map((cat) => {
      const catAssets = assets.filter((a) => a.category === cat);
      if (!catAssets.length) return { category: cat, avgChange: 0, count: 0 };
      const avg = catAssets.reduce((sum, a) => sum + getChange(a), 0) / catAssets.length;
      return { category: cat, avgChange: avg, count: catAssets.length };
    });
  }, [assets, timeframe]);

  // Color generator based on change %
  const getBlockColorStyles = (pct: number) => {
    if (isLight) {
      // Financial Paper High-Contrast Palette
      if (pct >= 6) {
        return {
          bg: 'bg-emerald-600',
          border: 'border-emerald-700',
          text: 'text-white',
          subtext: 'text-emerald-100',
        };
      }
      if (pct >= 2) {
        return {
          bg: 'bg-emerald-500',
          border: 'border-emerald-600',
          text: 'text-white',
          subtext: 'text-emerald-100',
        };
      }
      if (pct > 0) {
        return {
          bg: 'bg-emerald-100',
          border: 'border-emerald-300',
          text: 'text-emerald-900',
          subtext: 'text-emerald-700',
        };
      }
      if (pct === 0) {
        return {
          bg: 'bg-neutral-200',
          border: 'border-neutral-300',
          text: 'text-neutral-800',
          subtext: 'text-neutral-600',
        };
      }
      if (pct > -2) {
        return {
          bg: 'bg-rose-100',
          border: 'border-rose-300',
          text: 'text-rose-900',
          subtext: 'text-rose-700',
        };
      }
      if (pct > -6) {
        return {
          bg: 'bg-rose-500',
          border: 'border-rose-600',
          text: 'text-white',
          subtext: 'text-rose-100',
        };
      }
      return {
        bg: 'bg-rose-700',
        border: 'border-rose-800',
        text: 'text-white',
        subtext: 'text-rose-100',
      };
    }

    // Deep Space Dark Palette
    if (pct >= 6) {
      return {
        bg: 'bg-emerald-500/85 hover:bg-emerald-500',
        border: 'border-emerald-400',
        text: 'text-white font-extrabold',
        subtext: 'text-emerald-100',
      };
    }
    if (pct >= 2) {
      return {
        bg: 'bg-emerald-700/80 hover:bg-emerald-700',
        border: 'border-emerald-600/80',
        text: 'text-emerald-50 font-bold',
        subtext: 'text-emerald-200',
      };
    }
    if (pct > 0) {
      return {
        bg: 'bg-emerald-950/75 hover:bg-emerald-950/90',
        border: 'border-emerald-800/60',
        text: 'text-emerald-300 font-bold',
        subtext: 'text-emerald-400/80',
      };
    }
    if (pct === 0) {
      return {
        bg: 'bg-neutral-900 hover:bg-neutral-850',
        border: 'border-neutral-700',
        text: 'text-neutral-300',
        subtext: 'text-neutral-500',
      };
    }
    if (pct > -2) {
      return {
        bg: 'bg-rose-950/75 hover:bg-rose-950/90',
        border: 'border-rose-800/60',
        text: 'text-rose-300 font-bold',
        subtext: 'text-rose-400/80',
      };
    }
    if (pct > -6) {
      return {
        bg: 'bg-rose-700/80 hover:bg-rose-700',
        border: 'border-rose-600/80',
        text: 'text-rose-50 font-bold',
        subtext: 'text-rose-200',
      };
    }
    return {
      bg: 'bg-rose-500/85 hover:bg-rose-500',
      border: 'border-rose-400',
      text: 'text-white font-extrabold',
      subtext: 'text-rose-100',
    };
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    if (selectedCategory === 'ALL') return assets;
    return assets.filter((a) => a.category === selectedCategory);
  }, [assets, selectedCategory]);

  // Broadcast to tape
  const handleBroadcastTape = (asset: CryptoAsset) => {
    if (!onBroadcastAlert) return;
    const chg = getChange(asset);
    const level = Math.abs(chg) > 8 ? 'SPIKE' : 'NOTICE';
    onBroadcastAlert({
      level,
      source: `HEATMAP::${asset.symbol}`,
      text: `HEATMAP PULSE // ${asset.name} (${asset.symbol}) [${asset.category}] ${timeframe}: ${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% | Last: ${formatPrice(asset.price)} | Vol: ${asset.volume24h}`,
    });
    setBroadcastedSymbol(asset.symbol);
    setTimeout(() => setBroadcastedSymbol(null), 1800);
  };

  // Render an individual coin block
  const renderCoinBlock = (asset: CryptoAsset, customClass: string = '') => {
    const chg = getChange(asset);
    const isFlashing = flashSymbols.has(asset.symbol);
    const styles = getBlockColorStyles(chg);

    return (
      <div
        key={asset.symbol}
        onClick={() => setSelectedAsset(asset)}
        className={`relative rounded border p-2 flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden select-none group ${styles.bg} ${styles.border} ${
          isFlashing ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-[1.01] z-10' : ''
        } ${customClass}`}
      >
        {/* Top: Symbol & Category */}
        <div className="flex items-start justify-between gap-1">
          <div className="truncate">
            <span className={`font-mono text-sm tracking-tight ${styles.text}`}>
              {asset.symbol}
            </span>
            <div className={`text-[9px] font-sans truncate opacity-85 ${styles.subtext}`}>
              {asset.name}
            </div>
          </div>
          <span className="text-[8px] px-1 py-0.2 rounded bg-black/30 backdrop-blur-xs font-mono font-semibold text-white/80 shrink-0">
            #{asset.marketCapRank}
          </span>
        </div>

        {/* Bottom: Price & % Change */}
        <div className="mt-1 flex items-baseline justify-between gap-1">
          <span className={`text-[10px] font-mono font-semibold truncate ${styles.subtext}`}>
            {formatPrice(asset.price)}
          </span>
          <span className={`text-xs font-mono font-black shrink-0 flex items-center ${styles.text}`}>
            {chg >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
            {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5 font-mono text-[11px]">
      {/* Sector Performance Quick Summary Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-none">
        <span className="text-neutral-500 font-bold uppercase shrink-0 mr-0.5">SECTORS:</span>
        {sectorAggregates.map((s) => (
          <button
            key={s.category}
            onClick={() => setSelectedCategory(selectedCategory === s.category ? 'ALL' : s.category)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors shrink-0 ${
              selectedCategory === s.category
                ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 font-bold'
                : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>{s.category}</span>
            <span className={`font-bold ${s.avgChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {s.avgChange >= 0 ? '+' : ''}{s.avgChange.toFixed(1)}%
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar: Category Filters, Timeframe Switcher, Layout Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-neutral-950 rounded border border-neutral-800 text-[10px]">
        {/* Left: Category Filters */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-neutral-500 font-bold mr-1">FILTER:</span>
          {(['ALL', 'L1', 'DeFi', 'AI & Data', 'L2', 'Memes', 'Infrastructure'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-1.5 py-0.5 rounded font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Right: Timeframe [1H, 24H, 7D] & Layout Mode */}
        <div className="flex items-center gap-2">
          {/* Timeframe Toggle */}
          <div className="flex items-center border border-neutral-800 bg-black/40 rounded overflow-hidden">
            {(['1H', '24H', '7D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 font-bold transition-colors ${
                  timeframe === tf
                    ? 'bg-cyan-500/25 text-cyan-300 border-x border-cyan-500/40'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Layout Mode Selector */}
          <div className="flex items-center border border-neutral-800 bg-black/40 rounded overflow-hidden">
            <button
              onClick={() => setLayoutMode('treemap')}
              className={`px-2 py-0.5 transition-colors ${
                layoutMode === 'treemap'
                  ? 'bg-neutral-800 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Market Dominance Proportional Treemap"
            >
              DOMINANCE
            </button>
            <button
              onClick={() => setLayoutMode('sectors')}
              className={`px-2 py-0.5 transition-colors ${
                layoutMode === 'sectors'
                  ? 'bg-neutral-800 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Grouped by Sector Blocks"
            >
              BY SECTOR
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`px-2 py-0.5 transition-colors ${
                layoutMode === 'grid'
                  ? 'bg-neutral-800 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Uniform High-Density Grid"
            >
              GRID
            </button>
          </div>
        </div>
      </div>

      {/* Main Heatmap Canvas */}
      {layoutMode === 'treemap' && (
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {/* BTC: Anchor Market Leader (Occupies 2x2 on large screens) */}
          {filteredAssets.find((a) => a.symbol === 'BTC') && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 min-h-[160px] sm:min-h-[180px]">
              {renderCoinBlock(
                filteredAssets.find((a) => a.symbol === 'BTC')!,
                'h-full shadow-lg'
              )}
            </div>
          )}

          {/* ETH: Second Dominant Anchor (Occupies 2x1 or 2x2) */}
          {filteredAssets.find((a) => a.symbol === 'ETH') && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 min-h-[160px] sm:min-h-[180px]">
              {renderCoinBlock(
                filteredAssets.find((a) => a.symbol === 'ETH')!,
                'h-full shadow-lg'
              )}
            </div>
          )}

          {/* Secondary Tier: SOL, BNB, SUI, TAO, DOGE */}
          {filteredAssets
            .filter((a) => a.symbol !== 'BTC' && a.symbol !== 'ETH')
            .map((asset) => {
              const isMidCap = ['SOL', 'BNB', 'SUI', 'TAO', 'DOGE', 'PEPE'].includes(asset.symbol);
              const colClass = isMidCap 
                ? 'col-span-1 md:col-span-2 lg:col-span-2 min-h-[100px]' 
                : 'col-span-1 min-h-[90px]';

              return (
                <div key={asset.symbol} className={colClass}>
                  {renderCoinBlock(asset, 'h-full')}
                </div>
              );
            })}
        </div>
      )}

      {/* Grouped By Sector Layout */}
      {layoutMode === 'sectors' && (
        <div className="space-y-3">
          {(['L1', 'DeFi', 'AI & Data', 'L2', 'Memes', 'Infrastructure'] as const).map((sector) => {
            const sectorAssets = filteredAssets.filter((a) => a.category === sector);
            if (!sectorAssets.length) return null;

            const avg = sectorAssets.reduce((sum, a) => sum + getChange(a), 0) / sectorAssets.length;

            return (
              <div key={sector} className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded space-y-2">
                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-neutral-900">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-xs">{sector.toUpperCase()}</span>
                    <span className="text-neutral-500">({sectorAssets.length} assets)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-500">SECTOR AVG:</span>
                    <span className={`font-bold ${avg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {avg >= 0 ? '+' : ''}{avg.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {sectorAssets.map((asset) => renderCoinBlock(asset, 'min-h-[85px]'))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* High-Density Uniform Grid Layout */}
      {layoutMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filteredAssets.map((asset) => renderCoinBlock(asset, 'min-h-[85px]'))}
        </div>
      )}

      {/* Color Scale Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-500">
        <div className="flex items-center gap-1.5">
          <span>SCALE:</span>
          <span className="text-rose-400 font-bold">&le; -6%</span>
          <div className="flex h-2.5 w-32 rounded overflow-hidden border border-neutral-800">
            <span className="w-1/6 bg-rose-600" />
            <span className="w-1/6 bg-rose-800" />
            <span className="w-1/6 bg-rose-950" />
            <span className="w-1/6 bg-emerald-950" />
            <span className="w-1/6 bg-emerald-800" />
            <span className="w-1/6 bg-emerald-500" />
          </div>
          <span className="text-emerald-400 font-bold">&ge; +6%</span>
        </div>

        <div className="text-[9px] text-neutral-500">
          Click any coin block to open detailed inspection & broadcast tape
        </div>
      </div>

      {/* Selected Coin Detailed Inspection Popover */}
      {selectedAsset && (
        <div className="p-3 bg-neutral-950 border border-neutral-700 rounded-lg shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">
                {selectedAsset.name} ({selectedAsset.symbol})
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                {selectedAsset.category}
              </span>
              <span className="text-[9px] text-neutral-400">
                RANK #{selectedAsset.marketCapRank}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onBroadcastAlert && (
                <button
                  onClick={() => handleBroadcastTape(selectedAsset)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                    broadcastedSymbol === selectedAsset.symbol
                      ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                      : 'bg-neutral-900 border-neutral-700 hover:border-cyan-500 text-neutral-300 hover:text-white'
                  }`}
                  title="Broadcast to Terminal Order Tape"
                >
                  <Radio className="w-3 h-3 text-cyan-400" />
                  <span>BROADCAST TAPE</span>
                </button>
              )}
              <button
                onClick={() => setSelectedAsset(null)}
                className="text-neutral-500 hover:text-white p-0.5 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-[10px]">
            <div>
              <span className="text-neutral-500 block">CURRENT PRICE</span>
              <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">
                {formatPrice(selectedAsset.price)}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">1H / 24H / 7D</span>
              <div className="flex items-center gap-1 mt-0.5 font-bold">
                <span className={selectedAsset.change1h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {selectedAsset.change1h >= 0 ? '+' : ''}{selectedAsset.change1h}%
                </span>
                <span className="text-neutral-600">/</span>
                <span className={selectedAsset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {selectedAsset.change24h >= 0 ? '+' : ''}{selectedAsset.change24h}%
                </span>
                <span className="text-neutral-600">/</span>
                <span className={selectedAsset.change7d >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {selectedAsset.change7d >= 0 ? '+' : ''}{selectedAsset.change7d}%
                </span>
              </div>
            </div>
            <div>
              <span className="text-neutral-500 block">24H RANGE</span>
              <div className="mt-0.5 text-neutral-300">
                {formatPrice(selectedAsset.low24h)} - {formatPrice(selectedAsset.high24h)}
              </div>
            </div>
            <div>
              <span className="text-neutral-500 block">24H TURNOVER</span>
              <span className="text-neutral-200 font-semibold mt-0.5 block">
                {selectedAsset.volume24h}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">MARKET CAPITALIZATION</span>
              <span className="text-neutral-200 font-semibold mt-0.5 block">
                {selectedAsset.marketCap}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
