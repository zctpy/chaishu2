
import React, { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import Dashboard from './components/Dashboard';
import { AppState, AnalysisResult, ReviewStyle, Theme, ComplexityLevel } from './types';
import * as geminiService from './services/geminiService';
import { Sparkles, BookOpen } from 'lucide-react';

// --- THEME DEFINITIONS ---
const THEMES: Theme[] = [
  { 
    id: 'MODERN_EMERALD', 
    name: '极简白绿', 
    bgClass: 'bg-slate-50', 
    sidebarClass: 'bg-white border-r border-slate-200', 
    activeTabClass: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200', 
    textClass: 'text-slate-600', 
    accentColor: 'text-emerald-600', 
    cardClass: 'bg-white border-slate-200 shadow-sm' 
  },
  { 
    id: 'DARK_MODE', 
    name: '深邃夜空', 
    bgClass: 'bg-[#0f172a]', 
    sidebarClass: 'bg-[#1e293b] border-r border-slate-700', 
    activeTabClass: 'bg-slate-700 text-sky-400 border border-slate-600', 
    textClass: 'text-slate-300', 
    accentColor: 'text-sky-400', 
    cardClass: 'bg-[#1e293b] border-slate-700 shadow-xl' 
  },
  { 
    id: 'KIDS_PLAYFUL', 
    name: '童趣彩虹', 
    bgClass: 'bg-[#fffbeb]', 
    sidebarClass: 'bg-[#fff1f2] border-r border-rose-200', 
    activeTabClass: 'bg-white text-rose-500 shadow-md scale-105 border border-rose-100', 
    textClass: 'text-slate-700 font-medium', 
    accentColor: 'text-rose-500', 
    cardClass: 'bg-white border-orange-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem]' 
  },
  { 
    id: 'ZEN_PAPER', 
    name: '护眼羊皮', 
    bgClass: 'bg-[#f7f5eb]', 
    sidebarClass: 'bg-[#ebe6d6] border-r border-[#dcd6c3]', 
    activeTabClass: 'bg-[#fbf9f3] text-[#5c5644] shadow-sm border border-[#dcd6c3]', 
    textClass: 'text-[#474336]', 
    accentColor: 'text-[#8c7b56]', 
    cardClass: 'bg-[#fbf9f3] border-[#ebe6d6] shadow-sm' 
  },
  { 
    id: 'CYBERPUNK', 
    name: '赛博霓虹', 
    bgClass: 'bg-[#050505]', 
    sidebarClass: 'bg-[#0a0a0a] border-r border-fuchsia-900', 
    activeTabClass: 'bg-fuchsia-900/20 text-fuchsia-400 border border-fuchsia-500/50 shadow-[0_0_15px_rgba(232,121,249,0.3)]', 
    textClass: 'text-slate-300', 
    accentColor: 'text-cyan-400', 
    cardClass: 'bg-[#111] border-fuchsia-900/30 shadow-2xl' 
  },
  { 
    id: 'OCEAN_BREEZE', 
    name: '蔚蓝海风', 
    bgClass: 'bg-sky-50', 
    sidebarClass: 'bg-white border-r border-sky-100', 
    activeTabClass: 'bg-sky-100 text-sky-700 font-bold', 
    textClass: 'text-slate-600', 
    accentColor: 'text-sky-600', 
    cardClass: 'bg-white/80 backdrop-blur border-sky-100 shadow-sky-100/50' 
  },
  { 
    id: 'SUNSET_GLOW', 
    name: '暮光暖阳', 
    bgClass: 'bg-gradient-to-br from-orange-50 to-rose-50', 
    sidebarClass: 'bg-white/90 border-r border-orange-100', 
    activeTabClass: 'bg-gradient-to-r from-orange-100 to-rose-100 text-rose-700', 
    textClass: 'text-slate-700', 
    accentColor: 'text-orange-500', 
    cardClass: 'bg-white border-orange-100 shadow-orange-100' 
  },
  { 
    id: 'ROYAL_PURPLE', 
    name: '凝夜紫韵', 
    bgClass: 'bg-[#f3e8ff]', 
    sidebarClass: 'bg-[#2e1065] border-r border-[#4c1d95]', 
    activeTabClass: 'bg-[#581c87] text-purple-100 border-l-4 border-purple-300', 
    textClass: 'text-slate-700', 
    accentColor: 'text-[#7e22ce]', 
    cardClass: 'bg-white border-purple-100 shadow-purple-100' 
  }, 
  { 
    id: 'MINIMAL_GREY', 
    name: '极致黑白', 
    bgClass: 'bg-[#eeeeee]', 
    sidebarClass: 'bg-black border-r border-black', 
    activeTabClass: 'bg-white text-black font-bold', 
    textClass: 'text-black', 
    accentColor: 'text-black', 
    cardClass: 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
  },
  { 
    id: 'FOREST_DEEP', 
    name: '北欧森系', 
    bgClass: 'bg-[#ecfdf5]', 
    sidebarClass: 'bg-[#064e3b] border-r border-[#065f46]', 
    activeTabClass: 'bg-[#047857] text-emerald-50 shadow-inner', 
    textClass: 'text-emerald-900', 
    accentColor: 'text-[#047857]', 
    cardClass: 'bg-white border-emerald-100 shadow-emerald-100' 
  }
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [bookText, setBookText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<AnalysisResult>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Theme & Complexity State
  const [currentThemeId, setCurrentThemeId] = useState<string>('MODERN_EMERALD');
  const [complexity, setComplexity] = useState<ComplexityLevel>('NORMAL');

  // Derived Theme Object
  const currentTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];

  // Auto-switch theme if Kids mode is toggled (UX enhancement)
  useEffect(() => {
    if (complexity === 'KIDS') {
      setCurrentThemeId('KIDS_PLAYFUL');
    } else if (currentThemeId === 'KIDS_PLAYFUL') {
      setCurrentThemeId('MODERN_EMERALD');
    }
  }, [complexity]);

  // Loading states for refreshes
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);
  const [refreshingVocab, setRefreshingVocab] = useState(false);
  const [refreshingQuiz, setRefreshingQuiz] = useState(false);
  const [generatingReader, setGeneratingReader] = useState(false);
  const [generatingReview, setGeneratingReview] = useState(false);

  // Pagination for Reader
  const [readerCursor, setReaderCursor] = useState(0);
  const READER_CHUNK_SIZE = 15000;

  const handleAnalyze = async (text: string) => {
    setBookText(text);
    setAppState(AppState.PROCESSING);
    setIsLoading(true);

    try {
      // Pass complexity level to services
      const summary = await geminiService.generateSummary(text, complexity);
      
      await new Promise(r => setTimeout(r, 2000));
      
      const quotes = await geminiService.generateQuotes(text, [], complexity);

      setAnalysisData({
        summary,
        quotes
      });

      setAppState(AppState.DASHBOARD);
      setReaderCursor(0);
      loadSecondaryData(text);

    } catch (error) {
      console.error("Analysis Failed", error);
      alert("分析失败，请稍后重试。");
      setAppState(AppState.UPLOAD);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSecondaryData = async (text: string) => {
    try {
      await new Promise(r => setTimeout(r, 1500));
      const vocab = await geminiService.generateVocab(text, [], complexity);
      setAnalysisData(prev => ({ ...prev, vocab }));

      await new Promise(r => setTimeout(r, 1500));
      const quiz = await geminiService.generateQuiz(text, [], complexity);
      setAnalysisData(prev => ({ ...prev, quiz }));

      await new Promise(r => setTimeout(r, 1500));
      const plan = await geminiService.generateActionPlan(text, complexity);
      setAnalysisData(prev => ({ ...prev, actionPlan: plan }));
      
    } catch (e) {
      console.warn("Secondary data load partial failure", e);
    }
  };

  // --- Handlers for Refreshes ---

  const handleRefreshQuotes = async (existing: any[]) => {
    if (!bookText) return;
    setRefreshingQuotes(true);
    try {
      const newQuotes = await geminiService.generateQuotes(bookText, existing, complexity);
      setAnalysisData(prev => ({ ...prev, quotes: newQuotes }));
    } catch (e) {
      alert("刷新失败");
    } finally {
      setRefreshingQuotes(false);
    }
  };

  const handleRefreshVocab = async (existing: any[]) => {
    if (!bookText) return;
    setRefreshingVocab(true);
    try {
      const newVocab = await geminiService.generateVocab(bookText, existing, complexity);
      setAnalysisData(prev => ({ ...prev, vocab: newVocab }));
    } catch (e) {
      alert("刷新失败");
    } finally {
      setRefreshingVocab(false);
    }
  };

  const handleRefreshQuiz = async (existing: any[]) => {
    if (!bookText) return;
    setRefreshingQuiz(true);
    try {
      const newQuiz = await geminiService.generateQuiz(bookText, existing, complexity);
      setAnalysisData(prev => ({ ...prev, quiz: newQuiz }));
    } catch (e) {
      alert("刷新失败");
    } finally {
      setRefreshingQuiz(false);
    }
  };

  const handleGenerateReader = async (chapterIndex?: number) => {
    if (!bookText) return;
    let startPos = readerCursor;
    let focusChapter = "";

    if (typeof chapterIndex === 'number' && chapterIndex !== undefined && analysisData.summary?.chapters) {
        const chapter = analysisData.summary.chapters[chapterIndex];
        if (chapter) {
          focusChapter = chapter.chapterTitle;
          const foundIndex = bookText.indexOf(focusChapter);
          startPos = foundIndex !== -1 ? foundIndex : Math.floor((chapterIndex / analysisData.summary.chapters.length) * bookText.length);
          setReaderCursor(startPos);
        }
    }

    setGeneratingReader(true);
    try {
        const chunk = bookText.substring(startPos, startPos + READER_CHUNK_SIZE);
        const segments = await geminiService.generateReaderContent(chunk, focusChapter, complexity);
        setAnalysisData(prev => ({ ...prev, readerContent: segments }));
        setReaderCursor(startPos + READER_CHUNK_SIZE);
    } catch(e) {
        alert("生成阅读失败");
    } finally {
        setGeneratingReader(false);
    }
  };

  const handleLoadMoreReader = async () => {
    if (!bookText || readerCursor >= bookText.length) return;
    setGeneratingReader(true);
    try {
       const chunk = bookText.substring(readerCursor, readerCursor + READER_CHUNK_SIZE);
       if (!chunk.trim()) { alert("已到达末尾"); return; }
       const newSegments = await geminiService.generateReaderContent(chunk, undefined, complexity);
       setAnalysisData(prev => ({ ...prev, readerContent: [...(prev.readerContent || []), ...newSegments] }));
       setReaderCursor(prev => prev + READER_CHUNK_SIZE);
    } catch(e) { alert("加载失败"); } finally { setGeneratingReader(false); }
  };

  const handleGenerateReview = async (style: ReviewStyle, language: 'CN' | 'EN') => {
    if (!bookText) return;
    setGeneratingReview(true);
    try {
        const review = await geminiService.generateReview(bookText, style, language); 
        setAnalysisData(prev => ({ ...prev, bookReview: { ...review, language } }));
    } catch(e) { alert("生成书评失败"); } finally { setGeneratingReview(false); }
  };

  // --- NEW Podcast Handler ---
  const handleGeneratePodcast = async () => {
      if (!bookText) return;
      try {
          // This one is handled inside Dashboard usually, but we can pass a callback
          const result = await geminiService.generatePodcast(bookText, complexity);
          setAnalysisData(prev => ({ ...prev, podcast: result }));
      } catch (e) {
          console.error(e);
          alert("播客生成失败");
      }
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${currentTheme.bgClass} ${currentTheme.textClass}`}>
      
      {/* Background Ambience based on Theme */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {currentThemeId === 'DARK_MODE' && <div className="absolute inset-0 bg-slate-900"></div>}
        {currentThemeId === 'CYBERPUNK' && <div className="absolute inset-0 bg-[#050505] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>}
        {currentThemeId === 'MINIMAL_GREY' && <div className="absolute inset-0 bg-[#eeeeee] opacity-50 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>}
        
        {/* Default / Gentle Gradients */}
        <div className={`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-3xl opacity-30 mix-blend-multiply transition-colors duration-1000 ${currentThemeId === 'KIDS_PLAYFUL' ? 'bg-yellow-300' : 'bg-emerald-100'}`}></div>
      </div>

      {/* Header - Only visible on Upload screen, Dashboard has sidebar */}
      {appState !== AppState.DASHBOARD && (
        <header className="fixed top-0 inset-x-0 z-40 h-16 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <BookOpen className={`w-6 h-6 ${currentTheme.accentColor}`} />
            <span className="font-extrabold text-xl tracking-tight">BookMaster <span className={currentTheme.accentColor}>AI</span></span>
          </div>
          
          {/* Complexity Toggle on Landing Page */}
           <div className="flex items-center gap-2 bg-white/80 p-1 rounded-full border border-slate-200 shadow-sm">
              <button 
                onClick={() => setComplexity('NORMAL')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${complexity === 'NORMAL' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                专业版
              </button>
              <button 
                onClick={() => setComplexity('KIDS')}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${complexity === 'KIDS' ? 'bg-yellow-400 text-yellow-900' : 'text-slate-500 hover:text-yellow-600'}`}
              >
                👶 新手/儿童版
              </button>
           </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 relative">
        {appState === AppState.UPLOAD && (
          <div className="pt-16">
             <InputSection onAnalyze={handleAnalyze} isLoading={false} />
          </div>
        )}

        {appState === AppState.PROCESSING && (
           <div className="flex flex-col items-center justify-center h-screen animate-fadeIn">
             <div className="relative w-24 h-24 mb-8">
                <div className={`absolute inset-0 border-4 rounded-full opacity-20 ${currentThemeId === 'DARK_MODE' ? 'border-white' : 'border-slate-900'}`}></div>
                <div className={`absolute inset-0 border-4 border-t-transparent rounded-full animate-spin ${currentThemeId === 'KIDS_PLAYFUL' ? 'border-yellow-500' : 'border-emerald-500'}`}></div>
             </div>
             <h2 className={`text-3xl font-extrabold mb-4 ${currentThemeId === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>
                {complexity === 'KIDS' ? "AI 正在读故事书..." : "AI 正在深度阅读"}
             </h2>
             <p className="opacity-60 text-center">
               {complexity === 'KIDS' ? "寻找好玩的图片和简单的道理..." : "构建知识图谱 / 提炼核心金句..."}
             </p>
           </div>
        )}

        {appState === AppState.DASHBOARD && (
          <Dashboard 
            data={analysisData} 
            theme={currentTheme}
            themes={THEMES}
            onSelectTheme={setCurrentThemeId}
            complexity={complexity}
            onSetComplexity={setComplexity}
            
            onBack={() => { setAppState(AppState.UPLOAD); setBookText(''); setAnalysisData({}); }}
            
            onRefreshQuotes={handleRefreshQuotes} isRefreshingQuotes={refreshingQuotes}
            onRefreshVocab={handleRefreshVocab} isRefreshingVocab={refreshingVocab}
            onRefreshQuiz={handleRefreshQuiz} isRefreshingQuiz={refreshingQuiz}
            onGenerateReader={handleGenerateReader} onLoadMoreReader={handleLoadMoreReader} isGeneratingReader={generatingReader}
            onGenerateReview={handleGenerateReview} isGeneratingReview={generatingReview}
            onGeneratePodcast={handleGeneratePodcast}
          />
        )}
      </main>
    </div>
  );
};

export default App;
