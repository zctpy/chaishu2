
import React, { useRef, useState } from 'react';
import { X, Download, Share2, Sparkles, BookOpen, Twitter, Facebook, Quote, Palette, Circle } from 'lucide-react';

declare global {
  interface Window {
    html2canvas: any;
  }
}

export interface ShareData {
  title: string;
  author?: string;
  text: string; // The quote or summary
  subText?: string; // Translation
  footer?: string; // Reason or extra info
  type: 'QUOTE' | 'SUMMARY';
}

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ShareData | null;
}

const COLORS = [
    { id: 'NEON', name: '赛博霓虹', from: '#2e1065', to: '#be185d', text: '#fff', overlay: 'bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20' },
    { id: 'OBSIDIAN', name: '黑金流光', from: '#09090b', to: '#27272a', text: '#fcd34d', overlay: 'bg-gradient-to-tr from-yellow-500/10 via-transparent to-yellow-200/5' },
    { id: 'OCEAN', name: '深海极光', from: '#0f172a', to: '#0e7490', text: '#e0f2fe', overlay: 'bg-gradient-to-t from-cyan-400/10 to-blue-600/20' },
    { id: 'BEIGE', name: '护眼米黄', from: '#fdfbf7', to: '#e8e4d9', text: '#4a4740', overlay: 'bg-gradient-to-br from-orange-100/30 to-yellow-100/30' },
    { id: 'ZEN', name: '禅意墨绿', from: '#1a2e26', to: '#26423a', text: '#d1fae5', overlay: 'bg-gradient-to-br from-emerald-900/40 to-teal-900/40' },
];

