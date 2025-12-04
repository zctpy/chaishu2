
import React, { useRef, useState } from 'react';
import { X, Download, Share2, Sparkles, BookOpen, Twitter, Facebook, Copy } from 'lucide-react';

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

const LotusIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="lotusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" /> 
                <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
        </defs>
        <path d="M50 20C50 20 60 40 50 60C40 40 50 20 50 20Z" fill="url(#lotusGradient)" opacity="0.9" />
        <path d="M50 60C50 60 70 50 80 30C80 30 70 55 50 65" fill="#e879f9" opacity="0.8" />
        <path d="M50 60C50 60 30 50 20 30C20 30 30 55 50 65" fill="#e879f9" opacity="0.8" />
        <path d="M50 65C50 65 75 60 90 50C90 50 80 75 50 80" fill="#d8b4fe" opacity="0.7" />
        <path d="M50 65C50 65 25 60 10 50C10 50 20 75 50 80" fill="#d8b4fe" opacity="0.7" />
    </svg>
);

const SocialShareModal: React.FC<SocialShareModalProps> = ({ isOpen, onClose, data }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !data) return null;

  const handleDownload = async () => {
    if (!cardRef.current || !window.html2canvas) return;
    setIsGenerating(true);
    
    try {
      // CLONE STRATEGY:
      // We clone the card node and render it off-screen with full height.
      const originalElement = cardRef.current;
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '375px'; 
      clone.style.height = 'auto'; 
      clone.style.minHeight = 'fit-content';
      clone.style.transform = 'none';
      clone.style.borderRadius = '0'; 
      
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
      link.download = `BookMaster_Card_${Date.now()}.png`;
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

  // Dynamic font sizing
  const getTextClass = (len: number) => {
    if (len < 50) return 'text-3xl leading-tight';
    if (len < 150) return 'text-xl leading-relaxed';
    return 'text-base leading-relaxed text-justify';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-20 rounded-t-3xl shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-600" />
            分享卡片预览
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100 flex justify-center scrollbar-hide">
            {/* The Card to be Captured */}
            <div 
              ref={cardRef} 
              className="w-[360px] md:w-[375px] shrink-0 bg-gradient-to-br from-[#0f172a] to-[#334155] p-8 rounded-xl shadow-xl relative flex flex-col text-white h-fit min-h-[500px]"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none rounded-xl"></div>
                
                {/* Card Header */}
                <div className="relative z-10 mb-8 border-b border-white/10 pb-6 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-3 opacity-80">
                            <span className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-300">Daily Insight</span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight drop-shadow-sm font-serif-sc text-white/90">{data.title}</h2>
                        {data.author && <p className="text-slate-400 font-medium mt-2 text-sm italic">by {data.author}</p>}
                    </div>
                    {/* Lotus Icon Replacement */}
                    <div className="w-12 h-12">
                       <LotusIcon className="w-full h-full drop-shadow-lg" />
                    </div>
                </div>

                {/* Card Body */}
                <div className="relative z-10 mb-10 flex-1">
                    <div className="mb-6">
                        <p className={`font-serif font-medium tracking-wide text-white drop-shadow-sm whitespace-pre-wrap ${getTextClass(data.text.length)}`}>
                           {data.type === 'QUOTE' ? `"${data.text}"` : data.text}
                        </p>
                    </div>
                    {data.subText && (
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <p className="text-slate-300 text-lg font-light leading-relaxed">
                                {data.subText}
                            </p>
                        </div>
                    )}
                </div>

                {/* Card Footer - Simplified & Clean */}
                <div className="relative z-10 mt-auto pt-6 flex justify-between items-end gap-4 border-t border-white/5">
                    <div className="flex-1">
                        {data.footer && (
                            <div className="mb-1">
                                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">Key Takeaway</p>
                                <p className="text-xs text-slate-300 leading-relaxed opacity-90">{data.footer}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Minimal Brand Mark (No big logo) */}
                    <div className="opacity-50">
                        <div className="text-[10px] font-mono text-right text-slate-500">
                             Generated by<br/>BookMaster AI
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-5 border-t border-slate-100 bg-white rounded-b-3xl shrink-0 z-20 flex flex-col gap-3">
          <button 
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-xl shadow-slate-900/20 hover:bg-emerald-600 hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  正在生成高清长图...
                </>
            ) : (
                <>
                   <Download className="w-5 h-5" />
                   保存图片到相册
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
