
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, SkipForward, SkipBack, ArrowDownCircle, BookOpen, Download } from 'lucide-react';
import { ReaderSegment, ChapterSummary } from '../types';
import { generateSpeech, decodePCM, createWavBlob } from '../services/geminiService';

interface ReaderViewProps {
  segments: ReaderSegment[] | undefined;
  isLoading: boolean;
  onGenerate: (chapterIndex?: number) => void;
  onLoadMore?: () => void;
  chapters?: ChapterSummary[];
}

const ReaderView: React.FC<ReaderViewProps> = ({ segments, isLoading, onGenerate, onLoadMore, chapters }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readLanguage, setReadLanguage] = useState<'original' | 'translation'>('original');
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Audio state refs
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const isManuallyPausedRef = useRef<boolean>(false);

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      stopAudio(true);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to current segment
  useEffect(() => {
    if (segmentRefs.current[currentIndex]) {
      segmentRefs.current[currentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex]);

  const initAudioContext = async () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const stopAudio = (resetProgress: boolean = false) => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.onended = null; // Important: Clear onended to prevent triggering next segment logic
        currentSourceRef.current.stop();
      } catch (e) {
        // ignore already stopped errors
      }
      currentSourceRef.current = null;
    }
    if (resetProgress) {
        pausedTimeRef.current = 0;
        startTimeRef.current = 0;
        audioBufferRef.current = null;
    }
  };

  const playAudioBuffer = async (buffer: AudioBuffer, offset: number) => {
      const ctx = await initAudioContext();
      stopAudio(false); 

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;
      
      startTimeRef.current = ctx.currentTime - offset;

      source.onended = () => {
        // Only trigger next segment if we are NOT manually paused
        if (!isManuallyPausedRef.current) {
             if (segments && currentIndex < segments.length - 1) {
                setCurrentIndex(prev => prev + 1);
             } else {
                setIsPlaying(false);
                setCurrentIndex(0);
                stopAudio(true);
             }
        }
      };

      source.start(0, offset);
  };

  const playSegmentAudio = async (index: number, offset: number = 0, overrideLang?: 'original' | 'translation') => {
    if (!segments || index >= segments.length) {
      setIsPlaying(false);
      return;
    }

    setIsAudioLoading(true);

    try {
        await initAudioContext();

        // Resume from cached buffer
        if (audioBufferRef.current && offset > 0) {
            await playAudioBuffer(audioBufferRef.current, offset);
            setIsAudioLoading(false);
            return;
        }

        const lang = overrideLang || readLanguage;
        const textToSpeak = lang === 'original' ? segments[index].original : segments[index].translation;
        
        if (!textToSpeak || !textToSpeak.trim()) {
            // Skip empty
            if (currentIndex < segments.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setIsPlaying(false);
            }
            setIsAudioLoading(false);
            return;
        }

        const arrayBuffer = await generateSpeech(textToSpeak);
        if (!arrayBuffer) throw new Error("Failed to generate speech");

        const ctx = await initAudioContext();
        const audioBuffer = decodePCM(ctx, arrayBuffer);
        
        audioBufferRef.current = audioBuffer;
        await playAudioBuffer(audioBuffer, offset);

    } catch (e) {
        console.error("Playback error", e);
        setIsPlaying(false);
    } finally {
        setIsAudioLoading(false);
    }
  };

  // Main Play/Pause Toggle
  const togglePlay = async () => {
    if (isPlaying) {
      // PAUSE
      isManuallyPausedRef.current = true;
      const ctx = audioContextRef.current;
      if (ctx) {
          // Store elapsed time
          pausedTimeRef.current = Math.max(0, ctx.currentTime - startTimeRef.current);
      }
      stopAudio(false);
      setIsPlaying(false);
    } else {
      // RESUME
      isManuallyPausedRef.current = false;
      setIsPlaying(true);
      await playSegmentAudio(currentIndex, pausedTimeRef.current);
    }
  };

  const handleSegmentClick = async (index: number) => {
    stopAudio(true); // Stop and reset progress
    isManuallyPausedRef.current = false;
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  // --- Full Audio Download Logic ---
  const handleDownloadFullAudio = async () => {
    if (!segments || segments.length === 0) return;
    
    setIsDownloading(true);
    
    try {
        const buffers: ArrayBuffer[] = [];
        
        // Loop through all segments and generate/fetch audio
        // We do this sequentially to respect API rate limits and ensure order
        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const textToSpeak = readLanguage === 'original' ? seg.original : seg.translation;
            
            if (textToSpeak && textToSpeak.trim()) {
                const buffer = await generateSpeech(textToSpeak);
                if (buffer) {
                    buffers.push(buffer);
                }
            }
        }

        if (buffers.length === 0) {
            alert("无法生成音频数据，请稍后重试。");
            setIsDownloading(false);
            return;
        }

        // Merge all PCM buffers
        const totalLength = buffers.reduce((acc, b) => acc + b.byteLength, 0);
        const mergedBuffer = new Uint8Array(totalLength);
        
        let offset = 0;
        for (const buffer of buffers) {
            mergedBuffer.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        }

        // Create WAV Blob
        // 24000 is standard for the flash-tts model
        const wavBlob = createWavBlob(mergedBuffer.buffer, 24000);
        
        // Trigger Download
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Full_Chapter_${readLanguage === 'original' ? 'EN' : 'CN'}_${Date.now()}.wav`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 1000);

    } catch (error) {
        console.error("Download failed", error);
        alert("合成音频时出错，请检查网络连接。");
    } finally {
        setIsDownloading(false);
    }
  };

  // Effect to trigger audio when index changes AND we are in playing state
  useEffect(() => {
    if (isPlaying && !isAudioLoading) {
        // Reset paused time for new segment
        pausedTimeRef.current = 0;
        audioBufferRef.current = null;
        playSegmentAudio(currentIndex, 0);
    }
  }, [currentIndex]); 

  const handleLanguageSwitch = (newLang: 'original' | 'translation') => {
    if (readLanguage === newLang) return;

    let offset = 0;
    if (isPlaying && audioContextRef.current) {
        offset = audioContextRef.current.currentTime - startTimeRef.current;
    } else if (pausedTimeRef.current > 0) {
        offset = pausedTimeRef.current;
    }

    setReadLanguage(newLang);
    stopAudio(false);
    audioBufferRef.current = null; // Clear buffer as content changed

    if (isPlaying) {
        playSegmentAudio(currentIndex, offset, newLang);
    } else {
        pausedTimeRef.current = offset;
    }
  };

  if (isLoading && (!segments || segments.length === 0)) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>正在生成双语对照内容...</p>
        </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div className="text-center py-24 bg-white/50 backdrop-blur rounded-[2.5rem] border border-slate-200 shadow-sm">
         <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <BookOpen className="w-10 h-10 text-emerald-600" />
         </div>
         <h3 className="text-2xl font-black text-slate-800 mb-3">沉浸式双语阅读</h3>
         <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">AI 将为您提取核心章节，生成精准的中英对照视图，并提供真人级语音朗读体验。</p>
         <button 
           onClick={() => onGenerate()} 
           className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold hover:shadow-xl hover:-translate-y-1 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 mx-auto"
         >
           <Play className="w-5 h-5 fill-current" />
           开始生成阅读内容
         </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Sticky Control Bar */}
      <div className="sticky top-0 md:top-4 z-30 bg-white/80 backdrop-blur-xl p-3 md:p-4 rounded-2xl shadow-lg border border-white/20 flex flex-wrap items-center justify-between gap-4 transition-all">
         
         <div className="flex items-center gap-2 md:gap-4">
            <button 
                onClick={() => {
                   if(currentIndex > 0) handleSegmentClick(currentIndex - 1);
                }}
                disabled={currentIndex === 0}
                className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-md disabled:opacity-30 disabled:shadow-none transition-all"
            >
                <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button 
                onClick={togglePlay}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all ${
                    isPlaying 
                    ? 'bg-white border-2 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/20 scale-100' 
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 hover:scale-105 hover:-translate-y-0.5'
                }`}
            >
                {isAudioLoading ? (
                    <Loader2 className="animate-spin w-6 h-6 md:w-8 md:h-8" />
                ) : (
                    isPlaying ? <Pause className="fill-current w-6 h-6 md:w-8 md:h-8" /> : <Play className="fill-current w-6 h-6 md:w-8 md:h-8 ml-1" />
                )}
            </button>
            
            <button 
                onClick={() => {
                   if(currentIndex < segments.length - 1) handleSegmentClick(currentIndex + 1);
                }}
                disabled={currentIndex === segments.length - 1}
                className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-md disabled:opacity-30 disabled:shadow-none transition-all"
            >
                <SkipForward className="w-5 h-5 fill-current" />
            </button>
         </div>

         {/* Info Display */}
         <div className="hidden md:block text-center">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Segment</div>
             <div className="text-lg font-black text-slate-800 font-serif tabular-nums">
                 {currentIndex + 1} <span className="text-slate-300 text-base">/</span> {segments.length}
             </div>
         </div>

         <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/50">
             <button 
               onClick={() => handleLanguageSwitch('original')}
               className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${readLanguage === 'original' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
             >
                原文 (EN)
             </button>
             <button 
               onClick={() => handleLanguageSwitch('translation')}
               className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${readLanguage === 'translation' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
             >
                译文 (CN)
             </button>
             {/* Download Audio Button */}
             <div className="w-px h-6 bg-slate-200 mx-1"></div>
             <button 
               onClick={handleDownloadFullAudio}
               disabled={isDownloading || isAudioLoading}
               className={`p-2 rounded-lg transition-all flex items-center justify-center ${isDownloading ? 'text-emerald-500 bg-emerald-50' : 'text-emerald-600 hover:bg-white hover:shadow-sm'}`}
               title="下载全章朗读音频"
             >
                {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Download className="w-4 h-4" />
                )}
             </button>
         </div>
      </div>

      {/* Segments List - Stacked Card Layout */}
      <div className="space-y-6 pb-20 max-w-3xl mx-auto">
         {segments.map((seg, idx) => (
             <div 
                key={idx}
                ref={(el) => { segmentRefs.current[idx] = el; }}
                onClick={() => handleSegmentClick(idx)}
                className={`group cursor-pointer rounded-3xl transition-all duration-500 border ${
                    currentIndex === idx 
                    ? 'bg-white border-emerald-500 shadow-2xl shadow-emerald-500/10 ring-4 ring-emerald-500/10 scale-[1.02] z-10' 
                    : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-200 hover:shadow-lg scale-100 opacity-70 hover:opacity-100'
                }`}
             >
                 <div className="p-8 md:p-10">
                     {/* Original Text */}
                     <div className={`font-serif text-xl md:text-2xl leading-relaxed mb-6 transition-colors ${currentIndex === idx ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                         {seg.original}
                     </div>
                     
                     {/* Translation Box */}
                     <div className={`p-5 rounded-2xl text-base md:text-lg leading-relaxed transition-all ${
                         currentIndex === idx 
                         ? 'bg-emerald-50 text-emerald-900 font-medium' 
                         : 'bg-slate-50 text-slate-500 group-hover:bg-slate-100'
                     }`}>
                         {seg.translation}
                     </div>

                     {/* Active Indicator */}
                     {currentIndex === idx && isPlaying && (
                         <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 animate-fadeIn">
                             <span className="relative flex h-3 w-3">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                             </span>
                             <span>正在朗读...</span>
                         </div>
                     )}
                 </div>
             </div>
         ))}
      </div>

      {/* Load More Button */}
      {onLoadMore && (
         <div className="flex justify-center pb-24">
             <button 
                onClick={onLoadMore}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all shadow-sm group disabled:opacity-50 hover:shadow-lg hover:-translate-y-1"
             >
                {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <ArrowDownCircle className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
                )}
                <span className="font-bold">加载下一章节</span>
             </button>
         </div>
      )}
    </div>
  );
};

export default ReaderView;
