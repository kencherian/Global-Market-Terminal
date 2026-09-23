import { CandleData, RsiDivergence, DivergencePoint, TerminalAlert } from '../types';

export interface DivergenceDetectOptions {
  lookback?: number; // Maximum candle distance between swing points (default 28)
  minDistance?: number; // Minimum candle distance between swing points (default 3)
  rsiMinDelta?: number; // Minimum difference in RSI (default 1.5)
  priceMinDeltaPct?: number; // Minimum % difference in price (default 0.15%)
}

/**
 * Identify local swing lows and highs on Price and RSI
 */
function findPivots(candles: CandleData[], windowSize: number = 2) {
  const swingLows: DivergencePoint[] = [];
  const swingHighs: DivergencePoint[] = [];

  for (let i = windowSize; i < candles.length; i++) {
    const current = candles[i];
    if (typeof current.rsi !== 'number') continue;

    // Check Swing Low
    let isLow = true;
    for (let j = 1; j <= windowSize; j++) {
      const prev = candles[i - j];
      if (prev && current.low > prev.low) {
        isLow = false;
        break;
      }
    }
    // Also check right neighbors if available (or if near edge)
    if (isLow) {
      const rightLimit = Math.min(candles.length - 1, i + windowSize);
      for (let j = i + 1; j <= rightLimit; j++) {
        if (candles[j] && current.low > candles[j].low) {
          isLow = false;
          break;
        }
      }
    }

    if (isLow) {
      swingLows.push({
        index: i,
        date: current.date,
        price: current.low,
        rsi: current.rsi,
      });
    }

    // Check Swing High
    let isHigh = true;
    for (let j = 1; j <= windowSize; j++) {
      const prev = candles[i - j];
      if (prev && current.high < prev.high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) {
      const rightLimit = Math.min(candles.length - 1, i + windowSize);
      for (let j = i + 1; j <= rightLimit; j++) {
        if (candles[j] && current.high < candles[j].high) {
          isHigh = false;
          break;
        }
      }
    }

    if (isHigh) {
      swingHighs.push({
        index: i,
        date: current.date,
        price: current.high,
        rsi: current.rsi,
      });
    }
  }

  // Include the very latest candle if it is near an extreme relative to recent 3 candles
  if (candles.length >= 4) {
    const lastIdx = candles.length - 1;
    const last = candles[lastIdx];
    if (last && typeof last.rsi === 'number') {
      const prev3 = candles.slice(-4, -1);
      const isLowestRecent = prev3.every(c => last.low <= c.low);
      if (isLowestRecent && !swingLows.some(p => p.index === lastIdx)) {
        swingLows.push({
          index: lastIdx,
          date: last.date,
          price: last.low,
          rsi: last.rsi,
        });
      }
      const isHighestRecent = prev3.every(c => last.high >= c.high);
      if (isHighestRecent && !swingHighs.some(p => p.index === lastIdx)) {
        swingHighs.push({
          index: lastIdx,
          date: last.date,
          price: last.high,
          rsi: last.rsi,
        });
      }
    }
  }

  return { swingLows, swingHighs };
}

/**
 * Scans candle history for Regular and Hidden RSI Divergences
 */
export function detectRsiDivergences(
  candles: CandleData[],
  options: DivergenceDetectOptions = {}
): RsiDivergence[] {
  if (!candles || candles.length < 15) return [];

  const lookback = options.lookback || 28;
  const minDistance = options.minDistance || 3;
  const rsiMinDelta = options.rsiMinDelta || 1.2;
  const priceMinDeltaPct = options.priceMinDeltaPct || 0.1;

  const { swingLows, swingHighs } = findPivots(candles, 2);
  const detected: RsiDivergence[] = [];
  const totalCandles = candles.length;

  // 1. Regular Bullish Divergence Detection:
  // Price makes Lower Low (price2 < price1) while RSI makes Higher Low (rsi2 > rsi1)
  for (let i = 0; i < swingLows.length - 1; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      const p1 = swingLows[i];
      const p2 = swingLows[j];
      const candleDist = p2.index - p1.index;

      if (candleDist < minDistance || candleDist > lookback) continue;

      const priceDelta = p2.price - p1.price;
      const priceDeltaPct = (priceDelta / p1.price) * 100;
      const rsiDelta = p2.rsi - p1.rsi;

      // Regular Bullish: Price LL, RSI HL
      if (priceDelta < -0.15 && priceDeltaPct <= -priceMinDeltaPct && rsiDelta >= rsiMinDelta) {
        const isRecent = totalCandles - 1 - p2.index <= 6;
        detected.push({
          id: `bull-div-${p1.index}-${p2.index}`,
          type: 'BULLISH',
          p1,
          p2,
          priceDelta: Math.round(priceDelta * 100) / 100,
          priceDeltaPct: Math.round(priceDeltaPct * 100) / 100,
          rsiDelta: Math.round(rsiDelta * 10) / 10,
          detectedAt: new Date().toLocaleTimeString(),
          status: isRecent ? 'ACTIVE' : 'HISTORICAL',
          summary: `Price Lower Low ($${p2.price.toFixed(2)} vs $${p1.price.toFixed(2)}, ${priceDeltaPct.toFixed(2)}%) vs RSI Higher Low (${p2.rsi.toFixed(1)} vs ${p1.rsi.toFixed(1)}, +${rsiDelta.toFixed(1)} pts)`,
        });
      }
    }
  }

  // 2. Regular Bearish Divergence Detection:
  // Price makes Higher High (price2 > price1) while RSI makes Lower High (rsi2 < rsi1)
  for (let i = 0; i < swingHighs.length - 1; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      const p1 = swingHighs[i];
      const p2 = swingHighs[j];
      const candleDist = p2.index - p1.index;

      if (candleDist < minDistance || candleDist > lookback) continue;

      const priceDelta = p2.price - p1.price;
      const priceDeltaPct = (priceDelta / p1.price) * 100;
      const rsiDelta = p2.rsi - p1.rsi;

      // Regular Bearish: Price HH, RSI LH
      if (priceDelta > 0.15 && priceDeltaPct >= priceMinDeltaPct && rsiDelta <= -rsiMinDelta) {
        const isRecent = totalCandles - 1 - p2.index <= 6;
        detected.push({
          id: `bear-div-${p1.index}-${p2.index}`,
          type: 'BEARISH',
          p1,
          p2,
          priceDelta: Math.round(priceDelta * 100) / 100,
          priceDeltaPct: Math.round(priceDeltaPct * 100) / 100,
          rsiDelta: Math.round(rsiDelta * 10) / 10,
          detectedAt: new Date().toLocaleTimeString(),
          status: isRecent ? 'ACTIVE' : 'HISTORICAL',
          summary: `Price Higher High ($${p2.price.toFixed(2)} vs $${p1.price.toFixed(2)}, +${priceDeltaPct.toFixed(2)}%) vs RSI Lower High (${p2.rsi.toFixed(1)} vs ${p1.rsi.toFixed(1)}, ${rsiDelta.toFixed(1)} pts)`,
        });
      }
    }
  }

  // Deduplicate and select clearest signals (prefer most recent or greatest divergence span)
  const filtered: RsiDivergence[] = [];
  const seenP2 = new Set<number>();

  // Sort by index of p2 descending (most recent first)
  detected.sort((a, b) => b.p2.index - a.p2.index || Math.abs(b.rsiDelta) - Math.abs(a.rsiDelta));

  for (const div of detected) {
    if (!seenP2.has(div.p2.index)) {
      seenP2.add(div.p2.index);
      filtered.push(div);
    }
  }

  return filtered;
}

