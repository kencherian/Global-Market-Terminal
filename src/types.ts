export type DataAdapterMode = 'live' | 'demo';

export interface MarketIndex {
  symbol: string;
  name: string;
  region: 'Americas' | 'Europe' | 'Asia-Pacific';
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: string;
  sparkline: number[];
  currency: string;
  lastUpdated: string;
}

export interface HeatmapStock {
  ticker: string;
  company: string;
  sector: 'AI & Semiconductors' | 'Energy' | 'Financials';
  marketCap: number; // in Billions USD
  price: number;
  changePercent: number;
  volume: string;
  peRatio: number;
  high52w: number;
  low52w: number;
}

export interface CandleData {
  date: string;
  sessionIndex: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20?: number;
  ma50?: number;
  ema9?: number;
  upperBand?: number;
  lowerBand?: number;
  rsi?: number;
  volMa20?: number;
}

export interface CommodityMetal {
  symbol: string;
  name: string;
  category: 'Metals' | 'Energy';
  unit: string;
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  sparkline: number[];
}

export type SessionStatus = 'OPEN' | 'CLOSED' | 'PRE-MARKET' | 'AFTER-HOURS';

export interface WorldClockSession {
  id: string;
  city: string;
  exchange: string;
  timezone: string;
  utcOffset: number; // in hours
  openUtcHour: number;
  closeUtcHour: number;
  status: SessionStatus;
  localTime: string;
  flag: string;
  currency: string;
  hoursUntilEvent: string;
}

export type WidgetType = 
  | 'world_clocks'
  | 'global_indices'
  | 'sector_heatmap'
  | 'aapl_chart'
  | 'precious_metals'
  | 'terminal_tape'
  | 'market_sentiment'
  | 'market_news';

export type NewsSector = 
  | 'ALL'
  | 'TECH'
  | 'FINANCIALS'
  | 'ENERGY'
  | 'MACRO'
  | 'HEALTHCARE'
  | 'CONSUMER'
  | 'METALS';

export type NewsSentiment = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type NewsUrgency = 'BREAKING' | 'ALERT' | 'UPDATE' | 'FLASH';

export interface MarketNewsItem {
  id: string;
  timestamp: string; // ISO string or time string
  timeStr: string;   // Display formatted time (e.g. 14:32:05)
  sector: NewsSector;
  headline: string;
  summary: string;
  source: string;    // 'BLOOMBERG' | 'REUTERS' | 'DJ WIRES' | 'SEC EDGAR' | 'FED WIRE' | 'CNBC'
  tickers: string[];
  sentiment: NewsSentiment;
  urgency: NewsUrgency;
  impactScore: number; // 1-10
  isNew?: boolean;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  category: string;
  colSpan: 1 | 2 | 3 | 4; // in 4-column desktop grid
  minColSpan?: number;
  isVisible: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
}

export interface SentimentSubGauge {
  score: number;
  label: string;
  detail: string;
}

export interface MarketSentimentData {
  score: number; // 0 to 100
  label: 'Extreme Bearish' | 'Bearish' | 'Neutral' | 'Bullish' | 'Extreme Bullish';
  headline: string;
  summary: string;
  keyDrivers: string[];
  subGauges: {
    technicalMomentum: SentimentSubGauge;
    marketBreadth: SentimentSubGauge;
    volatilityRisk: SentimentSubGauge;
    macroOutlook: SentimentSubGauge;
  };
  institutionalFlow: string;
  bias: string;
  previousScore?: number;
  dayLow?: number;
  dayHigh?: number;
  timestamp: string;
  source: 'gemini-3.8-flash' | 'algorithmic-heuristic';
  fallback?: boolean;
}

export interface TerminalAlert {
  id: string;
  timestamp: string;
  level: 'INFO' | 'NOTICE' | 'SPIKE' | 'WARNING';
  source: string;
  text: string;
}

export type DivergenceType = 'BULLISH' | 'BEARISH' | 'HIDDEN_BULLISH' | 'HIDDEN_BEARISH';

export interface DivergencePoint {
  index: number;
  date: string;
  price: number;
  rsi: number;
}

export interface RsiDivergence {
  id: string;
  type: DivergenceType;
  p1: DivergencePoint;
  p2: DivergencePoint;
  priceDelta: number;
  priceDeltaPct: number;
  rsiDelta: number;
  detectedAt: string;
  status: 'ACTIVE' | 'CONFIRMED' | 'HISTORICAL';
  summary: string;
}
