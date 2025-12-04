
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Volume2, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { createChatSession, generateSpeech, decodePCM } from '../services/geminiService';
import { Chat } from '@google/genai';

interface ChatDrawerProps {
  context: string;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: '你好！我是你的 AI 读书助手。关于这本书，通过拆解分析后，你有什么想深入探讨的吗？', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);

  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (context && !chatSessionRef.current) {
        // Initialize chat with book context
        chatSessionRef.current = createChatSession(`
            You are a helpful assistant specialized in this specific book content. 
            Here is the content of the book you are answering questions about:
            ---
            ${context.substring(0, 50000)}...
            ---
            Answer primarily based on this text. If the user asks something outside the book, politely steer them back or answer briefly.
        `);
    }
  }, [context]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const result = await chatSessionRef.current.sendMessage({ message: userMsg.text });
        let text = result.text || "我无法生成回复。";
        
        // Strip quotes if they exist at start/end
        text = text.replace(/^["']|["']$/g, '').trim();

        setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: text,
            timestamp: Date.now()
        }]);
    } catch (error) {
        console.error("Chat Error", error);
        setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "抱歉，出错了，请重试。",
            timestamp: Date.now()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const playMessageAudio = async (text: string, id: string) => {
    if (playingMsgId === id) {
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setPlayingMsgId(null);
        return;
    }

    // Stop any existing audio
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }

    setPlayingMsgId(id);

    try {
        const arrayBuffer = await generateSpeech(text);
        if (!arrayBuffer) throw new Error("No audio generated");

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const ctx = audioContextRef.current;
        const audioBuffer = decodePCM(ctx, arrayBuffer);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
        
        source.onended = () => {
            setPlayingMsgId(null);
        };
    } catch (e) {
        console.error("Chat Audio Playback Error", e);
        setPlayingMsgId(null);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 group flex items-center justify-center p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_40px_rgb(16,185,129,0.5)] transition-all transform hover:scale-110 hover:-translate-y-1 z-40 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageCircle className="w-7 h-7 fill-current" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
      </button>

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white/95 backdrop-blur-2xl shadow-2xl transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-50 flex flex-col border-l border-white/50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50/80 to-teal-50/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
               <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
                <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">AI 问书助手</h3>
                <p className="text-xs text-emerald-600 font-medium">基于全书内容实时解答</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm border border-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row items-start'}`}>
               
               {/* Avatar */}
               <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-white ${msg.role === 'user' ? 'bg-slate-200' : 'bg-gradient-to-br from-emerald-100 to-teal-100'}`}>
                 {msg.role === 'user' ? <User className="w-5 h-5 text-slate-500" /> : <Bot className="w-5 h-5 text-emerald-600" />}
               </div>
               
               {/* Bubble Group */}
               <div className="flex flex-col gap-1 items-start max-w-[85%]">
                   <div className={`relative px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                       msg.role === 'user' 
                       ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-none' 
                       : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                   }`}>
                     {msg.text}
                   </div>
                   
                   {/* TTS Button for Model Messages */}
                   {msg.role === 'model' && (
                       <button 
                         onClick={() => playMessageAudio(msg.text, msg.id)}
                         className={`ml-1 mt-1 p-1.5 rounded-full transition-colors flex items-center gap-1 ${playingMsgId === msg.id ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:bg-slate-200'}`}
                         title="朗读回答"
                       >
                         {playingMsgId === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                         {playingMsgId === msg.id && <span className="text-[10px] font-bold">播放中...</span>}
                       </button>
                   )}
               </div>
            </div>
          ))}
          
          {isLoading && (
             <div className="flex gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Bot className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-12">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-5 border-t border-slate-100 bg-white/80 backdrop-blur pb-8 md:pb-5">
          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入你的问题，例如：这本书的核心观点是什么？"
              className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-inner text-slate-700 placeholder-slate-400"
              disabled={isLoading}
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-2 p-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-95"
            >
              <Send className="w-5 h-5 fill-current" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-300 mt-3 font-medium">AI 生成内容仅供参考</p>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity duration-300"
        ></div>
      )}
    </>
  );
};

export default ChatDrawer;
