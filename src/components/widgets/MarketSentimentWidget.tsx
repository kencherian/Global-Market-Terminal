import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  ShieldCheck, 
  Gauge, 
  Compass, 
  Activity, 
  Send,
  Zap,
  Sliders,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  MarketIndex, 
  CandleData, 
  HeatmapStock, 
  CommodityMetal, 
  MarketSentimentData,
  TerminalAlert 
} from '../../types';
import { 
  fetchGeminiMarketSentiment, 
  computeLocalAlgorithmicSentiment 
} from '../../services/sentimentService';

interface MarketSentimentWidgetProps {
  indices: MarketIndex[];
  aaplData?: CandleData[];
  heatmapStocks?: HeatmapStock[];
  metals?: CommodityMetal[];
  onBroadcastAlert?: (alert: Omit<TerminalAlert, 'id' | 'timestamp'>) => void;
}

export function MarketSentimentWidget({
  indices,
  aaplData,
  heatmapStocks,
  metals,
  onBroadcastAlert,
}: MarketSentimentWidgetProps) {
  // Initial local estimate for zero latency on mount
  const initialSentiment = useMemo(
    () => computeLocalAlgorithmicSentiment(indices, aaplData, heatmapStocks, metals),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [sentiment, setSentiment] = useState<MarketSentimentData>(initialSentiment);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [showSimMenu, setShowSimMenu] = useState<boolean>(false);

  // Trigger Gemini evaluation
  const handleAnalyze = useCallback(async (isManual = false) => {
    setIsLoading(true);
    setActivePreset(null);
    try {
      const result = await fetchGeminiMarketSentiment(indices, aaplData, heatmapStocks, metals);
      setSentiment(result);
      setLastRefreshed(new Date());

      if (isManual && onBroadcastAlert) {
        onBroadcastAlert({
          level: result.score >= 60 ? 'NOTICE' : result.score <= 40 ? 'WARNING' : 'INFO',
          source: result.source === 'gemini-3.8-flash' ? 'GEMINI-AI' : 'SENTIMENT',
          text: `[SENTIMENT] Index: ${result.score}/100 (${result.label.toUpperCase()}) | Bias: ${result.bias} | ${result.headline}`,
        });
      }
    } catch (err) {
      console.error('Failed to analyze market sentiment:', err);
    } finally {
      setIsLoading(false);
    }
  }, [indices, aaplData, heatmapStocks, metals, onBroadcastAlert]);

  // Initial fetch on mount with Gemini
  useEffect(() => {
    handleAnalyze(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic background refresh if autoSync is enabled
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      handleAnalyze(false);
    }, 90000); // 90 seconds
    return () => clearInterval(interval);
  }, [autoSync, handleAnalyze]);

  // Quick preset test simulation for rapid verification
  const handleApplyPreset = (presetScore: number, presetLabel: MarketSentimentData['label'], name: string) => {
    setActivePreset(name);
    const techScore = Math.max(10, Math.min(95, Math.round(presetScore * 0.95 + 5)));
    const breadthScore = Math.max(10, Math.min(95, Math.round(presetScore)));
    const volScore = Math.max(15, Math.min(90, Math.round(100 - Math.abs(presetScore - 50) * 1.4)));
    const macroScore = Math.max(10, Math.min(95, Math.round(presetScore * 0.85 + 10)));

    const simSentiment: MarketSentimentData = {
      score: presetScore,
      label: presetLabel,
      headline: presetScore >= 60 
        ? `Bullish Breakout: Institutional buying surges across tech & global benchmarks`
        : presetScore <= 40
        ? `Defensive De-risking: Breadth deterioration prompts flight to cash and gold`
        : `Equilibrium Channel: Index proxies trade sideways awaiting macroeconomic catalysts`,
      summary: presetScore >= 60
        ? `Comprehensive momentum expansion led by semiconductors and growth sectors. Over 80% of tracked benchmarks are registering above-average accumulation.`
        : presetScore <= 40
        ? `Pervasive risk-off positioning with cyclical distribution and hedging demand dominating the tape. Breadth remains heavily skewed toward defensive assets.`
        : `Mixed capital allocations across sectors. Mega-cap technology stability balances consolidation in cyclicals and financials.`,
      keyDrivers: [
        `Index participation breadth: ${presetScore >= 60 ? '85% Advance' : presetScore <= 40 ? '25% Advance' : '52% Advance'}`,
        `Risk premium evaluation: ${presetScore >= 60 ? 'Expanding Risk-On' : presetScore <= 40 ? 'Risk-Off Rotation' : 'Neutral Spread'}`,
        `Mega-cap technical alignment: ${presetScore >= 60 ? 'Above 20/50 MAs' : presetScore <= 40 ? 'Below Key MAs' : 'Rangebound'}`,
        `Institutional posture: ${presetScore >= 65 ? 'Active Accumulation' : presetScore <= 35 ? 'Broad Liquidation' : 'Rebalancing'}`,
      ],
      subGauges: {
        technicalMomentum: {
          score: techScore,
          label: techScore >= 60 ? 'Bullish Acceleration' : techScore <= 40 ? 'Weak Trend' : 'Rangebound',
          detail: `Trend velocity & oscillator index: ${techScore}/100`,
        },
        marketBreadth: {
          score: breadthScore,
          label: breadthScore >= 60 ? 'Broad Participation' : breadthScore <= 40 ? 'Narrow Breadth' : 'Moderate',
          detail: `Advance/Decline ratio score: ${breadthScore}/100`,
        },
        volatilityRisk: {
          score: volScore,
          label: volScore >= 60 ? 'Complacent / Low Risk' : volScore <= 40 ? 'Elevated Volatility' : 'Balanced',
          detail: `Volatility spread index: ${volScore}/100`,
        },
        macroOutlook: {
          score: macroScore,
          label: macroScore >= 60 ? 'Supportive' : macroScore <= 40 ? 'Restrictive' : 'Neutral',
          detail: `Macro liquidity index: ${macroScore}/100`,
        },
      },
      institutionalFlow: presetScore >= 65 ? 'Active Accumulation' : presetScore <= 35 ? 'Heavy Distribution' : 'Neutral Rebalancing',
      bias: presetScore >= 60 ? 'Risk-On' : presetScore <= 40 ? 'Risk-Off' : 'Neutral',
      previousScore: 50,
      dayLow: Math.max(5, presetScore - 8),
      dayHigh: Math.min(98, presetScore + 6),
      timestamp: new Date().toISOString(),
      source: 'gemini-3.8-flash',
      fallback: false,
    };
    setSentiment(simSentiment);

    if (onBroadcastAlert) {
      onBroadcastAlert({
        level: presetScore >= 60 ? 'NOTICE' : presetScore <= 40 ? 'WARNING' : 'INFO',
        source: 'PRESET-SIM',
        text: `[SENTIMENT SIM] Simulated score: ${presetScore}/100 (${presetLabel.toUpperCase()}) | Bias: ${simSentiment.bias}`,
      });
    }
  };

  // Color mappings based on sentiment score
  const getScoreColor = (score: number) => {
    if (score >= 80) return { main: '#06b6d4', glow: 'rgba(6,182,212,0.4)', bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40', badge: 'bg-cyan-950 text-cyan-300 border-cyan-700' };
    if (score >= 60) return { main: '#10b981', glow: 'rgba(16,185,129,0.4)', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', badge: 'bg-emerald-950 text-emerald-300 border-emerald-700' };
    if (score >= 40) return { main: '#eab308', glow: 'rgba(234,179,8,0.4)', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/40', badge: 'bg-yellow-950 text-yellow-300 border-yellow-700' };
    if (score >= 20) return { main: '#f97316', glow: 'rgba(249,115,22,0.4)', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/40', badge: 'bg-orange-950 text-orange-300 border-orange-700' };
    return { main: '#ef4444', glow: 'rgba(239,68,68,0.4)', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40', badge: 'bg-rose-950 text-rose-300 border-rose-700' };
  };

  const theme = getScoreColor(sentiment.score);

  // SVG Geometry for Radial Semi-Circular Arc Gauge
  // Center is at (170, 140), radius R = 110, inner radius = 90
  const cx = 170;
  const cy = 135;
  const r = 100;
  const strokeW = 16;

  // Calculate needle angle in degrees (180 deg = left = 0 score, 0 deg = right = 100 score)
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, sentiment.score));
  const needleAngle = 180 - (clampedScore / 100) * 180; // 180 (far left) to 0 (far right)
  
  // Needle tip coordinate
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = r - 12;
  const tipX = cx + needleLength * Math.cos(needleRad);
  const tipY = cy - needleLength * Math.sin(needleRad);

  // Tick calculation helper
  const getTickCoords = (val: number, length: number, offset = 0) => {
    const angle = 180 - (val / 100) * 180;
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + (r + offset) * Math.cos(rad);
    const y1 = cy - (r + offset) * Math.sin(rad);
    const x2 = cx + (r + offset + length) * Math.cos(rad);
    const y2 = cy - (r + offset + length) * Math.sin(rad);
    return { x1, y1, x2, y2, angle };
  };

  // Delta vs previous score
  const scoreDelta = sentiment.previousScore !== undefined ? sentiment.score - sentiment.previousScore : 0;

  return (
    <div className="space-y-3 font-mono">
      {/* Widget Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800/80 text-[11px]">
        
        {/* Left: AI Model Badge & Source */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>GEMINI 3.8 FLASH</span>
          </div>
          <span className="text-[10px] text-neutral-500 hidden sm:inline">
            DAILY SENTIMENT INDEX
          </span>
          {sentiment.fallback && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300" title="Running quantitative heuristic algorithm while Gemini connects">
              HEURISTIC ENGINE
            </span>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick Sim Preset Toggle */}
          <button
            onClick={() => setShowSimMenu(!showSimMenu)}
            className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
              showSimMenu 
                ? 'bg-neutral-800 border-neutral-600 text-neutral-200' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Open Preset Test Simulations"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>PRESETS</span>
          </button>

          {/* Auto-Sync Toggle */}
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`px-2 py-0.5 rounded border text-[10px] transition-colors ${
              autoSync
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500'
            }`}
            title="Auto-refresh sentiment every 90 seconds"
          >
            AUTO {autoSync ? 'ON' : 'OFF'}
          </button>

          {/* Analyze / Refresh Button */}
          <button
            onClick={() => handleAnalyze(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-bold text-[10px] transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] disabled:opacity-50"
            title="Prompt Gemini to re-evaluate real-time market data"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'ANALYZING...' : 'EVALUATE'}</span>
          </button>
        </div>
      </div>

      {/* Preset Simulation Bar (Expandable) */}
      {showSimMenu && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded bg-neutral-950 border border-neutral-800 text-[10px] animate-fadeIn">
          <span className="text-neutral-500 mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            SIMULATE GAUGE:
          </span>
          <button
            onClick={() => handleApplyPreset(15, 'Extreme Bearish', 'EXT-BEAR')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activePreset === 'EXT-BEAR' ? 'bg-rose-950 text-rose-300 border-rose-500' : 'bg-neutral-900 border-neutral-800 text-rose-400 hover:border-rose-700'
            }`}
          >
            Extreme Bearish (15)
          </button>
          <button
            onClick={() => handleApplyPreset(32, 'Bearish', 'BEAR')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activePreset === 'BEAR' ? 'bg-orange-950 text-orange-300 border-orange-500' : 'bg-neutral-900 border-neutral-800 text-orange-400 hover:border-orange-700'
            }`}
          >
            Bearish (32)
          </button>
          <button
            onClick={() => handleApplyPreset(50, 'Neutral', 'NEUT')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activePreset === 'NEUT' ? 'bg-yellow-950 text-yellow-300 border-yellow-500' : 'bg-neutral-900 border-neutral-800 text-yellow-400 hover:border-yellow-700'
            }`}
          >
            Neutral (50)
          </button>
          <button
            onClick={() => handleApplyPreset(72, 'Bullish', 'BULL')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activePreset === 'BULL' ? 'bg-emerald-950 text-emerald-300 border-emerald-500' : 'bg-neutral-900 border-neutral-800 text-emerald-400 hover:border-emerald-700'
            }`}
          >
            Bullish (72)
          </button>
          <button
            onClick={() => handleApplyPreset(92, 'Extreme Bullish', 'EXT-BULL')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              activePreset === 'EXT-BULL' ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-neutral-900 border-neutral-800 text-cyan-400 hover:border-cyan-700'
            }`}
          >
            Extreme Bullish (92)
          </button>
          <button
            onClick={() => handleAnalyze(true)}
            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors ml-auto"
          >
            Reset to Live
          </button>
        </div>
      )}

      {/* Main Grid: Left Side Gauge Visualizer, Right Side Sub-indices & Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* Left Column: Radial Color-Coded Gauge */}
        <div className="lg:col-span-6 bg-[#04080b] border border-neutral-800/90 rounded-lg p-3 sm:p-4 flex flex-col items-center justify-between relative overflow-hidden shadow-inner">
          
          {/* Subtle background glow from theme */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none blur-3xl opacity-20 transition-all duration-700"
            style={{ backgroundColor: theme.main }}
          />

          {/* Top Gauge Readout Header */}
          <div className="w-full flex items-center justify-between text-[10px] text-neutral-400 z-10">
            <span className="flex items-center gap-1 font-semibold text-neutral-300">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              SENTIMENT GAUGEMETER
            </span>
            <span className="flex items-center gap-1 text-[10px] text-neutral-500">
              <Clock className="w-3 h-3" />
              {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* SVG Radial Arc Speedometer Gauge */}
          <div className="w-full max-w-[340px] my-1 flex justify-center items-center relative select-none">
            <svg viewBox="0 0 340 185" className="w-full h-auto overflow-visible">
              <defs>
                {/* Glow Filter */}
                <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                {/* Segment Gradients */}
                <linearGradient id="arc-grad" x1="0%" y1="100%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="25%" stopColor="#f97316" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="75%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>

                {/* Needle Gradient */}
                <linearGradient id="needle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor={theme.main} />
                </linearGradient>
              </defs>

              {/* Background Arc Track (Dark muted groove) */}
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                fill="none"
                stroke="#172026"
                strokeWidth={strokeW + 2}
                strokeLinecap="round"
              />

              {/* Color Segments (5 Defined Zones: Extreme Bearish to Extreme Bullish) */}
              {/* Zone 1: Extreme Bearish 0 - 20 (180deg to 144deg) */}
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r * Math.cos((144 * Math.PI) / 180)} ${cy - r * Math.sin((144 * Math.PI) / 180)}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth={strokeW}
                strokeOpacity={clampedScore <= 20 ? 1 : 0.35}
                className="transition-all duration-300"
              />
              {/* Zone 2: Bearish 20 - 40 (144deg to 108deg) */}
              <path
                d={`M ${cx + r * Math.cos((144 * Math.PI) / 180)} ${cy - r * Math.sin((144 * Math.PI) / 180)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos((108 * Math.PI) / 180)} ${cy - r * Math.sin((108 * Math.PI) / 180)}`}
                fill="none"
                stroke="#f97316"
                strokeWidth={strokeW}
                strokeOpacity={clampedScore > 20 && clampedScore <= 40 ? 1 : 0.35}
                className="transition-all duration-300"
              />
              {/* Zone 3: Neutral 40 - 60 (108deg to 72deg) */}
              <path
                d={`M ${cx + r * Math.cos((108 * Math.PI) / 180)} ${cy - r * Math.sin((108 * Math.PI) / 180)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos((72 * Math.PI) / 180)} ${cy - r * Math.sin((72 * Math.PI) / 180)}`}
                fill="none"
                stroke="#eab308"
                strokeWidth={strokeW}
                strokeOpacity={clampedScore > 40 && clampedScore <= 60 ? 1 : 0.35}
                className="transition-all duration-300"
              />
              {/* Zone 4: Bullish 60 - 80 (72deg to 36deg) */}
              <path
                d={`M ${cx + r * Math.cos((72 * Math.PI) / 180)} ${cy - r * Math.sin((72 * Math.PI) / 180)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos((36 * Math.PI) / 180)} ${cy - r * Math.sin((36 * Math.PI) / 180)}`}
                fill="none"
                stroke="#10b981"
                strokeWidth={strokeW}
                strokeOpacity={clampedScore > 60 && clampedScore <= 80 ? 1 : 0.35}
                className="transition-all duration-300"
              />
              {/* Zone 5: Extreme Bullish 80 - 100 (36deg to 0deg) */}
              <path
                d={`M ${cx + r * Math.cos((36 * Math.PI) / 180)} ${cy - r * Math.sin((36 * Math.PI) / 180)} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth={strokeW}
                strokeOpacity={clampedScore > 80 ? 1 : 0.35}
                className="transition-all duration-300"
              />

              {/* Active Score Glowing Arc Overlay */}
              <path
                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${tipX} ${tipY}`}
                fill="none"
                stroke="url(#arc-grad)"
                strokeWidth={strokeW - 4}
                strokeLinecap="round"
                filter="url(#gauge-glow)"
                opacity="0.9"
                className="transition-all duration-700 ease-out"
              />

              {/* Tick Marks */}
              {[0, 20, 40, 50, 60, 80, 100].map((t) => {
                const tick = getTickCoords(t, t === 50 || t === 0 || t === 100 ? 9 : 5, 8);
                const isFifty = t === 50;
                return (
                  <g key={t}>
                    <line
                      x1={tick.x1}
                      y1={tick.y1}
                      x2={tick.x2}
                      y2={tick.y2}
                      stroke={isFifty ? '#94a3b8' : '#475569'}
                      strokeWidth={isFifty ? 2 : 1.2}
                    />
                  </g>
                );
              })}

              {/* Major Labels around outer circumference */}
              <text x={cx - r - 2} y={cy + 18} fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">
                0
              </text>
              <text x={cx - r + 24} y={cy - 48} fill="#f97316" fontSize="8" textAnchor="middle">
                25
              </text>
              <text x={cx} y={cy - r - 12} fill="#eab308" fontSize="9" fontWeight="bold" textAnchor="middle">
                50 [NEUT]
              </text>
              <text x={cx + r - 24} y={cy - 48} fill="#10b981" fontSize="8" textAnchor="middle">
                75
              </text>
              <text x={cx + r + 2} y={cy + 18} fill="#06b6d4" fontSize="9" fontWeight="bold" textAnchor="middle">
                100
              </text>

              {/* Dynamic Center Needle */}
              <g className="transition-all duration-700 ease-out">
                {/* Needle glowing shadow / tracer line */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={tipX}
                  y2={tipY}
                  stroke={theme.main}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  filter="url(#gauge-glow)"
                  opacity="0.8"
                />

                {/* Needle core pointer */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={tipX}
                  y2={tipY}
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Needle Tip Arrowhead / Diamond accent */}
                <circle
                  cx={tipX}
                  cy={tipY}
                  r="3.5"
                  fill="#ffffff"
                  stroke={theme.main}
                  strokeWidth="2"
                  filter="url(#gauge-glow)"
                />

                {/* Center Hub & Outer Bezel Ring */}
                <circle cx={cx} cy={cy} r="14" fill="#070c10" stroke="#334155" strokeWidth="2.5" />
                <circle cx={cx} cy={cy} r="8" fill={theme.main} filter="url(#gauge-glow)" />
                <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
              </g>

              {/* Digital Score Readout Displayed within the Arch Basin */}
              <text
                x={cx}
                y={cy + 30}
                fill="#ffffff"
                fontSize="32"
                fontWeight="900"
                fontFamily="monospace"
                textAnchor="middle"
                className="tracking-tighter"
              >
                {sentiment.score}
              </text>
              <text
                x={cx + 38}
                y={cy + 18}
                fill="#64748b"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="start"
              >
                /100
              </text>
            </svg>
          </div>

          {/* Color-Coded Status Badge & Intraday Stats */}
          <div className="w-full flex flex-col items-center gap-2 mt-[-10px] z-10">
            {/* Status Pill Badge */}
            <div className={`px-3 py-1 rounded-full border flex items-center gap-2 font-bold text-xs tracking-wider shadow-md ${theme.badge}`}>
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: theme.main }} />
              <span className="uppercase">{sentiment.label}</span>
            </div>

            {/* Sub-bar showing Intraday Range and Previous Close delta */}
            <div className="flex items-center justify-between w-full px-2 py-1 rounded bg-neutral-950/70 border border-neutral-800 text-[10px] text-neutral-400">
              <div className="flex items-center gap-1">
                <span>PREV CLOSE:</span>
                <span className="text-neutral-200 font-semibold">{sentiment.previousScore ?? 50}</span>
                {scoreDelta !== 0 && (
                  <span className={`flex items-center font-bold ${scoreDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {scoreDelta > 0 ? <TrendingUp className="w-2.5 h-2.5 ml-0.5" /> : <TrendingDown className="w-2.5 h-2.5 ml-0.5" />}
                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span>INTRADAY:</span>
                <span className="text-neutral-300 font-mono">
                  L: <span className="text-rose-400 font-bold">{sentiment.dayLow ?? Math.max(5, sentiment.score - 7)}</span>
                  {' — '}
                  H: <span className="text-emerald-400 font-bold">{sentiment.dayHigh ?? Math.min(98, sentiment.score + 7)}</span>
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Sub-Gauges & Synthesis */}
        <div className="lg:col-span-6 flex flex-col justify-between gap-3">
          
          {/* Sub-Index 4 Quantitative Mini-Gauges */}
          <div className="bg-[#04080b] border border-neutral-800/90 rounded-lg p-3 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-300 border-b border-neutral-800/80 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                COMPONENT PILLARS BREAKDOWN
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                BIAS: <strong className={theme.text}>{sentiment.bias.toUpperCase()}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              
              {/* Technical Momentum */}
              <div className="p-2 rounded bg-neutral-950 border border-neutral-850 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold">Tech Momentum</span>
                  <span className="font-bold text-neutral-200">
                    {sentiment.subGauges.technicalMomentum.score}/100
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${sentiment.subGauges.technicalMomentum.score}%`,
                      backgroundColor: getScoreColor(sentiment.subGauges.technicalMomentum.score).main 
                    }} 
                  />
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  {sentiment.subGauges.technicalMomentum.label}
                </div>
              </div>

              {/* Market Breadth */}
              <div className="p-2 rounded bg-neutral-950 border border-neutral-850 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold">Market Breadth</span>
                  <span className="font-bold text-neutral-200">
                    {sentiment.subGauges.marketBreadth.score}/100
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${sentiment.subGauges.marketBreadth.score}%`,
                      backgroundColor: getScoreColor(sentiment.subGauges.marketBreadth.score).main 
                    }} 
                  />
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  {sentiment.subGauges.marketBreadth.label}
                </div>
              </div>

              {/* Volatility & Risk */}
              <div className="p-2 rounded bg-neutral-950 border border-neutral-850 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold">Stability / Vol</span>
                  <span className="font-bold text-neutral-200">
                    {sentiment.subGauges.volatilityRisk.score}/100
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${sentiment.subGauges.volatilityRisk.score}%`,
                      backgroundColor: getScoreColor(sentiment.subGauges.volatilityRisk.score).main 
                    }} 
                  />
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  {sentiment.subGauges.volatilityRisk.label}
                </div>
              </div>

              {/* Macro Climate */}
              <div className="p-2 rounded bg-neutral-950 border border-neutral-850 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-semibold">Macro Climate</span>
                  <span className="font-bold text-neutral-200">
                    {sentiment.subGauges.macroOutlook.score}/100
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${sentiment.subGauges.macroOutlook.score}%`,
                      backgroundColor: getScoreColor(sentiment.subGauges.macroOutlook.score).main 
                    }} 
                  />
                </div>
                <div className="text-[9px] text-neutral-500 truncate">
                  {sentiment.subGauges.macroOutlook.label}
                </div>
              </div>

            </div>
          </div>

          {/* Gemini AI Synthesis & Key Drivers Panel */}
          <div className="bg-[#04080b] border border-neutral-800/90 rounded-lg p-3 space-y-2 flex-1 flex flex-col justify-between shadow-inner">
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SYNTHESIS & MACRO SUMMARY</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                    FLOW: <strong className="text-neutral-200">{sentiment.institutionalFlow}</strong>
                  </span>
                  {onBroadcastAlert && (
                    <button
                      onClick={() => {
                        onBroadcastAlert({
                          level: sentiment.score >= 60 ? 'NOTICE' : sentiment.score <= 40 ? 'WARNING' : 'INFO',
                          source: 'GEMINI-AI',
                          text: `[SENTIMENT] ${sentiment.score}/100 (${sentiment.label}) - ${sentiment.headline}`,
                        });
                      }}
                      className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-emerald-400 transition-colors"
                      title="Post current sentiment to Terminal Tape"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Headline Callout */}
              <div className={`p-2 rounded border text-xs font-semibold leading-relaxed ${theme.bg} ${theme.border} ${theme.text}`}>
                "{sentiment.headline}"
              </div>

              {/* Summary Paragraph */}
              <p className="text-[11px] text-neutral-300 leading-normal line-clamp-3">
                {sentiment.summary}
              </p>
            </div>

            {/* Key Catalysts / Drivers Bullets */}
            <div className="pt-2 border-t border-neutral-800/70 space-y-1">
              <div className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold">
                Key Market Catalysts & Drivers:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                {sentiment.keyDrivers.map((driver, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-neutral-300">
                    <span className="text-emerald-400 font-bold leading-none mt-0.5">›</span>
                    <span className="truncate">{driver}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
