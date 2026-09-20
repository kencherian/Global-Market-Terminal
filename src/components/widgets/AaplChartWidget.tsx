import { useState, useRef } from 'react';
import { CandleData } from '../../types';
import { 
  BarChart3, 
  LineChart, 
  CandlestickChart, 
  Sliders, 
  TrendingUp, 
  Maximize2, 
  Info 
} from 'lucide-react';

interface AaplChartWidgetProps {
  candles: CandleData[];
  liveFlash: boolean;
}

export interface VapBin {
  index: number;
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  yTop: number;
  yBottom: number;
  height: number;
  totalVolume: number;
  bullVolume: number;
  bearVolume: number;
  isPoc: boolean;
  isValueArea: boolean;
}

export function AaplChartWidget({ candles, liveFlash }: AaplChartWidgetProps) {
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showEMA9, setShowEMA9] = useState(true);
  const [showBands, setShowBands] = useState(true);
  const [showRsiOverlay, setShowRsiOverlay] = useState(true);
  const [showVolumeBars, setShowVolumeBars] = useState(true);
  const [showVapProfile, setShowVapProfile] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);
  const [hoveredVapBin, setHoveredVapBin] = useState<VapBin | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  if (!candles || candles.length === 0) {
    return <div className="p-4 text-center text-neutral-500 font-mono text-xs">No Candle Data Available</div>;
  }

  const latest = candles[candles.length - 1];
  const first = candles[0];
  const overallChg = latest.close - first.open;
  const overallPct = (overallChg / first.open) * 100;
  const isPosPeriod = overallChg >= 0;

  // Global Min and Max across the 60 sessions
  const allPrices = candles.flatMap((c) => [
    c.low, 
    c.high, 
    showBands && c.upperBand ? c.upperBand : c.high,
    showBands && c.lowerBand ? c.lowerBand : c.low,
  ]);
  const minPrice = Math.min(...allPrices) - 1.5;
  const maxPrice = Math.max(...allPrices) + 1.5;
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...candles.map((c) => c.volume));

  // Dimensions
  const svgWidth = 840;
  const mainHeight = 205;
  const subHeight = 75;
  const padTop = 15;
  const padBottom = 12;
  const padRight = 62;
  const padLeft = 12;

  const usableWidth = svgWidth - padLeft - padRight;
  const stepX = usableWidth / candles.length;

  const getY = (price: number) => {
    return mainHeight - padBottom - ((price - minPrice) / priceRange) * (mainHeight - padTop - padBottom);
  };

  // Secondary Bottom Graph Y scale (RSI 0 to 100)
  const subTop = mainHeight + 10;
  const subBottom = mainHeight + subHeight + 10;
  const subUsableHeight = subBottom - subTop;

  const getRsiY = (rsi: number) => {
    const clamped = Math.max(0, Math.min(100, rsi));
    return subTop + (1 - clamped / 100) * subUsableHeight;
  };

  // Build Technical Polylines
  const sma20Points: string[] = [];
  const sma50Points: string[] = [];
  const ema9Points: string[] = [];
  const upperBandPoints: string[] = [];
  const lowerBandPoints: string[] = [];
  const linePoints: string[] = [];
  const areaPoints: string[] = [];

  // Build Secondary RSI points & area coordinates
  const rsiPoints: { x: number; y: number; rsi: number; date: string }[] = [];
  const rsiPolylineCoords: string[] = [];
  const rsiAreaCoords: string[] = [];

  candles.forEach((c, i) => {
    const x = padLeft + i * stepX + stepX / 2;
    const yClose = getY(c.close);

    linePoints.push(`${x},${yClose}`);
    if (i === 0) areaPoints.push(`${x},${mainHeight - padBottom}`);
    areaPoints.push(`${x},${yClose}`);
    if (i === candles.length - 1) areaPoints.push(`${x},${mainHeight - padBottom}`);

    if (c.ma20) sma20Points.push(`${x},${getY(c.ma20)}`);
    if (c.ma50) sma50Points.push(`${x},${getY(c.ma50)}`);
    if (c.ema9) ema9Points.push(`${x},${getY(c.ema9)}`);
    if (c.upperBand) upperBandPoints.push(`${x},${getY(c.upperBand)}`);
    if (c.lowerBand) lowerBandPoints.push(`${x},${getY(c.lowerBand)}`);

    // Secondary RSI calculations
    const rsiVal = c.rsi ?? 50;
    const yRsi = getRsiY(rsiVal);
    rsiPoints.push({ x, y: yRsi, rsi: rsiVal, date: c.date });
    rsiPolylineCoords.push(`${x.toFixed(1)},${yRsi.toFixed(1)}`);
  });

  if (rsiPoints.length > 0) {
    const firstX = rsiPoints[0].x;
    const lastX = rsiPoints[rsiPoints.length - 1].x;
    rsiAreaCoords.push(`${firstX.toFixed(1)},${subBottom}`);
    rsiPoints.forEach((p) => rsiAreaCoords.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`));
    rsiAreaCoords.push(`${lastX.toFixed(1)},${subBottom}`);
  }

  const activeCandle = hoveredCandle || latest;
  const activeRsi = activeCandle.rsi ?? 50;

  const getRsiStateBadge = (val: number) => {
    if (val >= 70) {
      return { text: 'OVERBOUGHT', color: 'text-rose-400', bg: 'bg-rose-950/60 border-rose-800 text-rose-300' };
    }
    if (val <= 30) {
      return { text: 'OVERSOLD', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-800 text-emerald-300' };
    }
    if (val >= 55) {
      return { text: 'BULLISH', color: 'text-sky-300', bg: 'bg-sky-950/60 border-sky-800 text-sky-300' };
    }
    if (val <= 45) {
      return { text: 'BEARISH', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-800 text-amber-300' };
    }
    return { text: 'NEUTRAL', color: 'text-neutral-300', bg: 'bg-neutral-800 border-neutral-700 text-neutral-300' };
  };

  const activeRsiBadge = getRsiStateBadge(activeRsi);

  // Horizontal Volume-at-Price (VAP) Profile Calculations
  const NUM_VAP_BINS = 24;
  const binStepPrice = priceRange / NUM_VAP_BINS;

  const rawBins: VapBin[] = Array.from({ length: NUM_VAP_BINS }, (_, i) => {
    const pLow = minPrice + i * binStepPrice;
    const pHigh = pLow + binStepPrice;
    const pMid = (pLow + pHigh) / 2;
    const yTop = getY(pHigh);
    const yBottom = getY(pLow);
    const height = Math.max(2, Math.abs(yBottom - yTop) - 0.8);
    return {
      index: i,
      priceLow: pLow,
      priceHigh: pHigh,
      priceMid: pMid,
      yTop,
      yBottom,
      height,
      totalVolume: 0,
      bullVolume: 0,
      bearVolume: 0,
      isPoc: false,
      isValueArea: false,
    };
  });

  // Distribute volume proportionally across overlapping price bins
  candles.forEach((c) => {
    const isBull = c.close >= c.open;
    const cLow = Math.max(minPrice, c.low);
    const cHigh = Math.min(maxPrice, c.high);
    const span = Math.max(0.01, cHigh - cLow);

    rawBins.forEach((b) => {
      const overlap = Math.max(0, Math.min(b.priceHigh, cHigh) - Math.max(b.priceLow, cLow));
      if (overlap > 0) {
        const fraction = overlap / span;
        const vol = c.volume * fraction;
        b.totalVolume += vol;
        if (isBull) {
          b.bullVolume += vol;
        } else {
          b.bearVolume += vol;
        }
      }
    });
  });

  // Identify Point of Control (POC) bin with the highest trading activity
  let maxVapVolume = 0;
  let pocIndex = 0;
  rawBins.forEach((b, i) => {
    if (b.totalVolume > maxVapVolume) {
      maxVapVolume = b.totalVolume;
      pocIndex = i;
    }
  });

  if (rawBins[pocIndex]) {
    rawBins[pocIndex].isPoc = true;
  }

  // Calculate Value Area (70% of total volume centered around POC)
  const totalProfileVolume = rawBins.reduce((acc, b) => acc + b.totalVolume, 0);
  const targetVaVolume = totalProfileVolume * 0.7;
  let currentVaVolume = rawBins[pocIndex]?.totalVolume || 0;
  if (rawBins[pocIndex]) {
    rawBins[pocIndex].isValueArea = true;
  }

  let upIdx = pocIndex + 1;
  let downIdx = pocIndex - 1;
  while (currentVaVolume < targetVaVolume && (upIdx < NUM_VAP_BINS || downIdx >= 0)) {
    const upVol = upIdx < NUM_VAP_BINS ? rawBins[upIdx].totalVolume : -1;
    const downVol = downIdx >= 0 ? rawBins[downIdx].totalVolume : -1;

    if (upVol >= downVol && upIdx < NUM_VAP_BINS) {
      rawBins[upIdx].isValueArea = true;
      currentVaVolume += upVol;
      upIdx++;
    } else if (downIdx >= 0) {
      rawBins[downIdx].isValueArea = true;
      currentVaVolume += downVol;
      downIdx--;
    } else {
      break;
    }
  }

  const vaBins = rawBins.filter((b) => b.isValueArea);
  const vahPrice = vaBins.length > 0 ? Math.max(...vaBins.map((b) => b.priceHigh)) : maxPrice;
  const valPrice = vaBins.length > 0 ? Math.min(...vaBins.map((b) => b.priceLow)) : minPrice;
  const pocBin = rawBins[pocIndex] || rawBins[0];
  const vapMaxWidth = 135;
  const profileRightEdge = svgWidth - padRight;

  const activeVapBin = hoveredVapBin || (hoveredCandle ? rawBins.find((b) => hoveredCandle.close >= b.priceLow && hoveredCandle.close <= b.priceHigh) : null);

  return (
    <div className="space-y-3 font-mono text-xs" ref={containerRef}>
      {/* Top Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">AAPL.US</span>
              <span className="text-[10px] text-neutral-400">Apple Inc. — NASDAQ</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                60 SESSIONS
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${activeRsiBadge.bg}`}>
                RSI {activeRsi.toFixed(1)} {activeRsiBadge.text}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-base font-bold ${liveFlash ? 'text-emerald-300 scale-105 transition-transform' : 'text-white'}`}>
                ${latest.close.toFixed(2)}
              </span>
              <span className={`text-[11px] font-semibold ${isPosPeriod ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPosPeriod ? '+' : ''}{overallChg.toFixed(2)} ({isPosPeriod ? '+' : ''}{overallPct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Chart View Modes and Overlays */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Types */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2 py-1 rounded text-[10px] transition-colors ${
                chartType === 'candlestick' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Candlestick Chart"
            >
              CANDLE
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-2 py-1 rounded text-[10px] transition-colors ${
                chartType === 'line' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Line Chart"
            >
              LINE
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-2 py-1 rounded text-[10px] transition-colors ${
                chartType === 'area' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Mountain Area"
            >
              AREA
            </button>
          </div>

          {/* Overlays toggle */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px]">
            <button
              onClick={() => setShowSMA20(!showSMA20)}
              className={`px-1.5 py-0.5 rounded ${showSMA20 ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Simple Moving Average 20"
            >
              SMA20
            </button>
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`px-1.5 py-0.5 rounded ${showSMA50 ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Simple Moving Average 50"
            >
              SMA50
            </button>
            <button
              onClick={() => setShowEMA9(!showEMA9)}
              className={`px-1.5 py-0.5 rounded ${showEMA9 ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Exponential Moving Average 9"
            >
              EMA9
            </button>
            <button
              onClick={() => setShowBands(!showBands)}
              className={`px-1.5 py-0.5 rounded ${showBands ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Bollinger Bands (20,2)"
            >
              BOLL
            </button>
          </div>

          {/* Secondary Graph Overlays (RSI Line, Volume & VAP Profile) */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px]">
            <button
              onClick={() => setShowVapProfile(!showVapProfile)}
              className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-colors ${
                showVapProfile
                  ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle Horizontal Volume-at-Price Profile (Price levels with highest trading activity & Point of Control)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              VAP PROFILE
            </button>
            <button
              onClick={() => setShowRsiOverlay(!showRsiOverlay)}
              className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-colors ${
                showRsiOverlay ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.2)]' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle Secondary RSI Indicator Line Graph Overlaid at Bottom"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              RSI(14)
            </button>
            <button
              onClick={() => setShowVolumeBars(!showVolumeBars)}
              className={`px-2 py-0.5 rounded transition-colors ${
                showVolumeBars ? 'bg-neutral-800 text-neutral-200 font-semibold' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle Background Volume Bars"
            >
              VOL
            </button>
          </div>
        </div>
      </div>

      {/* Active Crosshair Inspection Readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-neutral-950 border border-neutral-800/80 text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-neutral-400">DATE: <strong className="text-white">{activeCandle.date}</strong></span>
          <span className="text-neutral-400">O: <strong className="text-neutral-200">{activeCandle.open.toFixed(2)}</strong></span>
          <span className="text-neutral-400">H: <strong className="text-neutral-200">{activeCandle.high.toFixed(2)}</strong></span>
          <span className="text-neutral-400">L: <strong className="text-neutral-200">{activeCandle.low.toFixed(2)}</strong></span>
          <span className="text-neutral-400">C: <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>{activeCandle.close.toFixed(2)}</strong></span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {activeVapBin ? (
            <span className="text-amber-400/95 flex items-center gap-1.5">
              <span>VAP @ <strong>${activeVapBin.priceMid.toFixed(2)}</strong>:</span>
              <strong className="text-white">{(activeVapBin.totalVolume / 1000000).toFixed(2)}M</strong>
              <span className="text-emerald-400">({activeVapBin.totalVolume > 0 ? ((activeVapBin.bullVolume / activeVapBin.totalVolume) * 100).toFixed(0) : 0}% Buy)</span>
              {activeVapBin.isPoc && (
                <span className="px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-amber-500/60 font-bold text-[8.5px]">
                  POC (PEAK ACTIVITY)
                </span>
              )}
            </span>
          ) : (
            <span className="text-amber-400/90 font-medium">
              POC: <strong>${pocBin.priceMid.toFixed(2)}</strong> ({(pocBin.totalVolume / 1000000).toFixed(1)}M)
            </span>
          )}
          <span className="text-neutral-500">VOL: <strong className="text-neutral-300">{(activeCandle.volume / 1000000).toFixed(2)}M</strong></span>
          <span className="text-neutral-500 flex items-center gap-1.5">
            RSI(14): <strong className={activeRsiBadge.color}>{activeRsi.toFixed(1)}</strong>
            <span className={`text-[8.5px] px-1 py-0.2 rounded border font-semibold ${activeRsiBadge.bg}`}>
              {activeRsiBadge.text}
            </span>
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full bg-[#05090c] rounded border border-neutral-800/80 overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${subBottom + 12}`}
          className="w-full h-auto select-none"
          style={{ minHeight: '320px' }}
        >
          <defs>
            {/* Area gradient for AAPL Price */}
            <linearGradient id="aaplAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            {/* Bollinger Band gradient */}
            <linearGradient id="bollGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.03" />
            </linearGradient>
            {/* RSI Area gradient */}
            <linearGradient id="rsiAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Main Price Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
            const y = padTop + ratio * (mainHeight - padTop - padBottom);
            const price = maxPrice - ratio * priceRange;
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="3,3"
                />
                <text
                  x={svgWidth - padRight + 6}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  ${price.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Bollinger Band Shading */}
          {showBands && upperBandPoints.length > 0 && lowerBandPoints.length > 0 && (
            <polygon
              points={`${upperBandPoints.join(' ')} ${[...lowerBandPoints].reverse().join(' ')}`}
              fill="url(#bollGrad)"
            />
          )}

          {/* Bollinger Band Outlines */}
          {showBands && upperBandPoints.length > 0 && (
            <polyline
              points={upperBandPoints.join(' ')}
              fill="none"
              stroke="#0284c7"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.6"
            />
          )}
          {showBands && lowerBandPoints.length > 0 && (
            <polyline
              points={lowerBandPoints.join(' ')}
              fill="none"
              stroke="#0284c7"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.6"
            />
          )}

          {/* HORIZONTAL VOLUME-AT-PRICE (VAP) PROFILE (RIGHT SIDE) */}
          {showVapProfile && (
            <g id="volume-at-price-profile">
              {/* Profile Background Column Tint */}
              <rect
                x={profileRightEdge - vapMaxWidth - 6}
                y={padTop}
                width={vapMaxWidth + 6}
                height={mainHeight - padTop - padBottom}
                fill="#020406"
                fillOpacity="0.45"
                rx="2"
              />
              {/* Profile Left Separation Line */}
              <line
                x1={profileRightEdge - vapMaxWidth - 6}
                y1={padTop}
                x2={profileRightEdge - vapMaxWidth - 6}
                y2={mainHeight - padBottom}
                stroke="#1e293b"
                strokeDasharray="2,2"
                strokeWidth="0.8"
                opacity="0.6"
              />

              {/* Value Area High (VAH) Reference Guideline */}
              <line
                x1={profileRightEdge - vapMaxWidth - 6}
                y1={getY(vahPrice)}
                x2={profileRightEdge}
                y2={getY(vahPrice)}
                stroke="#38bdf8"
                strokeWidth="0.8"
                strokeDasharray="2,2"
                opacity="0.65"
              />
              <text
                x={profileRightEdge - vapMaxWidth - 9}
                y={getY(vahPrice) + 3}
                textAnchor="end"
                fill="#38bdf8"
                fontSize="7"
                fontFamily="monospace"
              >
                VAH ${vahPrice.toFixed(1)}
              </text>

              {/* Value Area Low (VAL) Reference Guideline */}
              <line
                x1={profileRightEdge - vapMaxWidth - 6}
                y1={getY(valPrice)}
                x2={profileRightEdge}
                y2={getY(valPrice)}
                stroke="#38bdf8"
                strokeWidth="0.8"
                strokeDasharray="2,2"
                opacity="0.65"
              />
              <text
                x={profileRightEdge - vapMaxWidth - 9}
                y={getY(valPrice) + 3}
                textAnchor="end"
                fill="#38bdf8"
                fontSize="7"
                fontFamily="monospace"
              >
                VAL ${valPrice.toFixed(1)}
              </text>

              {/* Horizontal Volume Bars by Price Level */}
              {rawBins.map((bin) => {
                const barWidth = maxVapVolume > 0 ? (bin.totalVolume / maxVapVolume) * vapMaxWidth : 0;
                const xStart = profileRightEdge - barWidth;
                const y = Math.min(bin.yTop, bin.yBottom);
                const bullWidth = bin.totalVolume > 0 ? (bin.bullVolume / bin.totalVolume) * barWidth : 0;
                const bearWidth = Math.max(0, barWidth - bullWidth);
                const isActive =
                  hoveredVapBin?.index === bin.index ||
                  (hoveredCandle && hoveredCandle.close >= bin.priceLow && hoveredCandle.close <= bin.priceHigh);

                return (
                  <g
                    key={`vap-bar-${bin.index}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredVapBin(bin)}
                    onMouseLeave={() => setHoveredVapBin(null)}
                  >
                    {/* Bullish (Buy) Volume segment */}
                    <rect
                      x={xStart}
                      y={y}
                      width={bullWidth}
                      height={bin.height}
                      fill="#10b981"
                      fillOpacity={bin.isPoc ? 0.85 : isActive ? 0.75 : bin.isValueArea ? 0.45 : 0.22}
                      rx={0.5}
                    />
                    {/* Bearish (Sell) Volume segment */}
                    <rect
                      x={xStart + bullWidth}
                      y={y}
                      width={bearWidth}
                      height={bin.height}
                      fill="#f43f5e"
                      fillOpacity={bin.isPoc ? 0.85 : isActive ? 0.75 : bin.isValueArea ? 0.45 : 0.22}
                      rx={0.5}
                    />

                    {/* POC Border Highlight */}
                    {bin.isPoc && (
                      <rect
                        x={xStart}
                        y={y}
                        width={barWidth}
                        height={bin.height}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.2"
                        rx={0.5}
                      />
                    )}

                    {/* Active Hover Border Outline */}
                    {isActive && (
                      <rect
                        x={xStart - 1.5}
                        y={y - 0.5}
                        width={barWidth + 3}
                        height={bin.height + 1}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1"
                        rx={1}
                      />
                    )}

                    {/* Numeric Volume Tag on Wide Bars */}
                    {barWidth > 38 && (
                      <text
                        x={xStart + 3}
                        y={y + bin.height - 1.5}
                        fill={bin.isPoc ? '#fbbf24' : isActive ? '#ffffff' : '#94a3b8'}
                        fontSize="7"
                        fontFamily="monospace"
                        fontWeight={bin.isPoc ? 'bold' : 'normal'}
                      >
                        {bin.isPoc ? 'POC ' : ''}{(bin.totalVolume / 1000000).toFixed(1)}M
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Full-width Point of Control (POC) Golden Dashed Reference Line across chart */}
              <line
                x1={padLeft}
                y1={getY(pocBin.priceMid)}
                x2={profileRightEdge}
                y2={getY(pocBin.priceMid)}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="4,3"
                opacity="0.9"
              />

              {/* POC Tag on Right Margin */}
              <rect
                x={profileRightEdge + 3}
                y={getY(pocBin.priceMid) - 7}
                width="56"
                height="14"
                rx="2"
                fill="#f59e0b"
              />
              <text
                x={profileRightEdge + 31}
                y={getY(pocBin.priceMid) + 3.5}
                textAnchor="middle"
                fill="#04070a"
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                POC ${pocBin.priceMid.toFixed(2)}
              </text>
            </g>
          )}

          {/* Area Chart Mode */}
          {chartType === 'area' && (
            <>
              <polygon points={areaPoints.join(' ')} fill="url(#aaplAreaGrad)" />
              <polyline points={linePoints.join(' ')} fill="none" stroke="#10b981" strokeWidth="2" />
            </>
          )}

          {/* Line Chart Mode */}
          {chartType === 'line' && (
            <polyline points={linePoints.join(' ')} fill="none" stroke="#10b981" strokeWidth="2" />
          )}

          {/* Candlestick Chart Mode */}
          {chartType === 'candlestick' &&
            candles.map((c, i) => {
              const x = padLeft + i * stepX + stepX / 2;
              const yOpen = getY(c.open);
              const yClose = getY(c.close);
              const yHigh = getY(c.high);
              const yLow = getY(c.low);

              const isBull = c.close >= c.open;
              const color = isBull ? '#10b981' : '#f43f5e';
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(Math.abs(yClose - yOpen), 1.5);
              const candleWidth = Math.max(stepX * 0.72, 3);

              return (
                <g key={c.date}>
                  {/* High/Low Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={color}
                    strokeWidth="1.2"
                  />
                  {/* Candle Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={color}
                    rx="0.5"
                  />
                </g>
              );
            })}

          {/* Technical Moving Average Overlays */}
          {showSMA20 && sma20Points.length > 0 && (
            <polyline points={sma20Points.join(' ')} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
          )}
          {showSMA50 && sma50Points.length > 0 && (
            <polyline points={sma50Points.join(' ')} fill="none" stroke="#06b6d4" strokeWidth="1.5" />
          )}
          {showEMA9 && ema9Points.length > 0 && (
            <polyline points={ema9Points.join(' ')} fill="none" stroke="#818cf8" strokeWidth="1.5" />
          )}

          {/* Divider between Main Price Chart and Bottom Secondary RSI Chart */}
          <line
            x1={padLeft}
            y1={mainHeight}
            x2={svgWidth - padRight}
            y2={mainHeight}
            stroke="#1e293b"
            strokeWidth="1.2"
          />

          {/* SECONDARY BOTTOM GRAPH: RSI INDICATOR OVERLAY */}
          <g id="secondary-rsi-bottom-graph">
            {/* Bottom Graph Base Panel */}
            <rect
              x={padLeft}
              y={subTop}
              width={usableWidth}
              height={subUsableHeight}
              fill="#04070a"
              opacity="0.85"
            />

            {/* Overbought Band (>70) Tint */}
            <rect
              x={padLeft}
              y={getRsiY(100)}
              width={usableWidth}
              height={getRsiY(70) - getRsiY(100)}
              fill="#f43f5e"
              fillOpacity="0.08"
            />

            {/* Neutral Corridor (30 to 70) Tint */}
            <rect
              x={padLeft}
              y={getRsiY(70)}
              width={usableWidth}
              height={getRsiY(30) - getRsiY(70)}
              fill="#0284c7"
              fillOpacity="0.02"
            />

            {/* Oversold Band (<30) Tint */}
            <rect
              x={padLeft}
              y={getRsiY(30)}
              width={usableWidth}
              height={getRsiY(0) - getRsiY(30)}
              fill="#10b981"
              fillOpacity="0.08"
            />

            {/* Background Volume Bars (when enabled) */}
            {showVolumeBars &&
              candles.map((c, i) => {
                const x = padLeft + i * stepX + stepX / 2;
                const vHeight = (c.volume / maxVolume) * (subUsableHeight * 0.7);
                const isBull = c.close >= c.open;
                const candleWidth = Math.max(stepX * 0.65, 2.5);
                return (
                  <rect
                    key={`v-${c.date}`}
                    x={x - candleWidth / 2}
                    y={subBottom - vHeight}
                    width={candleWidth}
                    height={vHeight}
                    fill={isBull ? '#10b981' : '#f43f5e'}
                    opacity={showRsiOverlay ? 0.28 : 0.65}
                  />
                );
              })}

            {/* Threshold Reference Lines: 70 OB, 50 Midline, 30 OS */}
            <line
              x1={padLeft}
              y1={getRsiY(70)}
              x2={svgWidth - padRight}
              y2={getRsiY(70)}
              stroke="#f43f5e"
              strokeWidth="0.85"
              strokeDasharray="3,3"
              opacity="0.85"
            />
            <line
              x1={padLeft}
              y1={getRsiY(50)}
              x2={svgWidth - padRight}
              y2={getRsiY(50)}
              stroke="#475569"
              strokeWidth="0.75"
              strokeDasharray="2,2"
              opacity="0.6"
            />
            <line
              x1={padLeft}
              y1={getRsiY(30)}
              x2={svgWidth - padRight}
              y2={getRsiY(30)}
              stroke="#10b981"
              strokeWidth="0.85"
              strokeDasharray="3,3"
              opacity="0.85"
            />

            {/* Secondary Right Y-Axis Scale Ticks for RSI */}
            <text
              x={svgWidth - padRight + 5}
              y={getRsiY(70) + 3}
              fill="#f43f5e"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              70 OB
            </text>
            <text
              x={svgWidth - padRight + 5}
              y={getRsiY(50) + 3}
              fill="#64748b"
              fontSize="8"
              fontFamily="monospace"
            >
              50
            </text>
            <text
              x={svgWidth - padRight + 5}
              y={getRsiY(30) + 3}
              fill="#10b981"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              30 OS
            </text>

            {/* Secondary Sub-panel Watermark & Identification */}
            <text
              x={padLeft + 4}
              y={subTop + 11}
              fill="#38bdf8"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              letterSpacing="0.05em"
            >
              RSI(14) SECONDARY OVERLAY
            </text>
            {showVolumeBars && (
              <text
                x={padLeft + 165}
                y={subTop + 11}
                fill="#64748b"
                fontSize="8.5"
                fontFamily="monospace"
              >
                + VOLUME HISTOGRAM
              </text>
            )}

            {/* RSI SECONDARY LINE GRAPH OVERLAY */}
            {showRsiOverlay && rsiPoints.length > 0 && (
              <g id="rsi-line-overlay-group">
                {/* Gradient Fill under the Secondary Line */}
                <polygon
                  points={rsiAreaCoords.join(' ')}
                  fill="url(#rsiAreaGrad)"
                />

                {/* Soft Outer Glow Polyline */}
                <polyline
                  points={rsiPolylineCoords.join(' ')}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.25"
                />

                {/* Primary High-Precision Secondary RSI Line Graph */}
                <polyline
                  points={rsiPolylineCoords.join(' ')}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Live End Marker & Real-Time Right-Axis Badge */}
                {(() => {
                  const lastPt = rsiPoints[rsiPoints.length - 1];
                  if (!lastPt) return null;
                  const lastVal = lastPt.rsi;
                  const badgeColor = lastVal >= 70 ? '#f43f5e' : lastVal <= 30 ? '#10b981' : '#0284c7';
                  const badgeY = Math.max(subTop, Math.min(subBottom - 14, lastPt.y - 7));
                  return (
                    <g>
                      <circle cx={lastPt.x} cy={lastPt.y} r="5" fill="#38bdf8" opacity="0.35" className="animate-ping" />
                      <circle cx={lastPt.x} cy={lastPt.y} r="3" fill="#38bdf8" stroke="#04070a" strokeWidth="1.5" />

                      {/* Right Axis Current RSI Tag Badge */}
                      <rect
                        x={svgWidth - padRight + 3}
                        y={badgeY}
                        width="36"
                        height="14"
                        rx="2"
                        fill={badgeColor}
                      />
                      <text
                        x={svgWidth - padRight + 21}
                        y={badgeY + 10}
                        textAnchor="middle"
                        fill="#030708"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {lastVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })()}

                {/* Active Hover Point on the Secondary RSI Line Graph */}
                {hoveredCandle && (
                  (() => {
                    const hoveredIdx = candles.findIndex((c) => c.date === hoveredCandle.date);
                    if (hoveredIdx < 0 || !rsiPoints[hoveredIdx]) return null;
                    const pt = rsiPoints[hoveredIdx];
                    return (
                      <g pointerEvents="none">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4.5"
                          fill="#ffffff"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="8"
                          fill="#38bdf8"
                          fillOpacity="0.25"
                        />
                        {/* Hover value label on the graph */}
                        <rect
                          x={Math.max(padLeft + 4, Math.min(svgWidth - padRight - 36, pt.x - 17))}
                          y={pt.y - 18}
                          width="34"
                          height="13"
                          rx="2"
                          fill="#0f172a"
                          stroke="#38bdf8"
                          strokeWidth="0.8"
                        />
                        <text
                          x={Math.max(padLeft + 4, Math.min(svgWidth - padRight - 36, pt.x - 17)) + 17}
                          y={pt.y - 8.5}
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="8"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {pt.rsi.toFixed(1)}
                        </text>
                      </g>
                    );
                  })()
                )}
              </g>
            )}
          </g>

          {/* Synchronized Vertical Crosshair spanning both Price & Bottom RSI Chart */}
          {hoveredCandle && (() => {
            const hoveredIdx = candles.findIndex((c) => c.date === hoveredCandle.date);
            if (hoveredIdx < 0) return null;
            const x = padLeft + hoveredIdx * stepX + stepX / 2;
            return (
              <line
                x1={x}
                y1={padTop}
                x2={x}
                y2={subBottom}
                stroke="#94a3b8"
                strokeWidth="0.8"
                strokeDasharray="2,2"
                opacity="0.6"
                pointerEvents="none"
              />
            );
          })()}

          {/* Interactive Hover Columns spanning entire height */}
          {candles.map((c, i) => {
            const x = padLeft + i * stepX;
            return (
              <rect
                key={`hit-${c.date}`}
                x={x}
                y={0}
                width={stepX}
                height={subBottom + 8}
                fill="transparent"
                className="cursor-crosshair hover:fill-white/5 transition-colors"
                onMouseEnter={() => setHoveredCandle(c)}
                onMouseLeave={() => setHoveredCandle(null)}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend and 60-Session Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-neutral-400 pt-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-500" /> SMA20
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-cyan-500" /> SMA50
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-indigo-400" /> EMA9
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-b border-sky-400 border-dashed" /> BOLLINGER (20,2)
          </span>
          <span className="flex items-center gap-1 font-semibold text-sky-300">
            <span className="w-2.5 h-0.5 bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" /> RSI(14)
          </span>
          <span className="flex items-center gap-1 font-semibold text-amber-400">
            <span className="w-2.5 h-1 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" /> VAP (POC: ${pocBin.priceMid.toFixed(2)})
          </span>
          <span className="flex items-center gap-1 text-[9px] text-neutral-500">
            (VAH ${vahPrice.toFixed(1)} / VAL ${valPrice.toFixed(1)})
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>POC: <strong className="text-amber-400 font-bold">${pocBin.priceMid.toFixed(2)}</strong></span>
          <span>60S LOW: <strong className="text-white">${minPrice.toFixed(2)}</strong></span>
          <span>60S HIGH: <strong className="text-white">${maxPrice.toFixed(2)}</strong></span>
          <span>SPREAD: <strong className="text-neutral-200">${(maxPrice - minPrice).toFixed(2)}</strong></span>
          <span>RSI: <strong className={activeRsiBadge.color}>{latest.rsi?.toFixed(1)}</strong></span>
        </div>
      </div>
    </div>
  );
}
