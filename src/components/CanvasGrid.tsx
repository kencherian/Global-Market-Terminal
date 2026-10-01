import { useState, type ReactNode, type DragEvent } from 'react';
import { WidgetConfig } from '../types';
import { 
  GripVertical, 
  Minus, 
  Square, 
  Minimize2, 
  X, 
  Maximize2, 
  ArrowLeftRight,
  Columns
} from 'lucide-react';

interface CanvasGridProps {
  widgets: WidgetConfig[];
  onReorderWidgets: (draggedId: string, targetId: string) => void;
  onUpdateWidgetSpan: (id: string, newColSpan: 1 | 2 | 3 | 4) => void;
  onToggleMinimize: (id: string) => void;
  onToggleMaximize: (id: string) => void;
  onCloseWidget: (id: string) => void;
  renderWidgetContent: (widget: WidgetConfig) => ReactNode;
}

export function CanvasGrid({
  widgets,
  onReorderWidgets,
  onUpdateWidgetSpan,
  onToggleMinimize,
  onToggleMaximize,
  onCloseWidget,
  renderWidgetContent,
}: CanvasGridProps) {
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);

  // If any widget is maximized, render solely that widget in full screen mode
  const maximizedWidget = widgets.find((w) => w.isMaximized && w.isVisible);

  if (maximizedWidget) {
    return (
      <div className="p-4 max-w-[1920px] mx-auto">
        <div className="bg-[#070b0e] border border-emerald-500/50 rounded-lg shadow-2xl overflow-hidden flex flex-col min-h-[85vh]">
          {/* Header */}
          <div className="bg-[#0b1116] border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-300 font-mono text-sm tracking-wider">
                {maximizedWidget.title}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono uppercase">
                [FULLSCREEN FOCUS MODE]
              </span>
            </div>
            <button
              onClick={() => onToggleMaximize(maximizedWidget.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-700 hover:border-emerald-500 text-neutral-300 hover:text-white text-xs font-mono transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>RESTORE CANVAS</span>
            </button>
          </div>
          {/* Content */}
          <div className="p-4 flex-1 overflow-auto">
            {renderWidgetContent(maximizedWidget)}
          </div>
        </div>
      </div>
    );
  }

  const visibleWidgets = widgets.filter((w) => w.isVisible);

  const handleDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedWidgetId(id);
  };

  const handleDragOver = (e: DragEvent, id: string) => {
    e.preventDefault();
    if (draggedWidgetId && draggedWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverWidgetId(null);
  };

  const handleDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== targetId) {
      onReorderWidgets(sourceId, targetId);
    }
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  return (
    <div className="p-3 sm:p-4 max-w-[1920px] mx-auto min-h-[calc(100vh-140px)]">
      {/* 4-column responsive CSS Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
        {visibleWidgets.map((widget) => {
          const isDragging = draggedWidgetId === widget.id;
          const isOver = dragOverWidgetId === widget.id;

          // Tailwind col-span classes based on widget.colSpan
          let spanClass = 'col-span-1';
          if (widget.colSpan === 2) spanClass = 'col-span-1 md:col-span-2 xl:col-span-2';
          if (widget.colSpan === 3) spanClass = 'col-span-1 md:col-span-2 xl:col-span-3';
          if (widget.colSpan === 4) spanClass = 'col-span-1 md:col-span-2 xl:col-span-4';

          return (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, widget.id)}
              className={`${spanClass} transition-all duration-200 group ${
                isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'
              } ${isOver ? 'ring-2 ring-emerald-500 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)]' : ''}`}
            >
              <div className="bg-[#070b0e] border border-neutral-800/90 hover:border-neutral-700/80 rounded-lg overflow-hidden shadow-lg flex flex-col">
                
                {/* Terminal Widget Titlebar (Drag Handle) */}
                <div className="bg-[#0b1015] border-b border-neutral-800/90 px-3 py-1.5 flex items-center justify-between select-none cursor-grab active:cursor-grabbing">
                  
                  {/* Left: Grip Handle & Title */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-neutral-600 group-hover:text-emerald-400 transition-colors" />
                    <span className="font-bold text-neutral-200 text-xs font-mono tracking-wide">
                      {widget.title}
                    </span>
                    <span className="hidden sm:inline text-[9px] px-1 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-neutral-500 font-mono">
                      {widget.category}
                    </span>
                  </div>

                  {/* Right: Window Controls & Span Selector */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    
                    {/* Width Resize Toggle (Cycle 1 -> 2 -> 3 -> 4) */}
                    <button
                      onClick={() => {
                        const nextSpan = (widget.colSpan % 4 + 1) as 1 | 2 | 3 | 4;
                        onUpdateWidgetSpan(widget.id, nextSpan);
                      }}
                      className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60 transition-colors text-[10px] font-mono flex items-center gap-0.5"
                      title={`Current width: ${widget.colSpan}/4 columns. Click to resize.`}
                    >
                      <Columns className="w-3 h-3" />
                      <span>{widget.colSpan}C</span>
                    </button>

                    <div className="w-[1px] h-3 bg-neutral-800" />

                    {/* Minimize / Expand */}
                    <button
                      onClick={() => onToggleMinimize(widget.id)}
                      className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60 transition-colors"
                      title={widget.isMinimized ? 'Expand Widget' : 'Minimize Widget'}
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    {/* Maximize to full view */}
                    <button
                      onClick={() => onToggleMaximize(widget.id)}
                      className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60 transition-colors"
                      title="Maximize to Fullscreen"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>

                    {/* Close / Hide Widget */}
                    <button
                      onClick={() => onCloseWidget(widget.id)}
                      className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800/60 transition-colors"
                      title="Close Widget (Restore from WIDGETS menu)"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Widget Body */}
                {!widget.isMinimized && (
                  <div className="p-3 sm:p-3.5 flex-1">
                    {renderWidgetContent(widget)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
