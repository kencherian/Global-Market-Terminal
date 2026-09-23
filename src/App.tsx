import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  WidgetConfig, 
  DataAdapterMode, 
  CandleData, 
  MarketIndex, 
  HeatmapStock, 
  CommodityMetal, 
  WorldClockSession, 
  TerminalAlert 
} from './types';
import { 
  generateAAPL60Sessions, 
  INITIAL_INDICES, 
  INITIAL_HEATMAP_STOCKS, 
  INITIAL_METALS, 
  calculateWorldSessions 
} from './services/dataAdapter';
import { generateOfflineZip } from './services/exportBundle';
import { playTerminalTick, playTerminalAlarm } from './services/soundEffects';
import { TerminalHeader } from './components/TerminalHeader';
import { CanvasGrid } from './components/CanvasGrid';
import { WorldSessionClocksWidget } from './components/widgets/WorldSessionClocksWidget';
import { GlobalIndicesWidget } from './components/widgets/GlobalIndicesWidget';
import { HeatmapWidget } from './components/widgets/HeatmapWidget';
import { AaplChartWidget } from './components/widgets/AaplChartWidget';
import { PreciousMetalsWidget } from './components/widgets/PreciousMetalsWidget';
import { TerminalTapeWidget } from './components/widgets/TerminalTapeWidget';

const STORAGE_KEY = 'mkt_terminal_layout_v2';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'w-world-clocks',
    type: 'world_clocks',
    title: 'WORLD SESSION CLOCKS & UTC OVERLAP TIMELINE',
    category: 'SYNCHRONIZATION',
    colSpan: 4,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-aapl-chart',
    type: 'aapl_chart',
    title: 'AAPL.US — 60-SESSION TECHNICAL CHART & RSI',
    category: 'TECHNICAL ANALYSIS',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-sector-heatmap',
    type: 'sector_heatmap',
    title: 'AI / ENERGY / FINANCIALS SECTOR HEATMAP',
    category: 'HEATMAP ENGINE',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-global-indices',
    type: 'global_indices',
    title: 'GLOBAL EQUITY INDICES MONITOR',
    category: 'GLOBAL BENCHMARKS',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-precious-metals',
    type: 'precious_metals',
    title: 'PRECIOUS METALS & COMMODITIES MATRIX',
    category: 'COMMODITY SPREADS',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-terminal-tape',
    type: 'terminal_tape',
    title: 'ORDERBOOK & TICKER LOG STREAM',
    category: 'TELEMETRY',
    colSpan: 4,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
];

