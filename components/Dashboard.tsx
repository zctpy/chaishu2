
import React, { useState } from 'react';
import { 
  BookOpen, Quote, Languages, CheckSquare, Calendar, RefreshCw, Volume2, 
  Sparkles, PenTool, Mic, Settings, LayoutGrid, LogOut, ChevronRight, Play, Headphones,
  Share2, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult, TabView, ReviewStyle, Theme, ComplexityLevel } from '../types';
import ReaderView from './ReaderView';
import SocialShareModal, { ShareData } from './SocialShareModal';
import ExportReportModal from './ExportReportModal';
import PodcastView from './PodcastView';
import { generateSpeech, decodePCM } from '../services/geminiService';

interface DashboardProps {
  data: AnalysisResult;
  theme: Theme;
  themes: Theme[];
  onSelectTheme: (id: string) => void;
  complexity: ComplexityLevel;
  onSetComplexity: (c: ComplexityLevel) => void;

  onBack: () => void;
  
  onRefreshQuotes: (existing: any[]) => void;
  isRefreshingQuotes: boolean;
  onRefreshVocab: (existing: any[]) => void;
  isRefreshingVocab: boolean;
  onRefreshQuiz: (existing: any[]) => void;
  isRefreshingQuiz: boolean;
  onGenerateReader: (chapterIndex?: number) => void;
  onLoadMoreReader: () => void;
  isGeneratingReader: boolean;
  onGenerateReview: (style: ReviewStyle, language: 'CN' | 'EN') => void;
  isGeneratingReview: boolean;
  onGeneratePodcast: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    data, theme, themes, onSelectTheme, complexity, onSetComplexity,
    onBack,
    onRefreshQuotes, isRefreshingQuotes,
    onRefreshVocab, isRefreshingVocab,
    onRefreshQuiz, isRefreshingQuiz,
    onGenerateReader, onLoadMoreReader, isGeneratingReader,
    onGenerateReview, isGeneratingReview,
    onGeneratePodcast
}) => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.SUMMARY);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Audio playing logic
  const [playingAudio, setPlayingAudio] = useState<string | null>(null); 
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const audioBufferCache = React.useRef<Map<string, AudioBuffer>>(new Map());

  // Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<{[key:number]: number}>({});

  const playHighQualitySpeech = async (text: string, id: string) => {
    if (playingAudio === id) {
       setPlayingAudio(null);
       audioContextRef.current?.close();
       return;
    }
    setPlayingAudio(id);
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;
        let audioBuffer = audioBufferCache.current.get(text);
        if (!audioBuffer) {
             const arrayBuffer = await generateSpeech(text);
             if (!arrayBuffer) throw new Error("No audio");
             audioBuffer = decodePCM(ctx, arrayBuffer);
             audioBufferCache.current.set(text, audioBuffer);
        }
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
        source.onended = () => setPlayingAudio(null);
    } catch (e) { console.error(e); setPlayingAudio(null); }
  };

  const openShareModal = (data: ShareData) => { setShareData(data); setShareModalOpen(true); };

  // --- Render Helpers ---

  const tabs = [
    { id: TabView.SUMMARY, label: '全书总结', icon: BookOpen },
    { id: TabView.READER, label: '双语阅读', icon: Headphones }, 
    { id: TabView.REVIEW, label: '深度书评', icon: PenTool }, 
    { id: TabView.QUOTES, label: '精选金句', icon: Quote },
    { id: TabView.VOCAB, label: '核心词汇', icon: Languages },
    { id: TabView.PRACTICE, label: '深度测验', icon: CheckSquare },
    { id: TabView.PLAN, label: '行动计划', icon: Calendar },
    { id: TabView.PODCAST, label: '生成播客', icon: Mic }, 
  ];

  const renderContent = () => {
    // Style override wrapper based on complexity
    const containerClass = `animate-fadeIn max-w-5xl mx-auto pb-20 ${complexity === 'KIDS' ? 'font-comic' : ''}`;
    const headingClass = `text-4xl md:text-5xl font-extrabold mb-8 ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-white' : 'text-slate-900'}`;
    const cardBaseClass = `${theme.cardClass} rounded-[2rem] shadow-sm relative overflow-hidden transition-all`;

    switch (activeTab) {
      case TabView.SUMMARY:
        return (
          <div className={containerClass}>
            <div className={`${cardBaseClass} p-8 md:p-12`}>
               <h1 className={headingClass}>
                   {data.summary?.title}
               </h1>
               <div className={`prose max-w-none text-lg leading-loose ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'prose-invert' : 'text-slate-700'}`}>
                   {complexity === 'KIDS' && <div className="text-3xl mb-4">🧸 📖 ✨</div>}
                   <ReactMarkdown>{data.summary?.overallSummary || ''}</ReactMarkdown>
               </div>
               
               {/* Chapters */}
               <div className="mt-12 grid gap-6 md:grid-cols-2">
                   {data.summary?.chapters.map((c, i) => (
                       <div key={i} className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100 hover:shadow-md'}`}>
                           <div className={`text-sm font-bold mb-2 uppercase tracking-wider ${theme.accentColor}`}>Chapter {i+1}</div>
                           <h3 className={`text-xl font-bold mb-3 ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-slate-100' : 'text-slate-800'}`}>{c.chapterTitle}</h3>
                           <p className={`text-sm leading-relaxed ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-slate-400' : 'text-slate-600'}`}>{c.summary}</p>
                       </div>
                   ))}
               </div>
            </div>
          </div>
        );

      case TabView.PODCAST:
        return (
            <div className={containerClass}>
                 <PodcastView 
                    podcast={data.podcast}
                    onGenerate={onGeneratePodcast}
                    complexity={complexity}
                    theme={theme}
                 />
            </div>
        );

      case TabView.QUOTES:
          return (
              <div className={containerClass + " space-y-6"}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className={headingClass.replace('mb-8', 'mb-0')}>精选金句</h2>
                      <button onClick={() => onRefreshQuotes(data.quotes || [])} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${theme.id==='DARK_MODE'?'border-slate-600 text-emerald-400':'bg-white border-slate-200 text-emerald-600'}`}>
                          <RefreshCw className={`w-4 h-4 ${isRefreshingQuotes?'animate-spin':''}`} /> 换一组
                      </button>
                  </div>
                  <div className="grid gap-6">
                      {data.quotes?.map((q, i) => (
                          <div key={i} className={`${cardBaseClass} p-8 border group`}>
                              <p className={`text-2xl font-serif mb-4 italic ${theme.id==='DARK_MODE' || theme.id === 'CYBERPUNK' ?'text-slate-200':'text-slate-800'}`}>"{q.text}"</p>
                              <p className={`text-lg mb-4 ${theme.id==='DARK_MODE' || theme.id === 'CYBERPUNK' ?'text-slate-400':'text-slate-600'}`}>{q.translation}</p>
                              <div className={`p-4 rounded-xl text-sm ${theme.id==='DARK_MODE' || theme.id === 'CYBERPUNK' ?'bg-white/5 text-slate-400':'bg-slate-50 text-slate-600'}`}>
                                  <span className={`font-bold mr-2 ${theme.accentColor}`}>AI解析:</span>{q.reason}
                              </div>
                              
                              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => openShareModal({ 
                                        type: 'QUOTE', 
                                        title: data.summary?.title || '', 
                                        text: q.text, 
                                        subText: q.translation, 
                                        footer: q.reason,
                                        author: data.summary?.author 
                                    })} 
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-emerald-500 bg-white shadow-sm border border-slate-100"
                                    title="生成金句卡片"
                                  >
                                      <Share2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => playHighQualitySpeech(q.text, `q-${i}`)} 
                                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-emerald-500 bg-white shadow-sm border border-slate-100"
                                    title="朗读"
                                  >
                                      {playingAudio === `q-${i}` ? <span className="animate-spin text-xs">⏳</span> : <Volume2 className="w-4 h-4"/>}
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          );

      case TabView.VOCAB:
          return (
              <div className={containerClass + " space-y-6"}>
                   <div className="flex justify-between items-center mb-6">
                      <h2 className={headingClass.replace('mb-8', 'mb-0')}>核心词汇</h2>
                      <button onClick={() => onRefreshVocab(data.vocab || [])} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${theme.id==='DARK_MODE'?'border-slate-600 text-emerald-400':'bg-white border-slate-200 text-emerald-600'}`}>
                          <RefreshCw className={`w-4 h-4 ${isRefreshingVocab?'animate-spin':''}`} /> 换一组
                      </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.vocab?.map((v, i) => (
                          <div key={i} className={`${cardBaseClass} p-6 flex items-start justify-between group`}>
                              <div>
                                  <div className="flex items-baseline gap-3 mb-1">
                                      <span className={`text-2xl font-bold ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>{v.word}</span>
                                      <span className="text-sm font-mono text-slate-400 bg-black/5 px-2 py-0.5 rounded">{v.ipa}</span>
                                  </div>
                                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${theme.accentColor}`}>{v.pos}</div>
                                  <p className={`${theme.id === 'DARK_MODE' ? 'text-slate-400' : 'text-slate-600'}`}>{v.meaning}</p>
                              </div>
                              <button onClick={() => playHighQualitySpeech(v.word, `v-${i}`)} className="p-2 text-slate-300 hover:text-emerald-500">
                                  <Volume2 className="w-5 h-5" />
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
          );

      case TabView.REVIEW:
          return (
             <div className={containerClass}>
                 {!data.bookReview ? (
                     <div className={`${cardBaseClass} p-12 text-center`}>
                         <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                             <PenTool className="w-10 h-10 text-emerald-600" />
                         </div>
                         <h2 className={`text-2xl font-bold mb-4 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>生成深度书评</h2>
                         <p className="text-slate-500 mb-8 max-w-md mx-auto">选择一种评论风格，AI 将为您撰写一篇有深度、有观点的专业书评。</p>
                         
                         <div className="flex flex-wrap justify-center gap-3">
                             {[
                                 { id: 'GENTLE', label: '温和推荐' },
                                 { id: 'CRITICAL', label: '批判性分析' },
                                 { id: 'ACADEMIC', label: '学术研讨' },
                                 { id: 'ESSAY', label: '随笔散文' },
                                 { id: 'NIETZSCHE', label: '尼采风格' }
                             ].map((style) => (
                                 <button
                                    key={style.id}
                                    onClick={() => onGenerateReview(style.id as any, 'CN')}
                                    disabled={isGeneratingReview}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 font-medium text-slate-600 transition-all disabled:opacity-50"
                                 >
                                     {style.label}
                                 </button>
                             ))}
                         </div>
                         {isGeneratingReview && <div className="mt-8 text-emerald-600 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4 animate-spin"/> 正在撰写中...</div>}
                     </div>
                 ) : (
                     <div className={`${cardBaseClass} p-10 md:p-14`}>
                         <div className="mb-8 pb-8 border-b border-slate-100">
                             <div className="flex flex-wrap gap-2 mb-4">
                                 {data.bookReview.titles.map((t,i) => (
                                     <span key={i} className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">{t}</span>
                                 ))}
                             </div>
                             <h1 className={`text-3xl font-bold mb-4 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-900'}`}>{data.bookReview.titles[0]}</h1>
                             <p className="text-lg text-slate-500 italic">“ {data.bookReview.oneSentenceSummary} ”</p>
                         </div>
                         <div className={`prose max-w-none mb-10 ${theme.id === 'DARK_MODE' ? 'prose-invert' : 'text-slate-700'}`}>
                             <ReactMarkdown>{data.bookReview.contentMarkdown}</ReactMarkdown>
                         </div>
                         <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                             <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> 读后自检清单</h4>
                             <ul className="space-y-2">
                                 {data.bookReview.selfCheckList.map((item, i) => (
                                     <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                                         <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0"></span>
                                         {item}
                                     </li>
                                 ))}
                             </ul>
                         </div>
                     </div>
                 )}
             </div>
          );

      case TabView.PRACTICE:
          return (
              <div className={containerClass + " space-y-6"}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className={headingClass.replace('mb-8', 'mb-0')}>深度测验</h2>
                      <button onClick={() => onRefreshQuiz(data.quiz || [])} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${theme.id==='DARK_MODE'?'border-slate-600 text-emerald-400':'bg-white border-slate-200 text-emerald-600'}`}>
                          <RefreshCw className={`w-4 h-4 ${isRefreshingQuiz?'animate-spin':''}`} /> 换一组
                      </button>
                  </div>
                  <div className="grid gap-6">
                      {data.quiz?.map((q, qIdx) => {
                          const isAnswered = selectedAnswers[qIdx] !== undefined;
                          const isCorrect = selectedAnswers[qIdx] === q.correctAnswerIndex;
                          
                          return (
                              <div key={qIdx} className={`${cardBaseClass} p-8`}>
                                  <div className="flex items-start gap-4 mb-6">
                                      <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">{qIdx + 1}</span>
                                      <div>
                                          <h3 className={`text-lg font-bold mb-1 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>{q.questionCn}</h3>
                                          <p className="text-sm text-slate-500">{q.questionEn}</p>
                                      </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                      {q.optionsCn.map((opt, oIdx) => {
                                          let btnClass = `w-full text-left p-4 rounded-xl border transition-all flex justify-between items-center `;
                                          
                                          if (isAnswered) {
                                              if (oIdx === q.correctAnswerIndex) {
                                                  btnClass += "bg-emerald-100 border-emerald-500 text-emerald-800";
                                              } else if (selectedAnswers[qIdx] === oIdx) {
                                                  btnClass += "bg-red-50 border-red-200 text-red-700 opacity-60";
                                              } else {
                                                  btnClass += "bg-slate-50 border-transparent opacity-50";
                                              }
                                          } else {
                                              btnClass += `${theme.id === 'DARK_MODE' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-transparent hover:bg-slate-100 hover:border-slate-300'}`;
                                          }

                                          return (
                                              <button 
                                                key={oIdx}
                                                disabled={isAnswered}
                                                onClick={() => setSelectedAnswers(prev => ({...prev, [qIdx]: oIdx}))}
                                                className={btnClass}
                                              >
                                                  <span>{opt}</span>
                                                  {isAnswered && oIdx === q.correctAnswerIndex && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                                  {isAnswered && selectedAnswers[qIdx] === oIdx && oIdx !== q.correctAnswerIndex && <XCircle className="w-5 h-5 text-red-500" />}
                                              </button>
                                          );
                                      })}
                                  </div>

                                  {isAnswered && (
                                      <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 animate-fadeIn ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                          <div className="text-sm">
                                              <p className="font-bold mb-1">解析：</p>
                                              {q.explanationCn}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                  </div>
              </div>
          );

      case TabView.PLAN:
          return (
              <div className={containerClass}>
                   <h2 className={headingClass}>7天行动计划</h2>
                   <div className={`${cardBaseClass} p-8 md:p-12 relative`}>
                        {/* Vertical Line */}
                        <div className="absolute left-8 md:left-12 top-12 bottom-12 w-0.5 bg-slate-200"></div>

                        <div className="space-y-12 relative">
                            {data.actionPlan?.map((day, i) => (
                                <div key={i} className="flex gap-6 md:gap-10 relative">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-lg z-10 shrink-0 border-4 border-white ring-1 ring-slate-100">
                                        {day.day}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`text-xl font-bold mb-2 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>
                                            Day {day.day}: {day.focus}
                                        </h3>
                                        <div className={`p-6 rounded-2xl ${theme.id === 'DARK_MODE' ? 'bg-white/5' : 'bg-slate-50'}`}>
                                            <ul className="space-y-3">
                                                {day.tasks.map((task, ti) => (
                                                    <li key={ti} className="flex items-start gap-3">
                                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                                        <span className={`${theme.id === 'DARK_MODE' ? 'text-slate-300' : 'text-slate-600'}`}>{task}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                   </div>
              </div>
          );

      case TabView.READER:
          return (
              <div className={containerClass}>
                  <ReaderView 
                      segments={data.readerContent} 
                      chapters={data.summary?.chapters}
                      isLoading={isGeneratingReader} 
                      onGenerate={onGenerateReader}
                      onLoadMore={onLoadMoreReader}
                  />
              </div>
          );
      
      default:
        return <div className="p-10 text-center opacity-50">Content Loading or Module Not Active...</div>;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
       
       {/* LEFT SIDEBAR */}
       <aside className={`w-full md:w-64 shrink-0 flex flex-col justify-between transition-colors duration-300 z-30 ${theme.sidebarClass} ${theme.id === 'ROYAL_PURPLE' || theme.id === 'MINIMAL_GREY' || theme.id === 'FOREST_DEEP' || theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-white/80' : 'text-slate-600'}`}>
           <div>
               {/* Brand / Logo Area */}
               <div className="h-20 flex items-center px-6 gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'bg-white/10 text-white' : 'bg-white text-emerald-600'}`}>
                       <BookOpen className="w-6 h-6" />
                   </div>
                   <span className={`font-bold text-lg ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-white' : ''} ${theme.id==='ROYAL_PURPLE'?'text-white':''}`}>BookMaster</span>
               </div>

               {/* Navigation Tabs */}
               <nav className="px-4 space-y-1 mt-4">
                   {tabs.map(tab => (
                       <button
                         key={tab.id}
                         onClick={() => setActiveTab(tab.id)}
                         className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                             activeTab === tab.id 
                             ? `${theme.activeTabClass} shadow-sm translate-x-1` 
                             : `hover:bg-black/5 ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'hover:bg-white/10 text-slate-400' : ''}`
                         }`}
                       >
                           <tab.icon className="w-5 h-5" />
                           {tab.label}
                       </button>
                   ))}
               </nav>
           </div>

           {/* Sidebar Footer Controls */}
           <div className="p-4 space-y-4">
               
               {/* Complexity Toggle */}
               <div className={`p-1 rounded-lg flex ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'bg-slate-800' : 'bg-black/5'}`}>
                   <button 
                     onClick={() => onSetComplexity('NORMAL')}
                     className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${complexity === 'NORMAL' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                   >
                       专业版
                   </button>
                   <button 
                     onClick={() => onSetComplexity('KIDS')}
                     className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${complexity === 'KIDS' ? 'bg-yellow-400 shadow-sm text-yellow-900' : 'text-slate-500'}`}
                   >
                       👶 新手
                   </button>
               </div>

               {/* Theme Picker Trigger */}
               <div className="relative">
                   <button 
                     onClick={() => setShowThemeMenu(!showThemeMenu)}
                     className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'}`}
                   >
                       <div className="flex items-center gap-2">
                           <LayoutGrid className="w-4 h-4" />
                           <span className="text-sm font-medium">{theme.name}</span>
                       </div>
                       <ChevronRight className={`w-4 h-4 transition-transform ${showThemeMenu ? 'rotate-90' : ''}`} />
                   </button>

                   {/* Popover Theme Menu */}
                   {showThemeMenu && (
                       <div className="absolute bottom-full left-0 w-64 mb-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 grid grid-cols-2 gap-2 z-50 animate-fadeIn text-slate-800">
                           {themes.map(t => (
                               <button 
                                 key={t.id}
                                 onClick={() => { onSelectTheme(t.id); setShowThemeMenu(false); }}
                                 className={`text-left px-3 py-2 rounded-lg text-xs font-bold border hover:scale-105 transition-transform ${t.id === theme.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-600'}`}
                               >
                                   <div className={`w-full h-8 rounded mb-1 ${t.bgClass} border border-slate-200`}></div>
                                   {t.name}
                               </button>
                           ))}
                       </div>
                   )}
               </div>

               <button 
                  onClick={onBack}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-slate-400 hover:text-red-500 transition-colors"
               >
                   <LogOut className="w-4 h-4" />
                   返回首页
               </button>
           </div>
       </aside>

       {/* RIGHT CONTENT AREA */}
       <main className="flex-1 overflow-y-auto h-screen p-6 md:p-10 relative">
           {/* Top Actions (Export) */}
           <div className="absolute top-6 right-6 z-20 flex gap-2">
               <button onClick={() => setExportModalOpen(true)} className={`p-2.5 rounded-full shadow-md transition-all hover:scale-110 ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'bg-white/10 text-white' : 'bg-white text-slate-700'}`}>
                   <Sparkles className="w-5 h-5" />
               </button>
           </div>

           {renderContent()}
       </main>

       {/* Modals */}
       <SocialShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} data={shareData} />
       <ExportReportModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} data={data} />
    </div>
  );
};

export default Dashboard;
