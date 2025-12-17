
import React, { useState, useRef, useEffect } from 'react';
import { Mic, PhoneOff, User, Bot, Volume2, Sparkles, AlertCircle, Headphones } from 'lucide-react';
import { createLiveSession, decodePCM } from '../services/geminiService';
import { LiveServerMessage, Blob } from '@google/genai';
import { Theme } from '../types';

interface LiveCoachProps {
  bookContext: string;
  theme: Theme;
}

const LiveCoach: React.FC<LiveCoachProps> = ({ bookContext, theme }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false); // AI is talking
  const [error, setError] = useState<string | null>(null);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const disconnect = () => {
    setIsConnected(false);
    setIsTalking(false);
    
    // Close audio contexts
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
  };

  const handleConnect = async () => {
    setError(null);
    try {
        // 1. Force 16kHz Sample Rate for Input
        // Most modern browsers support setting sampleRate. This handles resampling natively and cleaner than JS.
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
            sampleRate: 16000, 
            latencyHint: 'interactive' 
        });
        
        // 2. Output Context (Gemini usually returns 24kHz, we match it)
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ 
            sampleRate: 24000 
        });
        
        inputAudioContextRef.current = inputCtx;
        outputAudioContextRef.current = outputCtx;

        // 3. Get User Media with strict constraints
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 16000, // Try to request hardware 16k
                echoCancellation: true,
                autoGainControl: true,
                noiseSuppression: true,
            } 
        });

        const systemInstruction = `
        You are an expert reading coach.
        
        BOOK CONTEXT:
        ${bookContext.substring(0, 5000)}...

        INSTRUCTIONS:
        1. **Speak ONLY in Mandarin Chinese (Putonghua).** 
        2. Even if the user speaks English, answer in Chinese unless explicitly asked to teach English.
        3. Keep responses SHORT, encouraging, and conversational.
        4. Do NOT make up facts. Use the book context.
        `;

        nextStartTimeRef.current = 0;

        const sessionPromise = createLiveSession(systemInstruction, {
            callbacks: {
                onopen: async () => {
                    console.log("Live Session Opened");
                    setIsConnected(true);
                    
                    const source = inputCtx.createMediaStreamSource(stream);
                    // Buffer size 4096 at 16k is approx 256ms latency, good balance for chunking
                    const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Since inputCtx is strictly 16000, inputData is already 16kHz.
                        // We can send it directly without manual downsampling logic which causes artifacts.
                        const pcmBlob = createBlob(inputData);
                        
                        sessionPromiseRef.current?.then(session => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputCtx.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio) {
                        setIsTalking(true);
                        try {
                            const audioBuffer = await decodePCM(outputCtx, decode(base64Audio), 24000);
                            
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            
                            const now = outputCtx.currentTime;
                            // Gapless playback logic
                            if (nextStartTimeRef.current < now) {
                                nextStartTimeRef.current = now;
                            }
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            
                            source.onended = () => {
                                if (outputCtx.currentTime >= nextStartTimeRef.current - 0.1) {
                                    setIsTalking(false);
                                }
                            };
                        } catch (e) {
                            console.error("Audio Decode Error", e);
                        }
                    }

                    if (message.serverContent?.interrupted) {
                        console.log("Interrupted");
                        nextStartTimeRef.current = outputCtx.currentTime;
                        setIsTalking(false);
                    }
                },
                onclose: () => {
                    console.log("Session Closed");
                    disconnect();
                },
                onerror: (e: any) => {
                    console.error("Live Session Error", e);
                    setError("连接中断，请刷新重试。");
                    disconnect();
                }
            }
        });

        sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
        console.error("Connection Failed", e);
        if (e.name === 'NotAllowedError' || e.message?.includes('Permission denied')) {
             setError("请允许访问麦克风。");
        } else {
             setError("无法初始化音频设备，请尝试刷新页面。");
        }
        disconnect();
    }
  };

  // Helpers
  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        // Simple clipping
        let s = Math.max(-1, Math.min(1, data[i]));
        // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    return {
        data: base64,
        mimeType: 'audio/pcm;rate=16000'
    };
  };

  const decode = (base64: string): ArrayBuffer => {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
  };

  return (
    <div className={`max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[600px] ${theme.cardClass} rounded-[2.5rem] p-10 relative overflow-hidden transition-all duration-500`}>
        
        {/* Background Ambient Effect */}
        <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${isConnected ? 'opacity-100' : 'opacity-20'}`}>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full blur-[100px] animate-pulse ${isTalking ? 'scale-125 opacity-40' : 'scale-100 opacity-20'}`}></div>
        </div>

        <div className="relative z-10 text-center">
            <div className="mb-8 inline-block p-4 rounded-full bg-slate-50 border border-slate-100 shadow-sm">
                <Bot className={`w-12 h-12 ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
            </div>

            <h2 className={`text-4xl font-black mb-4 tracking-tight ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>
                AI 阅读教练
            </h2>
            
            <p className={`text-lg mb-8 max-w-md mx-auto ${theme.id === 'DARK_MODE' ? 'text-slate-400' : 'text-slate-600'}`}>
                {!isConnected 
                  ? "戴上耳机，点击下方按钮，开始与 AI 教练探讨书中的精彩内容。" 
                  : "正在聆听中... 您可以直接通过语音提问或发表感想。"}
            </p>

            {/* Headphone Advice */}
            {!isConnected && !error && (
                <div className="mb-8 flex items-center justify-center gap-2 text-sm text-slate-500 bg-slate-100/50 px-4 py-2 rounded-full mx-auto w-fit">
                    <Headphones className="w-4 h-4" />
                    <span>建议佩戴耳机以获得最佳体验（防止回音）</span>
                </div>
            )}

            {error && (
                <div className="mb-8 flex items-center gap-2 justify-center text-red-500 bg-red-50 px-4 py-2 rounded-lg animate-fadeIn">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            )}

            {!isConnected ? (
                <button 
                  onClick={handleConnect}
                  className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-2xl font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Mic className="w-6 h-6 relative z-10" />
                    <span className="relative z-10">开始语音对话</span>
                </button>
            ) : (
                <div className="flex flex-col items-center gap-8">
                     {/* Visualizer Placeholder */}
                     <div className="h-16 flex items-center gap-1.5">
                         {[...Array(5)].map((_, i) => (
                             <div 
                               key={i} 
                               className={`w-3 rounded-full bg-emerald-500 transition-all duration-300 ${isTalking ? 'animate-[bounce_1s_infinite]' : 'h-3'}`}
                               style={{ 
                                   height: isTalking ? `${Math.random() * 40 + 20}px` : '12px',
                                   animationDelay: `${i * 0.1}s` 
                               }} 
                             ></div>
                         ))}
                     </div>

                     <button 
                       onClick={disconnect}
                       className="flex items-center gap-2 px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 hover:bg-red-100 transition-colors"
                     >
                         <PhoneOff className="w-5 h-5" />
                         结束通话
                     </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default LiveCoach;
