
import React, { useState, useRef, useEffect } from 'react';
import { Mic, PhoneOff, User, Bot, Volume2, Sparkles, AlertCircle } from 'lucide-react';
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
  
  const videoRef = useRef<HTMLVideoElement>(null); // For future video expansion, current audio only
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

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
  };

  const handleConnect = async () => {
    setError(null);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Setup Audio Contexts
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        inputAudioContextRef.current = inputCtx;
        outputAudioContextRef.current = outputCtx;

        const systemInstruction = `
        You are an expert reading coach and literary companion. 
        You are discussing the book with the user.
        
        BOOK CONTEXT:
        ${bookContext.substring(0, 10000)}...

        ROLE:
        - Be friendly, encouraging, and insightful.
        - Discuss the plot, themes, characters, or specific quotes.
        - If the user asks about something else, politely guide them back to the book.
        - Keep your responses concise and conversational.
        
        CRITICAL LANGUAGE RULES:
        1. **STRICTLY SPEAK ONLY Standard Mandarin Chinese (Putonghua) OR English.**
        2. **NEVER** speak Cantonese, regional dialects, or mixed languages.
        3. If you hear gibberish or noise, simply say "请再说一遍" (Please say that again) in Mandarin or wait.
        4. If the user speaks Chinese, reply in clear Standard Mandarin.
        5. If the user speaks English, reply in English.
        6. Start the conversation by greeting the user in Mandarin.
        `;

        let nextStartTime = 0;

        // Use the updated createLiveSession helper which separates callbacks correctly
        const sessionPromise = createLiveSession(systemInstruction, {
            callbacks: {
                onopen: async () => {
                    console.log("Live Session Opened");
                    setIsConnected(true);
                    
                    // Start Input Streaming
                    const source = inputCtx.createMediaStreamSource(stream);
                    const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        // Send data when session is ready
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
                            
                            // Schedule Audio
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            
                            const now = outputCtx.currentTime;
                            // Ensure nextStartTime is at least now
                            nextStartTime = Math.max(nextStartTime, now);
                            
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                            
                            source.onended = () => {
                                // Simple check: if current time > nextStartTime (with buffer), we are done talking
                                if (outputCtx.currentTime >= nextStartTime - 0.1) {
                                    setIsTalking(false);
                                }
                            };
                        } catch (e) {
                            console.error("Audio Decode Error", e);
                        }
                    }

                    if (message.serverContent?.interrupted) {
                        console.log("Interrupted");
                        nextStartTime = 0;
                        setIsTalking(false);
                    }
                },
                onclose: () => {
                    console.log("Session Closed");
                    setIsConnected(false);
                    setIsTalking(false);
                },
                onerror: (e: any) => {
                    console.error("Live Session Error", e);
                    setError("服务暂时不可用或连接中断，请稍后重试。");
                    setIsConnected(false);
                    setIsTalking(false);
                    // Force cleanup
                    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
                    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
                }
            }
        });

        sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
        console.error("Connection Failed", e);
        if (e.name === 'NotAllowedError' || e.message?.includes('Permission denied')) {
             setError("无法访问麦克风。请在浏览器设置中允许此网站使用麦克风。");
        } else {
             setError("连接初始化失败，请检查网络或重试。");
        }
    }
  };

  // Helpers for Audio Data (Local to avoid export mess if not in service)
  const createBlob = (data: Float32Array): Blob => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    // Encode Int16 to Base64 manually string build
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
            
            <p className={`text-lg mb-12 max-w-md mx-auto ${theme.id === 'DARK_MODE' ? 'text-slate-400' : 'text-slate-600'}`}>
                {!isConnected 
                  ? "戴上耳机，点击下方按钮，开始与 AI 教练探讨书中的精彩内容。" 
                  : "正在聆听中... 您可以直接通过语音提问或发表感想。"}
            </p>

            {error && (
                <div className="mb-8 flex items-center gap-2 justify-center text-red-500 bg-red-50 px-4 py-2 rounded-lg">
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
