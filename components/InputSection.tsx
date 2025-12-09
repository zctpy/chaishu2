
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Sparkles, FileText, ArrowRight, Book, BrainCircuit, Headphones, Zap } from 'lucide-react';

interface InputSectionProps {
  onAnalyze: (text: string) => void;
  isLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onAnalyze, isLoading }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        alert("温馨提示：当前网页版主要支持 .TXT/.MD 文本直接解析。PDF 文件请先复制文字内容，然后粘贴到下方文本框中即可。");
        e.target.value = ''; 
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target?.result as string);
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const handleDemo = () => {
    const demoText = `Atomic Habits by James Clear... (Demo content truncated for brevity)`; 
    // In real app, put full demo text here.
    setText("Atomic Habits by James Clear.\nIntroduction: The Story of the British Cycling Team.\nChapter 1: The Surprising Power of Atomic Habits.\nSuccess is the product of daily habits—not once-in-a-lifetime transformations...");
  };

  return (
    <div className="max-w-6xl mx-auto mt-12 px-6 pb-20 animate-slideUp relative z-10">
      
      {/* Hero Section */}
      <div className="text-center mb-16 relative">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/40 border border-white/60 backdrop-blur-md text-emerald-800 text-sm font-bold uppercase tracking-wide mb-8 shadow-sm animate-bounce cursor-default">
          <Sparkles className="w-4 h-4 text-emerald-600" /> 
          AI 驱动的沉浸式阅读引擎
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-slate-800 mb-8 tracking-tight leading-[1.1] drop-shadow-sm">
          让阅读 <br className="md:hidden"/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 animate-gradient">更深刻、更有趣</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-600 font-medium max-w-3xl mx-auto leading-relaxed opacity-90">
            上传书籍或粘贴文本，立即生成
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded mx-1">全书脑图</span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded mx-1">双语对照</span>
            及
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded mx-1">深度书评</span>
            。
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="glass-panel rounded-[3rem] p-3 shadow-2xl shadow-emerald-900/10">
        <div className="bg-white/60 rounded-[2.5rem] p-8 md:p-12 border border-white/50 backdrop-blur-sm">
          
          <div className="grid md:grid-cols-5 gap-8">
            
            {/* File Upload Area */}
            <div className="md:col-span-2 relative group cursor-pointer">
               <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
               <div className="relative h-full min-h-[220px] bg-white rounded-3xl border-2 border-dashed border-slate-200 group-hover:border-emerald-400 transition-all duration-300 flex flex-col items-center justify-center text-center p-6 overflow-hidden">
                  <input 
                    type="file" 
                    accept=".txt,.md,.pdf" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  
                  <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm">
                     <Upload className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-xl mb-2">点击上传书籍</h3>
                  <p className="text-slate-400 text-sm font-medium">支持 .TXT, .MD <br/>(PDF请复制文本)</p>
               </div>
            </div>

            {/* Divider for mobile */}
            <div className="md:hidden flex items-center gap-4 text-slate-300 text-sm font-bold uppercase">
               <div className="h-px bg-slate-300 flex-1"></div> OR <div className="h-px bg-slate-300 flex-1"></div>
            </div>

            {/* Text Input Area */}
            <div className="md:col-span-3 flex flex-col gap-4">
               <div className="relative group flex-1">
                 <textarea
                    ref={textareaRef}
                    className="w-full h-full min-h-[220px] p-6 rounded-3xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none resize-none text-slate-700 shadow-inner transition-all text-lg leading-relaxed placeholder:text-slate-400"
                    placeholder="或者在这里直接粘贴书籍内容..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  ></textarea>
                  <div className="absolute bottom-4 right-4 pointer-events-none">
                     <FileText className="w-6 h-6 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
               </div>

               <div className="flex items-center justify-between gap-4 mt-2">
                   <button 
                    onClick={handleDemo}
                    className="text-sm font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors"
                   >
                     <Zap className="w-4 h-4" /> 试用 Demo
                   </button>

                   <button
                    onClick={() => onAnalyze(text)}
                    disabled={!text.trim() || isLoading}
                    className={`flex-1 md:flex-none md:w-64 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none ${
                      !text.trim() || isLoading 
                      ? 'bg-slate-300 shadow-none' 
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`}
                   >
                     {isLoading ? (
                       <>
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         分析中...
                       </>
                     ) : (
                       <>
                         <Play className="w-5 h-5 fill-current" />
                         开始拆书
                       </>
                     )}
                   </button>
               </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 px-2">
         {[
            { icon: Book, title: "多维拆解", desc: "自动生成全书总结、思维导图、金句海报，全方位吃透好书。", color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: Headphones, title: "双语伴读", desc: "一键生成中英对照，配合真人级 AI 语音朗读，沉浸式学习。", color: "text-blue-600", bg: "bg-blue-50" },
            { icon: BrainCircuit, title: "深度内化", desc: "智能生成章节测验与七天行动计划，助力知识内化与实践。", color: "text-purple-600", bg: "bg-purple-50" },
         ].map((f, i) => (
             <div key={i} className="bg-white/60 backdrop-blur border border-white/50 p-6 rounded-3xl hover:bg-white hover:shadow-lg transition-all duration-300 group">
                 <div className={`w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                     <f.icon className={`w-7 h-7 ${f.color}`} />
                 </div>
                 <h3 className="font-bold text-xl text-slate-800 mb-2">{f.title}</h3>
                 <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
             </div>
         ))}
      </div>
    </div>
  );
};

export default InputSection;
