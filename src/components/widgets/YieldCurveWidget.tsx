import { useState, useMemo } from 'react';
import { TreasuryYield, TerminalTheme } from '../../types';
import { 
  YIELD_CURVE_SCENARIOS, 
  calculateEstrellaMishkinRecessionProb 
} from '../../services/dataAdapter';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Bell, 
  BellRing, 
  Radio, 
  Sliders, 
  RotateCcw, 
  Info, 
  Layers, 
  ExternalLink, 
  ChevronRight, 
  ShieldAlert 
} from 'lucide-react';

interface YieldCurveWidgetProps {
  yields: TreasuryYield[];
  flashTenors?: Set<string>;
  onBroadcastAlert?: (alert: { level: 'INFO' | 'NOTICE' | 'SPIKE' | 'WARNING'; source: string; text: string }) => void;
  audioEnabled?: boolean;
  theme?: TerminalTheme;
}

export function YieldCurveWidget({
  yields: initialYields,
  flashTenors = new Set(),
  onBroadcastAlert,
  audioEnabled = false,
  theme = 'deep-space',
}: YieldCurveWidgetProps) {
  const isLight = theme === 'financial-paper';
  // Scenario & Simulation state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('current-live');
  const [parallelShiftBps, setParallelShiftBps] = useState<number>(0);
  const [hoveredTenor, setHoveredTenor] = useState<string | null>(null);
  const [selectedTenor, setSelectedTenor] = useState<string>('10Y');
  
  // Display filters
  const [viewMode, setViewMode] = useState<'benchmarks' | 'all'>('benchmarks');
  const [show1MonthAgo, setShow1MonthAgo] = useState<boolean>(true);
  const [show1YearAgo, setShow1YearAgo] = useState<boolean>(true);
  const [showRecessionInfo, setShowRecessionInfo] = useState<boolean>(false);
  const [audioAlertArmed, setAudioAlertArmed] = useState<boolean>(true);

  // Key requested benchmark tenors
  const KEY_BENCHMARK_TENORS = useMemo(() => new Set(['3M', '2Y', '5Y', '10Y', '30Y']), []);

  // Compute effective yields with scenario overrides and parallel shift
  const effectiveYields = useMemo(() => {
    const scenario = YIELD_CURVE_SCENARIOS.find((s) => s.id === selectedScenarioId);
    const shiftPercent = parallelShiftBps / 100;

    return initialYields.map((item) => {
      let baseYield = item.yield;
      if (scenario && scenario.id !== 'current-live' && scenario.yieldOverrides[item.tenor] !== undefined) {
        baseYield = scenario.yieldOverrides[item.tenor];
      }
      const shifted = Math.round((baseYield + shiftPercent) * 100) / 100;
      return {
        ...item,
        yield: Math.max(0.01, shifted),
        changeBps: Math.round((item.changeBps + parallelShiftBps) * 10) / 10,
      };
    });
  }, [initialYields, selectedScenarioId, parallelShiftBps]);

  // Key tenors
  const y3m = effectiveYields.find((y) => y.tenor === '3M')?.yield ?? 4.62;
  const y2y = effectiveYields.find((y) => y.tenor === '2Y')?.yield ?? 3.78;
  const y5y = effectiveYields.find((y) => y.tenor === '5Y')?.yield ?? 3.75;
  const y10y = effectiveYields.find((y) => y.tenor === '10Y')?.yield ?? 3.98;
  const y30y = effectiveYields.find((y) => y.tenor === '30Y')?.yield ?? 4.28;

  // Key Spreads (in basis points)
  const spread2y10y = Math.round((y10y - y2y) * 1000) / 10; // 10Y - 2Y
  const spread3m10y = Math.round((y10y - y3m) * 1000) / 10; // 10Y - 3M
  const spread5y30y = Math.round((y30y - y5y) * 1000) / 10; // 30Y - 5Y
  const spread2y5y = Math.round((y5y - y2y) * 1000) / 10;   // 5Y - 2Y

  const isInverted2y10y = spread2y10y < 0;
  const isInverted3m10y = spread3m10y < 0;

  // NY Fed Estrella-Mishkin Recession Probability (12 months forward)
  const recessionProb = useMemo(() => {
    return calculateEstrellaMishkinRecessionProb(y10y, y3m);
  }, [y10y, y3m]);

  // Curve Regime classification
  const curveRegime = useMemo(() => {
    if (isInverted2y10y && isInverted3m10y) return { text: 'DEEP INVERSION', color: 'text-rose-400', bg: 'bg-rose-950/80 border-rose-800' };
    if (isInverted2y10y) return { text: '2Y/10Y INVERTED', color: 'text-rose-400', bg: 'bg-rose-950/80 border-rose-800' };
    if (isInverted3m10y) return { text: 'FRONT-END INVERTED (3M/10Y)', color: 'text-amber-400', bg: 'bg-amber-950/80 border-amber-800' };
    if (spread2y10y < 15) return { text: 'FLAT CURVE', color: 'text-yellow-400', bg: 'bg-yellow-950/80 border-yellow-800' };
    if (spread2y10y > 100) return { text: 'STEEP EXPANSION', color: 'text-emerald-400', bg: 'bg-emerald-950/80 border-emerald-800' };
    return { text: 'NORMAL UPWARD SLOPING', color: 'text-cyan-400', bg: 'bg-cyan-950/80 border-cyan-800' };
  }, [isInverted2y10y, isInverted3m10y, spread2y10y]);

  // Broadcast current rate status to terminal tape
  const handleBroadcastCurrentCurve = () => {
    if (!onBroadcastAlert) return;
    const alertLevel = isInverted2y10y || isInverted3m10y ? 'SPIKE' : 'NOTICE';
    const inversionText = isInverted2y10y 
      ? `⚠️ 2Y/10Y INVERTED (${spread2y10y} bps)` 
      : `2Y/10Y NORMAL (+${spread2y10y} bps)`;
    
    onBroadcastAlert({
      level: alertLevel,
      source: 'RATES::UST_CURVE',
      text: `US TREASURY MONITOR // 10Y @ ${y10y.toFixed(2)}% | 2Y @ ${y2y.toFixed(2)}% | 3M @ ${y3m.toFixed(2)}% | ${inversionText} | Recession Prob: ${recessionProb}%`,
    });
  };

  // SVG Chart Geometry
  const chartWidth = 720;
  const chartHeight = 250;
  const padding = { top: 25, right: 35, bottom: 40, left: 50 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Y-axis range (Min/Max yield across all active curves)
  const allYValues = [
    ...effectiveYields.map((d) => d.yield),
    ...(show1MonthAgo ? effectiveYields.map((d) => d.oneMonthAgo) : []),
    ...(show1YearAgo ? effectiveYields.map((d) => d.oneYearAgo) : []),
  ];
  const minY = Math.max(0, Math.floor(Math.min(...allYValues) * 2) / 2 - 0.25);
  const maxY = Math.ceil(Math.max(...allYValues) * 2) / 2 + 0.25;

  // X coordinate mapper: distributes tenors evenly with spacing
  const xCoords = useMemo(() => {
    const totalTenors = effectiveYields.length;
    const map: Record<string, number> = {};
    effectiveYields.forEach((item, idx) => {
      map[item.tenor] = padding.left + (idx / (totalTenors - 1)) * plotWidth;
    });
    return map;
  }, [effectiveYields, plotWidth, padding.left]);

  const getYCoord = (yVal: number) => {
    const ratio = (yVal - minY) / (maxY - minY || 1);
    return padding.top + plotHeight - ratio * plotHeight;
  };

  // Build SVG path strings
  const livePath = useMemo(() => {
    return effectiveYields.reduce((acc, pt, i) => {
      const x = xCoords[pt.tenor];
      const y = getYCoord(pt.yield);
      return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
    }, '');
  }, [effectiveYields, xCoords, minY, maxY]);

  const liveAreaPath = useMemo(() => {
    if (effectiveYields.length === 0) return '';
    const bottomY = padding.top + plotHeight;
    const firstX = xCoords[effectiveYields[0].tenor];
    const lastX = xCoords[effectiveYields[effectiveYields.length - 1].tenor];
    return `${livePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [livePath, effectiveYields, xCoords, padding.top, plotHeight]);

  const monthAgoPath = useMemo(() => {
    return effectiveYields.reduce((acc, pt, i) => {
      const x = xCoords[pt.tenor];
      const y = getYCoord(pt.oneMonthAgo);
      return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
    }, '');
  }, [effectiveYields, xCoords, minY, maxY]);

  const yearAgoPath = useMemo(() => {
    return effectiveYields.reduce((acc, pt, i) => {
      const x = xCoords[pt.tenor];
      const y = getYCoord(pt.oneYearAgo);
      return i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`;
    }, '');
  }, [effectiveYields, xCoords, minY, maxY]);

  // Selected or hovered tenor detail
  const activeTenorObj = useMemo(() => {
    const t = hoveredTenor || selectedTenor;
    return effectiveYields.find((y) => y.tenor === t) || effectiveYields[effectiveYields.length - 3]; // default 10Y
  }, [hoveredTenor, selectedTenor, effectiveYields]);

  // Filtered table rows
  const tableYields = useMemo(() => {
    if (viewMode === 'benchmarks') {
      return effectiveYields.filter((y) => KEY_BENCHMARK_TENORS.has(y.tenor));
    }
    return effectiveYields;
  }, [effectiveYields, viewMode, KEY_BENCHMARK_TENORS]);

  // Y-axis grid tick levels
  const yTicks = useMemo(() => {
    const step = (maxY - minY) > 2.5 ? 0.5 : 0.25;
    const ticks: number[] = [];
    for (let v = minY; v <= maxY + 0.001; v += step) {
      ticks.push(Math.round(v * 100) / 100);
    }
    return ticks;
  }, [minY, maxY]);

  return (
    <div className="space-y-3 font-mono text-[11px] text-neutral-300">
      {/* Top Banner: Key Inversion Spreads & Recession Probability */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 2Y / 10Y SPREAD (Benchmark Inversion Indicator) */}
        <div 
          className={`p-2.5 rounded border transition-all ${
            isInverted2y10y
              ? 'bg-rose-950/40 border-rose-600/80 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
              : 'bg-neutral-950 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span className="font-bold flex items-center gap-1">
              {isInverted2y10y ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              )}
              2Y / 10Y SPREAD
            </span>
            <span className={`px-1 py-0.2 rounded text-[8px] font-bold border ${
              isInverted2y10y 
                ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse' 
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              {isInverted2y10y ? 'INVERTED' : 'NORMAL'}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className={`text-base sm:text-lg font-extrabold ${
              isInverted2y10y ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {spread2y10y >= 0 ? '+' : ''}{spread2y10y.toFixed(1)} <span className="text-xs font-normal text-neutral-400">bps</span>
            </span>
            <span className="text-[10px] text-neutral-400">
              10Y: {y10y.toFixed(2)}% | 2Y: {y2y.toFixed(2)}%
            </span>
          </div>
          <div className="text-[9px] text-neutral-500 mt-0.5 truncate">
            {isInverted2y10y ? 'Recession warning triggered' : 'Classic term premium active'}
          </div>
        </div>

        {/* 3M / 10Y SPREAD (Fed Preferred Indicator) */}
        <div 
          className={`p-2.5 rounded border transition-all ${
            isInverted3m10y
              ? 'bg-amber-950/40 border-amber-600/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'bg-neutral-950 border-neutral-800'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span className="font-bold flex items-center gap-1">
              <span className="text-cyan-400 font-extrabold">FED</span>
              3M / 10Y SPREAD
            </span>
            <span className={`px-1 py-0.2 rounded text-[8px] font-bold border ${
              isInverted3m10y 
                ? 'bg-amber-950 text-amber-300 border-amber-700' 
                : 'bg-cyan-950 text-cyan-300 border-cyan-800'
            }`}>
              {isInverted3m10y ? 'INVERTED' : 'NORMAL'}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className={`text-base sm:text-lg font-extrabold ${
              isInverted3m10y ? 'text-amber-400' : 'text-cyan-400'
            }`}>
              {spread3m10y >= 0 ? '+' : ''}{spread3m10y.toFixed(1)} <span className="text-xs font-normal text-neutral-400">bps</span>
            </span>
            <span className="text-[10px] text-neutral-400">
              3M: {y3m.toFixed(2)}%
            </span>
          </div>
          <div className="text-[9px] text-neutral-500 mt-0.5 truncate">
            Estrella-Mishkin probit metric
          </div>
        </div>

        {/* RECESSION PROBABILITY GAUGE (NY Fed Probit Model) */}
        <div className="p-2.5 rounded border bg-neutral-950 border-neutral-800 relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span className="font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              12M RECESSION PROB
            </span>
            <span className={`px-1 py-0.2 rounded text-[8px] font-bold border ${
              recessionProb >= 50
                ? 'bg-rose-950 text-rose-300 border-rose-700'
                : recessionProb >= 30
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              {recessionProb >= 50 ? 'HIGH' : recessionProb >= 30 ? 'ELEVATED' : 'LOW'}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className={`text-base sm:text-lg font-extrabold ${
              recessionProb >= 50 ? 'text-rose-400' : recessionProb >= 30 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {recessionProb.toFixed(1)}%
            </span>
            <button
              onClick={() => setShowRecessionInfo(!showRecessionInfo)}
              className="text-[9px] text-cyan-400 hover:text-cyan-300 underline"
            >
              Methodology
            </button>
          </div>

          {/* Mini Progress Bar */}
          <div className="w-full bg-neutral-900 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                recessionProb >= 50 ? 'bg-rose-500' : recessionProb >= 30 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, recessionProb))}%` }}
            />
          </div>
        </div>

        {/* 5Y / 30Y & REGIME STATUS */}
        <div className="p-2.5 rounded border bg-neutral-950 border-neutral-800">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span className="font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              5Y / 30Y STEEPNESS
            </span>
            <span className="text-[10px] text-neutral-500">
              30Y: {y30y.toFixed(2)}%
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-extrabold text-cyan-300">
              +{spread5y30y.toFixed(1)} <span className="text-xs font-normal text-neutral-400">bps</span>
            </span>
            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${curveRegime.bg} ${curveRegime.color}`}>
              {curveRegime.text}
            </span>
          </div>
          <div className="text-[9px] text-neutral-500 mt-0.5 truncate">
            Long-end duration term premium
          </div>
        </div>
      </div>

      {/* Methodology Collapsible Card */}
      {showRecessionInfo && (
        <div className="p-3 bg-neutral-950/90 border border-cyan-800/60 rounded text-[10px] text-neutral-300 space-y-1.5">
          <div className="flex items-center justify-between font-bold text-cyan-300">
            <span>NY FED ESTRELLA-MISHKIN RECESSION MODEL (12-MONTH PROBIT)</span>
            <button 
              onClick={() => setShowRecessionInfo(false)}
              className="text-neutral-500 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-neutral-400 leading-relaxed">
            Econometric model based on Arturo Estrella & Frederic Mishkin (1998): 
            <code className="text-cyan-400 bg-black/60 px-1 py-0.5 rounded mx-1">
              P(Recession) = Φ(-0.5333 - 0.6330 × (10Y - 3M spread))
            </code>
            where Φ is the cumulative normal distribution. An inversion of the 10Y–3M yield spread below 0 bps historically precedes US recessions by 10 to 18 months, with a perfect track record since 1955.
          </p>
        </div>
      )}

      {/* Toolbar: Scenario Selectors, Parallel Shift, Toggle Comparative Curves */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-neutral-950 rounded border border-neutral-800">
        {/* Left: Preset Scenario Buttons */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-neutral-500 font-bold mr-1">SCENARIO:</span>
          {YIELD_CURVE_SCENARIOS.map((sc) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedScenarioId(sc.id);
                  setParallelShiftBps(0);
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  isSelected
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/70 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
                title={sc.description}
              >
                {sc.name}
              </button>
            );
          })}
        </div>

        {/* Right: Comparative Overlay Toggles & Rate Shock Slider */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1M Ago Toggle */}
          <button
            onClick={() => setShow1MonthAgo(!show1MonthAgo)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
              show1MonthAgo
                ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-amber-400 inline-block border-t border-dashed" />
            <span>1M Ago</span>
          </button>

          {/* 1Y Ago Toggle */}
          <button
            onClick={() => setShow1YearAgo(!show1YearAgo)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
              show1YearAgo
                ? 'bg-indigo-950/40 border-indigo-600/60 text-indigo-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500'
            }`}
          >
            <span className="w-2 h-0.5 bg-indigo-400 inline-block border-t border-dashed" />
            <span>1Y Ago</span>
          </button>

          {/* Broadcast to Tape */}
          {onBroadcastAlert && (
            <button
              onClick={handleBroadcastCurrentCurve}
              className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/80 hover:border-cyan-600 text-cyan-300 text-[10px] font-bold transition-colors"
              title="Broadcast current yield curve metrics to terminal order tape"
            >
              BROADCAST TAPE
            </button>
          )}
        </div>
      </div>

      {/* Parallel Yield Shift Slider & Rate Stress Test */}
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 bg-neutral-950/70 border border-neutral-800/80 rounded text-[10px]">
        <div className="flex items-center gap-2">
          <Sliders className="w-3 h-3 text-cyan-400" />
          <span className="text-neutral-400 font-bold">PARALLEL RATE SHOCK:</span>
          <span className={`font-mono font-bold ${parallelShiftBps > 0 ? 'text-emerald-400' : parallelShiftBps < 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
            {parallelShiftBps > 0 ? '+' : ''}{parallelShiftBps} bps
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <span className="text-[9px] text-neutral-500">-100</span>
          <input
            type="range"
            min="-100"
            max="100"
            step="5"
            value={parallelShiftBps}
            onChange={(e) => setParallelShiftBps(Number(e.target.value))}
            className="w-full accent-cyan-500 h-1 bg-neutral-800 rounded cursor-pointer"
          />
          <span className="text-[9px] text-neutral-500">+100</span>
        </div>

        {parallelShiftBps !== 0 && (
          <button
            onClick={() => setParallelShiftBps(0)}
            className="flex items-center gap-1 text-[9px] text-cyan-400 hover:text-cyan-200"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>RESET</span>
          </button>
        )}
      </div>

      {/* Main Interactive Yield Curve SVG Chart */}
      <div className={`relative ${isLight ? 'bg-white border-[#dcd5c7]' : 'bg-black/60 border-neutral-800'} rounded p-2 overflow-hidden`}>
        {/* Chart Legend */}
        <div className={`flex items-center justify-between px-2 pt-1 pb-2 border-b ${isLight ? 'border-[#ede7da]' : 'border-neutral-900'} text-[10px]`}>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'} font-bold`}>
              <span className={`w-3 h-1 ${isLight ? 'bg-sky-600' : 'bg-cyan-400'} rounded-sm shadow-sm`} />
              <span>LIVE TREASURY CURVE</span>
            </div>

            {show1MonthAgo && (
              <div className={`flex items-center gap-1.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                <span className={`w-3 h-0.5 border-t-2 border-dashed ${isLight ? 'border-amber-600' : 'border-amber-400'}`} />
                <span>1 MONTH AGO</span>
              </div>
            )}

            {show1YearAgo && (
              <div className={`flex items-center gap-1.5 ${isLight ? 'text-indigo-700' : 'text-indigo-400'}`}>
                <span className={`w-3 h-0.5 border-t-2 border-dashed ${isLight ? 'border-indigo-600' : 'border-indigo-400'}`} />
                <span>1 YEAR AGO</span>
              </div>
            )}
          </div>

          <div className={`${isLight ? 'text-neutral-500' : 'text-neutral-500'} text-[9px]`}>
            Hover / Click tenor nodes to inspect yields
          </div>
        </div>

        {/* SVG Curve Plot */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto min-w-[580px] select-none"
          >
            <defs>
              {/* Cyan Gradient for Active Curve Area */}
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isLight ? '#0284c7' : '#06b6d4'} stopOpacity={isLight ? 0.15 : 0.25} />
                <stop offset="100%" stopColor={isLight ? '#0284c7' : '#06b6d4'} stopOpacity="0.0" />
              </linearGradient>

              {/* Inversion Warning Gradient Pattern */}
              <pattern id="inversionHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke={isLight ? '#b91c1c' : '#f43f5e'} strokeWidth="1" strokeOpacity={isLight ? 0.35 : 0.2} />
              </pattern>
            </defs>

            {/* Inversion Zone Shading (Between 2Y and 10Y if inverted) */}
            {isInverted2y10y && xCoords['2Y'] && xCoords['10Y'] && (
              <g>
                <rect
                  x={xCoords['2Y']}
                  y={padding.top}
                  width={xCoords['10Y'] - xCoords['2Y']}
                  height={plotHeight}
                  fill="url(#inversionHatch)"
                />
                <text
                  x={(xCoords['2Y'] + xCoords['10Y']) / 2}
                  y={padding.top + 18}
                  fill={isLight ? '#b91c1c' : '#f43f5e'}
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                  opacity="0.9"
                  letterSpacing="1"
                >
                  ⚠️ 2Y/10Y INVERSION ZONE ({spread2y10y} bps)
                </text>
              </g>
            )}

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {yTicks.map((tick) => {
              const y = getYCoord(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke={isLight ? '#e2ded6' : '#1f2937'}
                    strokeWidth="0.8"
                    strokeDasharray="2,3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    fill={isLight ? '#475569' : '#6b7280'}
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {tick.toFixed(2)}%
                  </text>
                </g>
              );
            })}

            {/* 1 Year Ago Curve */}
            {show1YearAgo && (
              <path
                d={yearAgoPath}
                fill="none"
                stroke={isLight ? '#4f46e5' : '#818cf8'}
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity={isLight ? 0.8 : 0.7}
              />
            )}

            {/* 1 Month Ago Curve */}
            {show1MonthAgo && (
              <path
                d={monthAgoPath}
                fill="none"
                stroke={isLight ? '#d97706' : '#fbbf24'}
                strokeWidth="1.5"
                strokeDasharray="4,4"
                opacity={isLight ? 0.85 : 0.75}
              />
            )}

            {/* Live Yield Curve Area Fill */}
            <path
              d={liveAreaPath}
              fill="url(#curveGradient)"
            />

            {/* Live Yield Curve Spline Line */}
            <path
              d={livePath}
              fill="none"
              stroke={isLight ? '#0284c7' : '#06b6d4'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isLight ? 'drop-shadow-sm' : 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]'}
            />

            {/* Vertical guidelines & Interactive Nodes on each tenor */}
            {effectiveYields.map((pt) => {
              const x = xCoords[pt.tenor];
              const y = getYCoord(pt.yield);
              const isKeyBenchmark = KEY_BENCHMARK_TENORS.has(pt.tenor);
              const isHovered = hoveredTenor === pt.tenor;
              const isSelected = selectedTenor === pt.tenor;
              const isFlashing = flashTenors.has(pt.tenor);

              return (
                <g 
                  key={pt.tenor}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredTenor(pt.tenor)}
                  onMouseLeave={() => setHoveredTenor(null)}
                  onClick={() => setSelectedTenor(pt.tenor)}
                >
                  {/* Subtle vertical tick line */}
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + plotHeight}
                    stroke={isHovered || isSelected ? '#06b6d4' : '#1f2937'}
                    strokeWidth={isHovered || isSelected ? '1' : '0.5'}
                    strokeDasharray={isHovered || isSelected ? 'none' : '2,4'}
                    opacity={isHovered || isSelected ? 0.6 : 0.3}
                  />

                  {/* Benchmark Tenor Highlight Circle */}
                  {isKeyBenchmark && (
                    <circle
                      cx={x}
                      cy={y}
                      r="7"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="1"
                      strokeOpacity="0.4"
                    />
                  )}

                  {/* Outer Pulsing Flash Ring on Micro-Tick */}
                  {isFlashing && (
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2"
                      className="animate-ping"
                    />
                  )}

                  {/* Central Node Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered || isSelected ? '5' : isKeyBenchmark ? '4' : '3'}
                    fill={isKeyBenchmark ? '#06b6d4' : '#0891b2'}
                    stroke="#030608"
                    strokeWidth="1.5"
                    className="transition-all duration-200"
                  />

                  {/* Top Yield Number Label (for key benchmarks or hovered) */}
                  {(isKeyBenchmark || isHovered || isSelected) && (
                    <text
                      x={x}
                      y={y - 8}
                      fill={isHovered || isSelected ? '#ffffff' : '#67e8f9'}
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {pt.yield.toFixed(2)}%
                    </text>
                  )}

                  {/* Bottom Tenor Label on X-axis */}
                  <text
                    x={x}
                    y={padding.top + plotHeight + 16}
                    fill={isHovered || isSelected ? '#ffffff' : isKeyBenchmark ? '#22d3ee' : '#9ca3af'}
                    fontSize={isKeyBenchmark ? '10' : '9'}
                    fontWeight={isKeyBenchmark ? 'bold' : 'normal'}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {pt.tenor}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected / Hovered Tenor Detailed HUD Card */}
        {activeTenorObj && (
          <div className="mt-2 p-2 bg-neutral-950/90 border border-cyan-800/50 rounded flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-xs px-1.5 py-0.5 bg-cyan-950 border border-cyan-600 rounded">
                US {activeTenorObj.tenor}
              </span>
              <span className="text-neutral-300 font-semibold">{activeTenorObj.name}</span>
              {KEY_BENCHMARK_TENORS.has(activeTenorObj.tenor) && (
                <span className="text-[8px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1 py-0.2 rounded font-bold">
                  CORE BENCHMARK
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div>
                <span className="text-neutral-500 mr-1">YIELD:</span>
                <span className="text-cyan-300 font-bold text-xs">{activeTenorObj.yield.toFixed(2)}%</span>
              </div>

              <div>
                <span className="text-neutral-500 mr-1">DAY CHG:</span>
                <span className={`font-bold ${activeTenorObj.changeBps >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeTenorObj.changeBps >= 0 ? '+' : ''}{activeTenorObj.changeBps.toFixed(1)} bps
                </span>
              </div>

              <div>
                <span className="text-neutral-500 mr-1">1M SPREAD:</span>
                <span className="text-neutral-300">
                  {(activeTenorObj.yield - activeTenorObj.oneMonthAgo >= 0 ? '+' : '')}
                  {((activeTenorObj.yield - activeTenorObj.oneMonthAgo) * 100).toFixed(1)} bps
                </span>
              </div>

              <div>
                <span className="text-neutral-500 mr-1">DAY RANGE:</span>
                <span className="text-neutral-400">
                  {activeTenorObj.dayLow.toFixed(2)}% – {activeTenorObj.dayHigh.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Benchmark Tenors Quick Filter Tabs & Maturities Table */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800">
            <button
              onClick={() => setViewMode('benchmarks')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'benchmarks'
                  ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              KEY BENCHMARKS (3M, 2Y, 5Y, 10Y, 30Y)
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                viewMode === 'all'
                  ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              FULL CURVE (1M TO 30Y)
            </button>
          </div>

          <div className="text-neutral-500 text-[9px]">
            Live quotes synchronized with US Treasury trading hours
          </div>
        </div>

        {/* Maturities Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="text-neutral-500 text-[10px] border-b border-neutral-800 uppercase tracking-wider bg-black/40">
                <th className="py-2 px-2.5">MATURITY / TENOR</th>
                <th className="py-2 px-2">SECURITY</th>
                <th className="py-2 px-2 text-right">YIELD (%)</th>
                <th className="py-2 px-2 text-right">NET CHG (BPS)</th>
                <th className="py-2 px-2 text-right">1M AGO</th>
                <th className="py-2 px-2 text-right">1Y AGO</th>
                <th className="py-2 px-2 text-center hidden md:table-cell">SESSION RANGE</th>
                <th className="py-2 px-2 text-center w-16">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/40">
              {tableYields.map((row) => {
                const isSelected = selectedTenor === row.tenor;
                const isKey = KEY_BENCHMARK_TENORS.has(row.tenor);
                const isUp = row.changeBps >= 0;
                const isFlashing = flashTenors.has(row.tenor);

                return (
                  <tr
                    key={row.tenor}
                    onClick={() => setSelectedTenor(row.tenor)}
                    className={`hover:bg-neutral-800/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-cyan-950/25' : ''
                    } ${isFlashing ? 'bg-cyan-500/10' : ''}`}
                  >
                    {/* Tenor */}
                    <td className="py-2 px-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-extrabold ${isKey ? 'text-white' : 'text-neutral-300'}`}>
                          {row.tenor}
                        </span>
                        {isKey && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-bold">
                            BENCHMARK
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Security Name */}
                    <td className="py-2 px-2 text-neutral-300">
                      {row.name}
                    </td>

                    {/* Yield */}
                    <td className="py-2 px-2 text-right font-extrabold text-neutral-100">
                      {row.yield.toFixed(2)}%
                    </td>

                    {/* Net Change in Basis Points */}
                    <td className="py-2 px-2 text-right">
                      <span className={`font-bold flex items-center justify-end gap-0.5 ${
                        isUp ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isUp ? '+' : ''}{row.changeBps.toFixed(1)}
                      </span>
                    </td>

                    {/* 1 Month Ago */}
                    <td className="py-2 px-2 text-right text-neutral-400">
                      {row.oneMonthAgo.toFixed(2)}%
                    </td>

                    {/* 1 Year Ago */}
                    <td className="py-2 px-2 text-right text-neutral-400">
                      {row.oneYearAgo.toFixed(2)}%
                    </td>

                    {/* Session Range Bar */}
                    <td className="py-2 px-2 text-center hidden md:table-cell">
                      <div className="flex items-center justify-center gap-1 text-[9px] text-neutral-500">
                        <span>{row.dayLow.toFixed(2)}</span>
                        <div className="w-16 bg-neutral-900 rounded-full h-1 relative overflow-hidden">
                          <div 
                            className="absolute top-0 bottom-0 bg-cyan-500 rounded-full"
                            style={{
                              left: '15%',
                              width: '70%',
                            }}
                          />
                        </div>
                        <span>{row.dayHigh.toFixed(2)}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2 px-2 text-center">
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
