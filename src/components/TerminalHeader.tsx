import { useState } from 'react';
import { 
  Activity, 
  Download, 
  RefreshCw, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Tv, 
  Plus, 
  Radio, 
  RotateCcw,
  Check,
  ChevronDown
} from 'lucide-react';
import { DataAdapterMode, WidgetConfig } from '../types';

interface TerminalHeaderProps {
  adapterMode: DataAdapterMode;
  onToggleAdapterMode: () => void;
  simSpeed: number;
  onChangeSimSpeed: (speed: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  widgets: WidgetConfig[];
  onToggleWidgetVisibility: (id: string) => void;
  onResetLayout: () => void;
  onExportZip: () => void;
  isExporting: boolean;
  tickCount: number;
  latencyMs: number;
  utcTimeStr: string;
}

export function TerminalHeader({
  adapterMode,
  onToggleAdapterMode,
  simSpeed,
  onChangeSimSpeed,
  isPaused,
  onTogglePause,
  crtEnabled,
  onToggleAudio,
  audioEnabled,
  onToggleCrt,
  widgets,
  onToggleWidgetVisibility,
  onResetLayout,
  onExportZip,
  isExporting,
  tickCount,
  latencyMs,
  utcTimeStr,
}: TerminalHeaderProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#060a0d]/95 backdrop-blur-md border-b border-emerald-950/80 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1920px] mx-auto">
        
        {/* Left Branding & Live Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="font-bold tracking-wider text-emerald-400 font-mono text-sm">
              MKT-TERM<span className="text-emerald-600">::</span>ALPHA
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-[10px] text-emerald-300 font-mono">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>LATENCY: {latencyMs}ms</span>
            <span className="text-emerald-700">|</span>
            <span>TICKS: {tickCount.toLocaleString()}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 font-mono">
            <span>UTC</span>
            <span className="text-neutral-200 font-semibold">{utcTimeStr}</span>
          </div>
        </div>

        {/* Center: Adapter Mode & Feed Controls */}
        <div className="flex items-center gap-2">
          {/* Live vs Demo Toggle */}
          <button
            id="btn-adapter-mode"
            onClick={onToggleAdapterMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all font-mono text-[11px] ${
              adapterMode === 'live'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                : 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
            }`}
            title="Toggle between Live Feed and Synthetic Demo Simulation"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${adapterMode === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>FEED: {adapterMode.toUpperCase()}</span>
          </button>

          {/* Simulation Speeds */}
          <div className="flex items-center border border-neutral-800 bg-neutral-950/70 rounded overflow-hidden">
            <button
              id="btn-sim-pause"
              onClick={onTogglePause}
              className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                isPaused ? 'bg-amber-600/30 text-amber-300 font-bold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isPaused ? 'RESUME' : 'PAUSE'}
            </button>
            <div className="w-[1px] h-3 bg-neutral-800" />
            {[1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => onChangeSimSpeed(speed)}
                className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                  simSpeed === speed && !isPaused
                    ? 'bg-emerald-600/30 text-emerald-300 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {speed}X
              </button>
            ))}
          </div>

          {/* Audio toggle */}
          <button
            id="btn-audio-toggle"
            onClick={onToggleAudio}
            className={`p-1.5 rounded border transition-colors ${
              audioEnabled
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-400'
            }`}
            title={audioEnabled ? 'Terminal Audio Muted' : 'Enable Terminal Audio Tick'}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* CRT scanline toggle */}
          <button
            id="btn-crt-toggle"
            onClick={onToggleCrt}
            className={`p-1.5 rounded border transition-colors ${
              crtEnabled
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-400'
            }`}
            title={crtEnabled ? 'CRT Scanlines ON' : 'CRT Scanlines OFF'}
          >
            <Tv className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Tools: Add Widget, Reset Layout, Export Offline ZIP */}
        <div className="flex items-center gap-2">
          {/* Add Widget Dropdown */}
          <div className="relative">
            <button
              id="btn-add-widget"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-[11px] font-mono transition-colors"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>WIDGETS</span>
              <ChevronDown className="w-3 h-3 text-neutral-500" />
            </button>

            {showAddMenu && (
              <div 
                className="absolute right-0 mt-1 w-56 bg-[#0c1217] border border-neutral-800 rounded shadow-xl py-1 z-50 text-[11px] font-mono"
                onMouseLeave={() => setShowAddMenu(false)}
              >
                <div className="px-3 py-1.5 text-[10px] text-neutral-500 border-b border-neutral-800/80 uppercase tracking-wider">
                  Toggle Widgets
                </div>
                {widgets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => onToggleWidgetVisibility(w.id)}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-800/70 flex items-center justify-between transition-colors"
                  >
                    <span className={w.isVisible ? 'text-neutral-200' : 'text-neutral-500 line-through'}>
                      {w.title}
                    </span>
                    {w.isVisible && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Layout */}
          <button
            id="btn-reset-layout"
            onClick={onResetLayout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 text-[11px] font-mono transition-colors"
            title="Reset Canvas Layout to Default"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          {/* Export Complete Offline ZIP */}
          <button
            id="btn-export-offline-zip"
            onClick={onExportZip}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-black font-semibold text-[11px] font-mono transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] disabled:opacity-50"
            title="Download Complete Standalone Offline Bundle ZIP with index.html and README"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isExporting ? 'EXPORTING...' : 'OFFLINE ZIP'}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