/**
 * Format divergence into an authoritative TerminalAlert for TerminalTapeWidget
 */
export function formatDivergenceAlert(divergence: RsiDivergence): TerminalAlert {
  const isBull = divergence.type === 'BULLISH';
  const now = new Date();
  const timeStr = `${now.toISOString().substring(11, 19)}.${Math.floor(Math.random() * 900 + 100)}`;
  
  const icon = isBull ? '🟢 [BULLISH RSI DIV]' : '🔴 [BEARISH RSI DIV]';
  const bias = isBull ? 'UPSIDE REVERSAL / SELLER EXHAUSTION' : 'DOWNSIDE REVERSAL / BUYER EXHAUSTION';

  const text = `${icon} AAPL ${divergence.type} DIVERGENCE: ${divergence.summary} — BIAS: ${bias} (Sessions: ${divergence.p1.date} → ${divergence.p2.date})`;

  return {
    id: `div-alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: timeStr,
    level: 'SPIKE',
    source: isBull ? 'RSI-BULL' : 'RSI-BEAR',
    text,
  };
}

/**
 * Create a synthetic divergence pattern for testing / demonstration
 */
export function createSyntheticDivergence(
  candles: CandleData[],
  type: 'BULLISH' | 'BEARISH'
): RsiDivergence {
  const len = candles.length;
  const idx2 = len - 1;
  const idx1 = Math.max(0, len - 9);
  const c1 = candles[idx1] || candles[0];
  const c2 = candles[idx2] || candles[0];

  if (type === 'BULLISH') {
    const p1Price = Math.round((c2.close + 2.65) * 100) / 100;
    const p2Price = Math.round(c2.low * 100) / 100;
    const rsi1 = 28.2;
    const rsi2 = 36.8;
    const priceDelta = Math.round((p2Price - p1Price) * 100) / 100;
    const priceDeltaPct = Math.round((priceDelta / p1Price) * 100) / 100;
    const rsiDelta = Math.round((rsi2 - rsi1) * 10) / 10;

    return {
      id: `bull-sim-${Date.now()}`,
      type: 'BULLISH',
      p1: { index: idx1, date: c1.date, price: p1Price, rsi: rsi1 },
      p2: { index: idx2, date: c2.date, price: p2Price, rsi: rsi2 },
      priceDelta,
      priceDeltaPct,
      rsiDelta,
      detectedAt: new Date().toLocaleTimeString(),
      status: 'ACTIVE',
      summary: `Price Lower Low ($${p2Price.toFixed(2)} vs $${p1Price.toFixed(2)}, ${priceDeltaPct}%) vs RSI Higher Low (${rsi2} vs ${rsi1}, +${rsiDelta} pts)`,
    };
  } else {
    const p1Price = Math.round((c2.close - 2.85) * 100) / 100;
    const p2Price = Math.round(c2.high * 100) / 100;
    const rsi1 = 74.2;
    const rsi2 = 66.5;
    const priceDelta = Math.round((p2Price - p1Price) * 100) / 100;
    const priceDeltaPct = Math.round((priceDelta / p1Price) * 100) / 100;
    const rsiDelta = Math.round((rsi2 - rsi1) * 10) / 10;

    return {
      id: `bear-sim-${Date.now()}`,
      type: 'BEARISH',
      p1: { index: idx1, date: c1.date, price: p1Price, rsi: rsi1 },
      p2: { index: idx2, date: c2.date, price: p2Price, rsi: rsi2 },
      priceDelta,
      priceDeltaPct,
      rsiDelta,
      detectedAt: new Date().toLocaleTimeString(),
      status: 'ACTIVE',
      summary: `Price Higher High ($${p2Price.toFixed(2)} vs $${p1Price.toFixed(2)}, +${priceDeltaPct}%) vs RSI Lower High (${rsi2} vs ${rsi1}, ${rsiDelta} pts)`,
    };
  }
}
