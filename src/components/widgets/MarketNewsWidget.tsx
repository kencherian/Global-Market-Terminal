import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Newspaper, 
  Radio, 
  RefreshCw, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  SlidersHorizontal, 
  Send, 
  Check, 
  Copy, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Clock,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import { 
  MarketNewsItem, 
  NewsSector, 
  NewsSentiment, 
  TerminalAlert 
} from '../../types';
import { 
  INITIAL_NEWS_HEADLINES, 
  generateSimulatedNewsTick, 
  fetchMarketNewsApi 
} from '../../services/newsService';
import { playTerminalTick, playTerminalAlarm } from '../../services/soundEffects';

interface MarketNewsWidgetProps {
  onBroadcastAlert?: (alert: Omit<TerminalAlert, 'id' | 'timestamp'>) => void;
  audioEnabled?: boolean;
}

export const ALL_SECTORS: NewsSector[] = [
  'TECH',
  'ENERGY',
  'FINANCIALS',
  'MACRO',
  'METALS',
  'HEALTHCARE',
  'CONSUMER',
];

export interface SectorMeta {
  id: NewsSector;
  label: string;
  shortLabel: string;
  tag: string;
  accentBorder: string;
  accentText: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  badgeActive: string;
  description: string;
}

export const SECTOR_CONFIGS: SectorMeta[] = [
  {
    id: 'TECH',
    label: 'AI / SEMIS',
    shortLabel: 'AI/Semis',
    tag: 'AI/SEMI',
    accentBorder: 'border-cyan-500',
    accentText: 'text-cyan-300',
    activeBg: 'bg-cyan-950/70',
    activeBorder: 'border-cyan-400',
    activeText: 'text-cyan-200',
    badgeActive: 'bg-cyan-400/20 text-cyan-300 border-cyan-500/50',
    description: 'NVIDIA, TSMC, Broadcom, AMD, enterprise AI clusters, & accelerator backlogs',
  },
  {
    id: 'ENERGY',
    label: 'ENERGY',
    shortLabel: 'Energy',
    tag: 'ENERGY',
    accentBorder: 'border-orange-500',
    accentText: 'text-orange-300',
    activeBg: 'bg-orange-950/70',
    activeBorder: 'border-orange-400',
    activeText: 'text-orange-200',
    badgeActive: 'bg-orange-400/20 text-orange-300 border-orange-500/50',
    description: 'WTI Crude, Brent, Natural Gas Henry Hub, OPEC+ discipline, & offshore rigs',
  },
  {
    id: 'FINANCIALS',
    label: 'FINANCIALS',
    shortLabel: 'Financials',
    tag: 'FIN',
    accentBorder: 'border-emerald-500',
    accentText: 'text-emerald-300',
    activeBg: 'bg-emerald-950/70',
    activeBorder: 'border-emerald-400',
    activeText: 'text-emerald-200',
    badgeActive: 'bg-emerald-400/20 text-emerald-300 border-emerald-500/50',
    description: 'JPMorgan, Goldman Sachs, commercial lending spreads, debt syndication, & asset flows',
  },
  {
    id: 'MACRO',
    label: 'MACRO / RATES',
    shortLabel: 'Macro',
    tag: 'MACRO',
    accentBorder: 'border-amber-500',
    accentText: 'text-amber-300',
    activeBg: 'bg-amber-950/70',
    activeBorder: 'border-amber-400',
    activeText: 'text-amber-200',
    badgeActive: 'bg-amber-400/20 text-amber-300 border-amber-500/50',
    description: 'FOMC policy, 10Y Treasury yields, Core PCE/CPI deflators, & foreign exchange',
  },
  {
    id: 'METALS',
    label: 'METALS / COMM',
    shortLabel: 'Metals',
    tag: 'METALS',
    accentBorder: 'border-yellow-500',
    accentText: 'text-yellow-300',
    activeBg: 'bg-yellow-950/70',
    activeBorder: 'border-yellow-400',
    activeText: 'text-yellow-200',
    badgeActive: 'bg-yellow-400/20 text-yellow-300 border-yellow-500/50',
    description: 'Gold spot bullion, Silver industrial paste, LME copper warehouse stocks, & metals',
  },
  {
    id: 'HEALTHCARE',
    label: 'HEALTHCARE',
    shortLabel: 'Health',
    tag: 'HLTH',
    accentBorder: 'border-rose-500',
    accentText: 'text-rose-300',
    activeBg: 'bg-rose-950/70',
    activeBorder: 'border-rose-400',
    activeText: 'text-rose-200',
    badgeActive: 'bg-rose-400/20 text-rose-300 border-rose-500/50',
    description: 'Clinical trial secondary endpoints, bioequivalence studies, & medical device deliveries',
  },
  {
    id: 'CONSUMER',
    label: 'CONSUMER',
    shortLabel: 'Consumer',
    tag: 'CONS',
    accentBorder: 'border-indigo-500',
    accentText: 'text-indigo-300',
    activeBg: 'bg-indigo-950/70',
    activeBorder: 'border-indigo-400',
    activeText: 'text-indigo-200',
    badgeActive: 'bg-indigo-400/20 text-indigo-300 border-indigo-500/50',
    description: 'Autonomous vehicle telemetry, retail comps, & e-commerce sortation robotics',
  },
];