export default function App() {
  // Persistence for Widgets layout
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved layout from localStorage', e);
    }
    return DEFAULT_WIDGETS;
  });

  // Save layout to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (e) {
      console.warn('Failed to save layout to localStorage', e);
    }
  }, [widgets]);

  // Terminal preferences & mode
  const [adapterMode, setAdapterMode] = useState<DataAdapterMode>('live');
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [crtEnabled, setCrtEnabled] = useState<boolean>(false);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Telemetry metrics
  const [tickCount, setTickCount] = useState<number>(1420);
  const [latencyMs, setLatencyMs] = useState<number>(12);
  const [utcTimeStr, setUtcTimeStr] = useState<string>('');
  const [utcHours, setUtcHours] = useState<number>(14.5);

  // Datasets
  const [aaplData, setAaplData] = useState<CandleData[]>(() => generateAAPL60Sessions());
  const [indicesData, setIndicesData] = useState<MarketIndex[]>(INITIAL_INDICES);
  const [heatmapData, setHeatmapData] = useState<HeatmapStock[]>(INITIAL_HEATMAP_STOCKS);
  const [metalsData, setMetalsData] = useState<CommodityMetal[]>(INITIAL_METALS);
  const [worldSessions, setWorldSessions] = useState<WorldClockSession[]>(() => calculateWorldSessions());

  // Flash highlight animations
  const [flashSymbols, setFlashSymbols] = useState<Set<string>>(new Set());
  const [flashTickers, setFlashTickers] = useState<Set<string>>(new Set());
  const [aaplFlash, setAaplFlash] = useState<boolean>(false);

  // Terminal Price Threshold Alert Flash State
  const [terminalAlertFlash, setTerminalAlertFlash] = useState<{
    symbol: string;
    price: number;
    threshold: number;
    time: string;
  } | null>(null);

  // Terminal log stream
  const [alerts, setAlerts] = useState<TerminalAlert[]>([
    { id: '1', timestamp: '15:42:01.210', level: 'NOTICE', source: 'NASDAQ', text: 'AAPL BLOCK TRADE: 15,000 SHARES @ $231.40 EX:NSDQ' },
    { id: '2', timestamp: '15:42:00.890', level: 'SPIKE', source: 'HEATMAP', text: 'NVDA ACCELERATION: VOLUME 64M (+3.42%)' },
    { id: '3', timestamp: '15:41:59.400', level: 'INFO', source: 'NYSE', text: 'ORDERBOOK BALANCED. SPREADS TIGHTENING ACROSS FINANCIALS' },
    { id: '4', timestamp: '15:41:58.120', level: 'NOTICE', source: 'LSE', text: 'XAU/USD GOLD FIX: 2658.65 BID/ASK BALANCED' },
  ]);

  // Audio ref to avoid stale state in timer
  const audioEnabledRef = useRef(audioEnabled);
  audioEnabledRef.current = audioEnabled;

  // Threshold alert trigger handler that flashes the entire terminal
  const handleAaplThresholdHit = useCallback((price: number, threshold: number) => {
    const now = new Date();
    const timeStr = `${now.toISOString().substring(11, 19)}.${Math.floor(Math.random() * 900 + 100)}`;

    setTerminalAlertFlash({
      symbol: 'AAPL',
      price,
      threshold,
      time: timeStr,
    });

    if (audioEnabledRef.current) {
      playTerminalAlarm();
    }

    setAlerts((prev) => [
      {
        id: String(Date.now()),
        timestamp: timeStr,
        level: 'SPIKE',
        source: 'THRESHOLD-HIT',
        text: `⚠️ AAPL PRICE THRESHOLD TRIGGERED: Reached $${price.toFixed(2)} (Alert Limit: $${threshold.toFixed(2)})`,
      },
      ...prev.slice(0, 50),
    ]);

    setTimeout(() => {
      setTerminalAlertFlash(null);
    }, 4500);
  }, []);

  useEffect(() => {
    const handleGlobalAlert = (e: any) => {
      const detail = e.detail;
      if (detail && detail.price) {
        handleAaplThresholdHit(detail.price, detail.threshold);
      }
    };
    window.addEventListener('terminal-price-threshold-hit', handleGlobalAlert);
    return () => window.removeEventListener('terminal-price-threshold-hit', handleGlobalAlert);
  }, [handleAaplThresholdHit]);

  // Real-time clock and Session update loop (every 1000ms)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTimeStr(now.toISOString().substring(11, 19));
      setUtcHours(now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600);
      setWorldSessions(calculateWorldSessions(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tick generator loop based on simSpeed and isPaused
  useEffect(() => {
    if (isPaused) return;

    const intervalMs = Math.max(1200 / simSpeed, 250);

    const tickInterval = setInterval(() => {
      setTickCount((prev) => prev + 1);
      setLatencyMs(Math.round(8 + Math.random() * 9));

      const randEvent = Math.random();

      // 1. AAPL Micro-Tick Update
      if (randEvent < 0.65) {
        setAaplData((prev) => {
          if (!prev.length) return prev;
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          const last = { ...copy[lastIdx] };

          const delta = (Math.random() - 0.48) * 0.45;
          const newClose = Math.round((last.close + delta) * 100) / 100;
          last.close = newClose;
          last.high = Math.max(last.high, newClose);
          last.low = Math.min(last.low, newClose);
          last.volume += Math.round(15000 + Math.random() * 45000);

          copy[lastIdx] = last;
          return copy;
        });

        setAaplFlash(true);
        setTimeout(() => setAaplFlash(false), 400);

        if (audioEnabledRef.current && Math.random() < 0.4) {
          playTerminalTick(randEvent < 0.5);
        }
      }

      // 2. Indices Micro-Tick Update
      if (randEvent < 0.45) {
        const randomIndexIdx = Math.floor(Math.random() * indicesData.length);
        const target = indicesData[randomIndexIdx];
        if (target) {
          const deltaPct = (Math.random() - 0.49) * 0.08;
          const newPrice = Math.round((target.price * (1 + deltaPct / 100)) * 100) / 100;
          const newChg = Math.round((target.change + (newPrice - target.price)) * 100) / 100;
          const newPct = Math.round((target.changePercent + deltaPct) * 100) / 100;

          setIndicesData((prev) => {
            const next = [...prev];
            next[randomIndexIdx] = {
              ...target,
              price: newPrice,
              change: newChg,
              changePercent: newPct,
              dayHigh: Math.max(target.dayHigh, newPrice),
              dayLow: Math.min(target.dayLow, newPrice),
            };
            return next;
          });

          setFlashSymbols((prev) => {
            const n = new Set(prev);
            n.add(target.symbol);
            return n;
          });

          setTimeout(() => {
            setFlashSymbols((prev) => {
              const n = new Set(prev);
              n.delete(target.symbol);
              return n;
            });
          }, 500);
        }
      }

      // 3. Heatmap Micro-Tick Update
      if (randEvent < 0.4) {
        const randomStockIdx = Math.floor(Math.random() * heatmapData.length);
        const st = heatmapData[randomStockIdx];
        if (st) {
          const deltaPct = (Math.random() - 0.48) * 0.15;
          const newPrice = Math.round((st.price * (1 + deltaPct / 100)) * 100) / 100;
          const newPct = Math.round((st.changePercent + deltaPct) * 100) / 100;

          setHeatmapData((prev) => {
            const next = [...prev];
            next[randomStockIdx] = {
              ...st,
              price: newPrice,
              changePercent: newPct,
            };
            return next;
          });

          setFlashTickers((prev) => {
            const n = new Set(prev);
            n.add(st.ticker);
            return n;
          });

          setTimeout(() => {
            setFlashTickers((prev) => {
              const n = new Set(prev);
              n.delete(st.ticker);
              return n;
            });
          }, 500);
        }
      }

      // 4. Metals Micro-Tick Update
      if (randEvent < 0.35) {
        const randomMetalIdx = Math.floor(Math.random() * metalsData.length);
        const m = metalsData[randomMetalIdx];
        if (m) {
          const delta = (Math.random() - 0.49) * (m.last > 500 ? 0.6 : 0.05);
          const newLast = Math.round((m.last + delta) * 1000) / 1000;
          const spread = Math.abs(m.ask - m.bid);
          const newBid = Math.round((newLast - spread / 2) * 1000) / 1000;
          const newAsk = Math.round((newLast + spread / 2) * 1000) / 1000;

          setMetalsData((prev) => {
            const next = [...prev];
            next[randomMetalIdx] = {
              ...m,
              last: newLast,
              bid: newBid,
              ask: newAsk,
              high24h: Math.max(m.high24h, newLast),
              low24h: Math.min(m.low24h, newLast),
            };
            return next;
          });

          setFlashSymbols((prev) => {
            const n = new Set(prev);
            n.add(m.symbol);
            return n;
          });

          setTimeout(() => {
            setFlashSymbols((prev) => {
              const n = new Set(prev);
              n.delete(m.symbol);
              return n;
            });
          }, 500);
        }
      }

      // 5. Random Orderbook stream event
      if (randEvent < 0.25) {
        const now = new Date();
        const timeStr = `${now.toISOString().substring(11, 19)}.${Math.floor(Math.random() * 900 + 100)}`;
        const sampleQuotes = [
          { s: 'NASDAQ', lvl: 'NOTICE', txt: `NVDA EXECUTED 12,500 @ $139.80 [DARK POOL]` },
          { s: 'ARCA', lvl: 'NOTICE', txt: `SPY ETF SWEEP: $4.2M @ $589.40` },
          { s: 'COMEX', lvl: 'SPIKE', txt: `GOLD FUTURE SPIKE: +$4.20/OZ HIGH MOMENTUM` },
          { s: 'XETRA', lvl: 'INFO', txt: `DAX 40 FUTURES BASKET REBALANCE CONFIRMED` },
          { s: 'HKEX', lvl: 'NOTICE', txt: `TENCENT LARGE BLOCK: 80,000 SHARES` },
        ];
        const pick = sampleQuotes[Math.floor(Math.random() * sampleQuotes.length)];

        setAlerts((prev) => [
          {
            id: String(Date.now()),
            timestamp: timeStr,
            level: pick.lvl as any,
            source: pick.s,
            text: pick.txt,
          },
          ...prev.slice(0, 50),
        ]);
      }
    }, intervalMs);

    return () => clearInterval(tickInterval);
  }, [simSpeed, isPaused, indicesData, heatmapData, metalsData]);

  // Drag and drop reordering
  const handleReorderWidgets = useCallback((sourceId: string, targetId: string) => {
    setWidgets((prev) => {
      const sourceIdx = prev.findIndex((w) => w.id === sourceId);
      const targetIdx = prev.findIndex((w) => w.id === targetId);
      if (sourceIdx < 0 || targetIdx < 0) return prev;

      const next = [...prev];
      const [removed] = next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, removed);
      return next;
    });
  }, []);

  // Column span adjustment (1..4)
  const handleUpdateWidgetSpan = useCallback((id: string, newColSpan: 1 | 2 | 3 | 4) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, colSpan: newColSpan } : w))
    );
  }, []);

  // Minimize / Expand
  const handleToggleMinimize = useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w))
    );
  }, []);

  // Maximize / Fullscreen
  const handleToggleMaximize = useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  }, []);

  // Hide widget
  const handleCloseWidget = useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isVisible: false } : w))
    );
  }, []);

  // Toggle visibility from Add Widget menu
  const handleToggleVisibility = useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isVisible: !w.isVisible } : w))
    );
  }, []);

  // Reset layout to default
  const handleResetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WIDGETS));
    } catch (e) {
      // ignore
    }
  }, []);

  // Export Complete Offline ZIP
  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      const blob = await generateOfflineZip(aaplData, indicesData, heatmapData, metalsData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'global-market-terminal-offline.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export offline zip', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Render individual widget component based on type
  const renderWidgetContent = (widget: WidgetConfig) => {
    switch (widget.type) {
      case 'world_clocks':
        return <WorldSessionClocksWidget sessions={worldSessions} utcHours={utcHours} />;
      case 'aapl_chart':
        return (
          <AaplChartWidget 
            candles={aaplData} 
            liveFlash={aaplFlash} 
            onThresholdHit={handleAaplThresholdHit} 
          />
        );
      case 'sector_heatmap':
        return <HeatmapWidget stocks={heatmapData} flashTickers={flashTickers} />;
      case 'global_indices':
        return <GlobalIndicesWidget indices={indicesData} flashSymbols={flashSymbols} />;
      case 'precious_metals':
        return <PreciousMetalsWidget metals={metalsData} flashSymbols={flashSymbols} />;
      case 'terminal_tape':
        return <TerminalTapeWidget alerts={alerts} onClearAlerts={() => setAlerts([])} />;
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-[#030608] text-slate-200 selection:bg-emerald-500/30 selection:text-emerald-200 terminal-grid ${crtEnabled ? 'crt-effect' : ''}`}>
      {/* Terminal Alert Flash Overlay (Triggered when price hits threshold level) */}
      {terminalAlertFlash && (
        <div className="fixed inset-0 pointer-events-none z-50 transition-all duration-300">
          {/* Strobe perimeter flashing border */}
          <div className="absolute inset-0 border-[4px] sm:border-[8px] border-rose-500 shadow-[inset_0_0_120px_rgba(244,63,94,0.45)] animate-pulse bg-rose-500/10" />

          {/* Floating warning HUD card at top center */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3.5 bg-[#0a0507]/95 border-2 border-rose-500 text-rose-100 px-4 py-2.5 rounded-lg shadow-[0_0_35px_rgba(244,63,94,0.75)] font-mono text-xs backdrop-blur-md animate-bounce">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
              <span className="font-extrabold tracking-widest text-rose-400 uppercase text-[11px] bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">
                ⚡ TERMINAL THRESHOLD HIT
              </span>
              <span className="font-semibold text-white">
                AAPL touched <span className="text-rose-300 font-bold">${terminalAlertFlash.price.toFixed(2)}</span>
              </span>
              <span className="text-rose-300/80 text-[10px]">
                [Alert Level: ${terminalAlertFlash.threshold.toFixed(2)} • {terminalAlertFlash.time}]
              </span>
            </div>
            <button
              onClick={() => setTerminalAlertFlash(null)}
              className="ml-2 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[10px] tracking-wide transition-colors cursor-pointer"
              title="Dismiss Terminal Alert Flash"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Top terminal status & controls bar */}
      <TerminalHeader
        adapterMode={adapterMode}
        onToggleAdapterMode={() => setAdapterMode(adapterMode === 'live' ? 'demo' : 'live')}
        simSpeed={simSpeed}
        onChangeSimSpeed={setSimSpeed}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        crtEnabled={crtEnabled}
        onToggleCrt={() => setCrtEnabled(!crtEnabled)}
        audioEnabled={audioEnabled}
        onToggleAudio={() => setAudioEnabled(!audioEnabled)}
        widgets={widgets}
        onToggleWidgetVisibility={handleToggleVisibility}
        onResetLayout={handleResetLayout}
        onExportZip={handleExportZip}
        isExporting={isExporting}
        tickCount={tickCount}
        latencyMs={latencyMs}
        utcTimeStr={utcTimeStr}
      />

      {/* Main Drag-and-Drop Canvas Workspace */}
      <main>
        <CanvasGrid
          widgets={widgets}
          onReorderWidgets={handleReorderWidgets}
          onUpdateWidgetSpan={handleUpdateWidgetSpan}
          onToggleMinimize={handleToggleMinimize}
          onToggleMaximize={handleToggleMaximize}
          onCloseWidget={handleCloseWidget}
          renderWidgetContent={renderWidgetContent}
        />
      </main>

      {/* Bottom Terminal Status Footer */}
      <footer className="border-t border-neutral-800/80 bg-[#05080a] px-4 py-2 text-[11px] font-mono text-neutral-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-neutral-400">DATA FEED: {adapterMode.toUpperCase()}</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span>LAYOUT: LOCALSTORAGE CACHED</span>
          <span className="text-neutral-600">|</span>
          <span className="hidden sm:inline">60-SESSION AAPL OHLC + INDICATORS (SMA/EMA/BOLL/RSI)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-400">DRAG TITLEBAR TO REORDER</span>
          <span className="text-neutral-600">•</span>
          <span className="text-emerald-500">TERMINAL v2.4.0</span>
        </div>
      </footer>
    </div>
  );
}
