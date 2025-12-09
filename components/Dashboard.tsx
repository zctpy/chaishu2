
import React, { useState } from 'react';
import { 
  BookOpen, Quote, Languages, CheckSquare, Calendar, RefreshCw, Volume2, 
  Sparkles, PenTool, Mic, LayoutGrid, LogOut, ChevronRight, Play, Headphones,
  Share2, CheckCircle2, XCircle, AlertCircle, Loader2, Menu, X, ArrowLeft
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
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Review Style State
  const [activeReviewStyle, setActiveReviewStyle] = useState<ReviewStyle | null>(null);

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
    const headingClass = `text-4xl md:text-5xl font-black mb-8 tracking-tight ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-white' : 'text-slate-800'}`;
    const cardBaseClass = `${theme.cardClass} rounded-[2.5rem] p-10 relative overflow-hidden transition-all duration-300`;

    switch (activeTab) {
      case TabView.SUMMARY:
        return (
          <div className={containerClass}>
            <div className={cardBaseClass}>
               <h1 className={headingClass}>
                   {data.summary?.title}
               </h1>
               <div className={`prose max-w-none text-lg leading-loose ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'prose-invert' : 'text-slate-600'}`}>
                   {complexity === 'KIDS' && <div className="text-3xl mb-4">🧸 📖 ✨</div>}
                   <ReactMarkdown>{data.summary?.overallSummary || ''}</ReactMarkdown>
               </div>
               
               {/* Chapters Optimized Typography */}
               <div className="mt-14 grid gap-8">
                   <h2 className={`text-3xl font-bold border-b pb-4 flex items-center gap-3 ${theme.id === 'DARK_MODE' ? 'text-white border-white/10' : 'text-slate-800 border-slate-100'}`}>
                       <BookOpen className="w-8 h-8 text-emerald-500" />
                       章节精华
                   </h2>
                   <div className="grid gap-6 md:grid-cols-2">
                       {data.summary?.chapters.map((c, i) => (
                           <div key={i} className={`p-8 rounded-3xl border transition-all hover:-translate-y-1 group ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-transparent hover:bg-white hover:shadow-xl hover:shadow-emerald-500/10'}`}>
                               <div className={`text-xs font-bold mb-3 uppercase tracking-wider flex items-center gap-2 ${theme.accentColor}`}>
                                   <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-[10px] opacity-80">{i+1}</span>
                                   Chapter
                               </div>
                               <h3 className={`text-xl font-bold mb-4 leading-tight ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-slate-100' : 'text-slate-800'}`}>
                                   {c.chapterTitle}
                               </h3>
                               <p className={`text-base leading-relaxed ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-slate-400' : 'text-slate-600'}`}>
                                   {c.summary}
                               </p>
                           </div>
                       ))}
                   </div>
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
                      <button onClick={() => onRefreshQuotes(data.quotes || [])} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors hover:shadow-lg ${theme.id==='DARK_MODE'?'border-slate-600 text-emerald-400 hover:bg-slate-700':'bg-white border-slate-100 text-emerald-600 hover:bg-emerald-50'}`}>
                          <RefreshCw className={`w-4 h-4 ${isRefreshingQuotes?'animate-spin':''}`} /> 换一组
                      </button>
                  </div>
                  <div className="grid gap-6">
                      {!data.quotes ? (
                          <div className="text-center p-10 opacity-50">正在加载金句...</div>
                      ) : data.quotes.map((q, i) => (
                          <div key={i} className={`${cardBaseClass} border-l-4 border-l-emerald-400 group hover:shadow-xl hover:shadow-emerald-500/5`}>
                              <p className={`text-2xl font-serif mb-4 italic leading-normal ${theme.id==='DARK_MODE' || theme.id === 'CYBERPUNK' ?'text-slate-200':'text-slate-800'}`}>"{q.text}"</p>
                              <p className={`text-lg mb-6 ${theme.id==='DARK_MODE' || theme.id === 'CYBERPUNK' ?'text-slate-400':'text-slate-500'}`}>{q.translation}</p>
                              <div className={`p-4 rounded-2xl text-sm flex items-start gap-2 ${theme.id==='DARK_MODE' || theme.id === 'CYBERPUNK' ?'bg-white/5 text-slate-400':'bg-slate-50 text-slate-600'}`}>
                                  <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{q.reason}</span>
                              </div>
                              
                              <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => openShareModal({ 
                                        type: 'QUOTE', 
                                        title: data.summary?.title || '', 
                                        text: q.text, 
                                        subText: q.translation, 
                                        footer: q.reason,
                                        author: data.summary?.author 
                                    })} 
                                    className="p-3 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 bg-white shadow-md border border-slate-100 transition-colors"
                                    title="生成金句卡片"
                                  >
                                      <Share2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => playHighQualitySpeech(q.text, `q-${i}`)} 
                                    className="p-3 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 bg-white shadow-md border border-slate-100 transition-colors"
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
                      <button onClick={() => onRefreshVocab(data.vocab || [])} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors hover:shadow-lg ${theme.id==='DARK_MODE'?'border-slate-600 text-emerald-400 hover:bg-slate-700':'bg-white border-slate-100 text-emerald-600 hover:bg-emerald-50'}`}>
                          <RefreshCw className={`w-4 h-4 ${isRefreshingVocab?'animate-spin':''}`} /> 换一组
                      </button>
                  </div>
                  
                  {!data.vocab ? (
                      <div className="flex flex-col items-center justify-center p-20 opacity-60">
                          <Loader2 className="w-8 h-8 animate-spin mb-2" />
                          <p>正在分析词汇...</p>
                      </div>
                  ) : (
                      <div className={`rounded-[2rem] overflow-hidden border shadow-sm ${theme.id === 'DARK_MODE' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-100'}`}>
                          <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                  <thead>
                                      <tr className={`border-b text-sm uppercase tracking-wider ${theme.id === 'DARK_MODE' ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                          <th className="p-6 font-bold whitespace-nowrap pl-8">单词</th>
                                          <th className="p-6 font-bold whitespace-nowrap">音标</th>
                                          <th className="p-6 font-bold whitespace-nowrap">词性</th>
                                          <th className="p-6 font-bold w-1/3 min-w-[200px]">释义</th>
                                          <th className="p-6 font-bold text-center whitespace-nowrap pr-8">朗读</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {data.vocab.map((v, i) => (
                                          <tr key={i} className={`border-b last:border-0 transition-colors ${theme.id === 'DARK_MODE' ? 'border-slate-700 hover:bg-slate-800/50' : 'border-slate-50 hover:bg-emerald-50/30'}`}>
                                              <td className={`p-6 pl-8 font-bold text-lg ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>{v.word}</td>
                                              <td className="p-6 font-mono text-slate-500 text-sm bg-slate-50/50 rounded-lg mx-2">{v.ipa}</td>
                                              <td className={`p-6 text-sm font-bold uppercase ${theme.accentColor}`}>{v.pos}</td>
                                              <td className={`p-6 ${theme.id === 'DARK_MODE' ? 'text-slate-300' : 'text-slate-700'}`}>{v.meaning}</td>
                                              <td className="p-6 text-center pr-8">
                                                  <button 
                                                    onClick={() => playHighQualitySpeech(v.word, `v-${i}`)} 
                                                    className={`p-2.5 rounded-full transition-colors ${theme.id === 'DARK_MODE' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-emerald-100 text-slate-400'} hover:text-emerald-600`}
                                                  >
                                                      {playingAudio === `v-${i}` ? <span className="animate-spin">⏳</span> : <Volume2 className="w-5 h-5" />}
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
          );

      case TabView.REVIEW:
          const reviewStyles: {id: ReviewStyle, label: string}[] = [
             { id: 'GENTLE', label: '温和推荐' },
             { id: 'CRITICAL', label: '批判性分析' },
             { id: 'ACADEMIC', label: '学术研讨' },
             { id: 'ESSAY', label: '随笔散文' },
             { id: 'NIETZSCHE', label: '尼采风格' },
             { id: 'SUDONGPO', label: '苏东坡风格' }
          ];

          return (
             <div className={containerClass}>
                 <div className={`${cardBaseClass} min-h-[600px]`}>
                     
                     {/* Sticky Header with Style Options */}
                     <div className="mb-10 text-center sticky top-0 bg-white/60 backdrop-blur-md py-6 z-10 -mx-10 px-10 border-b border-white/20">
                         <h2 className={`text-2xl font-bold mb-6 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>
                             深度书评生成
                         </h2>
                         <div className="flex flex-wrap justify-center gap-3">
                             {reviewStyles.map((style) => (
                                 <button
                                    key={style.id}
                                    onClick={() => {
                                        setActiveReviewStyle(style.id);
                                        onGenerateReview(style.id, 'CN');
                                    }}
                                    disabled={isGeneratingReview}
                                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all transform hover:scale-105 active:scale-95
                                        ${activeReviewStyle === style.id
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-200' 
                                            : theme.id === 'DARK_MODE' 
                                                ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white' 
                                                : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50'
                                        }
                                        ${isGeneratingReview ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                 >
                                     {style.label}
                                 </button>
                             ))}
                         </div>
                     </div>
                     
                     {/* Loading State */}
                     {isGeneratingReview && (
                         <div className="flex flex-col items-center justify-center py-24 animate-fadeIn">
                             <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                             <p className="text-emerald-600 font-bold text-lg animate-pulse">AI 正在深度思考并撰写评论...</p>
                         </div>
                     )}

                     {/* Empty State */}
                     {!isGeneratingReview && !data.bookReview && (
                         <div className="text-center py-20 opacity-40">
                             <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                 <PenTool className="w-10 h-10 text-slate-400" />
                             </div>
                             <p className="text-lg font-medium text-slate-400">请选择上方任意一种风格开始生成</p>
                         </div>
                     )}

                     {/* Content State */}
                     {!isGeneratingReview && data.bookReview && (
                         <div className="animate-fadeIn max-w-3xl mx-auto">
                             <div className="mb-12 text-center">
                                 <h1 className={`text-3xl md:text-5xl font-black mb-10 font-serif leading-tight ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-900'}`}>
                                     {data.bookReview.titles[0]}
                                 </h1>
                                 
                                 <div className="relative inline-block px-10 py-8 rounded-3xl bg-slate-50 border border-slate-100">
                                     <Quote className="w-10 h-10 text-emerald-200 absolute -top-4 -left-4 transform -scale-x-100" />
                                     <p className="text-xl italic font-serif text-slate-700 relative z-10 leading-relaxed">
                                         {data.bookReview.oneSentenceSummary}
                                     </p>
                                     <Quote className="w-10 h-10 text-emerald-200 absolute -bottom-4 -right-4" />
                                 </div>
                             </div>

                             <article className={`prose prose-lg max-w-none mb-12 text-justify
                                 ${theme.id === 'DARK_MODE' ? 'prose-invert' : 'prose-slate'}
                                 prose-headings:font-bold prose-headings:tracking-tight
                                 prose-p:leading-loose prose-p:text-slate-600
                                 prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-50/50 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic
                             `}>
                                 <ReactMarkdown>{data.bookReview.contentMarkdown}</ReactMarkdown>
                             </article>

                             <div className={`p-8 rounded-3xl border ${theme.id === 'DARK_MODE' ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-100'}`}>
                                 <h4 className={`font-bold text-lg mb-6 flex items-center gap-2 ${theme.id === 'DARK_MODE' ? 'text-emerald-400' : 'text-emerald-800'}`}>
                                     <CheckCircle2 className="w-6 h-6"/> 读后自检清单
                                 </h4>
                                 <ul className="grid gap-4 sm:grid-cols-2">
                                     {data.bookReview.selfCheckList.map((item, i) => (
                                         <li key={i} className="flex items-start gap-3 bg-white/50 p-3 rounded-xl border border-white/50">
                                             <div className="mt-1.5 w-5 h-5 rounded-full border-2 border-emerald-400/30 flex items-center justify-center shrink-0 bg-white">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                             </div>
                                             <span className={`text-base font-medium ${theme.id === 'DARK_MODE' ? 'text-slate-300' : 'text-slate-700'}`}>{item}</span>
                                         </li>
                                     ))}
                                 </ul>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
          );

      case TabView.PRACTICE:
          return (
              <div className={containerClass + " space-y-6"}>
                  <div className="flex justify-between items-center mb-6">
                      <h2 className={headingClass.replace('mb-8', 'mb-0')}>深度测验</h2>
                      <button onClick={() => onRefreshQuiz(data.quiz || [])} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors hover:shadow-lg ${theme.id==='DARK_MODE'?'border-slate-600 text-emerald-400 hover:bg-slate-700':'bg-white border-slate-100 text-emerald-600 hover:bg-emerald-50'}`}>
                          <RefreshCw className={`w-4 h-4 ${isRefreshingQuiz?'animate-spin':''}`} /> 换一组
                      </button>
                  </div>
                  {!data.quiz ? (
                       <div className="flex flex-col items-center justify-center p-20 opacity-60">
                          <Loader2 className="w-8 h-8 animate-spin mb-2" />
                          <p>正在生成测验...</p>
                      </div>
                  ) : (
                      <div className="grid gap-6">
                          {data.quiz.map((q, qIdx) => {
                              const isAnswered = selectedAnswers[qIdx] !== undefined;
                              const isCorrect = selectedAnswers[qIdx] === q.correctAnswerIndex;
                              
                              return (
                                  <div key={qIdx} className={cardBaseClass}>
                                      <div className="flex items-start gap-5 mb-8">
                                          <span className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-slate-900/20">{qIdx + 1}</span>
                                          <div>
                                              <h3 className={`text-xl font-bold mb-2 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>{q.questionCn}</h3>
                                              <p className="text-sm text-slate-500 font-medium">{q.questionEn}</p>
                                          </div>
                                      </div>
                                      
                                      <div className="space-y-4">
                                          {q.optionsCn.map((opt, oIdx) => {
                                              let btnClass = `w-full text-left p-5 rounded-2xl border transition-all duration-200 flex justify-between items-center group `;
                                              
                                              if (isAnswered) {
                                                  if (oIdx === q.correctAnswerIndex) {
                                                      btnClass += "bg-emerald-100 border-emerald-500 text-emerald-900 shadow-md";
                                                  } else if (selectedAnswers[qIdx] === oIdx) {
                                                      btnClass += "bg-red-50 border-red-200 text-red-900 opacity-60";
                                                  } else {
                                                      btnClass += "bg-slate-50 border-transparent opacity-40";
                                                  }
                                              } else {
                                                  btnClass += `${theme.id === 'DARK_MODE' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-transparent hover:bg-white hover:shadow-lg hover:border-emerald-200 hover:text-emerald-900'}`;
                                              }

                                              return (
                                                  <button 
                                                    key={oIdx}
                                                    disabled={isAnswered}
                                                    onClick={() => setSelectedAnswers(prev => ({...prev, [qIdx]: oIdx}))}
                                                    className={btnClass}
                                                  >
                                                      <span className="font-medium">{opt}</span>
                                                      {isAnswered && oIdx === q.correctAnswerIndex && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
                                                      {isAnswered && selectedAnswers[qIdx] === oIdx && oIdx !== q.correctAnswerIndex && <XCircle className="w-6 h-6 text-red-500" />}
                                                  </button>
                                              );
                                          })}
                                      </div>

                                      {isAnswered && (
                                          <div className={`mt-8 p-6 rounded-2xl flex items-start gap-4 animate-fadeIn ${isCorrect ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
                                              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                                              <div>
                                                  <p className="font-bold mb-2 text-lg">解析</p>
                                                  <p className="leading-relaxed">{q.explanationCn}</p>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
          );

      case TabView.PLAN:
          return (
              <div className={containerClass}>
                   <h2 className={headingClass}>7天行动计划</h2>
                   {!data.actionPlan ? (
                       <div className="flex flex-col items-center justify-center p-20 opacity-60">
                          <Loader2 className="w-8 h-8 animate-spin mb-2" />
                          <p>正在规划行动方案...</p>
                      </div>
                   ) : (
                       <div className={`${cardBaseClass} p-8 md:p-12 relative`}>
                            {/* Vertical Line */}
                            <div className="absolute left-10 md:left-14 top-12 bottom-12 w-0.5 bg-slate-200"></div>

                            <div className="space-y-12 relative">
                                {data.actionPlan.map((day, i) => (
                                    <div key={i} className="flex gap-8 relative group">
                                        <div className="w-12 h-12 rounded-2xl bg-white border-4 border-emerald-500 text-emerald-700 flex items-center justify-center font-black shadow-lg z-10 shrink-0 group-hover:scale-110 transition-transform duration-300">
                                            {day.day}
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <h3 className={`text-2xl font-bold mb-4 ${theme.id === 'DARK_MODE' ? 'text-white' : 'text-slate-800'}`}>
                                                {day.focus}
                                            </h3>
                                            <div className={`p-8 rounded-3xl ${theme.id === 'DARK_MODE' ? 'bg-white/5' : 'bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow'}`}>
                                                <ul className="space-y-4">
                                                    {day.tasks.map((task, ti) => (
                                                        <li key={ti} className="flex items-start gap-4">
                                                            <div className="mt-2 w-2 h-2 rounded-full bg-emerald-400 shrink-0 ring-4 ring-emerald-100"></div>
                                                            <span className={`text-lg leading-relaxed ${theme.id === 'DARK_MODE' ? 'text-slate-300' : 'text-slate-600'}`}>{task}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                       </div>
                   )}
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
    <div className="flex flex-col md:flex-row min-h-screen bg-transparent transition-colors duration-500 relative">
       
       {/* Mobile Header Trigger */}
       <div className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-800">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                BookMaster
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg bg-slate-100">
                <Menu className="w-5 h-5 text-slate-600" />
            </button>
       </div>

       {/* SIDEBAR NAVIGATION - Glassmorphic */}
       <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${theme.sidebarClass} flex flex-col shadow-2xl md:shadow-none h-screen`}>
           
           {/* Mobile Close Button */}
           <div className="md:hidden absolute top-4 right-4">
               <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-red-500">
                   <X className="w-6 h-6" />
               </button>
           </div>

           {/* Sidebar Header */}
           <div className="p-8 pb-6">
               <div className="flex items-center gap-3 mb-10 cursor-pointer group" onClick={onBack}>
                   <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'bg-white/10 text-white' : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'}`}>
                       <BookOpen className="w-6 h-6" />
                   </div>
                   <div>
                       <h1 className={`font-black text-xl tracking-tighter ${theme.id==='ROYAL_PURPLE' || theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'text-white' : 'text-slate-800'}`}>BookMaster</h1>
                   </div>
               </div>
               
               {/* Nav Items - Pill Style */}
               <nav className="space-y-2">
                   {tabs.map(tab => (
                       <button
                         key={tab.id}
                         onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
                         className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 ${
                             activeTab === tab.id 
                             ? `${theme.activeTabClass}` 
                             : `hover:bg-black/5 opacity-70 hover:opacity-100 ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'hover:bg-white/10 text-slate-400' : 'text-slate-600'}`
                         }`}
                       >
                           <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? '' : 'opacity-70'}`} />
                           {tab.label}
                           {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-current"></div>}
                       </button>
                   ))}
               </nav>
           </div>

           {/* Sidebar Footer (Optimized Function Keys) */}
           <div className={`mt-auto p-6 ${theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' ? 'bg-black/20' : 'bg-white/40 backdrop-blur-sm border-t border-slate-200/50'}`}>
               <div className="space-y-4">
                    
                    {/* Mode & Export Row */}
                   <div className="grid grid-cols-2 gap-3">
                       <button 
                         onClick={() => onSetComplexity(complexity === 'NORMAL' ? 'KIDS' : 'NORMAL')}
                         className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-[10px] font-bold transition-all hover:-translate-y-1 ${
                            complexity === 'KIDS' 
                            ? 'bg-yellow-100 border-yellow-200 text-yellow-800 shadow-sm' 
                            : `${theme.id === 'DARK_MODE' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-100 text-slate-600 hover:shadow-md'}`
                         }`}
                       >
                           <span className="text-xl mb-1">{complexity === 'KIDS' ? '🧸' : '🎓'}</span>
                           {complexity === 'KIDS' ? '儿童模式' : '专业模式'}
                       </button>

                       <button 
                         onClick={() => setExportModalOpen(true)}
                         className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-[10px] font-bold transition-all hover:-translate-y-1 ${
                            theme.id === 'DARK_MODE' 
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' 
                            : 'bg-white border-slate-100 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 hover:shadow-md'
                         }`}
                       >
                           <Sparkles className="w-5 h-5 mb-1 text-emerald-500" />
                           导出报告
                       </button>
                   </div>

                   {/* Theme Dropdown */}
                   <div className="relative">
                       <button 
                         onClick={() => setShowThemeMenu(!showThemeMenu)}
                         className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all hover:shadow-md ${
                            theme.id === 'DARK_MODE' || theme.id === 'CYBERPUNK' 
                            ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' 
                            : 'bg-white border-slate-100 text-slate-700 hover:bg-white'
                         }`}
                       >
                           <div className="flex items-center gap-2">
                               <LayoutGrid className="w-4 h-4 text-slate-400" />
                               <span className="text-xs font-bold">主题风格</span>
                           </div>
                           <span className="text-[10px] opacity-60 bg-slate-100 px-2 py-0.5 rounded-md font-medium">{theme.name}</span>
                       </button>

                       {/* Popover Menu */}
                       {showThemeMenu && (
                           <div className="absolute bottom-full left-0 w-full mb-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-2 grid grid-cols-1 gap-1 max-h-64 overflow-y-auto z-50 animate-fadeIn no-scrollbar">
                               {themes.map(t => (
                                   <button 
                                     key={t.id}
                                     onClick={() => { onSelectTheme(t.id); setShowThemeMenu(false); }}
                                     className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${t.id === theme.id ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm' : 'border-transparent hover:bg-slate-50 text-slate-600'}`}
                                   >
                                       <div className={`w-3 h-3 rounded-full ${t.bgClass} border border-slate-200 shadow-sm`}></div>
                                       {t.name}
                                   </button>
                               ))}
                           </div>
                       )}
                   </div>

                   <button 
                      onClick={onBack}
                      className="w-full flex items-center justify-center gap-2 py-3 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors border-t border-dashed border-slate-200 mt-2"
                   >
                       <LogOut className="w-3 h-3" />
                       退出阅读
                   </button>
               </div>
           </div>
       </aside>

       {/* Overlay for mobile sidebar */}
       {isSidebarOpen && (
           <div 
             className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
             onClick={() => setIsSidebarOpen(false)}
           />
       )}

       {/* RIGHT CONTENT AREA */}
       <main className="flex-1 overflow-y-auto h-screen p-6 md:p-12 relative scroll-smooth">
           {/* Top decorative gradient line */}
           <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 opacity-50"></div>
           {renderContent()}
       </main>

       {/* Modals */}
       <SocialShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} data={shareData} />
       <ExportReportModal isOpen={exportModalOpen} onClose={() => setExportModalOpen(false)} data={data} />
    </div>
  );
};

export default Dashboard;
