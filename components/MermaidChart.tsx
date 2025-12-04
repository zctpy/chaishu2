
import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, RefreshCcw } from 'lucide-react';

declare global {
  interface Window {
    mermaid: any;
  }
}

interface MermaidChartProps {
  chart: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (window.mermaid) {
      // Config for a cleaner, more professional look (No Yellows)
      window.mermaid.initialize({ 
        startOnLoad: true, 
        theme: 'base',
        themeVariables: {
            primaryColor: '#ffffff',        // White nodes
            primaryTextColor: '#0f172a',    // Slate-900 text
            primaryBorderColor: '#10b981',  // Emerald-500 border
            lineColor: '#64748b',           // Slate-500 lines
            secondaryColor: '#f1f5f9',      // Slate-100 (Secondary nodes)
            tertiaryColor: '#e2e8f0',       // Slate-200 (Tertiary/Clusters) - Replaced Yellow
            fontFamily: 'Inter, sans-serif',
            clusterBkg: '#f8fafc',          // Very light background for clusters
            clusterBorder: '#cbd5e1',       // Subtle border
        },
        flowchart: {
            curve: 'monotoneX', // Cleaner, slightly less curvy lines than 'basis'
            nodeSpacing: 30,    // Tighter spacing
            rankSpacing: 40,    // Tighter spacing between levels
            padding: 10
        }
      });
    }
  }, []);

  useEffect(() => {
    if (containerRef.current && window.mermaid) {
      // Clean up previous SVG to prevent duplicates/artifacts
      containerRef.current.innerHTML = ''; 
      
      const id = `mermaid-${Date.now()}`;
      const div = document.createElement('div');
      div.id = id;
      div.className = 'mermaid';
      div.innerHTML = chart;
      containerRef.current.appendChild(div);

      try {
        window.mermaid.run({
            nodes: [div]
        });
      } catch (e) {
        console.error("Mermaid rendering error", e);
        containerRef.current.innerHTML = "<p class='text-red-500 text-sm p-4'>思维导图渲染出错，建议点击“详细版”或刷新。</p>";
      }
      // Reset zoom on new chart
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [chart]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom on wheel
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.2, Math.min(prev + delta, 5)));
  };

  return (
    <div className="relative w-full h-[600px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
        
        {/* Toolbar */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-lg rounded-lg p-1.5 border border-slate-200">
            <button 
                onClick={handleZoomIn}
                className="p-2 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded transition-colors"
                title="放大"
            >
                <ZoomIn className="w-5 h-5" />
            </button>
            <button 
                onClick={handleReset}
                className="p-2 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded transition-colors"
                title="重置视图"
            >
                <RefreshCcw className="w-4 h-4" />
            </button>
            <button 
                onClick={handleZoomOut}
                className="p-2 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded transition-colors"
                title="缩小"
            >
                <ZoomOut className="w-5 h-5" />
            </button>
        </div>

        {/* Scrollable Area - Mouse Wheel Zoom Attached Here */}
        <div 
            className="w-full h-full overflow-auto flex items-center justify-center p-4 cursor-grab active:cursor-grabbing bg-slate-50/30"
            onWheel={handleWheel}
        >
            <div 
                style={{ 
                    transform: `scale(${zoom})`, 
                    transformOrigin: 'center top',
                    transition: 'transform 0.1s ease-out'
                }}
                className="min-w-full min-h-full flex items-center justify-center"
            >
                <div ref={containerRef} className="w-full text-center" id="mermaid-content-wrapper" />
            </div>
        </div>
        
        {/* Helper Hint */}
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-100 text-xs text-slate-500 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
            支持鼠标滚轮缩放 • 拖动查看 • 当前比例 {Math.round(zoom * 100)}%
        </div>
    </div>
  );
};

export default MermaidChart;
