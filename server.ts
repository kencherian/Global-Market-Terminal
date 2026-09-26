import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize Google GenAI client (User-Agent header required per skill guide)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Algorithmic fallback if Gemini API key is absent or errors occur
function generateAlgorithmicSentiment(
  indices: any[] = [],
  aaplSummary?: any,
  heatmapSummary?: any,
  metalsSummary?: any[]
) {
  let totalChange = 0;
  let positiveCount = 0;
  if (Array.isArray(indices) && indices.length > 0) {
    indices.forEach((idx) => {
      const chg = Number(idx.changePercent) || 0;
      totalChange += chg;
      if (chg > 0) positiveCount++;
    });
  }
  const avgChange = indices.length > 0 ? totalChange / indices.length : 0;
  const breadthPct = indices.length > 0 ? (positiveCount / indices.length) * 100 : 50;

  let aaplBonus = 0;
  if (aaplSummary) {
    if (aaplSummary.rsi) aaplBonus += (aaplSummary.rsi - 50) * 0.3;
    if (aaplSummary.ma20 && aaplSummary.price > aaplSummary.ma20) aaplBonus += 3;
    if (aaplSummary.ma50 && aaplSummary.price > aaplSummary.ma50) aaplBonus += 2;
  }

  let raw = Math.round(50 + avgChange * 15 + (breadthPct - 50) * 0.3 + aaplBonus);
  const score = Math.max(8, Math.min(94, raw));

  let label = 'Neutral';
  if (score >= 80) label = 'Extreme Bullish';
  else if (score >= 60) label = 'Bullish';
  else if (score <= 20) label = 'Extreme Bearish';
  else if (score <= 40) label = 'Bearish';

  const techScore = Math.max(10, Math.min(95, Math.round(50 + avgChange * 18 + aaplBonus * 2)));
  const breadthScore = Math.max(10, Math.min(95, Math.round(breadthPct)));
  const volRiskScore = Math.max(15, Math.min(88, Math.round(100 - Math.abs(avgChange) * 20 - (score < 40 ? 25 : 5))));
  const macroScore = Math.max(10, Math.min(95, Math.round(score * 0.85 + 10)));

  return {
    score,
    label,
    headline: score >= 60
      ? 'Equity momentum and index breadth advance risk-on sentiment'
      : score <= 40
      ? 'Distribution pressure and negative index breadth drive defensive posture'
      : 'Consolidative rangebound action as benchmarks balance macro signals',
    summary: score >= 60
      ? `Global indices indicate steady accumulation with ${breadthPct.toFixed(0)}% of benchmarks advancing. Moving averages across major equity proxies support continuing upside momentum.`
      : score <= 40
      ? `Defensive market breadth observed across global equity complexes. Macro factors and selling pressure keep sentiment constrained.`
      : `Benchmarks are navigating a neutral consolidation channel. Sector rotations between tech and cyclicals remain balanced.`,
    keyDrivers: [
      `Global index average daily performance: ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`,
      `Tracked equity breadth: ${positiveCount}/${indices.length} indices positive (${breadthPct.toFixed(0)}%)`,
      aaplSummary?.rsi ? `AAPL RSI momentum at ${aaplSummary.rsi}` : 'Tech mega-cap indicators balanced',
      `Overall institutional flow: ${score >= 60 ? 'Accumulation' : score <= 40 ? 'Distribution' : 'Neutral'}`,
    ],
    subGauges: {
      technicalMomentum: {
        score: techScore,
        label: techScore >= 60 ? 'Bullish Expansion' : techScore <= 40 ? 'Negative Drift' : 'Balanced',
        detail: `Technical momentum score: ${techScore}/100`,
      },
      marketBreadth: {
        score: breadthScore,
        label: breadthScore >= 60 ? 'Broad Participation' : breadthScore <= 40 ? 'Narrow' : 'Selective',
        detail: `${positiveCount} of ${indices.length} major global indices in green`,
      },
      volatilityRisk: {
        score: volRiskScore,
        label: volRiskScore >= 60 ? 'Low Volatility' : volRiskScore <= 40 ? 'Elevated Risk' : 'Moderate',
        detail: `Market stability index: ${volRiskScore}/100`,
      },
      macroOutlook: {
        score: macroScore,
        label: macroScore >= 60 ? 'Supportive' : macroScore <= 40 ? 'Restrictive' : 'Neutral',
        detail: `Macro liquidity and rate outlook score: ${macroScore}/100`,
      },
    },
    institutionalFlow: score >= 65 ? 'Active Accumulation' : score <= 35 ? 'Net Outflow' : 'Neutral Rebalancing',
    bias: score >= 60 ? 'Risk-On' : score <= 40 ? 'Risk-Off' : 'Neutral',
    previousScore: Math.max(10, Math.min(90, score + (score > 50 ? -4 : 4))),
    dayLow: Math.max(5, score - 7),
    dayHigh: Math.min(98, score + 8),
  };
}

