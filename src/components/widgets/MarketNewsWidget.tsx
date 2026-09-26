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
  ExternalLink, 
  Check, 
  Copy, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  AlertTriangle,
  Clock,
  Sparkles,
  Tag
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

const SECTOR_OPTIONS: { id: NewsSector; label: string; iconTag: string; color: string }[] = [
  { id: 'ALL', label: 'ALL WIRES', iconTag: 'ALL', color: 'border-slate-500 text-slate-200' },
  { id: 'TECH', label: 'TECH / AI', iconTag: 'TECH', color: 'border-cyan-500 text-cyan-300' },
  { id: 'MACRO', label: 'MACRO / RATES', iconTag: 'MACRO', color: 'border-amber-500 text-amber-300' },
  { id: 'FINANCIALS', label: 'FINANCIALS', iconTag: 'FIN', color: 'border-emerald-500 text-emerald-300' },
  { id: 'ENERGY', label: 'ENERGY / OIL', iconTag: 'NRG', color: 'border-orange-500 text-orange-300' },
  { id: 'METALS', label: 'METALS / COMM', iconTag: 'MET', color: 'border-yellow-500 text-yellow-300' },
  { id: 'HEALTHCARE', label: 'HEALTHCARE', iconTag: 'HLTH', color: 'border-rose-500 text-rose-300' },
  { id: 'CONSUMER', label: 'CONSUMER', iconTag: 'CONS', color: 'border-indigo-500 text-indigo-300' },
];

export function MarketNewsWidget({
  onBroadcastAlert,
  audioEnabled = false,
}: MarketNewsWidgetProps) {
  const [headlines, setHeadlines] = useState<MarketNewsItem[]>(INITIAL_NEWS_HEADLINES);
  const [selectedSector, setSelectedSector] = useState<NewsSector>('ALL');
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

  // Fetch news from simulated API
  const handleFetchNews = useCallback(async (sector: NewsSector = selectedSector) => {
    setIsLoading(true);
    try {
      const data = await fetchMarketNewsApi(sector, searchQuery);
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
  }, [selectedSector, searchQuery]);

  // Simulated live news ticker stream: pushes incoming wire every interval
  useEffect(() => {
    if (!isStreaming) return;

    const timer = setInterval(() => {
      const newTick = generateSimulatedNewsTick(selectedSector === 'ALL' ? undefined : selectedSector);
      
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
  }, [isStreaming, selectedSector, streamIntervalSec, soundAlerts]);

  // Handle immediate inject of a simulated wire
  const handleInjectWire = () => {
    const newTick = generateSimulatedNewsTick(selectedSector === 'ALL' ? undefined : selectedSector);
    setHeadlines((prev) => [newTick, ...prev]);
    setNewFlashId(newTick.id);
    if (soundAlerts) {
      playTerminalTick(true);
    }
    setTimeout(() => {
      setNewFlashId(null);
    }, 2500);
  };

  // Filter headlines by sector, sentiment, and keyword
  const filteredHeadlines = useMemo(() => {
    return headlines.filter((item) => {
      // Sector filter
      if (selectedSector !== 'ALL' && item.sector !== selectedSector) {
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
  }, [headlines, selectedSector, sentimentFilter, searchQuery]);

  // Sector counts
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
      onBroadcastAlert({
        level,
        source: `NEWS::${item.source}`,
        text: `[${item.sector}] ${item.headline} (${item.tickers.join(', ')})`,
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
            onClick={() => handleFetchNews(selectedSector)}
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

      {/* Sector Filter Pills Bar */}
      <div className="px-3 pt-2.5 pb-2 border-b border-neutral-800/70 bg-[#070c10]">
        <div className="flex items-center justify-between gap-1 mb-1.5 text-[10px] text-neutral-400">
          <div className="flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
            <span className="uppercase font-semibold tracking-wider text-slate-300">SECTOR FILTER</span>
          </div>
          <span className="text-neutral-500 text-[9px]">Select sector to narrow real-time wire feed</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-800">
          {SECTOR_OPTIONS.map((sec) => {
            const isSelected = selectedSector === sec.id;
            const count = sectorCounts[sec.id] || 0;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setSelectedSector(sec.id);
                  handleFetchNews(sec.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-all border font-mono ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold'
                    : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800/60'
                }`}
              >
                <span>{sec.label}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Sentiment Quick Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-neutral-800/80 bg-[#060a0e] text-[11px]">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="w-3 h-3 text-neutral-500 absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headline, ticker ($AAPL, $NVDA), source..."
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
            <p>No headlines found matching criteria.</p>
            <div className="flex items-center gap-2 mt-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-cyan-400 text-[10px]"
                >
                  Clear Search Query
                </button>
              )}
              {selectedSector !== 'ALL' && (
                <button
                  onClick={() => setSelectedSector('ALL')}
                  className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-cyan-400 text-[10px]"
                >
                  View All Sectors
                </button>
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
                    <span className="px-1.5 py-0.2 rounded bg-neutral-900/90 border border-neutral-800 text-cyan-400/90 font-mono text-[9px]">
                      {item.sector}
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
            <span>SECTOR: {selectedSector}</span>
          </span>
          <span>•</span>
          <span>SIMULATED API: ACTIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span>STREAM RATE: Every {streamIntervalSec}s</span>
          <span>•</span>
          <span className="text-neutral-400">WIRES IN CACHE: {headlines.length}</span>
        </div>
      </div>
    </div>
  );
}
