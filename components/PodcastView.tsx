
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Radio, Loader2, Download, ChevronDown, Languages, RefreshCw, Copy, Check } from 'lucide-react';
import { PodcastResult, ComplexityLevel, Theme } from '../types';
import { decodePCM } from '../services/geminiService';

interface PodcastViewProps {
  podcast?: PodcastResult;
  onGenerate: (language: 'CN' | 'EN') => void;
  complexity: ComplexityLevel;
  theme: Theme;
}

// Helper to convert raw PCM to WAV for download
const createWavBlob = (audioBuffer: ArrayBuffer, sampleRate: number = 24000): Blob => {
  const numOfChannels = 1;
  const length = audioBuffer.byteLength;
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);
  
  // Helper to write string
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numOfChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, length, true);
  
  // write the PCM samples
  const pcmData = new Uint8Array(audioBuffer);
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
};

const PodcastView: React.FC<PodcastViewProps> = ({ podcast, onGenerate, complexity, theme }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'EN' | 'CN'>('EN'); // Default to English
  const [copied, setCopied] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lineTimestampsRef = useRef<number[]>([]);
  const scrollRef = useRef<(HTMLDivElement | null)[]>([]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (sourceRef.current) sourceRef.current.stop();
    if (audioContextRef.current) audioContextRef.current.close();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    audioContextRef.current = null;
    sourceRef.current = null;
    setIsPlaying(false);
    setActiveLineIndex(-1);
  };

  const handleGenerate = async () => {
      setLoading(true);
      try {
        await onGenerate(selectedLang);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
  };

  const handleCopyScript = () => {
      if (!podcast) return;
      const text = podcast.script.map(line => `${line.speaker}: ${line.text}`).join('\n\n');
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const calculateTimestamps = (totalDuration: number, script: {text: string}[]) => {
      const totalChars = script.reduce((acc, line) => acc + line.text.length, 0);
      let accumulatedTime = 0;
      // Map end times for each line based on character count proportion
      return script.map(line => {
          const duration = (line.text.length / totalChars) * totalDuration;
          accumulatedTime += duration;
          return accumulatedTime;
      });
  };

  const playPodcast = async () => {
    if (!podcast?.audioBuffer) return;

    if (isPlaying) {
        stopAudio();
        return;
    }

    try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        
        const audioBuffer = decodePCM(ctx, podcast.audioBuffer.slice(0));
        
        // Calculate timestamps based on duration
        lineTimestampsRef.current = calculateTimestamps(audioBuffer.duration, podcast.script);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
        
        sourceRef.current = source;
        setIsPlaying(true);
        startTimeRef.current = ctx.currentTime;
        
        // Animation loop for highlighting
        const tick = () => {
            const elapsed = ctx.currentTime - startTimeRef.current;
            const index = lineTimestampsRef.current.findIndex(time => time > elapsed);
            
            // If index is -1 but we are still playing (elapsed < duration), it usually means we are at the very end
            const newIndex = index === -1 ? (elapsed < audioBuffer.duration ? lineTimestampsRef.current.length - 1 : -1) : index;
            
            if (newIndex !== activeLineIndex) {
                setActiveLineIndex(newIndex);
                // Auto scroll to active line
                if (newIndex !== -1 && scrollRef.current[newIndex]) {
                    scrollRef.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }

            if (elapsed < audioBuffer.duration) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                setIsPlaying(false);
                setActiveLineIndex(-1);
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        
        source.onended = () => {
             setIsPlaying(false);
             setActiveLineIndex(-1);
             if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };

    } catch (e) {
        console.error("Audio Play Error", e);
        alert("播放失败：无法解码音频数据");
        setIsPlaying(false);
    }
  };

  const downloadAudio = () => {
      if (!podcast?.audioBuffer) return;
      
      // Convert raw PCM to WAV for download
      const wavBlob = createWavBlob(podcast.audioBuffer);
      
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book_podcast_${Date.now()}.wav`;
      a.click();
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!podcast) {
      return (
          <div className={`${theme.cardClass} p-12 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-lg`}>
              <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-violet-500/30">
                  <Mic className="w-10 h-10 text-white" />
              </div>
              <h2 className={`text-3xl font-extrabold mb-4 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>
                  AI 播客生成室
              </h2>
              <p className={`text-lg mb-8 max-w-md ${theme.id === 'DARK_MODE' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {complexity === 'KIDS' 
                    ? "生成一个好玩的广播剧！会有两个有趣的角色给小朋友讲故事。"
                    : "生成一段关于本书的深度对话播客。由主持人与专家共同探讨核心观点。"}
              </p>

              {/* Language Selector */}
              <div className="relative inline-flex items-center mb-8">
                    <div className="absolute left-4 pointer-events-none text-violet-600">
                        <Languages className="w-5 h-5" />
                    </div>
                    <select
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value as 'CN' | 'EN')}
                        className={`appearance-none pl-12 pr-10 py-3 rounded-2xl font-bold text-sm shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                            theme.id === 'DARK_MODE'
                            ? 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-violet-300 hover:shadow-md'
                        }`}
                    >
                        <option value="EN">英文版 (English)</option>
                        <option value="CN">中文版 (Chinese)</option>
                    </select>
                    <div className="absolute right-4 pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                    </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="px-10 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-3 disabled:opacity-70 disabled:scale-100"
              >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Radio className="w-6 h-6" />}
                  {loading ? "正在撰写剧本并录制..." : "一键生成播客"}
              </button>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-slideUp">
        {/* Player Card */}
        <div className={`p-8 rounded-[2rem] shadow-xl relative overflow-hidden text-white ${complexity === 'KIDS' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-slate-900'}`}>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                 <div className={`w-32 h-32 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0 ${isPlaying ? 'animate-pulse' : ''} bg-white/10`}>
                     <Radio className="w-12 h-12 text-white" />
                 </div>
                 <div className="flex-1 text-center md:text-left">
                     <h2 className="text-2xl font-bold mb-2">{podcast.title || "BookMaster Podcast"}</h2>
                     <p className="opacity-80 mb-6">{podcast.script.length} lines • Multi-speaker AI • {selectedLang === 'EN' ? 'English' : 'Chinese'}</p>
                     
                     <div className="flex items-center gap-4 justify-center md:justify-start">
                         <button 
                           onClick={playPodcast}
                           disabled={!podcast.audioBuffer}
                           className="flex items-center gap-2 px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-100 transition-colors shadow-lg active:scale-95 transform"
                         >
                             {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                             {isPlaying ? "暂停" : "播放音频"}
                         </button>
                         {podcast.audioBuffer && (
                            <button onClick={downloadAudio} className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors" title="下载 WAV">
                                <Download className="w-5 h-5" />
                            </button>
                         )}
                     </div>
                 </div>
            </div>
            {/* Visualizer bars fake */}
            <div className="absolute bottom-0 left-0 right-0 h-24 flex items-end justify-between px-4 opacity-20 pointer-events-none">
                 {[...Array(20)].map((_,i) => (
                     <div key={i} className={`w-3 bg-white rounded-t-sm ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: `${20 + Math.random() * 80}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
                 ))}
            </div>
        </div>

        {/* Script View */}
        <div className={`${theme.cardClass} p-8 rounded-[2rem] border shadow-sm`}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h3 className={`text-xl font-bold ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>Podcast Script</h3>
                
                <div className="flex items-center gap-3">
                    {/* Copy Button */}
                    <button 
                        onClick={handleCopyScript}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? '已复制' : '复制脚本'}
                    </button>

                    {/* Language Switcher for Regeneration */}
                    <div className="relative inline-flex items-center">
                        <select
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value as 'CN' | 'EN')}
                            className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all cursor-pointer focus:outline-none border ${
                                theme.id === 'DARK_MODE'
                                ? 'bg-slate-800 text-white border-slate-700'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                        >
                            <option value="EN">English</option>
                            <option value="CN">中文</option>
                        </select>
                        <div className="absolute right-2 pointer-events-none text-slate-400">
                            <ChevronDown className="w-3 h-3" />
                        </div>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? '生成中...' : '重新生成'}
                    </button>
                </div>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {podcast.script.map((line, i) => (
                    <div 
                        key={i} 
                        ref={el => { scrollRef.current[i] = el }}
                        className={`flex gap-4 p-4 rounded-2xl transition-all duration-300 border-l-4 ${
                            activeLineIndex === i 
                            ? `${theme.id === 'DARK_MODE' ? 'border-l-emerald-400 bg-white/5' : 'border-l-emerald-500 bg-emerald-50/30'} pl-5 scale-[1.01]` 
                            : 'border-l-transparent hover:bg-slate-50/50 opacity-70 hover:opacity-100'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${line.speaker === 'Host' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {line.speaker === 'Host' ? (complexity === 'KIDS' ? '🐱' : 'Host') : (complexity === 'KIDS' ? '🐶' : 'Exp')}
                        </div>
                        <div className="flex-1">
                            <p className={`text-[10px] font-bold mb-1 opacity-50 uppercase tracking-wider ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-900'}`}>{line.speaker}</p>
                            <p className={`text-base leading-relaxed ${
                                activeLineIndex === i 
                                ? (theme.id === 'DARK_MODE' ? 'font-black text-white' : 'font-black text-slate-900') 
                                : (theme.id === 'DARK_MODE' ? 'text-slate-300' : 'text-slate-700')
                            }`}>
                                {line.text}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default PodcastView;