const SocialShareModal: React.FC<SocialShareModalProps> = ({ isOpen, onClose, data }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isPureMode, setIsPureMode] = useState(false);

  if (!isOpen || !data) return null;

  const activeColor = COLORS[selectedColorIdx];

  const handleDownload = async () => {
    if (!cardRef.current || !window.html2canvas) return;
    setIsGenerating(true);
    
    try {
      // CLONE STRATEGY to ensure high res capture without scrollbars
      const originalElement = cardRef.current;
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '400px'; 
      clone.style.height = 'auto'; 
      clone.style.transform = 'none';
      clone.style.borderRadius = '0'; 
      clone.style.boxShadow = 'none';
      
      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await window.html2canvas(clone, {
        scale: 3, 
        useCORS: true,
        backgroundColor: null, 
        logging: false,
      });
      
      document.body.removeChild(clone);
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `BookMaster_Insight_${Date.now()}.png`;
      link.click();
    } catch (e) {
      console.error("Image generation failed", e);
      alert("生成图片失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToX = () => {
    const textToShare = `Here is a great insight from ${data.title} by ${data.author || 'Unknown'}:\n\n"${data.text}"\n\n#BookMasterAI #Reading`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textToShare)}`;
    window.open(url, '_blank');
  };
  
  const handleShareToFB = () => {
     navigator.clipboard.writeText(`Reading ${data.title}:\n\n${data.text}`).then(() => {
        alert("内容已复制到剪贴板，即将跳转 Facebook...");
        window.open('https://www.facebook.com/', '_blank');
     });
  };

  const getTextClass = (len: number) => {
    if (len < 50) return 'text-3xl leading-tight';
    if (len < 100) return 'text-2xl leading-snug';
    return 'text-lg leading-relaxed text-justify';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-20 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            金句卡片生成
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 flex flex-col items-center scrollbar-hide">
            
            {/* The Card to be Captured */}
            <div 
              ref={cardRef} 
              className="w-[360px] shrink-0 relative flex flex-col overflow-hidden shadow-2xl transition-all duration-500 font-sans"
              style={{
                  background: isPureMode ? '#ffffff' : `linear-gradient(135deg, ${activeColor.from}, ${activeColor.to})`,
                  color: isPureMode ? '#1e293b' : activeColor.text,
                  minHeight: '640px',
              }}
            >
                {!isPureMode && (
                    <>
                        {/* 1. Noise Texture Overlay */}
                        <div className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

                        {/* 2. Color Gradient Overlay for depth */}
                        <div className={`absolute inset-0 ${activeColor.overlay} mix-blend-soft-light pointer-events-none`}></div>
                        
                        {/* 3. Abstract Glow Shapes */}
                        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full blur-[80px] pointer-events-none mix-blend-overlay"></div>
                        <div className="absolute bottom-0 -left-10 w-64 h-64 bg-white/5 rounded-full blur-[60px] pointer-events-none mix-blend-overlay"></div>

                        {/* 4. Elegant Border Frame */}
                        <div className="absolute inset-4 border border-white/20 z-10 pointer-events-none opacity-50"></div>
                        <div className="absolute inset-5 border border-white/10 z-10 pointer-events-none opacity-30"></div>
                    </>
                )}
                
                {/* Minimalist Border for Pure Mode */}
                {isPureMode && (
                     <div className="absolute inset-6 border border-slate-900 pointer-events-none"></div>
                )}

                {/* Content Container */}
                <div className={`relative z-30 flex flex-col h-full ${isPureMode ? 'p-12' : 'p-10'}`}>
                    
                    {/* Header: Label */}
                    {!isPureMode && (
                        <div className="flex justify-between items-center mb-8 opacity-80">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span className="text-xs font-bold tracking-[0.2em] uppercase">读书感悟</span>
                            </div>
                            <Sparkles className="w-4 h-4 opacity-70" />
                        </div>
                    )}
                    
                    {isPureMode && <div className="mb-8"></div>}

                    {/* Book Title Area */}
                    {!isPureMode && (
                        <div className="mb-10 text-center">
                        <h2 className="text-2xl font-black leading-tight mb-2 tracking-wide font-serif-sc drop-shadow-sm">
                            {data.title}
                        </h2>
                        {data.author && (
                            <div className="inline-block relative">
                                <span className="text-sm opacity-80 italic font-medium">
                                    {data.author} 著
                                </span>
                                <div className="absolute -bottom-1 left-0 right-0 h-px bg-current opacity-30"></div>
                            </div>
                        )}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col justify-center relative mb-8">
                        {!isPureMode && <Quote className="absolute -top-6 -left-4 w-12 h-12 opacity-10 transform -scale-x-100" />}
                        {isPureMode && <div className="text-4xl font-serif font-black mb-4">“</div>}
                        
                        {/* Quote Text */}
                        <p className={`font-serif leading-relaxed mb-6 font-bold relative z-10 drop-shadow-sm ${getTextClass(data.text.length)}`}>
                            {data.text}
                        </p>

                        {/* Translation (if exists) - Visually Separated */}
                        {data.subText && (
                            <div className={`relative pl-4 border-l-2 py-1 mt-2 ${isPureMode ? 'border-slate-300' : 'border-white/30'}`}>
                                <p className="text-sm md:text-base opacity-90 font-light leading-relaxed tracking-wide">
                                    {data.subText}
                                </p>
                            </div>
                        )}
                        
                        {!isPureMode && <Quote className="absolute -bottom-6 -right-4 w-12 h-12 opacity-10" />}
                        {isPureMode && <div className="text-4xl font-serif font-black mt-2 text-right">”</div>}
                    </div>

                    {/* Footer: Insight & Brand */}
                    <div className={`mt-auto pt-6 border-t ${isPureMode ? 'border-slate-200' : 'border-white/15'}`}>
                        {data.footer && (
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                     {!isPureMode && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>}
                                     <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">核心洞见</span>
                                </div>
                                <p className="text-xs md:text-sm opacity-80 leading-relaxed text-justify font-medium">
                                    {data.footer}
                                </p>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-end opacity-50">
                             <div className="flex items-center gap-1.5">
                                 {isPureMode ? (
                                    <div className="font-serif italic text-xs">{data.title}</div>
                                 ) : (
                                    <>
                                        <div className="w-5 h-5 border border-current rounded-full flex items-center justify-center">
                                            <span className="text-[10px] font-bold">AI</span>
                                        </div>
                                        <span className="text-[10px] font-bold tracking-widest uppercase">BookMaster</span>
                                    </>
                                 )}
                             </div>
                             {!isPureMode && <div className="text-[10px] tracking-widest">智能拆书</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Color Selector */}
            <div className="mt-8 flex gap-3 justify-center items-center">
                {/* Pure Mode Toggle */}
                <button
                    onClick={() => setIsPureMode(true)}
                    className={`w-9 h-9 rounded-full shadow-md border bg-white flex items-center justify-center transition-all duration-300 ${isPureMode ? 'border-slate-800 scale-110 ring-2 ring-slate-200' : 'border-slate-200 hover:scale-105'}`}
                    title="纯净版 (黑白)"
                >
                    <Circle className="w-4 h-4 text-slate-800" />
                </button>
                
                <div className="w-px h-6 bg-slate-300 mx-2"></div>

                {COLORS.map((c, i) => (
                    <button
                        key={c.id}
                        onClick={() => { setSelectedColorIdx(i); setIsPureMode(false); }}
                        className={`w-9 h-9 rounded-full shadow-lg border-2 transition-all duration-300 ${!isPureMode && selectedColorIdx === i ? 'border-slate-800 scale-110 ring-2 ring-slate-300' : 'border-white hover:scale-105'}`}
                        style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                        title={c.name}
                    />
                ))}
            </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-5 border-t border-slate-100 bg-white z-20 shrink-0 flex flex-col gap-3">
          <button 
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-xl shadow-slate-900/20 hover:bg-emerald-600 hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  正在渲染高清卡片...
                </>
            ) : (
                <>
                   <Download className="w-5 h-5" />
                   保存图片
                </>
            )}
          </button>
          
          <div className="grid grid-cols-2 gap-3">
             <button 
                onClick={handleShareToX}
                className="flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
             >
                <Twitter className="w-4 h-4 fill-current" />
                分享到 X
             </button>
             <button 
                onClick={handleShareToFB}
                className="flex items-center justify-center gap-2 py-3 bg-[#1877F2] text-white rounded-xl font-bold hover:bg-[#1565C0] transition-colors"
             >
                <Facebook className="w-4 h-4 fill-current" />
                Facebook
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialShareModal;
