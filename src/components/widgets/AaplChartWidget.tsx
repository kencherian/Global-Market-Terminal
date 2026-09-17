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
  const [subPanel, setSubPanel] = useState<'volume' | 'rsi'>('volume');
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
  const mainHeight = 220;
  const subHeight = 65;
  const padTop = 15;
  const padBottom = 20;
  const padRight = 55;
  const padLeft = 10;

  const usableWidth = svgWidth - padLeft - padRight;
  const stepX = usableWidth / candles.length;

  const getY = (price: number) => {
    return mainHeight - padBottom - ((price - minPrice) / priceRange) * (mainHeight - padTop - padBottom);
  };

  // Build Technical Polylines
  const sma20Points: string[] = [];
  const sma50Points: string[] = [];
  const ema9Points: string[] = [];
  const upperBandPoints: string[] = [];
  const lowerBandPoints: string[] = [];
  const linePoints: string[] = [];
  const areaPoints: string[] = [];

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
  });

  const activeCandle = hoveredCandle || latest;

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
              className={`px-1.5 py-0.5 rounded ${showSMA20 ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-neutral-500'}`}
            >
              SMA20
            </button>
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`px-1.5 py-0.5 rounded ${showSMA50 ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-neutral-500'}`}
            >
              SMA50
            </button>
            <button
              onClick={() => setShowEMA9(!showEMA9)}
              className={`px-1.5 py-0.5 rounded ${showEMA9 ? 'bg-indigo-500/20 text-indigo-300 font-semibold' : 'text-neutral-500'}`}
            >
              EMA9
            </button>
            <button
              onClick={() => setShowBands(!showBands)}
              className={`px-1.5 py-0.5 rounded ${showBands ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-neutral-500'}`}
            >
              BOLL
            </button>
          </div>

          {/* Sub-panel selector */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px]">
            <button
              onClick={() => setSubPanel('volume')}
              className={`px-2 py-0.5 rounded ${subPanel === 'volume' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400'}`}
            >
              VOL
            </button>
            <button
              onClick={() => setSubPanel('rsi')}
              className={`px-2 py-0.5 rounded ${subPanel === 'rsi' ? 'bg-neutral-800 text-white font-semibold' : 'text-neutral-400'}`}
            >
              RSI(14)
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
          {activeCandle.rsi !== undefined && (
            <span className="text-neutral-500">
              RSI: <strong className={activeCandle.rsi > 70 ? 'text-rose-400' : activeCandle.rsi < 30 ? 'text-emerald-400' : 'text-cyan-300'}>{activeCandle.rsi.toFixed(1)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full bg-[#05090c] rounded border border-neutral-800/80 overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${mainHeight + subHeight + 10}`}
          className="w-full h-auto select-none"
          style={{ minHeight: '300px' }}
        >
          <defs>
            {/* Area gradient */}
            <linearGradient id="aaplAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="bollGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
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
                <g key={c.date} className="cursor-pointer">
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

          {/* Divider between Main and Sub-panel */}
          <line
            x1={padLeft}
            y1={mainHeight}
            x2={svgWidth - padRight}
            y2={mainHeight}
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* SUB-PANEL: Volume */}
          {subPanel === 'volume' && (
            <g>
              <text x={svgWidth - padRight + 6} y={mainHeight + 16} fill="#64748b" fontSize="8">
                VOL
              </text>
              {candles.map((c, i) => {
                const x = padLeft + i * stepX + stepX / 2;
                const vHeight = (c.volume / maxVolume) * (subHeight - 12);
                const isBull = c.close >= c.open;
                const candleWidth = Math.max(stepX * 0.65, 2.5);
                return (
                  <rect
                    key={`v-${c.date}`}
                    x={x - candleWidth / 2}
                    y={mainHeight + subHeight - vHeight}
                    width={candleWidth}
                    height={vHeight}
                    fill={isBull ? '#10b981' : '#f43f5e'}
                    opacity="0.6"
                  />
                );
              })}
            </g>
          )}

          {/* SUB-PANEL: RSI (14) */}
          {subPanel === 'rsi' && (
            <g>
              {/* Threshold lines 70 & 30 */}
              <line
                x1={padLeft}
                y1={mainHeight + 10 + (1 - 0.7) * (subHeight - 15)}
                x2={svgWidth - padRight}
                y2={mainHeight + 10 + (1 - 0.7) * (subHeight - 15)}
                stroke="#f43f5e"
                strokeWidth="0.8"
                strokeDasharray="2,2"
                opacity="0.7"
              />
              <line
                x1={padLeft}
                y1={mainHeight + 10 + (1 - 0.3) * (subHeight - 15)}
                x2={svgWidth - padRight}
                y2={mainHeight + 10 + (1 - 0.3) * (subHeight - 15)}
                stroke="#10b981"
                strokeWidth="0.8"
                strokeDasharray="2,2"
                opacity="0.7"
              />
              <text x={svgWidth - padRight + 6} y={mainHeight + 10 + (1 - 0.7) * (subHeight - 15) + 3} fill="#f43f5e" fontSize="8">
                70
              </text>
              <text x={svgWidth - padRight + 6} y={mainHeight + 10 + (1 - 0.3) * (subHeight - 15) + 3} fill="#10b981" fontSize="8">
                30
              </text>

              {/* RSI Curve */}
              {(() => {
                const rsiPts = candles
                  .map((c, i) => {
                    if (c.rsi === undefined) return null;
                    const x = padLeft + i * stepX + stepX / 2;
                    const y = mainHeight + 10 + (1 - c.rsi / 100) * (subHeight - 15);
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ');
                return <polyline points={rsiPts} fill="none" stroke="#38bdf8" strokeWidth="1.5" />;
              })()}
            </g>
          )}

          {/* Interactive Hover Columns */}
          {candles.map((c, i) => {
            const x = padLeft + i * stepX;
            return (
              <rect
                key={`hit-${c.date}`}
                x={x}
                y={0}
                width={stepX}
                height={mainHeight + subHeight}
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
        <div className="flex items-center gap-3">
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
        </div>

        <div className="flex items-center gap-3 font-mono">
          <span>60S LOW: <strong className="text-white">${minPrice.toFixed(2)}</strong></span>
          <span>60S HIGH: <strong className="text-white">${maxPrice.toFixed(2)}</strong></span>
          <span>SPREAD: <strong className="text-neutral-200">${(maxPrice - minPrice).toFixed(2)}</strong></span>
        </div>
      </div>
    </div>
  );
}
