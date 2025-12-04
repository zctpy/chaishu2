
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Loader2, SkipForward, SkipBack, ArrowDownCircle } from 'lucide-react';
import { ReaderSegment } from '../types';
import { generateSpeech, decodePCM } from '../services/geminiService';

interface ReaderViewProps {
  segments: ReaderSegment[] | undefined;
  isLoading: boolean;
  onGenerate: () => void;
  onLoadMore?: () => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ segments, isLoading, onGenerate, onLoadMore }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [readLanguage, setReadLanguage] = useState<'original' | 'translation'>('original');
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // New refs for Pause/Resume logic
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

  const initAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const stopAudio = (resetProgress: boolean = false) => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
        currentSourceRef.current.onended = null; // Prevent triggering onEnded logic
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

  const playAudioBuffer = (buffer: AudioBuffer, offset: number) => {
      const ctx = initAudioContext();
      stopAudio(false); // Stop running source, but keep buffer/progress

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;
      
      startTimeRef.current = ctx.currentTime - offset;

      source.onended = () => {
        // Only proceed if not manually paused and still playing
        if (!isManuallyPausedRef.current && isPlaying) {
             if (segments && currentIndex < segments.length - 1) {
                // Next segment
                setCurrentIndex(prev => prev + 1);
                pausedTimeRef.current = 0; // Reset for next
                audioBufferRef.current = null; // Clear buffer for next
             } else {
                // End of list
                setIsPlaying(false);
                setCurrentIndex(0);
                pausedTimeRef.current = 0;
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
        // If we have a cached buffer and we are resuming (offset > 0) or just replaying the same index
        // Only use cache if language hasn't changed (overrideLang provided implies a change check external to this or explicit intent)
        // Ideally we assume if audioBufferRef.current exists, it matches the current context unless explicitly cleared.
        if (audioBufferRef.current && offset > 0) {
            playAudioBuffer(audioBufferRef.current, offset);
            setIsAudioLoading(false);
            return;
        }

        const lang = overrideLang || readLanguage;
        const textToSpeak = lang === 'original' ? segments[index].original : segments[index].translation;
        
        if (!textToSpeak || !textToSpeak.trim()) {
            console.warn("Skipping empty text segment", index);
            // Move to next if possible, or just stop
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

        const ctx = initAudioContext();
        const audioBuffer = decodePCM(ctx, arrayBuffer);
        
        // Cache it
        audioBufferRef.current = audioBuffer;
        
        playAudioBuffer(audioBuffer, offset);

    } catch (e) {
        console.error("Playback error", e);
        setIsPlaying(false);
    } finally {
        setIsAudioLoading(false);
    }
  };

  // Main Play/Pause Toggle
  const togglePlay = () => {
    if (isPlaying) {
      // PAUSE Logic
      isManuallyPausedRef.current = true;
      const ctx = audioContextRef.current;
      if (ctx) {
          // Calculate where we are
          pausedTimeRef.current = ctx.currentTime - startTimeRef.current;
      }
      stopAudio(false); // Stop sound, keep progress
      setIsPlaying(false);
    } else {
      // RESUME Logic
      isManuallyPausedRef.current = false;
      setIsPlaying(true);
      playSegmentAudio(currentIndex, pausedTimeRef.current);
    }
  };

  const handleSegmentClick = (index: number) => {
    // Reset everything for new segment
    stopAudio(true); 
    isManuallyPausedRef.current = false;
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const handleLanguageSwitch = (newLang: 'original' | 'translation') => {
    if (readLanguage === newLang) return;

    // Calculate current offset based on playback state
    let offset = 0;
    if (isPlaying && audioContextRef.current) {
        offset = audioContextRef.current.currentTime - startTimeRef.current;
    } else if (pausedTimeRef.current > 0) {
        offset = pausedTimeRef.current;
    }

    // Switch state
    setReadLanguage(newLang);

    // Stop current audio but preserve relative progress logic conceptually
    stopAudio(false);
    
    // Nuke the buffer because content changed (language changed)
    audioBufferRef.current = null;

    if (isPlaying) {
        // Resume immediately with new language at same offset
        playSegmentAudio(currentIndex, offset, newLang);
    } else {
        // Just update the pause pointer so next play uses it
        pausedTimeRef.current = offset;
    }
  };

  // Effect: Watch for index changes to auto-play if we are in "Playing" mode
  useEffect(() => {
    if (isPlaying && !isAudioLoading) {
        playSegmentAudio(currentIndex, 0); 
    }
  }, [currentIndex]);


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
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
         <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Volume2 className="w-8 h-8 text-emerald-600" />
         </div>
         <h3 className="text-xl font-bold text-slate-800 mb-2">双语逐段阅读</h3>
         <p className="text-slate-500 mb-6 max-w-md mx-auto">AI 将为您提取核心章节，生成中英对照视图，并提供高品质语音朗读。</p>
         <button 
           onClick={onGenerate}
           className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/30"
         >
           开始生成阅读内容
         </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Control Bar */}
      <div className="sticky top-[80px] z-20 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-slate-200/50 flex flex-wrap items-center justify-between gap-4">
         
         <div className="flex items-center gap-3">
            <button 
                onClick={() => {
                   if(currentIndex > 0) handleSegmentClick(currentIndex - 1);
                }}
                disabled={currentIndex === 0}
                className="p-2 text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-colors"
            >
                <SkipBack className="w-5 h-5" />
            </button>

            <button 
                onClick={togglePlay}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isPlaying 
                    ? 'bg-white border-2 border-emerald-100 text-emerald-600 shadow-sm hover:bg-emerald-50' 
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 shadow-lg hover:scale-105'
                }`}
            >
                {isAudioLoading ? (
                    <Loader2 className="animate-spin w-6 h-6" />
                ) : (
                    isPlaying ? <Pause className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6 ml-1" />
                )}
            </button>
            
            <button 
                onClick={() => {
                   if(currentIndex < segments.length - 1) handleSegmentClick(currentIndex + 1);
                }}
                disabled={currentIndex === segments.length - 1}
                className="p-2 text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-colors"
            >
                <SkipForward className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-slate-200 mx-2"></div>

            <button 
                onClick={() => {
                    stopAudio(true);
                    setIsPlaying(false);
                    setCurrentIndex(0);
                    isManuallyPausedRef.current = false;
                }}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 text-xs font-medium"
                title="重置"
            >
                <RotateCcw className="w-4 h-4" />
                重读
            </button>
         </div>

         <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-lg">
             <button 
               onClick={() => handleLanguageSwitch('original')}
               className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${readLanguage === 'original' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                原文 (EN)
             </button>
             <button 
               onClick={() => handleLanguageSwitch('translation')}
               className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${readLanguage === 'translation' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                译文 (CN)
             </button>
         </div>
      </div>

      {/* Segments List */}
      <div className="grid gap-4 max-w-4xl mx-auto pb-10">
         {segments.map((seg, idx) => (
             <div 
                key={idx}
                ref={(el) => { segmentRefs.current[idx] = el; }}
                onClick={() => handleSegmentClick(idx)}
                className={`group cursor-pointer p-6 rounded-2xl transition-all duration-300 border-l-4 ${
                    currentIndex === idx 
                    ? 'bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500/20 scale-[1.01]' 
                    : 'bg-white border-transparent hover:border-slate-300 hover:shadow-sm'
                }`}
             >
                 <div className="grid md:grid-cols-2 gap-6">
                     <div className={`font-serif text-lg leading-relaxed transition-colors ${currentIndex === idx ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                         {seg.original}
                     </div>
                     <div className={`text-base leading-relaxed transition-colors ${currentIndex === idx ? 'text-emerald-900 font-medium' : 'text-slate-500'}`}>
                         {seg.translation}
                     </div>
                 </div>
                 
                 {/* Current Indicator */}
                 {currentIndex === idx && (
                     <div className={`mt-4 flex items-center gap-2 text-xs font-bold transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-50'}`}>
                         {isPlaying ? (
                             <>
                                <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                                <span className="text-emerald-600">正在朗读...</span>
                             </>
                         ) : (
                             <>
                                <Pause className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-400">已暂停</span>
                             </>
                         )}
                     </div>
                 )}
             </div>
         ))}
      </div>

      {/* Load More Button */}
      {onLoadMore && (
         <div className="flex justify-center pb-20">
             <button 
                onClick={onLoadMore}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-4 bg-white border border-slate-200 rounded-full text-slate-600 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all shadow-sm group disabled:opacity-50"
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
