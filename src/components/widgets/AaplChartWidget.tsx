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

export function AaplChartWidget({ candles, liveFlash }: AaplChartWidgetProps) {
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showEMA9, setShowEMA9] = useState(true);
  const [showBands, setShowBands] = useState(true);
  const [showRsiOverlay, setShowRsiOverlay] = useState(true);
  const [showVolumeBars, setShowVolumeBars] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

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

          {/* Secondary Graph Overlays (RSI Line & Volume) */}
          <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px]">
            <button
              onClick={() => setShowRsiOverlay(!showRsiOverlay)}
              className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-colors ${
                showRsiOverlay ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-[0_0_8px_rgba(56,189,248,0.2)]' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Toggle Secondary RSI Indicator Line Graph Overlaid at Bottom"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              RSI(14) LINE
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
            <span className="w-2.5 h-0.5 bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" /> RSI(14) SECONDARY LINE
          </span>
          <span className="flex items-center gap-1 text-[9px] text-neutral-500">
            (<span className="text-rose-400">70 OB</span> / <span className="text-emerald-400">30 OS</span>)
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>60S LOW: <strong className="text-white">${minPrice.toFixed(2)}</strong></span>
          <span>60S HIGH: <strong className="text-white">${maxPrice.toFixed(2)}</strong></span>
          <span>SPREAD: <strong className="text-neutral-200">${(maxPrice - minPrice).toFixed(2)}</strong></span>
          <span>RSI: <strong className={activeRsiBadge.color}>{latest.rsi?.toFixed(1)}</strong></span>
        </div>
      </div>
    </div>
  );
}
