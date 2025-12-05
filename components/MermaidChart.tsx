
import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RefreshCcw, Hand, AlertCircle } from 'lucide-react';

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // State for Pan and Zoom
  const [zoom, setZoom] = useState(1); // Default to 100% for readability
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize Mermaid
  useEffect(() => {
    if (window.mermaid) {
      // Config for "Doubao" / XMind style: Tight, compact, organic
      window.mermaid.initialize({
        startOnLoad: false, // Important: We call run() manually
        theme: 'base',
        themeVariables: {
            primaryColor: '#e0f2fe',        // Light Sky Blue (Very light, clean)
            primaryTextColor: '#0f172a',    // Dark Slate
            primaryBorderColor: '#0ea5e9',  // Sky 500
            lineColor: '#cbd5e1',           // Slate-300 lines (subtle)
            secondaryColor: '#f0f9ff',      
            tertiaryColor: '#ffffff',       
            fontFamily: 'Inter, "Noto Sans SC", sans-serif',
            fontSize: '14px',
            edgeLabelBackground: '#ffffff',
            clusterBkg: '#f8fafc',
            clusterBorder: '#e2e8f0',
        },
        flowchart: {
            curve: 'basis',      // 'basis' gives the organic, mind-map feel
            nodeSpacing: 10,     // Tight vertical spacing
            rankSpacing: 50,     // Moderate horizontal spacing
            padding: 5,          // Minimal padding inside nodes
            htmlLabels: true,
        }
      });
    }
  }, []);

  // Render Chart
  useEffect(() => {
    if (containerRef.current && window.mermaid) {
      setError(null);
      containerRef.current.innerHTML = '';
      
      const id = `mermaid-${Date.now()}`;
      const div = document.createElement('div');
      div.id = id;
      div.className = 'mermaid';
      div.textContent = chart; // Use textContent for safety
      containerRef.current.appendChild(div);

      window.mermaid.run({ nodes: [div] }).then(() => {
          // Center the chart initially after render
          setPosition({ x: 0, y: 0 });
      }).catch((e: any) => {
          console.error("Mermaid Render Error", e);
          setError("脑图生成格式有误，AI 偶尔会出错，请尝试重新生成。");
      });
    }
  }, [chart]);

  // Mouse Event Handlers for Panning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    wrapperRef.current?.style.setProperty('cursor', 'grabbing');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    wrapperRef.current?.style.setProperty('cursor', 'grab');
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || true) { // Always allow wheel zoom for convenience
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 3));
    }
  };

  // Toolbar Actions
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.2));
  const handleReset = () => {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[650px] bg-white rounded-xl border border-slate-200 overflow-hidden group select-none shadow-inner">
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style={{ 
                 backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', 
                 backgroundSize: '20px 20px' 
             }}>
        </div>

        {/* Toolbar */}
        {!error && (
            <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] rounded-xl p-2 border border-slate-100">
                <button onClick={handleZoomIn} className="p-2.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors" title="放大">
                    <ZoomIn className="w-5 h-5" />
                </button>
                <button onClick={handleReset} className="p-2.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors" title="重置视图">
                    <RefreshCcw className="w-4 h-4" />
                </button>
                <button onClick={handleZoomOut} className="p-2.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors" title="缩小">
                    <ZoomOut className="w-5 h-5" />
                </button>
            </div>
        )}

        {/* Viewport */}
        <div 
            ref={wrapperRef}
            className="w-full h-full cursor-grab overflow-hidden relative flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            <div 
                style={{ 
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none" 
            >
                 <div ref={containerRef} id="mermaid-content-wrapper" className="pointer-events-auto" />
            </div>
            
            {/* Error Overlay */}
            {error && (
                 <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-40">
                     <div className="bg-white p-6 rounded-xl shadow-lg border border-red-100 flex flex-col items-center max-w-sm text-center">
                         <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                         <p className="text-slate-800 font-bold mb-2">生成出错</p>
                         <p className="text-sm text-slate-500">{error}</p>
                     </div>
                 </div>
            )}
        </div>

        {/* Overlay Info */}
        {!error && (
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-500 shadow-sm pointer-events-none">
                {Math.round(zoom * 100)}% • 拖动平移
            </div>
        )}
    </div>
  );
};

export default MermaidChart;
