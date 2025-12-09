
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic, Radio, Loader2, Download } from 'lucide-react';
import { PodcastResult, ComplexityLevel, Theme } from '../types';

interface PodcastViewProps {
  podcast?: PodcastResult;
  onGenerate: () => void;
  complexity: ComplexityLevel;
  theme: Theme;
}

const PodcastView: React.FC<PodcastViewProps> = ({ podcast, onGenerate, complexity, theme }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleGenerate = async () => {
      setLoading(true);
      await onGenerate();
      setLoading(false);
  };

  const playPodcast = async () => {
    if (!podcast?.audioBuffer) return;

    if (isPlaying) {
        sourceRef.current?.stop();
        setIsPlaying(false);
        return;
    }

    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        
        // Decode audio data
        const audioBuffer = await ctx.decodeAudioData(podcast.audioBuffer.slice(0));
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
        
        sourceRef.current = source;
        setIsPlaying(true);
        
        source.onended = () => setIsPlaying(false);

    } catch (e) {
        console.error("Audio Play Error", e);
        setIsPlaying(false);
    }
  };

  const downloadAudio = () => {
      if (!podcast?.audioBuffer) return;
      const blob = new Blob([podcast.audioBuffer], { type: 'audio/mp3' }); // Rough approx for download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book_podcast.mp3`;
      a.click();
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
                 <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                     <Radio className="w-12 h-12 text-white" />
                 </div>
                 <div className="flex-1 text-center md:text-left">
                     <h2 className="text-2xl font-bold mb-2">{podcast.title || "BookMaster Podcast"}</h2>
                     <p className="opacity-80 mb-6">{podcast.script.length} lines • Multi-speaker AI</p>
                     
                     <div className="flex items-center gap-4 justify-center md:justify-start">
                         <button 
                           onClick={playPodcast}
                           disabled={!podcast.audioBuffer}
                           className="flex items-center gap-2 px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-100 transition-colors"
                         >
                             {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                             {isPlaying ? "暂停" : "播放音频"}
                         </button>
                         {podcast.audioBuffer && (
                            <button onClick={downloadAudio} className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                                <Download className="w-5 h-5" />
                            </button>
                         )}
                     </div>
                 </div>
            </div>
            {/* Visualizer bars fake */}
            <div className="absolute bottom-0 left-0 right-0 h-24 flex items-end justify-between px-4 opacity-20 pointer-events-none">
                 {[...Array(20)].map((_,i) => (
                     <div key={i} className="w-3 bg-white rounded-t-sm animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
                 ))}
            </div>
        </div>

        {/* Script View */}
        <div className={`${theme.cardClass} p-8 rounded-[2rem] border shadow-sm`}>
            <h3 className={`text-xl font-bold mb-6 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>Podcast Script</h3>
            <div className="space-y-6">
                {podcast.script.map((line, i) => (
                    <div key={i} className="flex gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${line.speaker === 'Host' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {line.speaker === 'Host' ? (complexity === 'KIDS' ? '🐱' : 'Host') : (complexity === 'KIDS' ? '🐶' : 'Exp')}
                        </div>
                        <div className="flex-1">
                            <p className={`text-xs font-bold mb-1 opacity-50 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-900'}`}>{line.speaker}</p>
                            <p className={`text-lg leading-relaxed ${theme.id === 'DARK_MODE' ? 'text-slate-300' : 'text-slate-700'}`}>{line.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default PodcastView;
