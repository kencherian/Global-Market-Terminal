import { MarketNewsItem, NewsSector, NewsSentiment, NewsUrgency } from '../types';

export const INITIAL_NEWS_HEADLINES: MarketNewsItem[] = [
  {
    id: 'news-1',
    timestamp: new Date(Date.now() - 45 * 1000).toISOString(),
    timeStr: '14:31:12',
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
    id: 'news-2',
    timestamp: new Date(Date.now() - 110 * 1000).toISOString(),
    timeStr: '14:30:05',
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
    id: 'news-3',
    timestamp: new Date(Date.now() - 190 * 1000).toISOString(),
    timeStr: '14:28:44',
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
    id: 'news-4',
    timestamp: new Date(Date.now() - 280 * 1000).toISOString(),
    timeStr: '14:27:18',
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
    id: 'news-5',
    timestamp: new Date(Date.now() - 360 * 1000).toISOString(),
    timeStr: '14:25:52',
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
    id: 'news-6',
    timestamp: new Date(Date.now() - 480 * 1000).toISOString(),
    timeStr: '14:23:40',
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
    id: 'news-7',
    timestamp: new Date(Date.now() - 620 * 1000).toISOString(),
    timeStr: '14:21:15',
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
    id: 'news-8',
    timestamp: new Date(Date.now() - 760 * 1000).toISOString(),
    timeStr: '14:18:50',
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
    id: 'news-9',
    timestamp: new Date(Date.now() - 900 * 1000).toISOString(),
    timeStr: '14:16:30',
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
    id: 'news-10',
    timestamp: new Date(Date.now() - 1050 * 1000).toISOString(),
    timeStr: '14:14:02',
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
    id: 'news-11',
    timestamp: new Date(Date.now() - 1200 * 1000).toISOString(),
    timeStr: '14:11:45',
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
    id: 'news-12',
    timestamp: new Date(Date.now() - 1380 * 1000).toISOString(),
    timeStr: '14:08:20',
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
    id: 'news-13',
    timestamp: new Date(Date.now() - 1560 * 1000).toISOString(),
    timeStr: '14:05:10',
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
    id: 'news-14',
    timestamp: new Date(Date.now() - 1740 * 1000).toISOString(),
    timeStr: '14:02:00',
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
    id: 'news-15',
    timestamp: new Date(Date.now() - 1920 * 1000).toISOString(),
    timeStr: '13:59:14',
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
    id: 'news-16',
    timestamp: new Date(Date.now() - 2100 * 1000).toISOString(),
    timeStr: '13:56:05',
    sector: 'MACRO',
    headline: 'ECB: Governing Council signals gradual easing cycle as wage growth decelerates to 3.1%',
    summary: 'Frankfurt policymakers note cooling unit labor costs provide room for measured policy accommodation into autumn.',
    source: 'BLOOMBERG',
    tickers: ['EURUSD', 'DAX', 'CAC'],
    sentiment: 'NEUTRAL',
    urgency: 'UPDATE',
    impactScore: 6,
  }
];

