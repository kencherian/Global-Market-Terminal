import { useState, useMemo, type FormEvent } from 'react';
import { CryptoAsset, CryptoCategory, CryptoMarketOverview, TerminalTheme } from '../../types';
import { CRYPTO_CATALOG_PRESETS, INITIAL_CRYPTO_ASSETS } from '../../services/dataAdapter';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowUpDown,
  Search, 
  Plus, 
  Trash2, 
  Bell, 
  BellRing, 
  Flame, 
  Fuel, 
  Radio, 
  Sparkles, 
  RotateCcw, 
  X, 
  Check, 
  Layers,
  ChevronDown
} from 'lucide-react';

interface CryptoWatchlistWidgetProps {
  assets: CryptoAsset[];
  marketOverview: CryptoMarketOverview;
  flashSymbols: Set<string>;
  onAddAsset: (asset: CryptoAsset) => void;
  onRemoveAsset: (symbol: string) => void;
  onResetAssets: () => void;
  onToggleAlert?: (symbol: string) => void;
  onBroadcastAlert?: (alert: { level: 'INFO' | 'NOTICE' | 'SPIKE' | 'WARNING'; source: string; text: string }) => void;
  audioEnabled?: boolean;
  theme?: TerminalTheme;
}

export function CryptoWatchlistWidget({
  assets,
  marketOverview,
  flashSymbols,
  onAddAsset,
  onRemoveAsset,
  onResetAssets,
  onToggleAlert,
  onBroadcastAlert,
  theme = 'deep-space',
}: CryptoWatchlistWidgetProps) {
  const isLight = theme === 'financial-paper';

  const [selectedCategory, setSelectedCategory] = useState<'ALL' | CryptoCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rank' | 'change24hDesc' | 'change24hAsc' | 'priceDesc' | 'priceAsc' | 'change1hDesc' | 'volDesc'>('rank');
  const [showAddModal, setShowAddModal] = useState(false);
  const [broadcastedSymbol, setBroadcastedSymbol] = useState<string | null>(null);

  // Custom coin form state
  const [customSymbol, setCustomSymbol] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<CryptoCategory>('L1');
  const [customPrice, setCustomPrice] = useState('');
  const [customVolume, setCustomVolume] = useState('');
  const [customMcap, setCustomMcap] = useState('');

  // Clickable header sorting
  const handleHeaderSort = (column: 'rank' | 'price' | 'change24h' | 'change1h' | 'volume') => {
    if (column === 'rank') {
      setSortBy('rank');
    } else if (column === 'price') {
      setSortBy((prev) => (prev === 'priceDesc' ? 'priceAsc' : 'priceDesc'));
    } else if (column === 'change24h') {
      setSortBy((prev) => (prev === 'change24hDesc' ? 'change24hAsc' : 'change24hDesc'));
    } else if (column === 'change1h') {
      setSortBy('change1hDesc');
    } else if (column === 'volume') {
      setSortBy('volDesc');
    }
  };

  // Filter & Search
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesCategory = selectedCategory === 'ALL' || asset.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        asset.symbol.toLowerCase().includes(query) || 
        asset.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [assets, selectedCategory, searchQuery]);

  // Sort Assets
  const sortedAssets = useMemo(() => {
    const list = [...filteredAssets];
    switch (sortBy) {
      case 'rank':
        return list.sort((a, b) => a.marketCapRank - b.marketCapRank);
      case 'change24hDesc':
        return list.sort((a, b) => b.change24h - a.change24h);
      case 'change24hAsc':
        return list.sort((a, b) => a.change24h - b.change24h);
      case 'change1hDesc':
        return list.sort((a, b) => b.change1h - a.change1h);
      case 'priceDesc':
        return list.sort((a, b) => b.price - a.price);
      case 'priceAsc':
        return list.sort((a, b) => a.price - b.price);
      case 'volDesc':
        return list.sort((a, b) => {
          const numA = parseFloat(a.volume24h.replace(/[^0-9.]/g, '')) * (a.volume24h.includes('B') ? 1000 : 1);
          const numB = parseFloat(b.volume24h.replace(/[^0-9.]/g, '')) * (b.volume24h.includes('B') ? 1000 : 1);
          return numB - numA;
        });
      default:
        return list;
    }
  }, [filteredAssets, sortBy]);

  // Format crypto price with proper precision
  const formatCryptoPrice = (price: number) => {
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

  // Add custom asset submission
  const handleAddCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    const sym = customSymbol.trim().toUpperCase();
    if (!sym) return;

    const priceNum = parseFloat(customPrice) || 1.0;
    const newAsset: CryptoAsset = {
      symbol: sym,
      name: customName.trim() || sym,
      category: customCategory,
      price: priceNum,
      change1h: 0.1,
      change24h: 1.5,
      change7d: 4.2,
      high24h: priceNum * 1.05,
      low24h: priceNum * 0.95,
      volume24h: customVolume.trim() || '$100M',
      marketCap: customMcap.trim() || '$500M',
      marketCapRank: assets.length + 1,
      sparkline: [priceNum * 0.96, priceNum * 0.98, priceNum * 0.97, priceNum * 1.01, priceNum],
      alertEnabled: false,
    };

    onAddAsset(newAsset);
    setCustomSymbol('');
    setCustomName('');
    setCustomPrice('');
    setCustomVolume('');
    setCustomMcap('');
    setShowAddModal(false);
  };

  // Add preset token
  const handleAddPresetToken = (preset: typeof CRYPTO_CATALOG_PRESETS[0]) => {
    const existing = assets.some((a) => a.symbol.toUpperCase() === preset.symbol.toUpperCase());
    if (existing) return;

    const newAsset: CryptoAsset = {
      symbol: preset.symbol,
      name: preset.name,
      category: preset.category,
      price: preset.price,
      change1h: Math.round((Math.random() * 2 - 0.8) * 100) / 100,
      change24h: Math.round((Math.random() * 8 - 2.5) * 100) / 100,
      change7d: Math.round((Math.random() * 15 - 3) * 100) / 100,
      high24h: preset.price * 1.06,
      low24h: preset.price * 0.94,
      volume24h: '$350M',
      marketCap: '$3.5B',
      marketCapRank: preset.rank,
      sparkline: [preset.price * 0.94, preset.price * 0.96, preset.price * 0.98, preset.price * 0.97, preset.price],
      alertEnabled: false,
    };

    onAddAsset(newAsset);
  };

  // Broadcast alert to telemetry tape
  const handleBroadcastTape = (asset: CryptoAsset) => {
    if (!onBroadcastAlert) return;
    const level = Math.abs(asset.change24h) > 8 ? 'SPIKE' : 'NOTICE';
    onBroadcastAlert({
      level,
      source: `CRYPTO::${asset.symbol}`,
      text: `CRYPTO TELEMETRY // ${asset.name} (${asset.symbol}) trading at ${formatCryptoPrice(asset.price)} | 24h: ${asset.change24h >= 0 ? '+' : ''}${asset.change24h}% | 1h: ${asset.change1h >= 0 ? '+' : ''}${asset.change1h}% | Vol: ${asset.volume24h}`,
    });
    setBroadcastedSymbol(asset.symbol);
    setTimeout(() => setBroadcastedSymbol(null), 1800);
  };

  // Available catalog presets not yet in user list
  const unaddedPresets = useMemo(() => {
    const currentSymbols = new Set(assets.map((a) => a.symbol.toUpperCase()));
    return CRYPTO_CATALOG_PRESETS.filter((p) => !currentSymbols.has(p.symbol.toUpperCase()));
  }, [assets]);

  return (
    <div className="space-y-2.5 font-mono text-[11px]">
      {/* Top Crypto Macro HUD Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2 bg-neutral-950/80 rounded border border-neutral-800">
        {/* Total Crypto Market Cap */}
        <div className="col-span-1">
          <div className="text-[10px] text-neutral-500 font-semibold uppercase">TOTAL MARKET CAP</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-extrabold text-white tracking-tight">{marketOverview.totalMarketCap}</span>
            <span className={`text-[10px] font-bold ${marketOverview.totalMarketCapChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {marketOverview.totalMarketCapChange24h >= 0 ? '+' : ''}{marketOverview.totalMarketCapChange24h}%
            </span>
          </div>
        </div>

        {/* 24h Volume */}
        <div className="col-span-1">
          <div className="text-[10px] text-neutral-500 font-semibold uppercase">24H TURNOVER</div>
          <div className="text-sm font-extrabold text-neutral-200 mt-0.5">{marketOverview.totalVolume24h}</div>
        </div>

        {/* BTC / ETH Dominance */}
        <div className="col-span-1">
          <div className="text-[10px] text-neutral-500 font-semibold uppercase">BTC / ETH DOMINANCE</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-extrabold text-amber-400">{marketOverview.btcDominance}%</span>
            <span className="text-[10px] text-neutral-400">/</span>
            <span className="text-sm font-extrabold text-cyan-400">{marketOverview.ethDominance}%</span>
          </div>
        </div>

        {/* ETH Gas Tracker */}
        <div className="col-span-1">
          <div className="text-[10px] text-neutral-500 font-semibold uppercase flex items-center gap-1">
            <Fuel className="w-3 h-3 text-cyan-400" />
            ETH GAS
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-extrabold text-cyan-300">{marketOverview.gasGwei} Gwei</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">OPTIMAL</span>
          </div>
        </div>

        {/* Fear & Greed Index */}
        <div className="col-span-2 sm:col-span-1">
          <div className="text-[10px] text-neutral-500 font-semibold uppercase flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            FEAR & GREED
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-extrabold text-amber-300">{marketOverview.fearGreedIndex}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
              {marketOverview.fearGreedLabel.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Category Filters, Search, Add Coin, Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-neutral-800/80">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
          {(['ALL', 'L1', 'DeFi', 'AI & Data', 'L2', 'Memes'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 text-neutral-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search coin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-[10px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono w-28 sm:w-36"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Add Coin Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 rounded text-[10px] font-bold transition-colors"
            title="Add a custom token or choose from catalog"
          >
            <Plus className="w-3 h-3" />
            <span>ADD COIN</span>
          </button>

          {/* Reset Watchlist */}
          <button
            onClick={onResetAssets}
            className="p-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 text-[10px] transition-colors"
            title="Reset Crypto Watchlist to default set"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Crypto Assets Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11px] border-collapse">
          <thead>
            <tr className="text-neutral-500 text-[10px] border-b border-neutral-800 uppercase tracking-wider bg-black/40">
              <th 
                className="py-1.5 px-2 cursor-pointer hover:text-neutral-300 w-10 text-center"
                onClick={() => handleHeaderSort('rank')}
              >
                #
              </th>
              <th className="py-1.5 px-2">ASSET</th>
              <th 
                className="py-1.5 px-2 text-right cursor-pointer hover:text-neutral-300"
                onClick={() => handleHeaderSort('price')}
              >
                PRICE
              </th>
              <th 
                className="py-1.5 px-2 text-right cursor-pointer hover:text-neutral-300"
                onClick={() => handleHeaderSort('change1h')}
                title="1-hour percentage change"
              >
                1H %
              </th>
              <th 
                className="py-1.5 px-2 text-right cursor-pointer hover:text-neutral-300"
                onClick={() => handleHeaderSort('change24h')}
                title="24-hour percentage change"
              >
                24H %
              </th>
              <th className="py-1.5 px-2 text-right hidden sm:table-cell" title="7-day percentage change">
                7D %
              </th>
              <th className="py-1.5 px-2 text-center hidden md:table-cell">24H RANGE</th>
              <th 
                className="py-1.5 px-2 text-right hidden lg:table-cell cursor-pointer hover:text-neutral-300"
                onClick={() => handleHeaderSort('volume')}
              >
                24H VOL
              </th>
              <th className="py-1.5 px-2 text-right hidden xl:table-cell">MCAP</th>
              <th className="py-1.5 px-2 text-center w-16">TREND</th>
              <th className="py-1.5 px-2 text-center w-16">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/40">
            {sortedAssets.map((asset) => {
              const isFlashing = flashSymbols.has(asset.symbol);
              const is24hUp = asset.change24h >= 0;
              const is1hUp = asset.change1h >= 0;
              const is7dUp = asset.change7d >= 0;

              // Sparkline coordinates
              const spark = asset.sparkline || [asset.price];
              const minSpark = Math.min(...spark);
              const maxSpark = Math.max(...spark);
              const range = maxSpark - minSpark || 1;
              const points = spark.map((val, idx) => {
                const x = (idx / (spark.length - 1 || 1)) * 52;
                const y = 14 - ((val - minSpark) / range) * 11;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(' ');

              return (
                <tr 
                  key={asset.symbol}
                  className={`hover:bg-neutral-800/40 transition-colors group ${
                    isFlashing ? 'bg-amber-500/10' : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="py-2 px-2 text-center text-neutral-500 text-[10px]">
                    {asset.marketCapRank}
                  </td>

                  {/* Asset Symbol & Name */}
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-white text-[11px] group-hover:text-amber-300 transition-colors">
                        {asset.symbol}
                      </span>
                      <span className="text-neutral-400 text-[10px] hidden sm:inline truncate max-w-[85px]">
                        {asset.name}
                      </span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-500 font-bold hidden xl:inline">
                        {asset.category}
                      </span>
                    </div>
                  </td>

                  {/* Price */}
                  <td className={`py-2 px-2 text-right font-extrabold text-neutral-100 transition-colors ${
                    isFlashing ? 'text-amber-300' : ''
                  }`}>
                    {formatCryptoPrice(asset.price)}
                  </td>

                  {/* 1h Change */}
                  <td className="py-2 px-2 text-right">
                    <span className={`text-[10px] font-bold ${is1hUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {is1hUp ? '+' : ''}{asset.change1h.toFixed(2)}%
                    </span>
                  </td>

                  {/* 24h Change */}
                  <td className="py-2 px-2 text-right">
                    <span className={`font-bold flex items-center justify-end gap-0.5 ${
                      is24hUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {is24hUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {is24hUp ? '+' : ''}{asset.change24h.toFixed(2)}%
                    </span>
                  </td>

                  {/* 7d Change */}
                  <td className="py-2 px-2 text-right hidden sm:table-cell">
                    <span className={`text-[10px] font-semibold ${is7dUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {is7dUp ? '+' : ''}{asset.change7d.toFixed(1)}%
                    </span>
                  </td>

                  {/* 24h Range Bar */}
                  <td className="py-2 px-2 text-center hidden md:table-cell">
                    <div className="flex items-center justify-center gap-1 text-[9px] text-neutral-500">
                      <span>{formatCryptoPrice(asset.low24h)}</span>
                      <div className="w-16 bg-neutral-900 rounded-full h-1 relative overflow-hidden">
                        <div 
                          className={`absolute top-0 bottom-0 rounded-full ${is24hUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{
                            left: `${Math.max(5, Math.min(85, ((asset.price - asset.low24h) / (asset.high24h - asset.low24h || 1)) * 100))}%`,
                            width: '20%',
                          }}
                        />
                      </div>
                      <span>{formatCryptoPrice(asset.high24h)}</span>
                    </div>
                  </td>

                  {/* 24h Volume */}
                  <td className="py-2 px-2 text-right text-neutral-400 hidden lg:table-cell">
                    {asset.volume24h}
                  </td>

                  {/* Market Cap */}
                  <td className="py-2 px-2 text-right text-neutral-300 font-semibold hidden xl:table-cell">
                    {asset.marketCap}
                  </td>

                  {/* Sparkline */}
                  <td className="py-2 px-2 text-center">
                    <div className="w-14 h-4 mx-auto flex items-center justify-center">
                      <svg viewBox="0 0 52 14" className="w-full h-full overflow-visible">
                        <polyline
                          fill="none"
                          stroke={is24hUp ? (isLight ? '#047857' : '#10b981') : (isLight ? '#b91c1c' : '#f43f5e')}
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                      </svg>
                    </div>
                  </td>

                  {/* Actions: Bell Alert, Broadcast to Tape, Delete */}
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Alert Bell Toggle */}
                      {onToggleAlert && (
                        <button
                          onClick={() => onToggleAlert(asset.symbol)}
                          className={`p-1 rounded transition-colors ${
                            asset.alertEnabled
                              ? 'text-amber-400 bg-amber-950/60 border border-amber-800/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                              : 'text-neutral-500 hover:text-neutral-300'
                          }`}
                          title={asset.alertEnabled ? 'Breakout Alert Active (>3% tick move)' : 'Enable Breakout Alert'}
                        >
                          {asset.alertEnabled ? <BellRing className="w-3 h-3 animate-pulse" /> : <Bell className="w-3 h-3" />}
                        </button>
                      )}

                      {/* Broadcast Tape */}
                      {onBroadcastAlert && (
                        <button
                          onClick={() => handleBroadcastTape(asset)}
                          className={`p-1 rounded transition-colors ${
                            broadcastedSymbol === asset.symbol
                              ? 'text-emerald-400 bg-emerald-950 border border-emerald-800'
                              : 'text-neutral-500 hover:text-cyan-300'
                          }`}
                          title="Broadcast asset quote to Terminal Order Tape"
                        >
                          <Radio className="w-3 h-3" />
                        </button>
                      )}

                      {/* Remove Token */}
                      <button
                        onClick={() => onRemoveAsset(asset.symbol)}
                        className="p-1 text-neutral-500 hover:text-rose-400 transition-colors opacity-40 group-hover:opacity-100"
                        title="Remove coin from watchlist"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Coin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0b1015] border border-neutral-800 rounded-lg max-w-md w-full p-4 space-y-3.5 shadow-2xl font-mono text-[11px] text-neutral-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ADD CRYPTOCURRENCY TO MONITOR
              </span>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Popular Catalog Presets */}
            {unaddedPresets.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-neutral-400 font-semibold uppercase">
                  Quick Add From Popular Catalog
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-black/40 rounded border border-neutral-800">
                  {unaddedPresets.map((preset) => (
                    <button
                      key={preset.symbol}
                      onClick={() => handleAddPresetToken(preset)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-[10px] transition-colors"
                    >
                      <span className="font-bold text-white">{preset.symbol}</span>
                      <span className="text-neutral-400">{preset.name}</span>
                      <span className="text-amber-400 font-bold">${preset.price}</span>
                      <Plus className="w-2.5 h-2.5 text-emerald-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Token Entry Form */}
            <form onSubmit={handleAddCustomSubmit} className="space-y-2.5 border-t border-neutral-800 pt-2.5">
              <div className="text-[10px] text-neutral-400 font-semibold uppercase">
                Or Add Custom Token
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-neutral-500 mb-0.5">SYMBOL (TICKER)</label>
                  <input
                    type="text"
                    placeholder="e.g. SUI"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    required
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-neutral-500 mb-0.5">TOKEN NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. Sui Network"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-neutral-500 mb-0.5">CATEGORY</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as CryptoCategory)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="L1">L1</option>
                    <option value="DeFi">DeFi</option>
                    <option value="AI & Data">AI & Data</option>
                    <option value="L2">L2</option>
                    <option value="Memes">Memes</option>
                    <option value="Infrastructure">Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-neutral-500 mb-0.5">PRICE ($ USD)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2.15"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    required
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-neutral-500 mb-0.5">24H VOLUME</label>
                  <input
                    type="text"
                    placeholder="e.g. $450M"
                    value={customVolume}
                    onChange={(e) => setCustomVolume(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-neutral-500 mb-0.5">MARKET CAP</label>
                  <input
                    type="text"
                    placeholder="e.g. $4.8B"
                    value={customMcap}
                    onChange={(e) => setCustomMcap(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1 rounded bg-neutral-800 text-neutral-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  Add Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
