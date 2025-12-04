
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Sparkles, FileText, ArrowRight } from 'lucide-react';

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
      // Reset height to auto to allow shrinking when text is deleted
      textareaRef.current.style.height = 'auto';
      // Set height based on scrollHeight to fit content
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
    const demoText = `
      Atomic Habits by James Clear.
      Introduction: The Story of the British Cycling Team.
      Chapter 1: The Surprising Power of Atomic Habits.
      Success is the product of daily habits—not once-in-a-lifetime transformations. You should be far more concerned with your current trajectory than with your current results. If you want to predict where you'll end up in life, all you have to do is follow the curve of tiny gains or tiny losses, and see how your daily choices will compound ten or twenty years down the line.
      Chapter 2: How Your Habits Shape Your Identity (and Vice Versa).
      There are three layers of behavior change: a change in your outcomes, a change in your processes, or a change in your identity. The most effective way to change your habits is to focus not on what you want to achieve, but on who you wish to become.
      Chapter 3: How to Build Better Habits in 4 Simple Steps.
      A habit is a behavior that has been repeated enough times to become automatic. The ultimate purpose of habits is to solve the problems of life with as little energy and effort as possible. Any habit can be broken down into a feedback loop that involves four steps: cue, craving, response, and reward.
      The Four Laws of Behavior Change are a simple set of rules we can use to build better habits. They are (1) make it obvious, (2) make it attractive, (3) make it easy, and (4) make it satisfying.
    `;
    setText(demoText.trim());
  };

  return (
    <div className="max-w-5xl mx-auto mt-16 px-4 md:px-8 animate-slideUp">
      {/* Hero Text */}
      <div className="text-center mb-14 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-300/20 blur-[100px] rounded-full -z-10"></div>
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 border border-slate-200/60 backdrop-blur text-emerald-700 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
          <Sparkles className="w-3 h-3" /> 新一代 AI 知识引擎
        </div>
        
        <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
          让阅读 <br className="md:hidden"/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 animate-gradient">更高效、更深刻</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
          上传书籍或粘贴文本，立即生成
          <span className="text-emerald-600 font-semibold px-1">全书脑图</span>
          <span className="text-emerald-600 font-semibold px-1">双语对照</span>
          及
          <span className="text-emerald-600 font-semibold px-1">深度书评</span>。
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-white/70 backdrop-blur-2xl p-2 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/60 ring-1 ring-slate-900/5">
        <div className="bg-white rounded-[2rem] p-6 md:p-10 border border-slate-100">
          
          <div className="space-y-6">
            
            {/* File Upload Area */}
            <div className="relative group overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all duration-300 h-40 flex flex-col items-center justify-center">
              <input 
                type="file" 
                accept=".txt,.md,.pdf" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              <div className="pointer-events-none z-10 flex flex-col items-center">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm border border-slate-100">
                  <Upload className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="font-bold text-slate-700 text-lg">点击上传书籍文件</p>
                <p className="text-sm text-slate-400 mt-1">支持 .TXT, .MD (PDF请复制文本)</p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-2">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider bg-white px-2">或者</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* Text Area */}
            <div className="relative group">
              <textarea
                ref={textareaRef}
                className="w-full min-h-[150px] max-h-[300px] p-5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none resize-none text-slate-700 shadow-inner transition-all text-base leading-relaxed placeholder:text-slate-400 overflow-y-auto"
                placeholder="在此直接粘贴书籍内容..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              ></textarea>
              <div className="absolute bottom-3 right-3 pointer-events-none">
                 <FileText className="w-5 h-5 text-slate-300 group-focus-within:text-emerald-400 transition-colors" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
               <button 
                onClick={handleDemo}
                className="text-sm text-slate-500 hover:text-emerald-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all px-2"
               >
                 试用《原子习惯》片段 <ArrowRight className="w-3 h-3" />
               </button>

               <button
                onClick={() => onAnalyze(text)}
                disabled={!text.trim() || isLoading}
                className={`w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-xl text-white font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/30 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none ${
                  !text.trim() || isLoading 
                  ? 'bg-slate-300 shadow-none' 
                  : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600'
                }`}
               >
                 {isLoading ? (
                   <>
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     正在深度分析...
                   </>
                 ) : (
                   <>
                     <Play className="w-5 h-5 fill-current" />
                     开始拆解
                   </>
                 )}
               </button>
            </div>

          </div>
        </div>
      </div>
      
      {/* Footer Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-center px-4 opacity-80">
         <div>
            <h3 className="font-bold text-slate-800 mb-2">多维视角拆解</h3>
            <p className="text-sm text-slate-500">自动生成全书总结、思维导图、金句海报，全方位吃透好书。</p>
         </div>
         <div>
            <h3 className="font-bold text-slate-800 mb-2">双语对照学习</h3>
            <p className="text-sm text-slate-500">一键生成中英对照，配合真人级 AI 语音朗读，提升语言能力。</p>
         </div>
         <div>
            <h3 className="font-bold text-slate-800 mb-2">深度交互问答</h3>
            <p className="text-sm text-slate-500">基于全书内容的 AI 助手，随问随答，像与作者对话一样自然。</p>
         </div>
      </div>
    </div>
  );
};

export default InputSection;
