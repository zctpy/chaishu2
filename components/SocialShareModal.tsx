
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
      // This prevents html2canvas from clipping content due to scrollbars or viewport limits.
      const originalElement = cardRef.current;
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // Set styles to ensure the clone renders as a full "Long Image"
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '375px'; // Standard mobile width
      clone.style.height = 'auto'; // Force full height
      clone.style.minHeight = 'fit-content';
      clone.style.transform = 'none';
      clone.style.borderRadius = '0'; // Optional: remove radius for clean edges if desired, but keeping rounded is fine
      
      document.body.appendChild(clone);
      
      // Wait a brief moment for DOM layout updates (images, fonts)
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await window.html2canvas(clone, {
        scale: 3, // High resolution (3x) for crisp text
        useCORS: true,
        backgroundColor: null, 
        logging: false,
      });
      
      // Clean up
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
     // Facebook share usually requires a public URL. 
     // Since we don't have one, we will try to copy to clipboard first then open FB.
     navigator.clipboard.writeText(`Reading ${data.title}:\n\n${data.text}`).then(() => {
        alert("内容已复制到剪贴板，即将跳转 Facebook...");
        window.open('https://www.facebook.com/', '_blank');
     });
  };

  // Dynamic font sizing based on length
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
              className="w-[360px] md:w-[375px] shrink-0 bg-gradient-to-br from-emerald-500 to-teal-700 p-8 rounded-xl shadow-xl relative flex flex-col text-white h-fit min-h-[500px]"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-300/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none rounded-xl"></div>
                
                {/* Card Header */}
                <div className="relative z-10 mb-8 border-b border-white/20 pb-6">
                    <div className="flex items-center gap-2 mb-3 opacity-90">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                           <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold tracking-widest uppercase">BookMaster Note</span>
                    </div>
                    <h2 className="text-2xl font-bold leading-tight drop-shadow-sm">{data.title}</h2>
                    {data.author && <p className="text-emerald-100 font-medium mt-2 text-base">by {data.author}</p>}
                </div>

                {/* Card Body */}
                <div className="relative z-10 mb-10">
                    <div className="mb-6">
                        <Sparkles className="w-8 h-8 text-emerald-200 mb-4 opacity-80" />
                        <p className={`font-serif-sc font-bold tracking-wide text-white drop-shadow-sm whitespace-pre-wrap ${getTextClass(data.text.length)}`}>
                           {data.type === 'QUOTE' ? `"${data.text}"` : data.text}
                        </p>
                    </div>
                    {data.subText && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <p className="text-emerald-50 text-lg font-light leading-relaxed pl-4 border-l-4 border-emerald-300/50">
                                {data.subText}
                            </p>
                        </div>
                    )}
                </div>

                {/* Card Footer */}
                <div className="relative z-10 mt-auto pt-6 border-t border-white/20 flex justify-between items-end gap-4">
                    <div className="flex-1">
                        {data.footer && (
                            <div className="mb-4">
                                <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1 block">INSIGHT</span>
                                <p className="text-sm text-emerald-50 leading-relaxed opacity-90">{data.footer}</p>
                            </div>
                        )}
                        <div className="flex items-center gap-2 opacity-80">
                            <div className="w-5 h-5 bg-white rounded flex items-center justify-center shadow-sm">
                                <span className="text-[10px] font-black text-emerald-700">BM</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold tracking-wider leading-none">BookMaster AI</span>
                                <span className="text-[8px] leading-none mt-0.5">Knowledge Engine</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* QR Code Placeholder */}
                    <div className="bg-white p-1.5 rounded-lg shadow-lg shrink-0">
                        <div className="w-12 h-12 bg-slate-900/5 flex items-center justify-center rounded border border-slate-100">
                             <Sparkles className="w-6 h-6 text-slate-300" />
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
