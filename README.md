# Global Market Terminal Dashboard

A black-background, Bloomberg/terminal-style, drag-and-drop Canvas dashboard for real-time global market monitoring.

![Terminal Dashboard](public/assets/aistudio/.gitignore)

## Key Features

- **Terminal Canvas Workspace**: Drag-and-drop customizable layout, 1–4 column resizing, minimize/maximize fullscreen focus mode, and persistent layout caching via `localStorage`.
- **World Session Clocks**: Real-time clocks across New York (NYSE/NASDAQ), London (LSE), Frankfurt (XETRA), Tokyo (TSE), Hong Kong (HKEX), and Sydney (ASX) with a 24-hour UTC visual session overlap ribbon and live active exchange countdowns.
- **AAPL 60-Session Technical Chart**: Candlestick, Line, and Area chart views across 60 complete trading sessions, interactive hover crosshair, volume distribution, RSI (14) indicator with 70/30 thresholds, SMA 20, SMA 50, EMA 9, and Bollinger Bands overlays.
- **AI / Energy / Financials Heatmap**: Market-cap-weighted interactive treemap/grid colored by net gain/loss with sector filtering and fundamental stock inspection drawers.
- **Global Equity Indices**: S&P 500, NASDAQ 100, Dow Jones, FTSE 100, DAX 40, Nikkei 225, Hang Seng, Shanghai Composite, and Nifty 50 with live 7-day sparklines, session ranges, and net change meters.
- **Precious Metals & Commodities**: Real-time Bid/Ask matrix, live spread, Gold/Silver ratio (e.g. 84.5x), and 24-hour range gauges for Gold, Silver, Platinum, Palladium, WTI, Brent, and Copper.
- **Dual Data Adapters (Live / Demo)**: Switch between live feed synchronization and high-frequency deterministic simulation engine with adjustable tick speeds (1X, 2X, 5X, Pause).
- **Terminal Customization**: Toggleable retro CRT phosphor scanlines and Web Audio synthesized tick feedback.
- **Complete Offline Bundle**: One-click in-app export to a standalone `.zip` archive containing `index.html`, datasets, and zero-dependency offline executable verified for direct double-click opening with no console errors.

## Running Locally

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build production bundle
npm run build
```

## Offline Package

You can download the pre-packaged offline version directly from `/global-market-terminal-offline.zip` or click the **"OFFLINE ZIP"** button in the top terminal header.
