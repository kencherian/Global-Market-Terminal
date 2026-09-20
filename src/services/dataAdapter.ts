import { 
  MarketIndex, 
  HeatmapStock, 
  CandleData, 
  CommodityMetal, 
  WorldClockSession, 
  SessionStatus,
  TerminalAlert 
} from '../types';

// Baseline 60 Sessions of AAPL OHLC Data with realistic volatility & trend
export function generateAAPL60Sessions(): CandleData[] {
  const sessions: CandleData[] = [];
  const basePrice = 224.50;
  let currentPrice = basePrice;
  const now = new Date();
  
  // Generate 60 trading days backwards (skipping weekends roughly)
  const dates: string[] = [];
  let d = new Date(now);
  while (dates.length < 60) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.unshift(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() - 1);
  }

  // Known anchor points to create realistic market structure
  for (let i = 0; i < 60; i++) {
    const drift = (Math.sin(i / 6) * 1.5) + (Math.cos(i / 12) * 1.2);
    const noise = (Math.sin(i * 3.7) * 2.8) + (Math.cos(i * 1.9) * 2.1);
    
    const open = Math.round((currentPrice + (Math.random() * 0.8 - 0.4)) * 100) / 100;
    const change = drift + noise * 0.7;
    const close = Math.round((open + change) * 100) / 100;
    const high = Math.round((Math.max(open, close) + Math.abs(Math.sin(i * 2.3) * 2.2) + 0.5) * 100) / 100;
    const low = Math.round((Math.min(open, close) - Math.abs(Math.cos(i * 3.1) * 2.0) - 0.4) * 100) / 100;
    const volume = Math.round(42000000 + Math.abs(Math.sin(i * 1.4) * 28000000) + Math.random() * 8000000);

    sessions.push({
      date: dates[i] || `Session -${59 - i}`,
      sessionIndex: i + 1,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  // Calculate technical indicators (SMA20, SMA50, EMA9, Bollinger Bands, RSI)
  for (let i = 0; i < sessions.length; i++) {
    // SMA 20
    if (i >= 19) {
      const slice = sessions.slice(i - 19, i + 1);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      const sma = sum / 20;
      sessions[i].ma20 = Math.round(sma * 100) / 100;

      // Bollinger Bands (2 std deviations of 20 SMA)
      const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - sma, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      sessions[i].upperBand = Math.round((sma + stdDev * 2) * 100) / 100;
      sessions[i].lowerBand = Math.round((sma - stdDev * 2) * 100) / 100;
    }

    // SMA 50
    if (i >= 49) {
      const slice = sessions.slice(i - 49, i + 1);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      sessions[i].ma50 = Math.round((sum / 50) * 100) / 100;
    }

    // EMA 9
    if (i === 0) {
      sessions[i].ema9 = sessions[i].close;
    } else {
      const prevEma = sessions[i - 1].ema9 || sessions[i - 1].close;
      const k = 2 / (9 + 1);
      sessions[i].ema9 = Math.round((sessions[i].close * k + prevEma * (1 - k)) * 100) / 100;
    }

    // RSI 14
    if (i >= 14) {
      let gains = 0;
      let losses = 0;
      for (let j = i - 13; j <= i; j++) {
        const diff = sessions[j].close - sessions[j - 1].close;
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      if (avgLoss === 0) {
        sessions[i].rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        sessions[i].rsi = Math.round((100 - (100 / (1 + rs))) * 10) / 10;
      }
    } else {
      sessions[i].rsi = 54.2;
    }
  }

  return sessions;
}

export const INITIAL_INDICES: MarketIndex[] = [
  {
    symbol: 'SPX',
    name: 'S&P 500',
    region: 'Americas',
    price: 5894.25,
    change: 32.80,
    changePercent: 0.56,
    dayHigh: 5908.12,
    dayLow: 5854.40,
    volume: '2.84B',
    currency: 'USD',
    lastUpdated: '16:00:02 EDT',
    sparkline: [5860, 5854, 5872, 5868, 5885, 5879, 5894],
  },
  {
    symbol: 'NDX',
    name: 'NASDAQ 100',
    region: 'Americas',
    price: 20612.40,
    change: 184.60,
    changePercent: 0.90,
    dayHigh: 20680.10,
    dayLow: 20450.30,
    volume: '4.12B',
    currency: 'USD',
    lastUpdated: '16:00:00 EDT',
    sparkline: [20450, 20480, 20520, 20510, 20590, 20570, 20612],
  },
  {
    symbol: 'DJI',
    name: 'Dow Jones 30',
    region: 'Americas',
    price: 43245.80,
    change: -74.20,
    changePercent: -0.17,
    dayHigh: 43380.00,
    dayLow: 43190.50,
    volume: '345M',
    currency: 'USD',
    lastUpdated: '16:00:00 EDT',
    sparkline: [43320, 43350, 43290, 43310, 43210, 43260, 43245],
  },
  {
    symbol: 'FTSE',
    name: 'FTSE 100',
    region: 'Europe',
    price: 8295.10,
    change: 28.45,
    changePercent: 0.34,
    dayHigh: 8312.20,
    dayLow: 8264.00,
    volume: '780M',
    currency: 'GBP',
    lastUpdated: '16:35:00 BST',
    sparkline: [8265, 8274, 8290, 8282, 8305, 8290, 8295],
  },
  {
    symbol: 'DAX',
    name: 'DAX 40',
    region: 'Europe',
    price: 19488.60,
    change: 112.30,
    changePercent: 0.58,
    dayHigh: 19524.00,
    dayLow: 19390.10,
    volume: '640M',
    currency: 'EUR',
    lastUpdated: '17:30:00 CEST',
    sparkline: [19390, 19410, 19445, 19430, 19495, 19470, 19488],
  },
  {
    symbol: 'N225',
    name: 'Nikkei 225',
    region: 'Asia-Pacific',
    price: 39180.30,
    change: -210.50,
    changePercent: -0.53,
    dayHigh: 39420.00,
    dayLow: 39050.80,
    volume: '1.2B',
    currency: 'JPY',
    lastUpdated: '15:00:00 JST',
    sparkline: [39390, 39320, 39210, 39280, 39100, 39140, 39180],
  },
  {
    symbol: 'HSI',
    name: 'Hang Seng',
    region: 'Asia-Pacific',
    price: 20724.90,
    change: 362.15,
    changePercent: 1.78,
    dayHigh: 20850.00,
    dayLow: 20410.00,
    volume: '2.1B',
    currency: 'HKD',
    lastUpdated: '16:00:00 HKT',
    sparkline: [20420, 20510, 20640, 20590, 20780, 20700, 20724],
  },
  {
    symbol: 'SHCOMP',
    name: 'Shanghai Composite',
    region: 'Asia-Pacific',
    price: 3345.20,
    change: 22.80,
    changePercent: 0.69,
    dayHigh: 3360.50,
    dayLow: 3318.00,
    volume: '4.8B',
    currency: 'CNY',
    lastUpdated: '15:00:00 CST',
    sparkline: [3320, 3328, 3340, 3335, 3352, 3341, 3345],
  },
  {
    symbol: 'NIFTY',
    name: 'Nifty 50',
    region: 'Asia-Pacific',
    price: 25114.80,
    change: 89.20,
    changePercent: 0.36,
    dayHigh: 25180.00,
    dayLow: 24995.00,
    volume: '490M',
    currency: 'INR',
    lastUpdated: '15:30:00 IST',
    sparkline: [25020, 25050, 25090, 25070, 25140, 25100, 25114],
  },
];

export const INITIAL_HEATMAP_STOCKS: HeatmapStock[] = [
  // AI & Semiconductors
  { ticker: 'NVDA', company: 'NVIDIA Corp', sector: 'AI & Semiconductors', marketCap: 3420, price: 139.80, changePercent: 3.42, volume: '62.4M', peRatio: 58.4, high52w: 144.42, low52w: 45.10 },
  { ticker: 'MSFT', company: 'Microsoft Corp', sector: 'AI & Semiconductors', marketCap: 3180, price: 428.15, changePercent: 1.15, volume: '21.8M', peRatio: 35.2, high52w: 468.35, low52w: 309.45 },
  { ticker: 'GOOGL', company: 'Alphabet Inc', sector: 'AI & Semiconductors', marketCap: 2040, price: 165.30, changePercent: 1.64, volume: '24.1M', peRatio: 23.8, high52w: 191.75, low52w: 120.21 },
  { ticker: 'TSM', company: 'Taiwan Semi ADR', sector: 'AI & Semiconductors', marketCap: 990, price: 192.40, changePercent: 2.85, volume: '18.9M', peRatio: 31.4, high52w: 205.84, low52w: 84.50 },
  { ticker: 'AVGO', company: 'Broadcom Inc', sector: 'AI & Semiconductors', marketCap: 830, price: 178.60, changePercent: 2.10, volume: '14.2M', peRatio: 42.1, high52w: 185.16, low52w: 80.80 },
  { ticker: 'AMD', company: 'Adv Micro Devices', sector: 'AI & Semiconductors', marketCap: 252, price: 156.25, changePercent: -1.24, volume: '48.5M', peRatio: 112.0, high52w: 227.30, low52w: 94.04 },
  { ticker: 'ASML', company: 'ASML Holding ADR', sector: 'AI & Semiconductors', marketCap: 290, price: 712.50, changePercent: -2.35, volume: '4.8M', peRatio: 38.6, high52w: 1110.09, low52w: 654.10 },
  { ticker: 'PLTR', company: 'Palantir Tech', sector: 'AI & Semiconductors', marketCap: 98, price: 43.80, changePercent: 4.88, volume: '72.1M', peRatio: 118.5, high52w: 44.90, low52w: 14.48 },
  
  // Energy
  { ticker: 'XOM', company: 'Exxon Mobil', sector: 'Energy', marketCap: 492, price: 123.40, changePercent: 0.85, volume: '14.9M', peRatio: 14.2, high52w: 126.34, low52w: 95.77 },
  { ticker: 'CVX', company: 'Chevron Corp', sector: 'Energy', marketCap: 278, price: 152.10, changePercent: 0.42, volume: '8.4M', peRatio: 13.8, high52w: 167.11, low52w: 139.60 },
  { ticker: 'SHEL', company: 'Shell plc ADR', sector: 'Energy', marketCap: 215, price: 68.30, changePercent: -0.65, volume: '6.2M', peRatio: 11.2, high52w: 74.33, low52w: 60.10 },
  { ticker: 'COP', company: 'ConocoPhillips', sector: 'Energy', marketCap: 126, price: 108.90, changePercent: 0.25, volume: '5.1M', peRatio: 12.6, high52w: 134.50, low52w: 104.20 },
  { ticker: 'SLB', company: 'Schlumberger Ltd', sector: 'Energy', marketCap: 62, price: 43.50, changePercent: -1.45, volume: '9.8M', peRatio: 13.9, high52w: 61.40, low52w: 41.20 },
  { ticker: 'EOG', company: 'EOG Resources', sector: 'Energy', marketCap: 73, price: 128.40, changePercent: 1.10, volume: '3.4M', peRatio: 10.4, high52w: 139.80, low52w: 112.50 },
  { ticker: 'TTE', company: 'TotalEnergies SE', sector: 'Energy', marketCap: 148, price: 63.80, changePercent: -0.80, volume: '3.9M', peRatio: 8.1, high52w: 73.20, low52w: 59.80 },

  // Financials
  { ticker: 'JPM', company: 'JPMorgan Chase', sector: 'Financials', marketCap: 628, price: 221.75, changePercent: 1.45, volume: '11.2M', peRatio: 12.8, high52w: 225.48, low52w: 138.80 },
  { ticker: 'BAC', company: 'Bank of America', sector: 'Financials', marketCap: 334, price: 42.60, changePercent: 0.90, volume: '38.5M', peRatio: 14.1, high52w: 44.44, low52w: 24.96 },
  { ticker: 'WFC', company: 'Wells Fargo & Co', sector: 'Financials', marketCap: 224, price: 63.85, changePercent: 2.10, volume: '19.4M', peRatio: 12.9, high52w: 64.92, low52w: 38.60 },
  { ticker: 'GS', company: 'Goldman Sachs', sector: 'Financials', marketCap: 168, price: 512.40, changePercent: 1.80, volume: '2.8M', peRatio: 16.5, high52w: 524.30, low52w: 289.36 },
  { ticker: 'MS', company: 'Morgan Stanley', sector: 'Financials', marketCap: 188, price: 116.20, changePercent: 3.20, volume: '14.1M', peRatio: 17.8, high52w: 118.45, low52w: 69.42 },
  { ticker: 'V', company: 'Visa Inc', sector: 'Financials', marketCap: 560, price: 282.40, changePercent: 0.15, volume: '6.4M', peRatio: 29.4, high52w: 290.96, low52w: 227.68 },
  { ticker: 'MA', company: 'Mastercard Inc', sector: 'Financials', marketCap: 472, price: 508.90, changePercent: 0.40, volume: '2.9M', peRatio: 36.1, high52w: 518.25, low52w: 365.10 },
  { ticker: 'BLK', company: 'BlackRock Inc', sector: 'Financials', marketCap: 146, price: 978.50, changePercent: 1.25, volume: '750K', peRatio: 24.2, high52w: 1012.00, low52w: 602.00 },
];

export const INITIAL_METALS: CommodityMetal[] = [
  {
    symbol: 'XAU/USD',
    name: 'Gold Spot',
    category: 'Metals',
    unit: 'oz',
    bid: 2658.40,
    ask: 2658.90,
    last: 2658.65,
    change: 14.30,
    changePercent: 0.54,
    high24h: 2665.20,
    low24h: 2641.80,
    sparkline: [2642, 2648, 2651, 2649, 2663, 2655, 2658],
  },
  {
    symbol: 'XAG/USD',
    name: 'Silver Spot',
    category: 'Metals',
    unit: 'oz',
    bid: 31.42,
    ask: 31.46,
    last: 31.44,
    change: 0.48,
    changePercent: 1.55,
    high24h: 31.85,
    low24h: 30.82,
    sparkline: [30.85, 31.02, 31.18, 31.10, 31.62, 31.35, 31.44],
  },
  {
    symbol: 'XPT/USD',
    name: 'Platinum Spot',
    category: 'Metals',
    unit: 'oz',
    bid: 994.20,
    ask: 996.80,
    last: 995.50,
    change: -4.80,
    changePercent: -0.48,
    high24h: 1008.50,
    low24h: 989.10,
    sparkline: [1005, 1002, 998, 992, 990, 997, 995],
  },
  {
    symbol: 'XPD/USD',
    name: 'Palladium Spot',
    category: 'Metals',
    unit: 'oz',
    bid: 1018.50,
    ask: 1024.00,
    last: 1021.25,
    change: 12.75,
    changePercent: 1.26,
    high24h: 1035.00,
    low24h: 998.00,
    sparkline: [1001, 1008, 1014, 1012, 1028, 1019, 1021],
  },
  {
    symbol: 'WTI/USD',
    name: 'Crude Oil (WTI)',
    category: 'Energy',
    unit: 'bbl',
    bid: 70.88,
    ask: 70.92,
    last: 70.90,
    change: -0.84,
    changePercent: -1.17,
    high24h: 72.15,
    low24h: 70.40,
    sparkline: [71.9, 71.8, 71.2, 71.5, 70.6, 70.8, 70.9],
  },
  {
    symbol: 'BRENT/USD',
    name: 'Brent Crude',
    category: 'Energy',
    unit: 'bbl',
    bid: 74.46,
    ask: 74.50,
    last: 74.48,
    change: -0.72,
    changePercent: -0.96,
    high24h: 75.80,
    low24h: 73.95,
    sparkline: [75.4, 75.3, 74.8, 75.1, 74.2, 74.3, 74.48],
  },
  {
    symbol: 'HG/USD',
    name: 'Copper Futures',
    category: 'Metals',
    unit: 'lb',
    bid: 4.382,
    ask: 4.388,
    last: 4.385,
    change: 0.045,
    changePercent: 1.04,
    high24h: 4.415,
    low24h: 4.320,
    sparkline: [4.33, 4.35, 4.36, 4.34, 4.40, 4.37, 4.385],
  },
];

export function calculateWorldSessions(now: Date = new Date()): WorldClockSession[] {
  // Current UTC hour and minute
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const dayOfWeek = now.getUTCDay(); // 0 is Sun, 6 is Sat

  const isWeekend = dayOfWeek === 0 || (dayOfWeek === 6 && utcHours > 0) || (dayOfWeek === 5 && utcHours > 22);

  const rawSessions = [
    {
      id: 'ny',
      city: 'New York',
      exchange: 'NYSE / NASDAQ',
      timezone: 'America/New_York',
      utcOffset: -4,
      openUtcHour: 13.5, // 9:30 AM EDT = 13:30 UTC
      closeUtcHour: 20.0, // 4:00 PM EDT = 20:00 UTC
      flag: '🇺🇸',
      currency: 'USD',
    },
    {
      id: 'lon',
      city: 'London',
      exchange: 'London Stock Exchange',
      timezone: 'Europe/London',
      utcOffset: 1,
      openUtcHour: 7.0, // 8:00 AM BST = 7:00 UTC
      closeUtcHour: 15.5, // 4:30 PM BST = 15:30 UTC
      flag: '🇬🇧',
      currency: 'GBP',
    },
    {
      id: 'fra',
      city: 'Frankfurt',
      exchange: 'Deutsche Börse XETRA',
      timezone: 'Europe/Berlin',
      utcOffset: 2,
      openUtcHour: 7.0, // 9:00 AM CEST = 7:00 UTC
      closeUtcHour: 15.5, // 5:30 PM CEST = 15:30 UTC
      flag: '🇩🇪',
      currency: 'EUR',
    },
    {
      id: 'tyo',
      city: 'Tokyo',
      exchange: 'Tokyo Stock Exchange',
      timezone: 'Asia/Tokyo',
      utcOffset: 9,
      openUtcHour: 0.0, // 9:00 AM JST = 0:00 UTC
      closeUtcHour: 6.0, // 3:00 PM JST = 6:00 UTC
      flag: '🇯🇵',
      currency: 'JPY',
    },
    {
      id: 'hkg',
      city: 'Hong Kong',
      exchange: 'HKEX',
      timezone: 'Asia/Hong_Kong',
      utcOffset: 8,
      openUtcHour: 1.5, // 9:30 AM HKT = 1:30 UTC
      closeUtcHour: 8.0, // 4:00 PM HKT = 8:00 UTC
      flag: '🇭🇰',
      currency: 'HKD',
    },
    {
      id: 'syd',
      city: 'Sydney',
      exchange: 'Australian Sec. Exchange',
      timezone: 'Australia/Sydney',
      utcOffset: 10,
      openUtcHour: 23.0, // 10:00 AM AEST = 0:00 UTC (or prev day 23:00 UTC)
      closeUtcHour: 5.0, // 4:00 PM AEST = 6:00 UTC
      flag: '🇦🇺',
      currency: 'AUD',
    },
  ];

  return rawSessions.map((s) => {
    let status: SessionStatus = 'CLOSED';
    let hoursUntilEvent = '';

    // Calculate local time string
    const localTimeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: s.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    if (isWeekend) {
      status = 'CLOSED';
      hoursUntilEvent = 'Weekend Closed';
    } else {
      // Check session active status
      let inSession = false;
      if (s.openUtcHour < s.closeUtcHour) {
        inSession = utcHours >= s.openUtcHour && utcHours < s.closeUtcHour;
      } else {
        // Crosses midnight (e.g. Sydney)
        inSession = utcHours >= s.openUtcHour || utcHours < s.closeUtcHour;
      }

      if (inSession) {
        status = 'OPEN';
        let diff = s.closeUtcHour - utcHours;
        if (diff < 0) diff += 24;
        const h = Math.floor(diff);
        const m = Math.floor((diff - h) * 60);
        hoursUntilEvent = `Closes in ${h}h ${m}m`;
      } else {
        // Check Pre-market (1.5 hours before open)
        let hoursToOpen = s.openUtcHour - utcHours;
        if (hoursToOpen < 0) hoursToOpen += 24;

        if (hoursToOpen <= 1.5 && hoursToOpen > 0) {
          status = 'PRE-MARKET';
          const m = Math.floor(hoursToOpen * 60);
          hoursUntilEvent = `Opens in ${m}m`;
        } else {
          status = 'CLOSED';
          const h = Math.floor(hoursToOpen);
          const m = Math.floor((hoursToOpen - h) * 60);
          hoursUntilEvent = `Opens in ${h}h ${m}m`;
        }
      }
    }

    return {
      ...s,
      status,
      localTime: localTimeStr,
      hoursUntilEvent,
    };
  });
}