export function MarketNewsWidget({
  onBroadcastAlert,
  audioEnabled = false,
}: MarketNewsWidgetProps) {
  const [headlines, setHeadlines] = useState<MarketNewsItem[]>(INITIAL_NEWS_HEADLINES);
  
  // Multi-select sector state: initially all sectors enabled
  const [selectedSectors, setSelectedSectors] = useState<NewsSector[]>(ALL_SECTORS);

  const [sentimentFilter, setSentimentFilter] = useState<'ALL' | NewsSentiment>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamIntervalSec, setStreamIntervalSec] = useState<number>(12); // seconds between dynamic ticks
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(audioEnabled);
  const [newFlashId, setNewFlashId] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string>(
    new Date().toTimeString().split(' ')[0]
  );

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Sync sound setting if parent audio toggled
  useEffect(() => {
    setSoundAlerts(audioEnabled);
  }, [audioEnabled]);

  // Sector multi-select helper functions
  const toggleSector = useCallback((sectorId: NewsSector) => {
    setSelectedSectors((prev) => {
      if (prev.includes(sectorId)) {
        return prev.filter((s) => s !== sectorId);
      } else {
        return [...prev, sectorId];
      }
    });
  }, []);

  const soloSector = useCallback((sectorId: NewsSector) => {
    setSelectedSectors([sectorId]);
  }, []);

  const selectAllSectors = useCallback(() => {
    setSelectedSectors(ALL_SECTORS);
  }, []);

  const clearAllSectors = useCallback(() => {
    setSelectedSectors([]);
  }, []);

  const selectCoreTrio = useCallback(() => {
    setSelectedSectors(['TECH', 'ENERGY', 'FINANCIALS']);
  }, []);

  // Fetch news from simulated API
  const handleFetchNews = useCallback(async (sectorsToFetch: NewsSector[] = selectedSectors) => {
    setIsLoading(true);
    try {
      const data = await fetchMarketNewsApi(
        sectorsToFetch.length === ALL_SECTORS.length ? undefined : sectorsToFetch,
        searchQuery
      );
      setHeadlines((prev) => {
        // Merge without losing freshly injected ticks
        const existingIds = new Set(data.map((d) => d.id));
        const keepFresh = prev.filter((p) => p.isNew && !existingIds.has(p.id));
        return [...keepFresh, ...data];
      });
      setLastFetchTime(new Date().toTimeString().split(' ')[0]);
    } catch (err) {
      console.warn('Failed to load news feed', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSectors, searchQuery]);

  // Simulated live news ticker stream: pushes incoming wire every interval
  useEffect(() => {
    if (!isStreaming) return;

    const timer = setInterval(() => {
      // Direct real-time ticks to currently selected sectors (or all if none)
      const activeFilter = selectedSectors.length > 0 ? selectedSectors : ALL_SECTORS;
      const newTick = generateSimulatedNewsTick(activeFilter);
      
      setHeadlines((prev) => [newTick, ...prev.slice(0, 49)]); // keep latest 50
      setNewFlashId(newTick.id);

      // Play terminal tick or alarm
      if (soundAlerts) {
        if (newTick.urgency === 'BREAKING') {
          playTerminalAlarm();
        } else {
          playTerminalTick(newTick.sentiment === 'BULLISH');
        }
      }

      // Clear flash highlighting after 2.5s
      setTimeout(() => {
        setNewFlashId((current) => (current === newTick.id ? null : current));
      }, 2500);

    }, streamIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [isStreaming, selectedSectors, streamIntervalSec, soundAlerts]);

  // Handle immediate inject of a simulated wire for selected sectors
  const handleInjectWire = () => {
    const activeFilter = selectedSectors.length > 0 ? selectedSectors : ALL_SECTORS;
    const newTick = generateSimulatedNewsTick(activeFilter);
    setHeadlines((prev) => [newTick, ...prev]);
    setNewFlashId(newTick.id);
    if (soundAlerts) {
      playTerminalTick(true);
    }
    setTimeout(() => {
      setNewFlashId(null);
    }, 2500);
  };

  // Filter headlines by multi-selected sectors, sentiment, and keyword
  const filteredHeadlines = useMemo(() => {
    return headlines.filter((item) => {
      // Sector multi-select check
      if (selectedSectors.length === 0) {
        return false;
      }
      if (!selectedSectors.includes(item.sector)) {
        return false;
      }
      // Sentiment filter
      if (sentimentFilter !== 'ALL' && item.sentiment !== sentimentFilter) {
        return false;
      }
      // Search filter (headline, summary, ticker, source)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesHeadline = item.headline.toLowerCase().includes(q);
        const matchesSummary = item.summary?.toLowerCase().includes(q) || false;
        const matchesSource = item.source.toLowerCase().includes(q);
        const matchesTicker = item.tickers.some((t) => t.toLowerCase().includes(q));
        if (!matchesHeadline && !matchesSummary && !matchesSource && !matchesTicker) {
          return false;
        }
      }
      return true;
    });
  }, [headlines, selectedSectors, sentimentFilter, searchQuery]);

  // Sector counts across available headlines
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: headlines.length };
    headlines.forEach((item) => {
      counts[item.sector] = (counts[item.sector] || 0) + 1;
    });
    return counts;
  }, [headlines]);

  // Copy headline to clipboard
  const handleCopyHeadline = (item: MarketNewsItem) => {
    const text = `[${item.source}] ${item.headline} (${item.timeStr})`;
    navigator.clipboard?.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Broadcast headline into Terminal Tape Widget
  const handleBroadcastHeadline = (item: MarketNewsItem) => {
    if (onBroadcastAlert) {
      const level = item.urgency === 'BREAKING' ? 'SPIKE' : item.urgency === 'ALERT' ? 'WARNING' : 'NOTICE';
      const sectorTag = item.sector === 'TECH' ? 'AI/SEMIS' : item.sector;
      onBroadcastAlert({
        level,
        source: `NEWS::${item.source}`,
        text: `[${sectorTag}] ${item.headline} (${item.tickers.join(', ')})`,
      });
      if (soundAlerts) {
        playTerminalTick(true);
      }
    }
  };

  // Find most recent breaking or alert headline for the top banner
  const breakingHeadline = useMemo(() => {
    return headlines.find((h) => h.urgency === 'BREAKING') || headlines[0];
  }, [headlines]);

  const isAllSelected = selectedSectors.length === ALL_SECTORS.length;
  const isNoneSelected = selectedSectors.length === 0;
  const isTrioSelected = 
    selectedSectors.length === 3 &&
    selectedSectors.includes('TECH') &&
    selectedSectors.includes('ENERGY') &&
    selectedSectors.includes('FINANCIALS');

  return (
    <div className="flex flex-col h-full bg-[#060b0f] text-slate-200 select-none font-mono">
      {/* Top Controls & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-neutral-800/90 bg-[#080d12]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/50 text-[10px] text-cyan-300">
            <Radio className={`w-3 h-3 ${isStreaming ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
            <span className="font-bold">{isStreaming ? 'STREAM: LIVE' : 'STREAM: PAUSED'}</span>
            <span className="text-cyan-700">|</span>
            <span className="text-neutral-400">SYNC: {lastFetchTime}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400">
            <span>SHOWING:</span>
            <span className="text-cyan-400 font-bold">{filteredHeadlines.length}</span>
            <span>/</span>
            <span className="text-neutral-500">{headlines.length}</span>
          </div>
        </div>

        {/* Action Controls: Play/Pause, Speed, Audio, Refresh, Inject */}
        <div className="flex items-center gap-1.5">
          {/* Stream Play/Pause */}
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
              isStreaming
                ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 border-amber-600/60 text-amber-300 hover:bg-amber-900/60'
            }`}
            title={isStreaming ? 'Pause Real-Time Wire Feed' : 'Resume Real-Time Wire Feed'}
          >
            {isStreaming ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            <span>{isStreaming ? 'LIVE' : 'HOLD'}</span>
          </button>

          {/* Speed Selector */}
          <div className="hidden md:flex items-center border border-neutral-800 bg-neutral-950/80 rounded overflow-hidden text-[9px]">
            {[
              { label: '5s', sec: 5 },
              { label: '12s', sec: 12 },
              { label: '30s', sec: 30 },
            ].map((s) => (
              <button
                key={s.sec}
                onClick={() => setStreamIntervalSec(s.sec)}
                className={`px-1.5 py-1 font-mono transition-colors ${
                  streamIntervalSec === s.sec
                    ? 'bg-cyan-900/40 text-cyan-300 font-bold'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={`Simulate wire tick every ${s.sec} seconds`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Audio Alert Toggle */}
          <button
            onClick={() => setSoundAlerts(!soundAlerts)}
            className={`p-1 rounded border transition-colors ${
              soundAlerts
                ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-400'
            }`}
            title={soundAlerts ? 'News Audio Ticks Active' : 'News Audio Ticks Muted'}
          >
            {soundAlerts ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </button>

          {/* Trigger Instant Simulated Wire */}
          <button
            onClick={handleInjectWire}
            className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-600 text-neutral-300 hover:text-cyan-300 text-[10px] transition-colors"
            title="Inject simulated incoming wire tick immediately"
          >
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span className="hidden sm:inline">INJECT</span>
          </button>

          {/* Reload from simulated API */}
          <button
            onClick={() => handleFetchNews(selectedSectors)}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-600 text-neutral-300 hover:text-cyan-300 text-[10px] transition-colors disabled:opacity-50"
            title="Fetch wires from simulated API feed"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">FETCH</span>
          </button>
        </div>
      </div>

      {/* Breaking News Marquee Strip */}
      {breakingHeadline && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-rose-950/50 via-[#10070b]/60 to-transparent border-b border-rose-900/40 text-[11px] overflow-hidden">
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600/30 border border-rose-500/60 text-rose-300 text-[9px] font-extrabold uppercase tracking-wider shrink-0 animate-pulse">
            <Zap className="w-2.5 h-2.5 text-rose-400" />
            BREAKING
          </span>
          <span className="text-neutral-500 text-[10px] shrink-0 font-mono">
            {breakingHeadline.timeStr}
          </span>
          <span className="text-slate-200 font-semibold truncate hover:text-white transition-colors cursor-pointer"
            onClick={() => setExpandedId(expandedId === breakingHeadline.id ? null : breakingHeadline.id)}
          >
            {breakingHeadline.headline}
          </span>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-neutral-800/80 text-neutral-400">
              {breakingHeadline.source}
            </span>
          </div>
        </div>
      )}

      {/* Sector Multi-Select Filter Bar */}
      <div className="px-3 pt-2.5 pb-2 border-b border-neutral-800/70 bg-[#070c10]">
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 text-[10px]">
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="uppercase font-bold tracking-wider text-slate-200">
              SECTOR FEED FILTERS
            </span>
            <span className="text-neutral-500 font-mono text-[9px] hidden sm:inline">
              (MULTI-SELECT)
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                isAllSelected
                  ? 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300'
                  : isNoneSelected
                  ? 'bg-rose-950/70 border-rose-700/60 text-rose-300'
                  : 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
              }`}
            >
              {isAllSelected
                ? 'ALL 7 ACTIVE'
                : isNoneSelected
                ? '0 ACTIVE'
                : `${selectedSectors.length} OF 7 ACTIVE`}
            </span>
          </div>

          {/* Quick Filter Presets & Dedicated Toggles */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Direct Quick Toggle: AI/Semis */}
            <button
              onClick={() => toggleSector('TECH')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                selectedSectors.includes('TECH')
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.3)] font-bold'
                  : 'bg-neutral-900/90 border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle AI / Semis wire feed on/off"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedSectors.includes('TECH') ? 'bg-cyan-400 animate-pulse' : 'bg-neutral-600'}`} />
              <span>AI/SEMIS</span>
            </button>

            {/* Direct Quick Toggle: Energy */}
            <button
              onClick={() => toggleSector('ENERGY')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                selectedSectors.includes('ENERGY')
                  ? 'bg-orange-950 border-orange-400 text-orange-200 shadow-[0_0_8px_rgba(249,115,22,0.3)] font-bold'
                  : 'bg-neutral-900/90 border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle Energy wire feed on/off"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedSectors.includes('ENERGY') ? 'bg-orange-400 animate-pulse' : 'bg-neutral-600'}`} />
              <span>ENERGY</span>
            </button>

            {/* Direct Quick Toggle: Financials */}
            <button
              onClick={() => toggleSector('FINANCIALS')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                selectedSectors.includes('FINANCIALS')
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.3)] font-bold'
                  : 'bg-neutral-900/90 border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle Financials wire feed on/off"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${selectedSectors.includes('FINANCIALS') ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
              <span>FINANCIALS</span>
            </button>

            {/* Combo Preset: AI + Energy + Fin */}
            <button
              onClick={selectCoreTrio}
              className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-all ${
                isTrioSelected
                  ? 'bg-cyan-900/50 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-cyan-300 hover:border-neutral-700'
              }`}
              title="Select AI/Semis, Energy, and Financials together"
            >
              TRIO (AI+NRG+FIN)
            </button>

            {/* Select All */}
            <button
              onClick={selectAllSectors}
              className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                isAllSelected
                  ? 'bg-neutral-800 text-cyan-300 border-neutral-700 font-bold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border-neutral-800'
              }`}
              title="Enable all 7 sector feeds"
            >
              ALL
            </button>

            {/* Clear All */}
            <button
              onClick={clearAllSectors}
              className="px-2 py-0.5 rounded text-[9px] font-mono bg-neutral-900 text-neutral-500 hover:text-rose-300 border border-neutral-800 hover:border-rose-900/50 transition-colors"
              title="Mute all sector feeds"
            >
              CLEAR
            </button>
          </div>
        </div>

        {/* Sector Multi-Select Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-800">
          {SECTOR_CONFIGS.map((sec) => {
            const isSelected = selectedSectors.includes(sec.id);
            const count = sectorCounts[sec.id] || 0;

            return (
              <div
                key={sec.id}
                className="group relative flex items-center shrink-0"
              >
                <button
                  onClick={() => toggleSector(sec.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-all border font-mono ${
                    isSelected
                      ? `${sec.activeBg} ${sec.activeBorder} ${sec.activeText} shadow-[0_0_10px_rgba(6,182,212,0.18)] font-bold`
                      : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 opacity-60 hover:opacity-100'
                  }`}
                  title={`${sec.description} — Click to toggle`}
                >
                  {/* Visual Checkbox Indicator */}
                  <span
                    className={`flex items-center justify-center w-3 h-3 rounded transition-colors ${
                      isSelected
                        ? sec.badgeActive
                        : 'border border-neutral-700 bg-neutral-900 text-transparent'
                    }`}
                  >
                    {isSelected ? <Check className="w-2 h-2 stroke-[3]" /> : null}
                  </span>

                  <span>{sec.label}</span>

                  <span
                    className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? sec.badgeActive
                        : 'bg-neutral-900 text-neutral-600 border border-neutral-800'
                    }`}
                  >
                    {count}
                  </span>
                </button>

                {/* Quick Solo Hover Trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soloSector(sec.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 ml-1 px-1 py-0.5 rounded text-[8px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-cyan-300 transition-opacity"
                  title={`Show ONLY ${sec.label}`}
                >
                  SOLO
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtered Active Tags Banner (visible when filtered) */}
      {!isAllSelected && selectedSectors.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/20 border-b border-cyan-900/30 text-[10px] overflow-x-auto scrollbar-none">
          <span className="text-[9px] uppercase font-bold text-cyan-400 shrink-0 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            FILTERED FEEDS ({selectedSectors.length}):
          </span>
          {selectedSectors.map((secId) => {
            const sec = SECTOR_CONFIGS.find((s) => s.id === secId);
            return (
              <span
                key={secId}
                className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-neutral-900/90 border border-neutral-700 text-neutral-200 text-[9px] shrink-0 font-mono"
              >
                <span>{sec?.label || secId}</span>
                <button
                  onClick={() => toggleSector(secId)}
                  className="text-neutral-500 hover:text-rose-400 transition-colors ml-0.5 font-bold"
                  title={`Remove ${sec?.label || secId} from filter`}
                >
                  ✕
                </button>
              </span>
            );
          })}
          <button
            onClick={selectAllSectors}
            className="ml-auto text-[9px] text-cyan-400 hover:text-cyan-300 underline shrink-0 cursor-pointer font-mono"
          >
            Reset to All
          </button>
        </div>
      )}

      {/* Search & Sentiment Quick Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-neutral-800/80 bg-[#060a0e] text-[11px]">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="w-3 h-3 text-neutral-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headline, ticker ($NVDA, $XOM, $JPM), source..."
            className="w-full pl-7 pr-6 py-1 bg-neutral-950 border border-neutral-800 focus:border-cyan-500 focus:outline-none rounded text-[11px] font-mono text-slate-200 placeholder-neutral-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sentiment Filter Tabs */}
        <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded p-0.5 text-[10px]">
          {(['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'] as const).map((sent) => (
            <button
              key={sent}
              onClick={() => setSentimentFilter(sent)}
              className={`px-2 py-0.5 rounded font-mono transition-colors ${
                sentimentFilter === sent
                  ? sent === 'BULLISH'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/60 font-bold'
                    : sent === 'BEARISH'
                    ? 'bg-rose-950 text-rose-300 border border-rose-600/60 font-bold'
                    : sent === 'NEUTRAL'
                    ? 'bg-slate-800 text-slate-200 border border-slate-600 font-bold'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {sent === 'BULLISH' && '▲ '}
              {sent === 'BEARISH' && '▼ '}
              {sent === 'NEUTRAL' && '◆ '}
              {sent}
            </button>
          ))}
        </div>
      </div>

      {/* Headlines List Feed */}
      <div 
        ref={listContainerRef}
        className="flex-1 overflow-y-auto divide-y divide-neutral-900/90 scrollbar-thin scrollbar-thumb-neutral-800"
      >
        {filteredHeadlines.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
            <Newspaper className="w-8 h-8 text-neutral-700 stroke-[1.5]" />
            <p className="text-slate-300 font-medium">
              {isNoneSelected
                ? 'All sector news feeds are currently muted.'
                : 'No headlines found matching active criteria.'}
            </p>
            <p className="text-[10px] text-neutral-500 max-w-sm">
              {isNoneSelected
                ? 'Toggle on AI/Semis, Energy, Financials, or other sectors above to resume streaming financial headlines.'
                : 'Try adjusting your sector multi-select filters, search query, or sentiment options.'}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-cyan-400 text-[10px]"
                >
                  Clear Search Query
                </button>
              )}
              {selectedSectors.length < ALL_SECTORS.length && (
                <>
                  <button
                    onClick={selectAllSectors}
                    className="px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-700 hover:border-cyan-500 text-cyan-300 text-[10px] font-bold"
                  >
                    Enable All Feeds
                  </button>
                  <button
                    onClick={selectCoreTrio}
                    className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 hover:border-cyan-600 text-neutral-200 text-[10px]"
                  >
                    Enable Core Trio (AI+Energy+Fin)
                  </button>
                  {!selectedSectors.includes('TECH') && (
                    <button
                      onClick={() => toggleSector('TECH')}
                      className="px-2.5 py-1 rounded bg-neutral-900 border border-cyan-800 text-cyan-300 text-[10px]"
                    >
                      + AI / Semis
                    </button>
                  )}
                  {!selectedSectors.includes('ENERGY') && (
                    <button
                      onClick={() => toggleSector('ENERGY')}
                      className="px-2.5 py-1 rounded bg-neutral-900 border border-orange-800 text-orange-300 text-[10px]"
                    >
                      + Energy
                    </button>
                  )}
                  {!selectedSectors.includes('FINANCIALS') && (
                    <button
                      onClick={() => toggleSector('FINANCIALS')}
                      className="px-2.5 py-1 rounded bg-neutral-900 border border-emerald-800 text-emerald-300 text-[10px]"
                    >
                      + Financials
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          filteredHeadlines.map((item) => {
            const isFlash = newFlashId === item.id;
            const isExpanded = expandedId === item.id;
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className={`p-3 transition-all duration-300 hover:bg-[#0b131a] relative ${
                  isFlash
                    ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]'
                    : 'border-l-2 border-l-transparent'
                }`}
              >
                {/* Headline Meta Strip */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1 text-[10px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Urgency Badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded font-extrabold uppercase text-[9px] border tracking-wide ${
                        item.urgency === 'BREAKING'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-500/80 animate-pulse'
                          : item.urgency === 'ALERT'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-600/70'
                          : item.urgency === 'FLASH'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-600/70'
                          : 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                      }`}
                    >
                      {item.urgency}
                    </span>

                    {/* Time Stamp */}
                    <span className="text-neutral-400 flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5 text-neutral-500" />
                      {item.timeStr}
                    </span>

                    {/* Source Tag */}
                    <span className="px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold text-[9px]">
                      {item.source}
                    </span>

                    {/* Sector Tag */}
                    <span className={`px-1.5 py-0.2 rounded border font-mono text-[9px] font-semibold ${
                      item.sector === 'TECH'
                        ? 'bg-cyan-950/60 border-cyan-800/80 text-cyan-300'
                        : item.sector === 'ENERGY'
                        ? 'bg-orange-950/60 border-orange-800/80 text-orange-300'
                        : item.sector === 'FINANCIALS'
                        ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                        : item.sector === 'MACRO'
                        ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                        : item.sector === 'METALS'
                        ? 'bg-yellow-950/60 border-yellow-800/80 text-yellow-300'
                        : item.sector === 'HEALTHCARE'
                        ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                        : 'bg-indigo-950/60 border-indigo-800/80 text-indigo-300'
                    }`}>
                      {item.sector === 'TECH' ? 'AI / SEMIS' : item.sector}
                    </span>
                  </div>

                  {/* Sentiment & Impact */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                        item.sentiment === 'BULLISH'
                          ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                          : item.sentiment === 'BEARISH'
                          ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {item.sentiment === 'BULLISH' ? (
                        <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                      ) : item.sentiment === 'BEARISH' ? (
                        <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
                      ) : (
                        <Minus className="w-2.5 h-2.5 text-neutral-400" />
                      )}
                      <span>{item.sentiment}</span>
                    </span>

                    <span className="text-neutral-500 text-[9px] hidden sm:inline" title={`Market Impact Score: ${item.impactScore}/10`}>
                      IMP: <span className="text-neutral-300 font-bold">{item.impactScore}</span>/10
                    </span>
                  </div>
                </div>

                {/* Headline Text */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="cursor-pointer group flex items-start justify-between gap-2 mt-1"
                >
                  <p className="text-[12px] sm:text-[13px] leading-snug font-sans text-slate-100 group-hover:text-cyan-200 transition-colors">
                    {item.headline}
                  </p>
                  <div className="shrink-0 text-neutral-600 group-hover:text-neutral-300 pt-0.5">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>

                {/* Associated Tickers Chips */}
                {item.tickers && item.tickers.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {item.tickers.map((t) => (
                      <span
                        key={t}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery(t);
                        }}
                        className="cursor-pointer px-1.5 py-0.5 rounded bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-800/40 hover:border-cyan-600 text-cyan-300 text-[10px] font-mono font-semibold transition-colors"
                        title={`Filter news for ${t}`}
                      >
                        ${t}
                      </span>
                    ))}

                    {/* Quick action bar */}
                    <div className="ml-auto flex items-center gap-1.5">
                      {/* Broadcast to Tape */}
                      {onBroadcastAlert && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBroadcastHeadline(item);
                          }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-emerald-950 border border-neutral-800 hover:border-emerald-700 text-neutral-400 hover:text-emerald-300 text-[9px] font-mono transition-colors"
                          title="Broadcast headline to terminal tape log"
                        >
                          <Send className="w-2.5 h-2.5 text-emerald-400" />
                          <span>TAPE</span>
                        </button>
                      )}

                      {/* Copy Headline */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyHeadline(item);
                        }}
                        className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-[9px] transition-colors"
                        title="Copy headline text"
                      >
                        {isCopied ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Drawer: Wire summary and contextual analysis */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-neutral-800/80 bg-neutral-950/60 p-2.5 rounded text-[11px] font-mono animate-fadeIn">
                    <div className="text-neutral-300 leading-relaxed font-sans mb-2">
                      <span className="text-cyan-400 font-mono font-bold mr-1">WIRE NOTE:</span>
                      {item.summary}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-900 text-[10px] text-neutral-400">
                      <div className="flex items-center gap-3">
                        <span>ORIGIN: <strong className="text-slate-200">{item.source} WIRE DESK</strong></span>
                        <span>•</span>
                        <span>IMPACT LEVEL: <strong className="text-amber-400">{item.impactScore}/10</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBroadcastHeadline(item)}
                          className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/70 text-emerald-300 text-[9px] hover:bg-emerald-900/80 flex items-center gap-1"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>DISPATCH TO ORDERBOOK TAPE</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="px-3 py-1.5 border-t border-neutral-800/80 bg-[#060a0e] flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              FEEDS: {isAllSelected ? 'ALL (7/7 ACTIVE)' : isNoneSelected ? 'NONE ACTIVE' : `${selectedSectors.length} ACTIVE (${selectedSectors.map(s => s === 'TECH' ? 'AI' : s === 'ENERGY' ? 'NRG' : s === 'FINANCIALS' ? 'FIN' : s).join(', ')})`}
            </span>
          </span>
          <span>•</span>
          <span>SIMULATED API: ONLINE</span>
        </div>
        <div className="flex items-center gap-2">
          <span>TICK RATE: Every {streamIntervalSec}s</span>
          <span>•</span>
          <span className="text-neutral-400">CACHED: {headlines.length} WIRES</span>
        </div>
      </div>
    </div>
  );
}
