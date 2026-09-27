import { MarketIndex, CandleData, HeatmapStock, CommodityMetal, MarketSentimentData } from '../types';

export function computeLocalAlgorithmicSentiment(
  indices: MarketIndex[],
  aaplData?: CandleData[],
  heatmapStocks?: HeatmapStock[],
  metals?: CommodityMetal[]
): MarketSentimentData {
  // 1. Index Breadth & Performance
  let totalIndexChange = 0;
  let positiveIndices = 0;
  indices.forEach((idx) => {
    totalIndexChange += idx.changePercent;
    if (idx.changePercent > 0) positiveIndices++;
  });
  const avgIndexChange = indices.length > 0 ? totalIndexChange / indices.length : 0;
  const indexBreadthPct = indices.length > 0 ? (positiveIndices / indices.length) * 100 : 50;

  // 2. AAPL Technicals
  let aaplTrendBonus = 0;
  let aaplRsi = 50;
  if (aaplData && aaplData.length > 0) {
    const latest = aaplData[aaplData.length - 1];
    if (latest.rsi !== undefined) {
      aaplRsi = latest.rsi;
      aaplTrendBonus += (latest.rsi - 50) * 0.35;
    }
    if (latest.ma20 && latest.close > latest.ma20) {
      aaplTrendBonus += 4;
    }
    if (latest.ma50 && latest.close > latest.ma50) {
      aaplTrendBonus += 3;
    }
  }

  // 3. Sector Heatmap Breadth
  let techGain = 0;
  let energyGain = 0;
  let finGain = 0;
  if (heatmapStocks && heatmapStocks.length > 0) {
    heatmapStocks.forEach((stock) => {
      if (stock.sector === 'AI & Semiconductors') techGain += stock.changePercent;
      if (stock.sector === 'Energy') energyGain += stock.changePercent;
      if (stock.sector === 'Financials') finGain += stock.changePercent;
    });
  }

  // 4. Gold / Metals safe haven proxy
  let goldShift = 0;
  if (metals && metals.length > 0) {
    const gold = metals.find((m) => m.symbol.includes('XAU') || m.name.toLowerCase().includes('gold'));
    if (gold && gold.changePercent > 1.5 && avgIndexChange < 0) {
      // Flight to safety
      goldShift = -5;
    }
  }

  // Raw base calculation (50 = Neutral)
  // Index contribution: +1% avg change shifts score by ~14 points
  const indexScoreShift = avgIndexChange * 14;
  const breadthShift = (indexBreadthPct - 50) * 0.35;
  const sectorShift = techGain * 1.5;

  let rawScore = Math.round(50 + indexScoreShift + breadthShift + aaplTrendBonus + sectorShift + goldShift);
  const score = Math.max(5, Math.min(95, rawScore));

  let label: MarketSentimentData['label'] = 'Neutral';
  if (score >= 80) label = 'Extreme Bullish';
  else if (score >= 60) label = 'Bullish';
  else if (score <= 20) label = 'Extreme Bearish';
  else if (score <= 40) label = 'Bearish';

  // Sub-Gauges
  const techScore = Math.max(10, Math.min(95, Math.round(50 + avgIndexChange * 18 + aaplTrendBonus * 2.5)));
  const breadthScore = Math.max(10, Math.min(95, Math.round(indexBreadthPct)));
  // Volatility Risk (higher = calmer market / lower risk)
  const volRiskScore = Math.max(10, Math.min(90, Math.round(100 - Math.abs(avgIndexChange) * 25 - (score < 40 ? 30 : 5))));
  const macroScore = Math.max(10, Math.min(95, Math.round(score * 0.85 + 10)));

  const keyDrivers: string[] = [];
  if (avgIndexChange > 0.4) {
    keyDrivers.push(`Global indices trending positive (+${avgIndexChange.toFixed(2)}% avg advance)`);
  } else if (avgIndexChange < -0.4) {
    keyDrivers.push(`Broad equity indices under distribution (${avgIndexChange.toFixed(2)}% avg drop)`);
  } else {
    keyDrivers.push(`Major benchmarks rangebound within consolidation channels`);
  }

  if (techGain > 1.0) {
    keyDrivers.push(`AI & Semiconductor leadership providing strong upside momentum`);
  } else if (techGain < -1.0) {
    keyDrivers.push(`Technology sector drag weighing on market-wide risk appetite`);
  }

  if (aaplRsi > 58) {
    keyDrivers.push(`AAPL RSI oscillator (${aaplRsi.toFixed(1)}) confirming bullish accumulation`);
  } else if (aaplRsi < 42) {
    keyDrivers.push(`AAPL RSI oscillator (${aaplRsi.toFixed(1)}) reflecting oversold conditions`);
  }

  if (positiveIndices >= indices.length * 0.6) {
    keyDrivers.push(`Solid market breadth: ${positiveIndices}/${indices.length} benchmarks positive`);
  } else if (positiveIndices <= indices.length * 0.3) {
    keyDrivers.push(`Narrow market participation: only ${positiveIndices}/${indices.length} indices positive`);
  }

  const headline = score >= 60 
    ? `Bullish Momentum: Expansionary breadth and tech strength drive risk-on stance`
    : score <= 40
    ? `Bearish Headwinds: Broad distribution and risk-off rotation pressure equities`
    : `Consolidation Phase: Balanced buying and selling across global benchmarks`;

  const summary = score >= 60
    ? `Global indices reflect constructive accumulation with ${indexBreadthPct.toFixed(0)}% of benchmarks in green territory. Technology and semiconductors are providing clear leadership while momentum oscillators sustain upside bias.`
    : score <= 40
    ? `Market conditions are exhibiting defensive rotation and risk-off pressure. Broad index breadth has weakened to ${indexBreadthPct.toFixed(0)}% positive, with volatility and safe-haven flows commanding investor attention.`
    : `Equities are trading in a measured equilibrium. Gains in select mega-cap equities are offset by consolidation in cyclical sectors, keeping the aggregate sentiment gauge near median baseline.`;

  return {
    score,
    label,
    headline,
    summary,
    keyDrivers: keyDrivers.slice(0, 4),
    subGauges: {
      technicalMomentum: {
        score: techScore,
        label: techScore >= 60 ? 'Strong Upside' : techScore <= 40 ? 'Weak Momentum' : 'Neutral Range',
        detail: `Index MA alignment and trend velocity rating: ${techScore}/100`,
      },
      marketBreadth: {
        score: breadthScore,
        label: breadthScore >= 60 ? 'Healthy Breadth' : breadthScore <= 40 ? 'Narrow Breadth' : 'Moderate',
        detail: `${positiveIndices} of ${indices.length} tracked global equity benchmarks advancing`,
      },
      volatilityRisk: {
        score: volRiskScore,
        label: volRiskScore >= 60 ? 'Low Volatility' : volRiskScore <= 40 ? 'Elevated Volatility' : 'Controlled',
        detail: `Implied market dispersion and spread stability score: ${volRiskScore}/100`,
      },
      macroOutlook: {
        score: macroScore,
        label: macroScore >= 60 ? 'Expansionary' : macroScore <= 40 ? 'Defensive' : 'Balanced',
        detail: `Interest rate sensitivity and macro capital flow rating: ${macroScore}/100`,
      },
    },
    institutionalFlow: score >= 65 ? 'Active Accumulation' : score <= 35 ? 'Broad Distribution' : 'Neutral Rebalancing',
    bias: score >= 60 ? 'Risk-On' : score <= 40 ? 'Risk-Off' : 'Neutral',
    previousScore: Math.max(10, Math.min(90, score + (score > 50 ? -4 : 5))),
    dayLow: Math.max(5, score - 8),
    dayHigh: Math.min(98, score + 7),
    timestamp: new Date().toISOString(),
    source: 'algorithmic-heuristic',
    fallback: true,
  };
}

