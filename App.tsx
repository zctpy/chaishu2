
import React, { useState } from 'react';
import InputSection from './components/InputSection';
import Dashboard from './components/Dashboard';
import ChatDrawer from './components/ChatDrawer';
import { AppState, AnalysisResult, ReviewStyle } from './types';
import * as geminiService from './services/geminiService';
import { Sparkles, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [bookText, setBookText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<AnalysisResult>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Loading states for refreshes
  const [refreshingQuotes, setRefreshingQuotes] = useState(false);
  const [refreshingVocab, setRefreshingVocab] = useState(false);
  const [refreshingQuiz, setRefreshingQuiz] = useState(false);
  const [generatingMindMap, setGeneratingMindMap] = useState(false);
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
      // Parallel execution for core components
      const [summary, mindMap, quotes] = await Promise.all([
        geminiService.generateSummary(text),
        geminiService.generateMindMap(text), // Always detailed now
        geminiService.generateQuotes(text)
      ]);

      setAnalysisData({
        summary,
        mindMapMarkdown: mindMap,
        quotes
      });

      setAppState(AppState.DASHBOARD);

      // Reset reader state
      setReaderCursor(0);

      // Lazy load secondary components with better error handling
      loadSecondaryData(text);

    } catch (error) {
      console.error("Analysis Failed", error);
      alert("文本分析失败，可能是因为内容过长或网络问题，请稍后重试。");
      setAppState(AppState.UPLOAD);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSecondaryData = async (text: string) => {
    try {
      // Stagger calls to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
      const vocab = await geminiService.generateVocab(text);
      setAnalysisData(prev => ({ ...prev, vocab }));

      await new Promise(r => setTimeout(r, 1000));
      const quiz = await geminiService.generateQuiz(text);
      setAnalysisData(prev => ({ ...prev, quiz }));

      await new Promise(r => setTimeout(r, 1000));
      const plan = await geminiService.generateActionPlan(text);
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
      const newQuotes = await geminiService.generateQuotes(bookText, existing);
      setAnalysisData(prev => ({ ...prev, quotes: newQuotes }));
    } catch (e) {
      console.error(e);
      alert("生成金句失败，请稍后重试");
    } finally {
      setRefreshingQuotes(false);
    }
  };

  const handleRefreshVocab = async (existing: any[]) => {
    if (!bookText) return;
    setRefreshingVocab(true);
    try {
      const newVocab = await geminiService.generateVocab(bookText, existing);
      setAnalysisData(prev => ({ ...prev, vocab: newVocab }));
    } catch (e) {
      console.error(e);
      alert("生成词汇失败，请稍后重试");
    } finally {
      setRefreshingVocab(false);
    }
  };

  const handleRefreshQuiz = async (existing: any[]) => {
    if (!bookText) return;
    setRefreshingQuiz(true);
    try {
      const newQuiz = await geminiService.generateQuiz(bookText, existing);
      setAnalysisData(prev => ({ ...prev, quiz: newQuiz }));
    } catch (e) {
      console.error(e);
      alert("生成测验失败，请稍后重试");
    } finally {
      setRefreshingQuiz(false);
    }
  };

  const handleGenerateDetailedMindMap = async () => {
    // Deprecated button handler, but kept for compatibility just in case,
    // though the UI button will be removed.
    if (!bookText) return;
    setGeneratingMindMap(true);
    try {
      const newMap = await geminiService.generateMindMap(bookText); 
      setAnalysisData(prev => ({ ...prev, mindMapMarkdown: newMap }));
    } catch (e) {
      console.error(e);
      alert("生成脑图超时，请重试");
    } finally {
      setGeneratingMindMap(false);
    }
  };

  const handleGenerateReader = async (chapterIndex?: number) => {
    if (!bookText) return;
    
    // Determine start position and context hint
    let startPos = readerCursor;
    let focusChapter = "";

    if (chapterIndex !== undefined && analysisData.summary?.chapters) {
        const chapter = analysisData.summary.chapters[chapterIndex];
        focusChapter = chapter.chapterTitle;
        
        // Try to find the chapter in text
        const foundIndex = bookText.indexOf(focusChapter);
        if (foundIndex !== -1) {
            startPos = foundIndex;
        } else {
             // Heuristic Fallback
             startPos = Math.floor((chapterIndex / analysisData.summary.chapters.length) * bookText.length);
        }
        // Update cursor to this new position
        setReaderCursor(startPos);
    }

    setGeneratingReader(true);
    try {
        const chunk = bookText.substring(startPos, startPos + READER_CHUNK_SIZE);
        const segments = await geminiService.generateReaderContent(chunk, focusChapter);
        
        setAnalysisData(prev => ({ ...prev, readerContent: segments }));
        
        // Advance cursor
        setReaderCursor(startPos + READER_CHUNK_SIZE);

    } catch(e) {
        console.error(e);
        alert("生成阅读内容失败，请稍后重试");
    } finally {
        setGeneratingReader(false);
    }
  };

  const handleLoadMoreReader = async () => {
    if (!bookText || readerCursor >= bookText.length) return;
    setGeneratingReader(true);
    try {
       const chunk = bookText.substring(readerCursor, readerCursor + READER_CHUNK_SIZE);
       if (!chunk.trim()) {
           alert("已到达文本末尾");
           return;
       }
       const newSegments = await geminiService.generateReaderContent(chunk);
       setAnalysisData(prev => ({ 
           ...prev, 
           readerContent: [...(prev.readerContent || []), ...newSegments] 
       }));
       setReaderCursor(prev => prev + READER_CHUNK_SIZE);
    } catch(e) {
        console.error(e);
        alert("加载更多失败");
    } finally {
        setGeneratingReader(false);
    }
  };

  const handleGenerateReview = async (style: ReviewStyle, language: 'CN' | 'EN') => {
    if (!bookText) return;
    setGeneratingReview(true);
    try {
        const review = await geminiService.generateReview(bookText, style, language); 
        setAnalysisData(prev => ({ ...prev, bookReview: review }));
    } catch(e) {
        console.error(e);
        alert("生成书评失败，请重试");
    } finally {
        setGeneratingReview(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900">
      
      {/* Modern Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-[#f8fafc] overflow-hidden">
        {/* Soft Mesh Gradients */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-100/40 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-sky-100/30 rounded-full blur-3xl mix-blend-multiply opacity-50"></div>
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Header */}
      <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${appState === AppState.DASHBOARD ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { if(appState === AppState.DASHBOARD) setAppState(AppState.DASHBOARD) }}>
            <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 rounded-lg blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="relative w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <BookOpen className="w-5 h-5" />
                </div>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-800">
              BookMaster <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">AI</span>
            </span>
          </div>
          
          {appState === AppState.DASHBOARD && (
             <button 
              onClick={() => {
                setAppState(AppState.UPLOAD);
                setBookText('');
                setAnalysisData({});
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition-all border border-transparent hover:border-slate-200"
             >
               <Sparkles className="w-4 h-4" />
               拆解新书
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative pt-16">
        {appState === AppState.UPLOAD && (
          <InputSection onAnalyze={handleAnalyze} isLoading={false} />
        )}

        {appState === AppState.PROCESSING && (
           <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] animate-fadeIn">
             <div className="relative w-24 h-24 mb-10">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center animate-pulse">
                        <Sparkles className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>
             </div>
             <h2 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">AI 正在深度阅读</h2>
             <p className="text-slate-500 max-w-md text-center text-lg leading-relaxed font-medium">
               正在构建知识图谱、提炼核心金句...<br/>请稍候，精彩即将呈现
             </p>
           </div>
        )}

        {appState === AppState.DASHBOARD && (
          <Dashboard 
            data={analysisData} 
            onRefreshQuotes={handleRefreshQuotes}
            isRefreshingQuotes={refreshingQuotes}
            onRefreshVocab={handleRefreshVocab}
            isRefreshingVocab={refreshingVocab}
            onRefreshQuiz={handleRefreshQuiz}
            isRefreshingQuiz={refreshingQuiz}
            onGenerateDetailedMindMap={handleGenerateDetailedMindMap}
            isGeneratingMindMap={generatingMindMap}
            onGenerateReader={handleGenerateReader} // Updated
            onLoadMoreReader={handleLoadMoreReader}
            isGeneratingReader={generatingReader}
            onGenerateReview={handleGenerateReview}
            isGeneratingReview={generatingReview}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 mt-auto border-t border-slate-200/50 bg-white/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm font-medium flex items-center justify-center gap-1">
             BookMaster AI &copy; {new Date().getFullYear()} • Powered by Gemini 2.0 Flash
          </p>
        </div>
      </footer>

      {/* Chat Bot */}
      {appState === AppState.DASHBOARD && (
        <ChatDrawer context={bookText} />
      )}
    </div>
  );
};

export default App;
