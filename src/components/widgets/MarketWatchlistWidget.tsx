import { useState, useMemo, useRef, useEffect, type FormEvent } from 'react';
import { WatchlistAsset, WatchlistCategory } from '../../types';
import { MARKET_CATALOG_ASSETS, WATCHLIST_PRESETS } from '../../services/dataAdapter';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Search, 
  Trash2, 
  Sparkles, 
  Layers, 
  Radio, 
  TrendingUp, 
  TrendingDown, 
  X, 
  Check, 
  SlidersHorizontal,
  ChevronDown,
  Info
} from 'lucide-react';

interface MarketWatchlistWidgetProps {
  assets: WatchlistAsset[];
  flashSymbols: Set<string>;
  onAddAsset: (asset: WatchlistAsset) => void;
  onRemoveAsset: (symbol: string) => void;
  onResetAssets: (presetSymbols?: string[]) => void;
  onBroadcastAlert?: (alert: { level: 'INFO' | 'NOTICE' | 'SPIKE' | 'WARNING'; source: string; text: string }) => void;
  audioEnabled?: boolean;
}

export function MarketWatchlistWidget({
  assets,
  flashSymbols,
  onAddAsset,
  onRemoveAsset,
  onResetAssets,
  onBroadcastAlert,
}: MarketWatchlistWidgetProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | WatchlistCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'changeDesc' | 'changeAsc' | 'priceDesc' | 'priceAsc' | 'alpha'>('default');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [broadcastedSymbol, setBroadcastedSymbol] = useState<string | null>(null);

  // Modal custom ticker add state
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customCategory, setCustomCategory] = useState<WatchlistCategory>('Equities');
  const [customError, setCustomError] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowAddModal(false);
      }
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresetsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set of current symbols in watchlist for fast lookup
  const currentSymbolSet = useMemo(() => new Set(assets.map((a) => a.symbol.toUpperCase())), [assets]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = assets.length;
    let advancers = 0;
    let decliners = 0;
    let sumPercent = 0;

    assets.forEach((a) => {
      if (a.changePercent > 0) advancers++;
      else if (a.changePercent < 0) decliners++;
      sumPercent += a.changePercent;
    });

    const avgReturn = total > 0 ? sumPercent / total : 0;
    return {
      total,
      advancers,
      decliners,
      avgReturn,
      breadthRatio: total > 0 ? (advancers / total) * 100 : 50,
    };
  }, [assets]);

  // Filter & Sort
  const filteredAssets = useMemo(() => {
    let list = assets.filter((asset) => {
      // Category filter
      if (selectedCategory !== 'ALL' && asset.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const symbolMatch = asset.symbol.toLowerCase().includes(q);
        const nameMatch = asset.name.toLowerCase().includes(q);
        const catMatch = asset.category.toLowerCase().includes(q);
        return symbolMatch || nameMatch || catMatch;
      }
      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'changeDesc') return b.changePercent - a.changePercent;
      if (sortBy === 'changeAsc') return a.changePercent - b.changePercent;
      if (sortBy === 'priceDesc') return b.price - a.price;
      if (sortBy === 'priceAsc') return a.price - b.price;
      if (sortBy === 'alpha') return a.symbol.localeCompare(b.symbol);
      return 0;
    });
  }, [assets, selectedCategory, searchQuery, sortBy]);

  // Catalog items for the Add modal
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return MARKET_CATALOG_ASSETS;
    const q = catalogSearch.trim().toLowerCase();
    return MARKET_CATALOG_ASSETS.filter(
      (item) => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [catalogSearch]);

  // Handle adding custom ticker
  const handleAddCustom = (e: FormEvent) => {
    e.preventDefault();
    setCustomError('');

    const cleanSymbol = customSymbol.trim().toUpperCase();
    if (!cleanSymbol) {
      setCustomError('Please enter a valid ticker symbol');
      return;
    }

    if (currentSymbolSet.has(cleanSymbol)) {
      setCustomError(`${cleanSymbol} is already in your watchlist`);
      return;
    }

    const priceNum = parseFloat(customPrice);
    const finalPrice = !isNaN(priceNum) && priceNum > 0 ? priceNum : 100.0;
    const finalName = customName.trim() || `${cleanSymbol} Asset`;

    const newAsset: WatchlistAsset = {
      symbol: cleanSymbol,
      name: finalName,
      category: customCategory,
      price: finalPrice,
      change: 0.0,
      changePercent: 0.0,
      dayHigh: Math.round(finalPrice * 1.02 * 100) / 100,
      dayLow: Math.round(finalPrice * 0.98 * 100) / 100,
      volume: '1.2M',
      currency: 'USD',
      sparkline: [
        finalPrice * 0.98,
        finalPrice * 0.99,
        finalPrice * 0.985,
        finalPrice * 1.005,
        finalPrice * 0.995,
        finalPrice * 1.01,
        finalPrice,
      ],
      lastUpdated: new Date().toLocaleTimeString(),
    };

    onAddAsset(newAsset);
    setCustomSymbol('');
    setCustomName('');
    setCustomPrice('');
    setShowAddModal(false);
  };

  // Broadcast asset to terminal tape
  const handleBroadcast = (asset: WatchlistAsset) => {
    if (onBroadcastAlert) {
      const isUp = asset.changePercent >= 0;
      onBroadcastAlert({
        level: Math.abs(asset.changePercent) > 3 ? 'SPIKE' : 'NOTICE',
        source: `WATCH::${asset.symbol}`,
        text: `[WATCHLIST] ${asset.symbol} ($${asset.name}): ${formatPrice(asset.price, asset.category)} (${isUp ? '+' : ''}${asset.changePercent.toFixed(2)}%) • Vol: ${asset.volume}`,
      });
      setBroadcastedSymbol(asset.symbol);
      setTimeout(() => setBroadcastedSymbol(null), 1500);
    }
  };

  // Format price helper
  const formatPrice = (price: number, cat?: WatchlistCategory) => {
    if (cat === 'Forex' || price < 2) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-2.5 font-mono text-xs">
      {/* Top Banner: Quick Metrics & Action Controls */}
      <div className="bg-[#05080c] border border-neutral-800/80 rounded-md p-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Watchlist Breadth Summary */}
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-neutral-200">PORTFOLIO BREADTH:</span>
            <span className="text-cyan-400 font-extrabold">{metrics.total} ASSETS</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-neutral-400 border-l border-neutral-800 pl-2.5">
            <span className="text-emerald-400 font-bold">{metrics.advancers} ADV</span>
            <span>/</span>
            <span className="text-rose-400 font-bold">{metrics.decliners} DEC</span>
          </div>

          <div className="hidden md:flex items-center gap-1 border-l border-neutral-800 pl-2.5">
            <span className="text-neutral-500">AVG RETURN:</span>
            <span className={`font-bold ${metrics.avgReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.avgReturn >= 0 ? '+' : ''}{metrics.avgReturn.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Right: Quick Action Buttons (Add Asset, Presets, Reset) */}
        <div className="flex items-center gap-1.5">
          {/* Preset Baskets dropdown button */}
          <div className="relative" ref={presetsRef}>
            <button
              onClick={() => setShowPresetsMenu(!showPresetsMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-cyan-300 text-[10px] transition-colors"
              title="Select a pre-configured asset basket"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>PRESETS</span>
              <ChevronDown className="w-2.5 h-2.5 text-neutral-500" />
            </button>

            {showPresetsMenu && (
              <div className="absolute right-0 mt-1 w-64 bg-[#080d12] border border-neutral-800 rounded-md shadow-2xl py-1.5 z-50 text-[11px] font-mono">
                <div className="px-3 py-1 text-[9px] text-neutral-500 uppercase tracking-wider border-b border-neutral-800/80 font-bold">
                  Quick Watchlist Baskets
                </div>
                {WATCHLIST_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onResetAssets(preset.symbols);
                      setShowPresetsMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-800/60 flex items-center justify-between text-neutral-200 hover:text-cyan-300 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-neutral-100">{preset.name}</div>
                      <div className="text-[9px] text-neutral-400">{preset.symbols.join(', ')}</div>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                      {preset.tag}
                    </span>
                  </button>
                ))}
                <div className="border-t border-neutral-800/80 mt-1 pt-1">
                  <button
                    onClick={() => {
                      onResetAssets();
                      setShowPresetsMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-rose-300 hover:bg-rose-950/30 flex items-center justify-between text-[10px]"
                  >
                    <span>Reset to Core Default Basket</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Asset Modal Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-600/70 hover:border-emerald-500 text-emerald-300 text-[10px] font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)] hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>+ ADD ASSET</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-neutral-800/80">
        {/* Category Segmented Tabs */}
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 overflow-x-auto scrollbar-none">
          {(['ALL', 'Equities', 'ETFs', 'Crypto', 'Forex', 'Commodities'] as const).map((cat) => {
            const count = cat === 'ALL' ? assets.length : assets.filter((a) => a.category === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                  isSelected
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>{cat.toUpperCase()}</span>
                <span className={`text-[9px] ${isSelected ? 'text-cyan-400' : 'text-neutral-600'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 text-neutral-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter ticker / name..."
              className="pl-6 pr-5 py-0.5 w-32 sm:w-40 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 focus:outline-none rounded text-[10px] text-neutral-200 placeholder-neutral-600 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-[10px] text-neutral-300 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="default">Default Order</option>
            <option value="changeDesc">Gainers First (% Chg)</option>
            <option value="changeAsc">Losers First (% Chg)</option>
            <option value="priceDesc">Price (High → Low)</option>
            <option value="priceAsc">Price (Low → High)</option>
            <option value="alpha">Alphabetical (A → Z)</option>
          </select>
        </div>
      </div>

      {/* Main Watchlist Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px] border-collapse">
          <thead>
            <tr className="text-neutral-500 text-[10px] border-b border-neutral-800 uppercase tracking-wider bg-black/30">
              <th className="py-2 px-2.5">ASSET / TICKER</th>
              <th className="py-2 px-2 text-right">LAST PRICE</th>
              <th className="py-2 px-2 text-right">NET CHG</th>
              <th className="py-2 px-2 text-right">% CHG</th>
              <th className="py-2 px-2 text-center hidden md:table-cell">SESSION RANGE</th>
              <th className="py-2 px-2 text-right">7D / LIVE TREND</th>
              <th className="py-2 px-2 text-center w-16">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                    <Info className="w-5 h-5 text-neutral-600" />
                    <p className="text-neutral-400 font-medium text-xs">
                      {searchQuery
                        ? `No watchlist assets match "${searchQuery}".`
                        : selectedCategory !== 'ALL'
                        ? `No assets found in "${selectedCategory}".`
                        : 'Your custom watchlist is empty.'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {searchQuery ? (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-cyan-400 text-[10px]"
                        >
                          Clear Search
                        </button>
                      ) : (
                        <button
                          onClick={() => onResetAssets()}
                          className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px] font-bold"
                        >
                          Load Recommended Basket
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset, idx) => {
                const isPositive = asset.changePercent >= 0;
                const isFlashing = flashSymbols.has(asset.symbol);
                const isBroadcasted = broadcastedSymbol === asset.symbol;

                // Range calculations
                const rangeDiff = asset.dayHigh - asset.dayLow;
                const rangePct =
                  rangeDiff > 0
                    ? Math.min(Math.max(((asset.price - asset.dayLow) / rangeDiff) * 100, 4), 96)
                    : 50;

                return (
                  <tr
                    key={`${asset.symbol}-${idx}`}
                    className={`hover:bg-neutral-800/30 transition-colors group ${
                      isFlashing ? (isPositive ? 'bg-emerald-950/40 shadow-[inset_0_0_15px_rgba(16,185,129,0.2)]' : 'bg-rose-950/40 shadow-[inset_0_0_15px_rgba(244,63,94,0.2)]') : ''
                    }`}
                  >
                    {/* Symbol & Name */}
                    <td className="py-2.5 px-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-neutral-100 text-xs tracking-wide group-hover:text-cyan-300 transition-colors">
                          {asset.symbol}
                        </span>
                        <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold ${
                          asset.category === 'Equities'
                            ? 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                            : asset.category === 'Crypto'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            : asset.category === 'ETFs'
                            ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                            : asset.category === 'Forex'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            : 'bg-orange-950/60 text-orange-300 border-orange-800/60'
                        }`}>
                          {asset.category.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate max-w-[150px] sm:max-w-[200px]">
                        {asset.name}
                      </div>
                      {asset.notes && (
                        <div className="text-[9px] text-neutral-500 truncate max-w-[180px] italic">
                          {asset.notes}
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-2.5 px-2 text-right font-bold text-neutral-100 text-xs">
                      {formatPrice(asset.price, asset.category)}
                    </td>

                    {/* Net Change */}
                    <td className={`py-2.5 px-2 text-right font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className="inline-flex items-center gap-0.5">
                        {isPositive ? '+' : ''}{formatPrice(asset.change, asset.category)}
                      </span>
                    </td>

                    {/* % Change Badge */}
                    <td className="py-2.5 px-2 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isPositive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%
                      </span>
                    </td>

                    {/* Session Day Range Bar */}
                    <td className="py-2.5 px-2 text-center min-w-[120px] hidden md:table-cell">
                      <div className="flex items-center justify-between text-[9px] text-neutral-500 mb-0.5 font-mono">
                        <span>{formatPrice(asset.dayLow, asset.category)}</span>
                        <span>{formatPrice(asset.dayHigh, asset.category)}</span>
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

                    {/* Dynamic Mini Sparkline SVG */}
                    <td className="py-2.5 px-2 text-right w-24">
                      <svg className="w-20 h-5 inline-block overflow-visible" viewBox="0 0 60 20">
                        {renderWatchlistSparkline(asset.sparkline, isPositive)}
                      </svg>
                    </td>

                    {/* Actions: Broadcast Alert & Delete */}
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Broadcast to Tape */}
                        {onBroadcastAlert && (
                          <button
                            onClick={() => handleBroadcast(asset)}
                            className={`p-1 rounded border transition-colors ${
                              isBroadcasted
                                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-cyan-300 hover:border-cyan-700'
                            }`}
                            title="Broadcast alert to Terminal Tape"
                          >
                            <Radio className={`w-3 h-3 ${isBroadcasted ? 'animate-ping' : ''}`} />
                          </button>
                        )}

                        {/* Remove from Watchlist */}
                        <button
                          onClick={() => onRemoveAsset(asset.symbol)}
                          className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-rose-400 hover:border-rose-800 transition-colors"
                          title={`Remove ${asset.symbol} from Watchlist`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div
            ref={modalRef}
            className="bg-[#080d12] border border-neutral-800 rounded-lg max-w-lg w-full overflow-hidden shadow-2xl animate-fadeIn font-mono text-xs"
          >
            {/* Modal Header */}
            <div className="bg-[#0c1218] border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-neutral-100 text-sm tracking-wide">
                  ADD ASSETS TO WATCHLIST
                </span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs: Catalog vs Custom */}
            <div className="flex border-b border-neutral-800 bg-[#060a0e]">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`flex-1 py-2 px-4 text-center font-bold text-xs transition-colors border-b-2 ${
                  activeTab === 'catalog'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Market Catalog ({MARKET_CATALOG_ASSETS.length} Available)
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`flex-1 py-2 px-4 text-center font-bold text-xs transition-colors border-b-2 ${
                  activeTab === 'custom'
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                + Custom Asset Entry
              </button>
            </div>

            {/* Tab 1: Catalog Browser */}
            {activeTab === 'catalog' && (
              <div className="p-3 space-y-3 max-h-[420px] flex flex-col">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search by ticker (NVDA, SPY, BTC, GLD) or company..."
                    className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-400 focus:outline-none rounded text-xs text-neutral-200 placeholder-neutral-600 font-mono"
                    autoFocus
                  />
                </div>

                <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
                  {filteredCatalog.map((item) => {
                    const isAlreadyAdded = currentSymbolSet.has(item.symbol.toUpperCase());

                    return (
                      <div
                        key={item.symbol}
                        className="flex items-center justify-between p-2 rounded bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-100 text-xs w-16">
                            {item.symbol}
                          </span>
                          <div>
                            <div className="text-neutral-300 text-xs font-medium truncate max-w-[200px]">
                              {item.name}
                            </div>
                            <div className="text-[9px] text-neutral-500 flex items-center gap-1.5">
                              <span>{item.category}</span>
                              <span>•</span>
                              <span>${formatPrice(item.price, item.category)}</span>
                            </div>
                          </div>
                        </div>

                        {isAlreadyAdded ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950 text-neutral-500 border border-neutral-800 text-[10px]">
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>In Watchlist</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => onAddAsset(item)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/70 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: Custom Ticker Entry Form */}
            {activeTab === 'custom' && (
              <form onSubmit={handleAddCustom} className="p-4 space-y-3">
                {customError && (
                  <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[10px]">
                    {customError}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">
                    TICKER SYMBOL <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. COIN, UBER, NVO, SOL-USD"
                    className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-400 focus:outline-none rounded text-xs text-neutral-100 font-mono uppercase"
                    autoFocus
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">ASSET / COMPANY NAME</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Coinbase Global"
                      className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-400 focus:outline-none rounded text-xs text-neutral-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">STARTING PRICE ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="e.g. 175.50"
                      className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-400 focus:outline-none rounded text-xs text-neutral-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-neutral-400 mb-1">ASSET CATEGORY</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as WatchlistCategory)}
                    className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 focus:border-cyan-400 focus:outline-none rounded text-xs text-neutral-100 font-mono"
                  >
                    <option value="Equities">Equities / Stocks</option>
                    <option value="ETFs">ETFs & Indices</option>
                    <option value="Crypto">Crypto Assets</option>
                    <option value="Forex">Forex Currencies</option>
                    <option value="Commodities">Commodities & Energy</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition-colors shadow-md"
                  >
                    + Add to Watchlist
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function renderWatchlistSparkline(points: number[], isPositive: boolean) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const strokeColor = isPositive ? '#10b981' : '#f43f5e';

  const pts = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * 58 + 1;
      const y = 18 - ((val - min) / range) * 16;
      return `${x},${y}`;
    })
    .join(' ');

  const lastIdx = points.length - 1;
  const lastX = 59;
  const lastY = 18 - ((points[lastIdx] - min) / range) * 16;

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
        cx={lastX}
        cy={lastY}
        r="2.2"
        fill={strokeColor}
        className="animate-pulse"
      />
    </>
  );
}