export async function fetchGeminiMarketSentiment(
  indices: MarketIndex[],
  aaplData?: CandleData[],
  heatmapStocks?: HeatmapStock[],
  metals?: CommodityMetal[]
): Promise<MarketSentimentData> {
  // Prepare concise payload for Gemini
  const aaplLatest = aaplData && aaplData.length > 0 ? aaplData[aaplData.length - 1] : null;
  const aaplSummary = aaplLatest ? {
    price: aaplLatest.close,
    change: aaplLatest.close - aaplLatest.open,
    rsi: aaplLatest.rsi ? Math.round(aaplLatest.rsi * 10) / 10 : undefined,
    ma20: aaplLatest.ma20 ? Math.round(aaplLatest.ma20 * 100) / 100 : undefined,
    ma50: aaplLatest.ma50 ? Math.round(aaplLatest.ma50 * 100) / 100 : undefined,
  } : undefined;

  const topGainers = heatmapStocks 
    ? [...heatmapStocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3).map((s) => `${s.ticker} (${s.changePercent > 0 ? '+' : ''}${s.changePercent.toFixed(2)}%)`)
    : [];

  const topLosers = heatmapStocks 
    ? [...heatmapStocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3).map((s) => `${s.ticker} (${s.changePercent.toFixed(2)}%)`)
    : [];

  const payload = {
    indices: indices.map((idx) => ({
      symbol: idx.symbol,
      name: idx.name,
      region: idx.region,
      price: idx.price,
      changePercent: idx.changePercent,
    })),
    aaplSummary,
    heatmapSummary: {
      topGainers,
      topLosers,
      stockCount: heatmapStocks ? heatmapStocks.length : 0,
    },
    metalsSummary: metals ? metals.map((m) => ({ symbol: m.symbol, name: m.name, changePercent: m.changePercent })) : [],
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('/api/market-sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data && typeof data.score === 'number') {
      return {
        score: Math.max(0, Math.min(100, Math.round(data.score))),
        label: data.label || (data.score >= 60 ? 'Bullish' : data.score <= 40 ? 'Bearish' : 'Neutral'),
        headline: data.headline || 'Market sentiment evaluated by Gemini',
        summary: data.summary || '',
        keyDrivers: Array.isArray(data.keyDrivers) ? data.keyDrivers : [],
        subGauges: data.subGauges || {
          technicalMomentum: { score: data.score, label: 'Trend', detail: '' },
          marketBreadth: { score: 50, label: 'Breadth', detail: '' },
          volatilityRisk: { score: 50, label: 'Volatility', detail: '' },
          macroOutlook: { score: data.score, label: 'Macro', detail: '' },
        },
        institutionalFlow: data.institutionalFlow || 'Neutral',
        bias: data.bias || 'Neutral',
        previousScore: data.previousScore || Math.max(10, Math.min(90, data.score - 4)),
        dayLow: data.dayLow || Math.max(5, data.score - 8),
        dayHigh: data.dayHigh || Math.min(98, data.score + 7),
        timestamp: data.timestamp || new Date().toISOString(),
        source: data.source || (data.fallback ? 'algorithmic-heuristic' : 'gemini-3.8-flash'),
        fallback: !!data.fallback,
      };
    }
    throw new Error('Invalid JSON payload returned');
  } catch (err: any) {
    console.warn('Using local algorithmic sentiment due to API error:', err.message);
    const local = computeLocalAlgorithmicSentiment(indices, aaplData, heatmapStocks, metals);
    local.fallback = true;
    return local;
  }
}
