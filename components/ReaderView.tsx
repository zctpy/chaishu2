
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Loader2, SkipForward, SkipBack, ArrowDownCircle, BookOpen } from 'lucide-react';
import { ReaderSegment, ChapterSummary } from '../types';
import { generateSpeech, decodePCM } from '../services/geminiService';

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

  const playAudioBuffer = async (buffer: AudioBuffer, offset: number) => {
      const ctx = await initAudioContext();
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
        // Init context first to ensure user gesture is captured if this was triggered by click
        await initAudioContext();

        // If we have a cached buffer and we are resuming (offset > 0) or just replaying the same index
        if (audioBufferRef.current && offset > 0) {
            await playAudioBuffer(audioBufferRef.current, offset);
            setIsAudioLoading(false);
            return;
        }

        const lang = overrideLang || readLanguage;
        const textToSpeak = lang === 'original' ? segments[index].original : segments[index].translation;
        
        if (!textToSpeak || !textToSpeak.trim()) {
            console.warn("Skipping empty text segment", index);
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
        
        // Cache it
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
      await playSegmentAudio(currentIndex, pausedTimeRef.current);
    }
  };

  const handleSegmentClick = async (index: number) => {
    // Reset everything for new segment
    stopAudio(true); 
    isManuallyPausedRef.current = false;
    setCurrentIndex(index);
    setIsPlaying(true); // Auto play on click
    
    // Reset buffer since we changed segment
    audioBufferRef.current = null; 
    pausedTimeRef.current = 0;
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
        // We need to trigger play, but we must be careful not to trigger it if it was just set by handleSegmentClick which calls it manually
        // For simplicity, we can just call it here. The manual call in click handler might be redundant or we can rely on this effect.
        // To avoid double triggers, let's check if source is already playing matching this index? 
        // Simpler: Just play. playSegmentAudio handles re-generating.
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
