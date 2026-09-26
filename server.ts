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