// POST endpoint for Gemini Market Sentiment
app.post('/api/market-sentiment', async (req, res) => {
  const { indices = [], aaplSummary, heatmapSummary, metalsSummary = [] } = req.body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found, providing quantitative fallback sentiment');
    const fallback = generateAlgorithmicSentiment(indices, aaplSummary, heatmapSummary, metalsSummary);
    return res.json({
      ...fallback,
      source: 'algorithmic-heuristic',
      fallback: true,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const prompt = `You are a Wall Street quantitative strategist and macroeconomic analyst.
Evaluate current live financial terminal data and synthesize the daily "Market Sentiment" index from 0 to 100 (where 0 is Extreme Bearish, 50 is Neutral, and 100 is Extreme Bullish).

Current Market State Data:
1. Global Indices:
${JSON.stringify(indices.map((i: any) => ({ symbol: i.symbol, name: i.name, change: i.changePercent, price: i.price, region: i.region })))}

2. AAPL 60-Session Technicals & Oscillators:
${JSON.stringify(aaplSummary || { info: 'Standard tech mega-cap base' })}

3. Sector Heatmap & Breadth:
${JSON.stringify(heatmapSummary || { info: 'Tech, Energy, Financials overview' })}

4. Precious Metals & Energy Spreads:
${JSON.stringify(metalsSummary.map((m: any) => ({ symbol: m.symbol, change: m.changePercent })))}

Analyze overall market risk appetite, index participation breadth, institutional positioning, and cross-asset correlation.
Return an accurate, realistic Market Sentiment evaluation JSON matching the specified schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an institutional market analytics engine. Provide precise, professional financial terminal output.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: 'Index value from 0 to 100. 0-20=Extreme Bearish, 21-40=Bearish, 41-59=Neutral, 60-79=Bullish, 80-100=Extreme Bullish',
            },
            label: {
              type: Type.STRING,
              description: 'One of: Extreme Bearish, Bearish, Neutral, Bullish, Extreme Bullish',
            },
            headline: {
              type: Type.STRING,
              description: 'Punchy 1-sentence terminal market consensus headline',
            },
            summary: {
              type: Type.STRING,
              description: '2 to 3 concise sentences providing executive macroeconomic and technical rationale',
            },
            keyDrivers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 4 specific market drivers influencing this score',
            },
            subGauges: {
              type: Type.OBJECT,
              properties: {
                technicalMomentum: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    label: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['score', 'label', 'detail'],
                },
                marketBreadth: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    label: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['score', 'label', 'detail'],
                },
                volatilityRisk: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    label: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['score', 'label', 'detail'],
                },
                macroOutlook: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.INTEGER },
                    label: { type: Type.STRING },
                    detail: { type: Type.STRING },
                  },
                  required: ['score', 'label', 'detail'],
                },
              },
              required: ['technicalMomentum', 'marketBreadth', 'volatilityRisk', 'macroOutlook'],
            },
            institutionalFlow: {
              type: Type.STRING,
              description: 'Active Accumulation, Mild Inflow, Neutral Rebalancing, Mild Distribution, or Net Outflow',
            },
            bias: {
              type: Type.STRING,
              description: 'Risk-On, Neutral, Risk-Off, or Defensive',
            },
            previousScore: {
              type: Type.INTEGER,
              description: 'Estimated previous close sentiment score (0-100)',
            },
            dayLow: {
              type: Type.INTEGER,
              description: 'Intraday lowest score (0-100)',
            },
            dayHigh: {
              type: Type.INTEGER,
              description: 'Intraday highest score (0-100)',
            },
          },
          required: [
            'score',
            'label',
            'headline',
            'summary',
            'keyDrivers',
            'subGauges',
            'institutionalFlow',
            'bias',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      fallback: false,
      source: 'gemini-3.8-flash',
      ...parsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in Gemini market sentiment analysis:', error?.message || error);
    const fallback = generateAlgorithmicSentiment(indices, aaplSummary, heatmapSummary, metalsSummary);
    return res.json({
      ...fallback,
      source: 'algorithmic-heuristic',
      fallback: true,
      errorNotice: error?.message || 'Gemini evaluation encountered an issue, served quantitative sentiment',
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint: Real-Time Simulated Market News Wire Feed
app.get('/api/market-news', async (req, res) => {
  try {
    const sector = (req.query.sector as string || 'ALL').toUpperCase();
    const query = (req.query.q as string || '').toLowerCase().trim();
    const generateWithAi = req.query.ai === 'true';

    // Curated rich financial news database
    const allHeadlines = [
      {
        id: 'news-srv-1',
        timestamp: new Date(Date.now() - 40 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 40 * 1000).toTimeString().split(' ')[0],
        sector: 'TECH',
        headline: 'NVDA: Enterprise AI accelerator rack demand exceeds $14B order backlog into Q3',
        summary: 'Hyperscaler capital expenditures continue to fuel semiconductor order momentum with tier-1 cloud providers expanding multi-gigawatt cluster deployments.',
        source: 'BLOOMBERG',
        tickers: ['NVDA', 'MSFT', 'GOOGL'],
        sentiment: 'BULLISH',
        urgency: 'BREAKING',
        impactScore: 9,
      },
      {
        id: 'news-srv-2',
        timestamp: new Date(Date.now() - 100 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 100 * 1000).toTimeString().split(' ')[0],
        sector: 'MACRO',
        headline: 'US Core PCE deflator matches 2.6% consensus; easing timeline preserved',
        summary: 'Consumer price expenditures print in line with market consensus forecasts, allowing FOMC policymakers latitude to sustain steady benchmark rates.',
        source: 'REUTERS',
        tickers: ['SPX', 'NDX', 'US10Y'],
        sentiment: 'BULLISH',
        urgency: 'ALERT',
        impactScore: 8,
      },
      {
        id: 'news-srv-3',
        timestamp: new Date(Date.now() - 180 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 180 * 1000).toTimeString().split(' ')[0],
        sector: 'TECH',
        headline: 'AAPL: Silicon photonics patent filings surge for next-gen Neural Engine packaging',
        summary: 'Supply-chain verification confirms advanced packaging contracts with leading Taiwanese OSAT facilities for sub-2nm chiplet architectures.',
        source: 'DJ WIRES',
        tickers: ['AAPL', 'TSM'],
        sentiment: 'BULLISH',
        urgency: 'UPDATE',
        impactScore: 7,
      },
      {
        id: 'news-srv-4',
        timestamp: new Date(Date.now() - 260 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 260 * 1000).toTimeString().split(' ')[0],
        sector: 'ENERGY',
        headline: 'WTI Crude firms near $74.80/bbl as OPEC+ delegates confirm production discipline',
        summary: 'Voluntary export limitations remain strictly adhered to across key Gulf producers, offsetting modest US weekly inventory build.',
        source: 'BLOOMBERG',
        tickers: ['XOM', 'CVX', 'USO'],
        sentiment: 'NEUTRAL',
        urgency: 'UPDATE',
        impactScore: 6,
      },
      {
        id: 'news-srv-5',
        timestamp: new Date(Date.now() - 340 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 340 * 1000).toTimeString().split(' ')[0],
        sector: 'FINANCIALS',
        headline: 'JPM: Global Markets desk reports record equity options flow and risk-parity bid',
        summary: 'Institutional trading desks observe broad-based systematic rebalancing into mega-cap equities following treasury curve stabilization.',
        source: 'REUTERS',
        tickers: ['JPM', 'GS', 'MS'],
        sentiment: 'BULLISH',
        urgency: 'FLASH',
        impactScore: 7,
      },
      {
        id: 'news-srv-6',
        timestamp: new Date(Date.now() - 460 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 460 * 1000).toTimeString().split(' ')[0],
        sector: 'METALS',
        headline: 'GOLD: Spot bullion tests $2,780/oz as central banks absorb 44 metric tonnes in monthly reserves',
        summary: 'Sovereign foreign reserve diversification continues at an elevated pace across Asian and Eastern European monetary authorities.',
        source: 'DJ WIRES',
        tickers: ['XAU', 'GLD', 'NEM'],
        sentiment: 'BULLISH',
        urgency: 'ALERT',
        impactScore: 8,
      },
      {
        id: 'news-srv-7',
        timestamp: new Date(Date.now() - 590 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 590 * 1000).toTimeString().split(' ')[0],
        sector: 'HEALTHCARE',
        headline: 'LLY: Phase 3 oral obesity candidate meets secondary endpoint with 14.8% weight reduction',
        summary: 'Clinical trial readout shows favorable safety tolerability profile with zero drug-related discontinuations in 48-week cohort.',
        source: 'SEC EDGAR',
        tickers: ['LLY', 'NVO'],
        sentiment: 'BULLISH',
        urgency: 'BREAKING',
        impactScore: 8,
      },
      {
        id: 'news-srv-8',
        timestamp: new Date(Date.now() - 720 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 720 * 1000).toTimeString().split(' ')[0],
        sector: 'CONSUMER',
        headline: 'TSLA: Full Self-Driving v13 fleet data crosses 20 million incident-free highway miles',
        summary: 'Autonomous driving telemetry submitted to national safety regulators shows intervention frequency dropped by 42% relative to previous build.',
        source: 'CNBC',
        tickers: ['TSLA'],
        sentiment: 'BULLISH',
        urgency: 'UPDATE',
        impactScore: 7,
      },
      {
        id: 'news-srv-9',
        timestamp: new Date(Date.now() - 860 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 860 * 1000).toTimeString().split(' ')[0],
        sector: 'MACRO',
        headline: 'US 10-Year Treasury yield eases 3.4 bps to 4.24% following strong 7-year auction bid',
        summary: 'Indirect bidding participation reached 71.4%, signaling sustained sovereign appetite for long-dated dollar-denominated debt.',
        source: 'FED WIRE',
        tickers: ['US10Y', 'TLT', 'IEF'],
        sentiment: 'BULLISH',
        urgency: 'FLASH',
        impactScore: 6,
      },
      {
        id: 'news-srv-10',
        timestamp: new Date(Date.now() - 1000 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 1000 * 1000).toTimeString().split(' ')[0],
        sector: 'FINANCIALS',
        headline: 'BAC: Commercial loan demand expands +4.2% YoY with zero uptick in non-performing assets',
        summary: 'Middle-market corporate credit facilities demonstrate healthy operational liquidity and minimal refinancing distress.',
        source: 'BLOOMBERG',
        tickers: ['BAC', 'WFC'],
        sentiment: 'BULLISH',
        urgency: 'UPDATE',
        impactScore: 6,
      },
      {
        id: 'news-srv-11',
        timestamp: new Date(Date.now() - 1180 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 1180 * 1000).toTimeString().split(' ')[0],
        sector: 'TECH',
        headline: 'TSMC: 2nm trial wafer runs achieve 89% target yield; commercial ramp slated for H2',
        summary: 'Leading foundry partner confirms high-volume fab equipment installations progressing ahead of schedule in Hsinchu and Kaohsiung.',
        source: 'REUTERS',
        tickers: ['TSM', 'AAPL', 'AMD'],
        sentiment: 'BULLISH',
        urgency: 'ALERT',
        impactScore: 8,
      },
      {
        id: 'news-srv-12',
        timestamp: new Date(Date.now() - 1340 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 1340 * 1000).toTimeString().split(' ')[0],
        sector: 'ENERGY',
        headline: 'NATURAL GAS: Henry Hub contract slips 2.8% on mild weather forecast across Midwest',
        summary: 'Working gas in storage remains 8% above five-year average, maintaining downward pressure on near-term spot contracts.',
        source: 'DJ WIRES',
        tickers: ['UNG', 'EQT'],
        sentiment: 'BEARISH',
        urgency: 'UPDATE',
        impactScore: 5,
      },
      {
        id: 'news-srv-13',
        timestamp: new Date(Date.now() - 1520 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 1520 * 1000).toTimeString().split(' ')[0],
        sector: 'METALS',
        headline: 'COPPER: LME warehouse inventories drop to 5-month low amid grid expansion demand',
        summary: 'Accelerated global data center grid upgrades and renewable interconnects drive sustained physical copper cathode premiums.',
        source: 'BLOOMBERG',
        tickers: ['COPPER', 'FCX'],
        sentiment: 'BULLISH',
        urgency: 'FLASH',
        impactScore: 7,
      },
      {
        id: 'news-srv-14',
        timestamp: new Date(Date.now() - 1700 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 1700 * 1000).toTimeString().split(' ')[0],
        sector: 'CONSUMER',
        headline: 'AMZN: Regional delivery fulfillment unit costs decline 4.8% via AI robotics sortation',
        summary: 'Automated package handling networks deployed across 120 fulfillment centers lower per-unit outbound shipping expenses.',
        source: 'REUTERS',
        tickers: ['AMZN'],
        sentiment: 'BULLISH',
        urgency: 'UPDATE',
        impactScore: 7,
      },
      {
        id: 'news-srv-15',
        timestamp: new Date(Date.now() - 1880 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 1880 * 1000).toTimeString().split(' ')[0],
        sector: 'HEALTHCARE',
        headline: 'UNH: Medical loss ratio stabilizes at 83.1%; corporate medical membership rises',
        summary: 'Commercial health plan underwriting results indicate controlled utilization rates across outpatient and prescription claims.',
        source: 'SEC EDGAR',
        tickers: ['UNH', 'CVS'],
        sentiment: 'NEUTRAL',
        urgency: 'ALERT',
        impactScore: 6,
      },
      {
        id: 'news-srv-16',
        timestamp: new Date(Date.now() - 2050 * 1000).toISOString(),
        timeStr: new Date(Date.now() - 2050 * 1000).toTimeString().split(' ')[0],
        sector: 'MACRO',
        headline: 'ECB: Governing Council signals gradual easing cycle as wage growth decelerates to 3.1%',
        summary: 'Frankfurt policymakers note cooling unit labor costs provide room for measured policy accommodation into autumn.',
        source: 'BLOOMBERG',
        tickers: ['EURUSD', 'DAX', 'CAC'],
        sentiment: 'NEUTRAL',
        urgency: 'UPDATE',
        impactScore: 6,
      },
    ];

    let filtered = allHeadlines;
    if (sector && sector !== 'ALL') {
      filtered = filtered.filter((h) => h.sector === sector);
    }
    if (query) {
      filtered = filtered.filter((h) => 
        h.headline.toLowerCase().includes(query) ||
        h.summary.toLowerCase().includes(query) ||
        h.source.toLowerCase().includes(query) ||
        h.tickers.some((t) => t.toLowerCase().includes(query))
      );
    }

    return res.json({
      status: 'OK',
      sector,
      query,
      count: filtered.length,
      headlines: filtered,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/market-news:', err);
    return res.status(500).json({ error: 'Failed to fetch market news' });
  }
});

// Dev vs Production Server Setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Global Market Terminal server running on port ${port}`);
  });
}

startServer();
