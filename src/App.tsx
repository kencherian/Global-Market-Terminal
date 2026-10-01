import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  WidgetConfig, 
  DataAdapterMode, 
  CandleData, 
  MarketIndex, 
  HeatmapStock, 
  CommodityMetal, 
  WorldClockSession, 
  TerminalAlert,
  RsiDivergence,
  WatchlistAsset,
  PushTerminalNotification,
  TreasuryYield,
  TerminalTheme,
  CryptoAsset,
  CryptoMarketOverview
} from './types';
import { BellRing, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { 
  generateAAPL60Sessions, 
  INITIAL_INDICES, 
  INITIAL_HEATMAP_STOCKS, 
  INITIAL_METALS, 
  INITIAL_WATCHLIST_ASSETS,
  INITIAL_TREASURY_YIELDS,
  INITIAL_CRYPTO_ASSETS,
  INITIAL_CRYPTO_MARKET_OVERVIEW,
  MARKET_CATALOG_ASSETS,
  calculateWorldSessions 
} from './services/dataAdapter';
import { generateOfflineZip } from './services/exportBundle';
import { playTerminalTick, playTerminalAlarm } from './services/soundEffects';
import { formatDivergenceAlert } from './services/divergenceDetector';
import { TerminalHeader } from './components/TerminalHeader';
import { CanvasGrid } from './components/CanvasGrid';
import { WorldSessionClocksWidget } from './components/widgets/WorldSessionClocksWidget';
import { GlobalIndicesWidget } from './components/widgets/GlobalIndicesWidget';
import { HeatmapWidget } from './components/widgets/HeatmapWidget';
import { AaplChartWidget } from './components/widgets/AaplChartWidget';
import { PreciousMetalsWidget } from './components/widgets/PreciousMetalsWidget';
import { TerminalTapeWidget } from './components/widgets/TerminalTapeWidget';
import { MarketSentimentWidget } from './components/widgets/MarketSentimentWidget';
import { MarketNewsWidget } from './components/widgets/MarketNewsWidget';
import { MarketWatchlistWidget } from './components/widgets/MarketWatchlistWidget';
import { YieldCurveWidget } from './components/widgets/YieldCurveWidget';
import { CryptoWatchlistWidget } from './components/widgets/CryptoWatchlistWidget';
import { CryptoHeatmapWidget } from './components/widgets/CryptoHeatmapWidget';

const STORAGE_KEY = 'mkt_terminal_layout_v3';

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
    id: 'w-market-sentiment',
    type: 'market_sentiment',
    title: 'MARKET SENTIMENT & GEMINI QUANT ENGINE',
    category: 'AI SENTIMENT GAUGE',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-market-news',
    type: 'market_news',
    title: 'MARKET NEWS FEED // REAL-TIME WIRES',
    category: 'REAL-TIME WIRES',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-crypto-heatmap',
    type: 'crypto_heatmap',
    title: 'CRYPTOCURRENCY MARKET HEATMAP // DOMINANCE & SECTOR BLOCKS',
    category: 'CRYPTO HEATMAP',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-crypto-watchlist',
    type: 'crypto_watchlist',
    title: 'CRYPTOCURRENCY WATCHLIST // DIGITAL ASSETS & DOMINANCE',
    category: 'CRYPTO ASSETS',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-market-watchlist',
    type: 'market_watchlist',
    title: 'MARKET WATCHLIST // CUSTOM ASSET MONITOR',
    category: 'WATCHLIST',
    colSpan: 2,
    isVisible: true,
    isMinimized: false,
    isMaximized: false,
  },
  {
    id: 'w-yield-curve',
    type: 'yield_curve',
    title: 'US TREASURY YIELD CURVE // 2Y-10Y INVERSION & RECESSION GAUGE',
    category: 'MACRO & RATES',
    colSpan: 2,
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

let alertGlobalSeq = 1000;
export function generateUniqueAlertId(prefix = 'alert'): string {
  alertGlobalSeq++;
  return `${prefix}-${Date.now()}-${alertGlobalSeq}-${Math.random().toString(36).substring(2, 7)}`;
}

export default function App() {
  // Persistence for Widgets layout
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        let parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasSentiment = parsed.some((w: WidgetConfig) => w.type === 'market_sentiment');
          if (!hasSentiment) {
            const sentimentWidget: WidgetConfig = {
              id: 'w-market-sentiment',
              type: 'market_sentiment',
              title: 'MARKET SENTIMENT & GEMINI QUANT ENGINE',
              category: 'AI SENTIMENT GAUGE',
              colSpan: 2,
              isVisible: true,
              isMinimized: false,
              isMaximized: false,
            };
            parsed = [parsed[0], sentimentWidget, ...parsed.slice(1)];
          }

          const hasNews = parsed.some((w: WidgetConfig) => w.type === 'market_news');
          if (!hasNews) {
            const newsWidget: WidgetConfig = {
              id: 'w-market-news',
              type: 'market_news',
              title: 'MARKET NEWS FEED // REAL-TIME WIRES',
              category: 'REAL-TIME WIRES',
              colSpan: 2,
              isVisible: true,
              isMinimized: false,
              isMaximized: false,
            };
            const sentimentIdx = parsed.findIndex((w: WidgetConfig) => w.type === 'market_sentiment');
            if (sentimentIdx !== -1) {
              parsed = [
                ...parsed.slice(0, sentimentIdx + 1),
                newsWidget,
                ...parsed.slice(sentimentIdx + 1),
              ];
            } else {
              parsed = [parsed[0], newsWidget, ...parsed.slice(1)];
            }
          }

          const hasWatchlist = parsed.some((w: WidgetConfig) => w.type === 'market_watchlist');
          if (!hasWatchlist) {
            const watchlistWidget: WidgetConfig = {
              id: 'w-market-watchlist',
              type: 'market_watchlist',
              title: 'MARKET WATCHLIST // CUSTOM ASSET MONITOR',
              category: 'WATCHLIST',
              colSpan: 2,
              isVisible: true,
              isMinimized: false,
              isMaximized: false,
            };
            const newsIdx = parsed.findIndex((w: WidgetConfig) => w.type === 'market_news');
            if (newsIdx !== -1) {
              parsed = [
                ...parsed.slice(0, newsIdx + 1),
                watchlistWidget,
                ...parsed.slice(newsIdx + 1),
              ];
            } else {
              parsed = [...parsed, watchlistWidget];
            }
          }

          const hasYieldCurve = parsed.some((w: WidgetConfig) => w.type === 'yield_curve');
          if (!hasYieldCurve) {
            const yieldCurveWidget: WidgetConfig = {
              id: 'w-yield-curve',
              type: 'yield_curve',
              title: 'US TREASURY YIELD CURVE // 2Y-10Y INVERSION & RECESSION GAUGE',
              category: 'MACRO & RATES',
              colSpan: 2,
              isVisible: true,
              isMinimized: false,
              isMaximized: false,
            };
            const watchlistIdx = parsed.findIndex((w: WidgetConfig) => w.type === 'market_watchlist');
            if (watchlistIdx !== -1) {
              parsed = [
                ...parsed.slice(0, watchlistIdx + 1),
                yieldCurveWidget,
                ...parsed.slice(watchlistIdx + 1),
              ];
            } else {
              parsed = [...parsed, yieldCurveWidget];
            }
          }

          const hasCryptoWatchlist = parsed.some((w: WidgetConfig) => w.type === 'crypto_watchlist');
          if (!hasCryptoWatchlist) {
            const cryptoWidget: WidgetConfig = {
              id: 'w-crypto-watchlist',
              type: 'crypto_watchlist',
              title: 'CRYPTOCURRENCY WATCHLIST // DIGITAL ASSETS & DOMINANCE',
              category: 'CRYPTO ASSETS',
              colSpan: 2,
              isVisible: true,
              isMinimized: false,
              isMaximized: false,
            };
            const newsIdx = parsed.findIndex((w: WidgetConfig) => w.type === 'market_news');
            if (newsIdx !== -1) {
              parsed = [
                ...parsed.slice(0, newsIdx + 1),
                cryptoWidget,
                ...parsed.slice(newsIdx + 1),
              ];
            } else {
              parsed = [parsed[0], cryptoWidget, ...parsed.slice(1)];
            }
          }

          const hasCryptoHeatmap = parsed.some((w: WidgetConfig) => w.type === 'crypto_heatmap');
          if (!hasCryptoHeatmap) {
            const cryptoHeatmapWidget: WidgetConfig = {
              id: 'w-crypto-heatmap',
              type: 'crypto_heatmap',
              title: 'CRYPTOCURRENCY MARKET HEATMAP // DOMINANCE & SECTOR BLOCKS',
              category: 'CRYPTO HEATMAP',
              colSpan: 2,
              isVisible: true,
              isMinimized: false,
              isMaximized: false,
            };
            const cryptoWatchlistIdx = parsed.findIndex((w: WidgetConfig) => w.type === 'crypto_watchlist');
            if (cryptoWatchlistIdx !== -1) {
              parsed = [
                ...parsed.slice(0, cryptoWatchlistIdx),
                cryptoHeatmapWidget,
                ...parsed.slice(cryptoWatchlistIdx),
              ];
            } else {
              parsed = [parsed[0], cryptoHeatmapWidget, ...parsed.slice(1)];
            }
          }
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
  const THEME_STORAGE_KEY = 'mkt_terminal_theme_v1';
  const [theme, setTheme] = useState<TerminalTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'financial-paper' || saved === 'deep-space') {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to parse theme from localStorage', e);
    }
    return 'deep-space';
  });

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'deep-space' ? 'financial-paper' : 'deep-space';
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (e) {
        console.warn('Failed to save theme to localStorage', e);
      }
      return next;
    });
  }, []);

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

  // User Custom Watchlist Dataset with persistence
  const [watchlistData, setWatchlistData] = useState<WatchlistAsset[]>(() => {
    try {
      const saved = localStorage.getItem('mkt_user_watchlist_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse watchlist from localStorage', e);
    }
    return INITIAL_WATCHLIST_ASSETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('mkt_user_watchlist_v1', JSON.stringify(watchlistData));
    } catch (e) {
      console.warn('Failed to save watchlist to localStorage', e);
    }
  }, [watchlistData]);

  const handleAddWatchlistAsset = useCallback((asset: WatchlistAsset) => {
    setWatchlistData((prev) => {
      if (prev.some((a) => a.symbol.toUpperCase() === asset.symbol.toUpperCase())) {
        return prev;
      }
      return [asset, ...prev];
    });
  }, []);

  const handleRemoveWatchlistAsset = useCallback((symbol: string) => {
    setWatchlistData((prev) => prev.filter((a) => a.symbol.toUpperCase() !== symbol.toUpperCase()));
  }, []);

  const handleResetWatchlistAssets = useCallback((presetSymbols?: string[]) => {
    if (presetSymbols && presetSymbols.length > 0) {
      const lookup = new Map(MARKET_CATALOG_ASSETS.map((a) => [a.symbol.toUpperCase(), a]));
      const newItems: WatchlistAsset[] = [];
      presetSymbols.forEach((sym) => {
        const found = lookup.get(sym.toUpperCase());
        if (found) newItems.push(found);
      });
      setWatchlistData(newItems.length > 0 ? newItems : INITIAL_WATCHLIST_ASSETS);
    } else {
      setWatchlistData(INITIAL_WATCHLIST_ASSETS);
    }
  }, []);

  const handleToggleWatchlistAlert = useCallback((symbol: string) => {
    setWatchlistData((prev) =>
      prev.map((a) =>
        a.symbol.toUpperCase() === symbol.toUpperCase()
          ? { ...a, alertEnabled: !a.alertEnabled }
          : a
      )
    );
  }, []);

  // Cryptocurrency Watchlist Dataset with persistence
  const [cryptoData, setCryptoData] = useState<CryptoAsset[]>(() => {
    try {
      const saved = localStorage.getItem('mkt_user_crypto_watchlist_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse crypto watchlist from localStorage', e);
    }
    return INITIAL_CRYPTO_ASSETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('mkt_user_crypto_watchlist_v1', JSON.stringify(cryptoData));
    } catch (e) {
      console.warn('Failed to save crypto watchlist to localStorage', e);
    }
  }, [cryptoData]);

  const [cryptoMarketOverview, setCryptoMarketOverview] = useState<CryptoMarketOverview>(INITIAL_CRYPTO_MARKET_OVERVIEW);
  const [flashCryptoSymbols, setFlashCryptoSymbols] = useState<Set<string>>(new Set());

  const handleAddCryptoAsset = useCallback((asset: CryptoAsset) => {
    setCryptoData((prev) => {
      if (prev.some((a) => a.symbol.toUpperCase() === asset.symbol.toUpperCase())) {
        return prev;
      }
      return [asset, ...prev];
    });
  }, []);

  const handleRemoveCryptoAsset = useCallback((symbol: string) => {
    setCryptoData((prev) => prev.filter((a) => a.symbol.toUpperCase() !== symbol.toUpperCase()));
  }, []);

  const handleResetCryptoAssets = useCallback(() => {
    setCryptoData(INITIAL_CRYPTO_ASSETS);
  }, []);

  const handleToggleCryptoAlert = useCallback((symbol: string) => {
    setCryptoData((prev) =>
      prev.map((a) =>
        a.symbol.toUpperCase() === symbol.toUpperCase()
          ? { ...a, alertEnabled: !a.alertEnabled }
          : a
      )
    );
  }, []);

  // Push-style Terminal Notifications for >2% Single-Tick moves
  const [pushNotifications, setPushNotifications] = useState<PushTerminalNotification[]>([]);

  // Auto-dismiss push notifications after 7 seconds
  useEffect(() => {
    if (pushNotifications.length === 0) return;
    const timer = setTimeout(() => {
      setPushNotifications((prev) => prev.slice(0, prev.length - 1));
    }, 7000);
    return () => clearTimeout(timer);
  }, [pushNotifications]);

  const handleDismissPush = useCallback((id: string) => {
    setPushNotifications((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // US Treasury Yields state & flash tenors
  const [yieldData, setYieldData] = useState<TreasuryYield[]>(INITIAL_TREASURY_YIELDS);
  const [flashTenors, setFlashTenors] = useState<Set<string>>(new Set());

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
    { id: 'alert-init-1', timestamp: '15:42:01.210', level: 'NOTICE', source: 'NASDAQ', text: 'AAPL BLOCK TRADE: 15,000 SHARES @ $231.40 EX:NSDQ' },
    { id: 'alert-init-2', timestamp: '15:42:00.890', level: 'SPIKE', source: 'HEATMAP', text: 'NVDA ACCELERATION: VOLUME 64M (+3.42%)' },
    { id: 'alert-init-3', timestamp: '15:41:59.400', level: 'INFO', source: 'NYSE', text: 'ORDERBOOK BALANCED. SPREADS TIGHTENING ACROSS FINANCIALS' },
    { id: 'alert-init-4', timestamp: '15:41:58.120', level: 'NOTICE', source: 'LSE', text: 'XAU/USD GOLD FIX: 2658.65 BID/ASK BALANCED' },
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

    const alertId = generateUniqueAlertId('thresh');
    setAlerts((prev) => [
      {
        id: alertId,
        timestamp: timeStr,
        level: 'SPIKE',
        source: 'THRESHOLD-HIT',
        text: `⚠️ AAPL PRICE THRESHOLD TRIGGERED: Reached $${price.toFixed(2)} (Alert Limit: $${threshold.toFixed(2)})`,
      },
      ...prev.filter((p) => p.id !== alertId).slice(0, 50),
    ]);

    setTimeout(() => {
      setTerminalAlertFlash(null);
    }, 4500);
  }, []);

  // Automated RSI Divergence detection handler: triggers a visual alert in terminal log stream
  const handleAaplDivergenceDetected = useCallback((divergence: RsiDivergence) => {
    const alert = formatDivergenceAlert(divergence);

    setAlerts((prev) => {
      // Prevent duplicate immediate alert if already pushed
      if (prev.some((a) => a.text.includes(divergence.id) || a.text.includes(divergence.summary))) {
        return prev;
      }
      return [alert, ...prev.filter((p) => p.id !== alert.id).slice(0, 50)];
    });

    if (audioEnabledRef.current) {
      playTerminalTick(divergence.type === 'BULLISH');
    }
  }, []);

  // Broadcast any widget alert to the terminal log stream
  const handleBroadcastAlert = useCallback((alert: Omit<TerminalAlert, 'id' | 'timestamp'>) => {
    const alertId = generateUniqueAlertId('bcast');
    const newAlert: TerminalAlert = {
      id: alertId,
      timestamp: new Date().toISOString().substring(11, 23),
      ...alert,
    };
    setAlerts((prev) => [newAlert, ...prev.filter((p) => p.id !== alertId).slice(0, 50)]);
    if (audioEnabledRef.current) {
      playTerminalTick(alert.level !== 'WARNING');
    }
  }, []);

  useEffect(() => {
    const handleGlobalAlert = (e: any) => {
      const detail = e.detail;
      if (detail && detail.price) {
        handleAaplThresholdHit(detail.price, detail.threshold);
      }
    };
    const handleGlobalDivergence = (e: any) => {
      const detail = e.detail;
      if (detail && detail.type) {
        handleAaplDivergenceDetected(detail);
      }
    };

    window.addEventListener('terminal-price-threshold-hit', handleGlobalAlert);
    window.addEventListener('terminal-rsi-divergence-detected', handleGlobalDivergence);
    return () => {
      window.removeEventListener('terminal-price-threshold-hit', handleGlobalAlert);
      window.removeEventListener('terminal-rsi-divergence-detected', handleGlobalDivergence);
    };
  }, [handleAaplThresholdHit, handleAaplDivergenceDetected]);

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

      // 5. Watchlist Micro-Tick Update
      if (randEvent < 0.45) {
        let tickedSymbol = '';
        let triggeredPushNotif: PushTerminalNotification | null = null;

        setWatchlistData((prev) => {
          if (!prev.length) return prev;
          const randomAssetIdx = Math.floor(Math.random() * prev.length);
          const target = prev[randomAssetIdx];
          if (!target) return prev;
          tickedSymbol = target.symbol;

          const isForex = target.category === 'Forex';
          const isCrypto = target.category === 'Crypto';

          // Occasional volatility spike (~15% probability) to trigger >2% moves
          const isVolatilitySpike = Math.random() < 0.15;
          let deltaPct: number;
          if (isVolatilitySpike) {
            const dir = Math.random() > 0.48 ? 1 : -1;
            deltaPct = dir * (2.05 + Math.random() * 2.2); // 2.05% to 4.25% single-tick surge
          } else {
            deltaPct = (Math.random() - 0.48) * (isCrypto ? 0.35 : isForex ? 0.04 : 0.18);
          }

          let newPrice = target.price * (1 + deltaPct / 100);
          newPrice = isForex ? Math.round(newPrice * 10000) / 10000 : Math.round(newPrice * 100) / 100;

          const newChg = isForex
            ? Math.round((target.change + (newPrice - target.price)) * 10000) / 10000
            : Math.round((target.change + (newPrice - target.price)) * 100) / 100;
          const newPct = Math.round((target.changePercent + deltaPct) * 100) / 100;

          // Check if single-tick move is > 2% and push alert is enabled for this asset
          if (Math.abs(deltaPct) >= 2.0 && target.alertEnabled) {
            triggeredPushNotif = {
              id: `push-${Date.now()}-${target.symbol}-${Math.random().toString(36).substring(2, 6)}`,
              symbol: target.symbol,
              name: target.name,
              deltaPct: Math.round(deltaPct * 100) / 100,
              oldPrice: target.price,
              newPrice: newPrice,
              timestamp: new Date().toLocaleTimeString(),
              direction: deltaPct > 0 ? 'up' : 'down',
            };
          }

          const newSparkline = [...(target.sparkline || [target.price])];
          newSparkline.push(newPrice);
          if (newSparkline.length > 8) {
            newSparkline.shift();
          }

          const next = [...prev];
          next[randomAssetIdx] = {
            ...target,
            price: newPrice,
            change: newChg,
            changePercent: newPct,
            dayHigh: Math.max(target.dayHigh, newPrice),
            dayLow: Math.min(target.dayLow, newPrice),
            sparkline: newSparkline,
            lastUpdated: new Date().toLocaleTimeString(),
          };
          return next;
        });

        // Trigger Push-Style Terminal Notification if single tick moved >2% and alert was enabled
        if (triggeredPushNotif) {
          const notif = triggeredPushNotif;
          setPushNotifications((prev) => [notif, ...prev.slice(0, 3)]);

          if (audioEnabledRef.current) {
            playTerminalAlarm();
          }

          // Broadcast alert to Terminal Tape
          const alertId = generateUniqueAlertId('push');
          setAlerts((prev) => [
            {
              id: alertId,
              timestamp: `${new Date().toISOString().substring(11, 19)}.${Math.floor(Math.random() * 900 + 100)}`,
              level: 'SPIKE',
              source: `PUSH::${notif.symbol}`,
              text: `⚡ PUSH ALERT // ${notif.symbol} moved ${notif.direction === 'up' ? '+' : ''}${notif.deltaPct}% in 1 tick ($${notif.oldPrice.toFixed(2)} → $${notif.newPrice.toFixed(2)})`,
            },
            ...prev.slice(0, 50),
          ]);
        }

        if (tickedSymbol) {
          setFlashSymbols((prev) => {
            const n = new Set(prev);
            n.add(tickedSymbol);
            return n;
          });
          setTimeout(() => {
            setFlashSymbols((prev) => {
              const n = new Set(prev);
              n.delete(tickedSymbol);
              return n;
            });
          }, 500);
        }
      }

      // 6. US Treasury Yield Micro-Tick Update
      if (randEvent < 0.35) {
        let tickedTenor = '';
        setYieldData((prev) => {
          if (!prev.length) return prev;
          const randomIdx = Math.floor(Math.random() * prev.length);
          const target = prev[randomIdx];
          if (!target) return prev;
          tickedTenor = target.tenor;

          // Micro-tick: -1.5 bps to +1.5 bps
          const deltaBps = Math.round((Math.random() - 0.49) * 2.5 * 10) / 10;
          const newYield = Math.max(0.05, Math.round((target.yield + deltaBps / 100) * 100) / 100);
          const newChangeBps = Math.round((target.changeBps + deltaBps) * 10) / 10;

          const newSparkline = [...(target.sparkline || [target.yield])];
          newSparkline.push(newYield);
          if (newSparkline.length > 8) newSparkline.shift();

          const next = [...prev];
          next[randomIdx] = {
            ...target,
            yield: newYield,
            changeBps: newChangeBps,
            dayHigh: Math.max(target.dayHigh, newYield),
            dayLow: Math.min(target.dayLow, newYield),
            sparkline: newSparkline,
          };
          return next;
        });

        if (tickedTenor) {
          setFlashTenors((prev) => {
            const n = new Set(prev);
            n.add(tickedTenor);
            return n;
          });
          setTimeout(() => {
            setFlashTenors((prev) => {
              const n = new Set(prev);
              n.delete(tickedTenor);
              return n;
            });
          }, 600);
        }
      }

      // 7. Cryptocurrency Micro-Tick Update
      if (randEvent < 0.48) {
        let tickedCrypto = '';
        setCryptoData((prev) => {
          if (!prev.length) return prev;
          const randomIdx = Math.floor(Math.random() * prev.length);
          const target = prev[randomIdx];
          if (!target) return prev;
          tickedCrypto = target.symbol;

          // Crypto volatility: -0.7% to +0.7% with occasional 2-3% move
          const isSpike = Math.random() < 0.12;
          const deltaPct = isSpike 
            ? (Math.random() > 0.48 ? 1 : -1) * (2.1 + Math.random() * 1.8)
            : (Math.random() - 0.49) * 0.7;

          let newPrice = target.price * (1 + deltaPct / 100);
          if (newPrice > 100) newPrice = Math.round(newPrice * 100) / 100;
          else if (newPrice > 1) newPrice = Math.round(newPrice * 1000) / 1000;
          else newPrice = Math.round(newPrice * 100000000) / 100000000;

          const new1h = Math.round((target.change1h + deltaPct * 0.6) * 100) / 100;
          const new24h = Math.round((target.change24h + deltaPct) * 100) / 100;

          const newSparkline = [...(target.sparkline || [target.price])];
          newSparkline.push(newPrice);
          if (newSparkline.length > 8) newSparkline.shift();

          const next = [...prev];
          next[randomIdx] = {
            ...target,
            price: newPrice,
            change1h: new1h,
            change24h: new24h,
            high24h: Math.max(target.high24h, newPrice),
            low24h: Math.min(target.low24h, newPrice),
            sparkline: newSparkline,
            lastUpdated: new Date().toLocaleTimeString(),
          };
          return next;
        });

        if (tickedCrypto) {
          setFlashCryptoSymbols((prev) => {
            const n = new Set(prev);
            n.add(tickedCrypto);
            return n;
          });
          setTimeout(() => {
            setFlashCryptoSymbols((prev) => {
              const n = new Set(prev);
              n.delete(tickedCrypto);
              return n;
            });
          }, 500);
        }
      }

      // 8. Random Orderbook stream event
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

        const alertId = generateUniqueAlertId('tape');
        setAlerts((prev) => [
          {
            id: alertId,
            timestamp: timeStr,
            level: pick.lvl as any,
            source: pick.s,
            text: pick.txt,
          },
          ...prev.filter((p) => p.id !== alertId).slice(0, 50),
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
      case 'market_sentiment':
        return (
          <MarketSentimentWidget
            indices={indicesData}
            aaplData={aaplData}
            heatmapStocks={heatmapData}
            metals={metalsData}
            onBroadcastAlert={handleBroadcastAlert}
          />
        );
      case 'market_news':
        return (
          <MarketNewsWidget
            onBroadcastAlert={handleBroadcastAlert}
            audioEnabled={audioEnabled}
          />
        );
      case 'crypto_heatmap':
        return (
          <CryptoHeatmapWidget
            assets={cryptoData}
            flashSymbols={flashCryptoSymbols}
            onBroadcastAlert={handleBroadcastAlert}
            theme={theme}
          />
        );
      case 'crypto_watchlist':
        return (
          <CryptoWatchlistWidget
            assets={cryptoData}
            marketOverview={cryptoMarketOverview}
            flashSymbols={flashCryptoSymbols}
            onAddAsset={handleAddCryptoAsset}
            onRemoveAsset={handleRemoveCryptoAsset}
            onResetAssets={handleResetCryptoAssets}
            onToggleAlert={handleToggleCryptoAlert}
            onBroadcastAlert={handleBroadcastAlert}
            audioEnabled={audioEnabled}
            theme={theme}
          />
        );
      case 'market_watchlist':
        return (
          <MarketWatchlistWidget
            assets={watchlistData}
            flashSymbols={flashSymbols}
            onAddAsset={handleAddWatchlistAsset}
            onRemoveAsset={handleRemoveWatchlistAsset}
            onResetAssets={handleResetWatchlistAssets}
            onToggleAlert={handleToggleWatchlistAlert}
            onBroadcastAlert={handleBroadcastAlert}
            audioEnabled={audioEnabled}
          />
        );
      case 'yield_curve':
        return (
          <YieldCurveWidget
            yields={yieldData}
            flashTenors={flashTenors}
            onBroadcastAlert={handleBroadcastAlert}
            audioEnabled={audioEnabled}
            theme={theme}
          />
        );
      case 'aapl_chart':
        return (
          <AaplChartWidget 
            candles={aaplData} 
            liveFlash={aaplFlash} 
            onThresholdHit={handleAaplThresholdHit} 
            onDivergenceDetected={handleAaplDivergenceDetected}
            theme={theme}
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
    <div className={`min-h-screen ${theme === 'financial-paper' ? 'theme-financial-paper bg-[#f7f5ef] text-[#111827]' : 'bg-[#030608] text-slate-200'} selection:bg-emerald-500/30 selection:text-emerald-200 terminal-grid ${crtEnabled ? 'crt-effect' : ''}`}>
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

      {/* Push-style Terminal Notifications Tray (Triggered when asset moves >2% in a single tick) */}
      {pushNotifications.length > 0 && (
        <aside 
          aria-label="Push Terminal Notifications"
          className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex flex-col gap-2 max-w-[340px] sm:max-w-sm w-full pointer-events-none"
        >
          {pushNotifications.map((notif) => {
            const isUp = notif.direction === 'up';
            return (
              <div
                key={notif.id}
                role="alert"
                className={`pointer-events-auto border-2 rounded-lg p-2.5 sm:p-3 shadow-2xl backdrop-blur-md font-mono text-xs transition-all duration-300 ${
                  isUp
                    ? 'bg-[#041209]/95 border-emerald-500 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
                    : 'bg-[#160408]/95 border-rose-500 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.35)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b pb-1.5 mb-1.5 border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUp ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </span>
                    <span className="font-extrabold tracking-wider text-amber-300 uppercase text-[9px] bg-amber-950/80 border border-amber-600/70 px-1.5 py-0.2 rounded flex items-center gap-1">
                      <BellRing className="w-2.5 h-2.5 text-amber-400 animate-bounce" />
                      &gt;2% SINGLE-TICK MOVE
                    </span>
                  </div>
                  <button
                    onClick={() => handleDismissPush(notif.id)}
                    className="text-neutral-400 hover:text-white p-0.5 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-extrabold text-white text-sm tracking-wide">
                    {notif.symbol}
                  </span>
                  <span
                    className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      isUp
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {isUp ? '+' : ''}{notif.deltaPct.toFixed(2)}%
                  </span>
                </div>

                <div className="mt-1 text-[11px] text-neutral-300 flex items-center justify-between">
                  <span>
                    ${notif.oldPrice.toFixed(2)} <span className="text-neutral-500">→</span> <strong className="text-white font-bold">${notif.newPrice.toFixed(2)}</strong>
                  </span>
                  <span className="text-[9px] text-neutral-400">{notif.timestamp}</span>
                </div>

                <div className="mt-1 text-[10px] text-neutral-400 truncate">
                  {notif.name}
                </div>
              </div>
            );
          })}
        </aside>
      )}

      {/* Top terminal status & controls bar */}
      <TerminalHeader
        adapterMode={adapterMode}
        onToggleAdapterMode={() => setAdapterMode(adapterMode === 'live' ? 'demo' : 'live')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
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