// Seed templates for generating real-time simulated news ticks
const SIMULATED_TICK_TEMPLATES = [
  {
    sector: 'TECH' as NewsSector,
    headlines: [
      'MSFT: Azure AI API call volumes jump 64% QoQ across Fortune 500 client base',
      'AVGO: Broadcom expands optical DSP switch orders for 800G AI cluster interconnects',
      'AMD: MI350 benchmarks reveal 32% efficiency improvement in large language model training',
      'GOOGL: Google DeepMind unveils multimodal edge tensor processor for real-time robotics',
      'QCOM: Qualcomm Snapdragon X Elite secures 18 new commercial laptop platform design wins',
    ],
    sources: ['BLOOMBERG', 'REUTERS', 'DJ WIRES'],
    tickers: ['MSFT', 'AVGO', 'AMD', 'GOOGL', 'QCOM'],
    sentiment: 'BULLISH' as NewsSentiment,
    urgency: 'UPDATE' as NewsUrgency,
  },
  {
    sector: 'FINANCIALS' as NewsSector,
    headlines: [
      'GS: Asset Management arm closes $8.2B global infrastructure private equity fund',
      'MS: Wealth division reports net new asset inflows of $24B in current billing cycle',
      'C: Citigroup expands institutional trade corridor financing across Southeast Asia',
      'BLK: BlackRock iShares equity ETFs register $4.5B weekly net inflow into tech sector',
    ],
    sources: ['REUTERS', 'BLOOMBERG', 'SEC EDGAR'],
    tickers: ['GS', 'MS', 'C', 'BLK'],
    sentiment: 'BULLISH' as NewsSentiment,
    urgency: 'FLASH' as NewsUrgency,
  },
  {
    sector: 'ENERGY' as NewsSector,
    headlines: [
      'XOM: Deepwater production off Guyana basin tops 680,000 bpd ahead of scheduled target',
      'CVX: Permian horizontal drilling completion speeds improve 12% via automated rigs',
      'SLB: Schlumberger reports international offshore drilling rig utilization exceeds 92%',
      'OPEC+: Ministerial committee affirms steady compliance with voluntary crude output ceilings',
    ],
    sources: ['BLOOMBERG', 'DJ WIRES', 'REUTERS'],
    tickers: ['XOM', 'CVX', 'SLB'],
    sentiment: 'NEUTRAL' as NewsSentiment,
    urgency: 'UPDATE' as NewsUrgency,
  },
  {
    sector: 'MACRO' as NewsSector,
    headlines: [
      'FOMC: Fed Governor speech highlights stable labor market and balance-sheet runoff trajectory',
      'US DOLLAR: DXY index consolidates around 103.80 as foreign exchange volatility recedes',
      'ISM: Manufacturing new orders sub-index edges higher to 50.4, entering expansionary territory',
      'TREASURIES: 2Y/10Y yield curve steepens modestly by 1.8 bps in orderly trading session',
    ],
    sources: ['FED WIRE', 'REUTERS', 'BLOOMBERG'],
    tickers: ['US10Y', 'DXY', 'SPX'],
    sentiment: 'BULLISH' as NewsSentiment,
    urgency: 'ALERT' as NewsUrgency,
  },
  {
    sector: 'HEALTHCARE' as NewsSector,
    headlines: [
      'ABBV: AbbVie raises full-year immunology guidance following major European reimbursement approval',
      'MRK: Keytruda subcutaneous co-formulation achieves bioequivalence in pivotal trial',
      'ISRG: Intuitive Surgical installs 340 da Vinci robotic surgical systems in latest quarter',
      'BMY: Bristol Myers Squibb receives positive CHMP opinion for novel cardiology therapeutic',
    ],
    sources: ['SEC EDGAR', 'REUTERS', 'BLOOMBERG'],
    tickers: ['ABBV', 'MRK', 'ISRG', 'BMY'],
    sentiment: 'BULLISH' as NewsSentiment,
    urgency: 'UPDATE' as NewsUrgency,
  },
  {
    sector: 'CONSUMER' as NewsSector,
    headlines: [
      'COST: Comparable sales for latest retail period advance +6.4% on robust consumer staples traffic',
      'HD: Home Depot pro-contractor sales pipeline expands +3.8% ahead of spring building season',
      'NKE: Nike direct-to-consumer digital conversion rate improves 140 bps following app overhaul',
      'MCD: Global comparable store sales accelerate driven by value menu promotion traction',
    ],
    sources: ['DJ WIRES', 'CNBC', 'REUTERS'],
    tickers: ['COST', 'HD', 'NKE', 'MCD'],
    sentiment: 'NEUTRAL' as NewsSentiment,
    urgency: 'FLASH' as NewsUrgency,
  },
  {
    sector: 'METALS' as NewsSector,
    headlines: [
      'SILVER: Silver spot advances to $32.40/oz on industrial solar cell silver paste demand',
      'PLATINUM: WPIC forecasts 2026 global platinum market deficit of 540,000 ounces',
      'GOLD: Comex gold futures open interest increases 4,200 contracts in speculative accumulation',
      'ALUMINUM: Smelter capacity constraints in Scandinavia lift regional delivery premiums',
    ],
    sources: ['BLOOMBERG', 'REUTERS', 'DJ WIRES'],
    tickers: ['SILVER', 'GOLD', 'PL', 'ALUM'],
    sentiment: 'BULLISH' as NewsSentiment,
    urgency: 'ALERT' as NewsUrgency,
  },
];

let dynamicCounter = 100;

export function generateSimulatedNewsTick(sectorFilter?: NewsSector): MarketNewsItem {
  dynamicCounter++;
  const pool = sectorFilter && sectorFilter !== 'ALL'
    ? SIMULATED_TICK_TEMPLATES.filter((t) => t.sector === sectorFilter)
    : SIMULATED_TICK_TEMPLATES;

  const template = pool[Math.floor(Math.random() * pool.length)] || SIMULATED_TICK_TEMPLATES[0];
  const headline = template.headlines[Math.floor(Math.random() * template.headlines.length)];
  const source = template.sources[Math.floor(Math.random() * template.sources.length)];
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Randomize impact score 6-10
  const impactScore = Math.floor(Math.random() * 5) + 6;
  const urgencies: NewsUrgency[] = ['BREAKING', 'ALERT', 'UPDATE', 'FLASH'];
  const urgency = Math.random() < 0.25 ? 'BREAKING' : urgencies[Math.floor(Math.random() * urgencies.length)];

  return {
    id: `tick-news-${dynamicCounter}-${Date.now()}`,
    timestamp: now.toISOString(),
    timeStr: `${hours}:${minutes}:${seconds}`,
    sector: template.sector,
    headline,
    summary: `Simulated real-time financial wire feed broadcast for ${template.sector}. Real-time indicators indicate active trading responsiveness across linked tickers: ${template.tickers.join(', ')}.`,
    source,
    tickers: template.tickers,
    sentiment: template.sentiment,
    urgency,
    impactScore,
    isNew: true,
  };
}

/**
 * Fetch news from the simulated API (with fallback to client generation)
 */
export async function fetchMarketNewsApi(
  sector?: NewsSector,
  searchQuery?: string
): Promise<MarketNewsItem[]> {
  try {
    const params = new URLSearchParams();
    if (sector && sector !== 'ALL') {
      params.append('sector', sector);
    }
    if (searchQuery && searchQuery.trim()) {
      params.append('q', searchQuery.trim());
    }

    const res = await fetch(`/api/market-news?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.headlines)) {
        return data.headlines;
      }
    }
  } catch (e) {
    console.warn('API /api/market-news fallback to client simulated news feed', e);
  }

  // Client-side fallback
  let list = [...INITIAL_NEWS_HEADLINES];
  if (sector && sector !== 'ALL') {
    list = list.filter((item) => item.sector === sector);
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter((item) =>
      item.headline.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.tickers.some((t) => t.toLowerCase().includes(q))
    );
  }
  return list;
}
