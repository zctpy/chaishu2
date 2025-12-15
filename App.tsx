
import React, { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import Dashboard from './components/Dashboard';
import { AppState, AnalysisResult, ReviewStyle, Theme, ComplexityLevel } from './types';
import * as geminiService from './services/geminiService';
import { Sparkles, BookOpen } from 'lucide-react';

// --- GLOBAL STYLES & ANIMATIONS ---
const GlobalStyles = () => (
  <style>{`
    @keyframes blob {
      0% { transform: translate(0px, 0px) scale(1); }
      33% { transform: translate(30px, -50px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
      100% { transform: translate(0px, 0px) scale(1); }
    }
    .animate-blob {
      animation: blob 7s infinite;
    }
    .animation-delay-2000 {
      animation-delay: 2s;
    }
    .animation-delay-4000 {
      animation-delay: 4s;
    }
    .glass-panel {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.5);
    }
    .glass-sidebar {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.6);
    }
    /* Hide scrollbar for cleaner look in some containers */
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
  `}</style>
);

// --- THEME DEFINITIONS ---
const THEMES: Theme[] = [
  { 
    id: 'MODERN_EMERALD', 
    name: '清新翠绿', 
    bgClass: 'bg-slate-50', 
    sidebarClass: 'glass-sidebar', 
    activeTabClass: 'bg-emerald-100/80 text-emerald-700 shadow-sm ring-1 ring-emerald-200/50', 
    textClass: 'text-slate-600', 
    accentColor: 'text-emerald-600', 
    cardClass: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]' 
  },
  { 
    id: 'DARK_MODE', 
    name: '深邃夜空', 
    bgClass: 'bg-[#0f172a]', 
    sidebarClass: 'bg-[#1e293b]/90 backdrop-blur-xl border-r border-slate-700/50', 
    activeTabClass: 'bg-slate-700 text-sky-400 border border-slate-600 shadow-[0_0_15px_rgba(56,189,248,0.1)]', 
    textClass: 'text-slate-300', 
    accentColor: 'text-sky-400', 
    cardClass: 'bg-[#1e293b]/80 backdrop-blur-md border border-slate-700 shadow-xl' 
  },
  { 
    id: 'KIDS_PLAYFUL', 
    name: '童趣彩虹', 
    bgClass: 'bg-[#fffbeb]', 
    sidebarClass: 'bg-[#fff1f2]/90 backdrop-blur-xl border-r border-rose-200/50', 
    activeTabClass: 'bg-white text-rose-500 shadow-md scale-105 border border-rose-100 rounded-full', 
    textClass: 'text-slate-700 font-medium', 
    accentColor: 'text-rose-500', 
    cardClass: 'bg-white/90 border-2 border-orange-100 shadow-[0_8px_30px_rgb(0,0,0,0.05)] rounded-[2rem]' 
  },
  { 
    id: 'ZEN_PAPER', 
    name: '护眼羊皮', 
    bgClass: 'bg-[#f7f5eb]', 
    sidebarClass: 'bg-[#ebe6d6]/90 border-r border-[#dcd6c3]', 
    activeTabClass: 'bg-[#fbf9f3] text-[#5c5644] shadow-sm border border-[#dcd6c3]', 
    textClass: 'text-[#474336]', 
    accentColor: 'text-[#8c7b56]', 
    cardClass: 'bg-[#fbf9f3] border-[#ebe6d6] shadow-sm' 
  },
  { 
    id: 'CYBERPUNK', 
    name: '赛博霓虹', 
    bgClass: 'bg-[#050505]', 
    sidebarClass: 'bg-[#0a0a0a]/90 border-r border-fuchsia-900', 
    activeTabClass: 'bg-fuchsia-900/20 text-fuchsia-400 border border-fuchsia-500/50 shadow-[0_0_15px_rgba(232,121,249,0.3)]', 
    textClass: 'text-slate-300', 
    accentColor: 'text-cyan-400', 
    cardClass: 'bg-[#111]/90 border-fuchsia-900/30 shadow-2xl' 
  },
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

  const handleGeneratePodcast = async (language: 'CN' | 'EN') => {
      if (!bookText) return;
      try {
          const result = await geminiService.generatePodcast(bookText, complexity, language);
          setAnalysisData(prev => ({ ...prev, podcast: result }));
      } catch (e) {
          console.error(e);
          alert("播客生成失败");
      }
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${currentTheme.bgClass} ${currentTheme.textClass} relative overflow-hidden`}>
      <GlobalStyles />
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        {currentThemeId === 'DARK_MODE' ? (
             <div className="absolute inset-0 bg-slate-900">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
             </div>
        ) : (
             <div className="absolute inset-0 bg-slate-50">
                {/* Colorful blobs for light mode */}
                <div className={`absolute top-0 -left-4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob ${currentThemeId === 'KIDS_PLAYFUL' ? 'bg-yellow-300' : 'bg-purple-300'}`}></div>
                <div className={`absolute top-0 -right-4 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000 ${currentThemeId === 'KIDS_PLAYFUL' ? 'bg-pink-300' : 'bg-yellow-300'}`}></div>
                <div className={`absolute -bottom-32 left-20 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000 ${currentThemeId === 'KIDS_PLAYFUL' ? 'bg-blue-300' : 'bg-pink-300'}`}></div>
             </div>
        )}
      </div>

      {/* Header - Only visible on Upload screen */}
      {appState !== AppState.DASHBOARD && (
        <header className="fixed top-0 inset-x-0 z-40 h-20 flex items-center justify-between px-8 bg-white/30 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${currentThemeId === 'DARK_MODE' ? 'bg-white/10 text-white' : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'}`}>
                <BookOpen className="w-6 h-6" />
            </div>
            <span className={`font-extrabold text-2xl tracking-tight ${currentThemeId === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>
                BookMaster <span className="text-emerald-500">AI</span>
            </span>
          </div>
          
          {/* Complexity Toggle on Landing Page */}
           <div className="flex items-center gap-1 bg-white/40 p-1.5 rounded-full border border-white/50 backdrop-blur-sm shadow-sm">
              <button 
                onClick={() => setComplexity('NORMAL')}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-300 ${complexity === 'NORMAL' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}
              >
                🎓 专业版
              </button>
              <button 
                onClick={() => setComplexity('KIDS')}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-300 ${complexity === 'KIDS' ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md' : 'text-slate-600 hover:bg-white/50'}`}
              >
                🧸 儿童版
              </button>
           </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 relative">
        {appState === AppState.UPLOAD && (
          <div className="pt-20">
             <InputSection onAnalyze={handleAnalyze} isLoading={false} />
          </div>
        )}

        {appState === AppState.PROCESSING && (
           <div className="flex flex-col items-center justify-center h-screen animate-fadeIn relative z-10">
             <div className="relative w-32 h-32 mb-10">
                <div className={`absolute inset-0 border-4 rounded-full opacity-20 ${currentThemeId === 'DARK_MODE' ? 'border-white' : 'border-slate-900'}`}></div>
                <div className={`absolute inset-0 border-4 border-t-transparent rounded-full animate-spin ${currentThemeId === 'KIDS_PLAYFUL' ? 'border-yellow-500' : 'border-emerald-500'}`}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className={`w-10 h-10 animate-pulse ${currentThemeId === 'KIDS_PLAYFUL' ? 'text-yellow-500' : 'text-emerald-500'}`} />
                </div>
             </div>
             <h2 className={`text-4xl font-extrabold mb-4 tracking-tight ${currentThemeId === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>
                {complexity === 'KIDS' ? "AI 正在读故事书..." : "AI 正在深度解析"}
             </h2>
             <p className={`text-lg font-medium opacity-70 text-center max-w-md ${currentThemeId === 'DARK_MODE' ? 'text-slate-300' : 'text-slate-600'}`}>
               {complexity === 'KIDS' ? "正在寻找好玩的图片和简单的道理..." : "构建知识图谱 • 提炼核心金句 • 生成双语对照"}
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
