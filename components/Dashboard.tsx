
import React, { useState } from 'react';
import { 
  BookOpen, Quote, Languages, CheckSquare, Calendar, RefreshCw, Volume2, ArrowRight, Headphones, PlayCircle, Share2, Download, Printer, Loader2, Sparkles, ChevronDown, PenTool, CheckCircle, AlignLeft, Copy, Facebook, Twitter, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult, TabView, ReviewStyle } from '../types';
import ReaderView from './ReaderView';
import SocialShareModal, { ShareData } from './SocialShareModal';
import ExportReportModal from './ExportReportModal';
import { generateSpeech, decodePCM } from '../services/geminiService';

declare global {
    interface Window {
      html2canvas: any;
    }
}

interface DashboardProps {
  data: AnalysisResult;
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
}

const Dashboard: React.FC<DashboardProps> = ({ 
    data, 
    onRefreshQuotes, isRefreshingQuotes,
    onRefreshVocab, isRefreshingVocab,
    onRefreshQuiz, isRefreshingQuiz,
    onGenerateReader, onLoadMoreReader, isGeneratingReader,
    onGenerateReview, isGeneratingReview
}) => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.SUMMARY);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showScore, setShowScore] = useState(false);
  const [quizLang, setQuizLang] = useState<'CN' | 'EN'>('CN');
  
  // Separate state for Review Language to avoid conflict
  const [reviewLang, setReviewLang] = useState<'CN' | 'EN'>('CN');
  const [reviewStyle, setReviewStyle] = useState<ReviewStyle>('NIETZSCHE');
  
  // Review Copy State
  const [reviewCopied, setReviewCopied] = useState(false);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);

  // Export Report Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Audio State
  const [playingAudio, setPlayingAudio] = useState<string | null>(null); 
  const audioContextRef = React.useRef<AudioContext | null>(null);
  
  // Local Audio Buffer Cache (Simple In-Memory)
  const audioBufferCache = React.useRef<Map<string, AudioBuffer>>(new Map());

  const playHighQualitySpeech = async (text: string, id: string) => {
    if (playingAudio) {
       if (audioContextRef.current) {
         audioContextRef.current.close();
         audioContextRef.current = null;
       }
       setPlayingAudio(null);
       if (playingAudio === id) return;
    }

    setPlayingAudio(id);

    try {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        
        // Check local cache first
        let audioBuffer = audioBufferCache.current.get(text);

        if (!audioBuffer) {
             const arrayBuffer = await generateSpeech(text);
             if (!arrayBuffer) throw new Error("No audio generated");
             // Decode and cache
             audioBuffer = decodePCM(ctx, arrayBuffer);
             audioBufferCache.current.set(text, audioBuffer);
        }
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start(0);
        
        source.onended = () => {
            setPlayingAudio(null);
        };
    } catch (e) {
        console.error("Audio Playback Error", e);
        setPlayingAudio(null);
        alert("语音播放失败，请稍后重试。");
    }
  };

  const openShareModal = (data: ShareData) => {
      setShareData(data);
      setShareModalOpen(true);
  };

  const copyToClipboard = (text: string) => {
     navigator.clipboard.writeText(text).then(() => {
         // Standard alert removed for specific button feedback logic, but kept for generic calls
     });
  };

  const handleCopyReview = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
          setReviewCopied(true);
          setTimeout(() => setReviewCopied(false), 2000);
      });
  };

  const handleReviewLangChange = (lang: 'CN' | 'EN') => {
      if (reviewLang === lang) return;
      setReviewLang(lang);
      
      // Automatic regeneration if review exists but language doesn't match
      if (data.bookReview) {
          // Trigger regen
          onGenerateReview(reviewStyle, lang);
      }
  };

  const renderContent = () => {
    switch (activeTab) {
      case TabView.SUMMARY:
        const showChapters = data.summary?.chapters && data.summary.chapters.length > 1;

        return (
          <div className="space-y-10 animate-slideUp">
            {/* Hero Summary Card */}
            <div className={`bg-gradient-to-br from-white via-white to-emerald-50/50 backdrop-blur-xl p-8 md:p-14 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/60 relative overflow-hidden group ${!showChapters ? 'min-h-[600px] flex flex-col justify-center' : ''}`}>
               {/* Decorative background element */}
               <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl opacity-60 group-hover:scale-110 transition-transform duration-1000 pointer-events-none"></div>

              <div className="relative z-10">
                <div className={`flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12 ${!showChapters ? 'text-center md:items-center md:flex-col' : ''}`}>
                    <div>
                        <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight drop-shadow-sm font-serif-sc">{data.summary?.title}</h2>
                        <p className="text-emerald-700 font-medium text-xl flex items-center gap-2 justify-center md:justify-start">
                           {data.summary?.author && (
                               <>
                                <span className={`w-8 h-px bg-emerald-300 ${!showChapters ? 'hidden' : ''}`}></span>
                                <span>{data.summary?.author}</span>
                               </>
                           )}
                        </p>
                    </div>
                    <div className="shrink-0">
                        <button 
                            onClick={() => setExportModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/10 hover:bg-emerald-600 hover:shadow-emerald-500/20 hover:-translate-y-0.5 transition-all group"
                        >
                            <Printer className="w-5 h-5 group-hover:animate-pulse" />
                            <span className="font-bold">导出总报告</span>
                        </button>
                    </div>
                </div>
                
                {/* Overall Summary */}
                <div className={`relative ${!showChapters ? 'max-w-4xl mx-auto' : ''}`}>
                    {!showChapters && <div className="text-center text-emerald-500 font-bold tracking-widest uppercase mb-6 text-sm">BOOK SUMMARY</div>}
                    <div className={`absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-300 to-transparent rounded-full opacity-50 ${!showChapters ? 'hidden' : ''}`}></div>
                    <div className={`prose max-w-none text-slate-700 leading-loose bg-white/60 backdrop-blur-sm p-8 md:p-12 rounded-[2rem] border border-emerald-50 shadow-sm hover:shadow-md transition-shadow ${!showChapters ? 'text-xl leading-[2.5] text-justify font-serif-sc border-none shadow-none bg-transparent' : ''}`}>
                         {showChapters && (
                            <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                            <BookOpen className="w-6 h-6 text-emerald-600" />
                            全书核心思想
                            </h3>
                         )}
                         <p className={`${!showChapters ? 'first-letter:text-7xl first-letter:font-bold first-letter:text-emerald-600 first-letter:float-left first-letter:mr-3' : 'opacity-90 font-serif-sc text-xl leading-[2.2] text-justify'}`}>
                            {data.summary?.overallSummary}
                         </p>
                    </div>
                </div>
              </div>
            </div>
            
            {/* Chapters Grid - Only show if > 1 chapter */}
            {showChapters && (
                <div className="grid gap-6 md:grid-cols-2">
                {data.summary?.chapters.map((chapter, idx) => (
                    <div key={idx} className="bg-white/80 backdrop-blur p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-100/50 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
                    
                    {/* Background Number Watermark */}
                    <div className="absolute -right-2 -top-4 text-[8rem] font-black text-slate-50 group-hover:text-emerald-50/80 transition-colors select-none pointer-events-none z-0">
                        {idx + 1}
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-emerald-500 font-mono text-sm font-bold tracking-wider uppercase bg-emerald-50 px-3 py-1 rounded-full">Chapter {idx + 1}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-2xl group-hover:text-emerald-700 transition-colors leading-tight mb-4">{chapter.chapterTitle}</h4>
                        <p className="text-slate-600 text-lg leading-8 text-justify font-medium opacity-90">{chapter.summary}</p>
                    </div>
                    </div>
                ))}
                </div>
            )}
          </div>
        );
      
      case TabView.READER:
        return (
          <div className="animate-slideUp">
            <ReaderView 
                segments={data.readerContent} 
                chapters={data.summary?.chapters}
                isLoading={isGeneratingReader} 
                onGenerate={onGenerateReader}
            />
          </div>
        );

      case TabView.QUOTES:
        return (
          <div className="space-y-6 animate-slideUp">
             <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm">
                <h3 className="text-2xl font-bold text-slate-800 ml-2">精选金句</h3>
                <button 
                  onClick={() => onRefreshQuotes(data.quotes || [])}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm text-emerald-600 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                  disabled={isRefreshingQuotes}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingQuotes ? 'animate-spin' : ''}`} />
                  换一组 (不重复)
                </button>
             </div>
             
             <div className="grid gap-8 max-w-5xl mx-auto">
                {data.quotes?.map((quote, idx) => (
                <div key={idx} className="relative bg-white p-8 md:p-10 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-emerald-900/5 border border-slate-100 hover:border-emerald-100 transition-all duration-500 group overflow-hidden">
                    {/* Decorative big quote */}
                    <Quote className="absolute top-8 right-8 w-24 h-24 text-slate-50 group-hover:text-emerald-50/50 transition-colors rotate-12 pointer-events-none" />

                    <div className="relative z-10">
                         {/* Text Section */}
                         <div className="mb-8 text-center md:text-left pr-16">
                            <Sparkles className="w-6 h-6 text-emerald-400 mb-4 inline-block md:hidden" />
                            <p className="text-2xl md:text-3xl font-serif italic text-slate-800 leading-normal tracking-wide">
                                "{quote.text}"
                            </p>
                         </div>
                         
                         <div className="flex flex-col md:flex-row gap-6 items-start border-t border-slate-100 pt-6">
                             {/* Translation */}
                             <div className="flex-1">
                                <p className="text-lg text-slate-600 font-medium leading-relaxed">{quote.translation}</p>
                             </div>
                             
                             {/* Reason / Insight */}
                             <div className="flex-1 bg-emerald-50/50 rounded-xl p-5 border border-emerald-100/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">深度解析</span>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">{quote.reason}</p>
                             </div>
                         </div>
                    </div>
                    
                    {/* Action Buttons Floating */}
                    <div className="absolute top-8 right-8 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-4 group-hover:translate-x-0 z-20">
                        <button 
                            onClick={() => openShareModal({
                                type: 'QUOTE',
                                title: data.summary?.title || 'BookMaster Note',
                                author: data.summary?.author,
                                text: quote.text,
                                subText: quote.translation,
                                footer: quote.reason
                            })}
                            className="p-3 bg-white border border-slate-200 rounded-full hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-md"
                            title="生成分享卡片"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => playHighQualitySpeech(quote.text, `quote-${idx}`)}
                            className={`p-3 rounded-full border transition-all shadow-md ${playingAudio === `quote-${idx}` ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-white border-slate-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'}`}
                            title="真人朗读"
                        >
                            {playingAudio === `quote-${idx}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                ))}
             </div>
          </div>
        );

      case TabView.VOCAB:
        return (
          <div className="space-y-6 animate-slideUp">
             <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm">
                <h3 className="text-2xl font-bold text-slate-800 ml-2">核心词汇 (10个)</h3>
                <button 
                  onClick={() => onRefreshVocab(data.vocab || [])}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm text-emerald-600 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                  disabled={isRefreshingVocab}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingVocab ? 'animate-spin' : ''}`} />
                  换一批
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideUp">
                {data.vocab?.slice(0, 10).map((item, idx) => (
                  <div key={idx} className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-default">
                     <div className="relative z-10">
                         <div className="flex justify-between items-start mb-4">
                             <div 
                                onClick={() => playHighQualitySpeech(item.word, `vocab-${idx}`)}
                                className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center cursor-pointer hover:bg-emerald-500 hover:text-white transition-all border border-slate-100"
                             >
                                {playingAudio === `vocab-${idx}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                             </div>
                             <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">{item.pos}</span>
                         </div>
                         
                         <h4 className="text-2xl font-extrabold text-slate-800 mb-1 group-hover:text-emerald-700 transition-colors">{item.word}</h4>
                         <p className="font-mono text-sm text-slate-400 mb-4 tracking-wide">/{item.ipa}/</p>
                         
                         <div className="pt-4 border-t border-slate-50">
                             <p className="text-slate-600 font-medium leading-relaxed">{item.meaning}</p>
                         </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        );

      case TabView.PRACTICE:
        const correctCount = Object.keys(quizAnswers).filter((k) => quizAnswers[parseInt(k)] === data.quiz?.[parseInt(k)].correctAnswerIndex).length;
        const total = data.quiz?.length || 0;
        
        return (
          <div className="space-y-8 max-w-4xl mx-auto animate-slideUp">
             <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-2xl font-bold text-slate-800 ml-2">深度测验</h3>
                  <div className="relative group">
                    <select
                      value={quizLang}
                      onChange={(e) => setQuizLang(e.target.value as 'CN' | 'EN')}
                      className="appearance-none bg-emerald-50 text-emerald-700 font-bold text-sm py-2 pl-4 pr-10 rounded-lg border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer shadow-sm hover:bg-emerald-100 transition-colors"
                    >
                      <option value="CN">中文版</option>
                      <option value="EN">English</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                      setShowScore(false);
                      setQuizAnswers({});
                      onRefreshQuiz(data.quiz || []);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm text-emerald-600 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                  disabled={isRefreshingQuiz}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingQuiz ? 'animate-spin' : ''}`} />
                  生成新题
                </button>
             </div>

            {showScore && (
              <div className={`p-8 rounded-[1.5rem] text-center text-white shadow-xl shadow-emerald-500/20 transform transition-all scale-100 ${correctCount > total/2 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-orange-400 to-red-500'}`}>
                <h3 className="text-5xl font-extrabold mb-2">{Math.round((correctCount/total)*100)}<span className="text-2xl">分</span></h3>
                <p className="opacity-90 text-lg font-medium">{correctCount > total/2 ? "太棒了！你已经掌握了核心概念。" : "建议复习总结后再试一次。"}</p>
              </div>
            )}
            
            <div className="space-y-6">
              {data.quiz?.map((q, idx) => {
                  const questionText = quizLang === 'CN' ? q.questionCn : q.questionEn;
                  const options = quizLang === 'CN' ? q.optionsCn : q.optionsEn;
                  const explanation = quizLang === 'CN' ? q.explanationCn : q.explanationEn;

                  return (
                    <div key={idx} className="bg-white/80 backdrop-blur p-8 rounded-[1.5rem] border border-white shadow-sm hover:shadow-lg transition-all">
                      <div className="flex gap-5">
                          <span className="text-3xl font-extrabold text-slate-200 select-none">0{idx + 1}</span>
                          <div className="flex-1">
                              <p className="font-bold text-xl text-slate-800 mb-6 whitespace-pre-wrap leading-relaxed">{questionText}</p>
                              <div className="grid gap-3">
                              {options.map((opt, optIdx) => (
                                  <button
                                  key={optIdx}
                                  onClick={() => !showScore && setQuizAnswers(prev => ({...prev, [idx]: optIdx}))}
                                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center group whitespace-pre-wrap ${
                                      quizAnswers[idx] === optIdx 
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm' 
                                      : 'border-slate-100 bg-white hover:border-emerald-200 hover:bg-slate-50'
                                  } ${showScore && optIdx === q.correctAnswerIndex ? '!bg-emerald-100 !border-emerald-500 !text-emerald-900' : ''}
                                  ${showScore && quizAnswers[idx] === optIdx && quizAnswers[idx] !== q.correctAnswerIndex ? '!bg-red-50 !border-red-400 !text-red-800' : ''}
                                  `}
                                  >
                                  <span className="font-medium text-base">{opt}</span>
                                  {quizAnswers[idx] === optIdx && !showScore && <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>}
                                  </button>
                              ))}
                              </div>
                              {showScore && (
                              <div className="mt-6 text-sm text-slate-700 bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
                                  <span className="font-bold text-emerald-700 block mb-1">解析:</span> 
                                  <span className="whitespace-pre-wrap">{explanation}</span>
                              </div>
                              )}
                          </div>
                      </div>
                    </div>
                  );
              })}
            </div>

            {!showScore && (
              <button 
                onClick={() => setShowScore(true)}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                disabled={Object.keys(quizAnswers).length !== total}
              >
                提交答案
              </button>
            )}
          </div>
        );

      case TabView.REVIEW:
        const currentReview = data.bookReview;
        return (
          <div className="animate-slideUp max-w-5xl mx-auto space-y-6">
             {/* Review Control Panel */}
             <div className="bg-white/70 backdrop-blur p-6 rounded-[1.5rem] border border-white shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
               <div>
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-emerald-600" /> 深度书评
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">定制化风格评论，摆脱 AI 味</p>
               </div>
               
               <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl">
                  {/* Language Toggle for Review - Updates State and Triggers Regen */}
                  <div className="flex bg-white rounded-lg p-1 shadow-sm">
                      <button 
                        onClick={() => handleReviewLangChange('CN')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${reviewLang === 'CN' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        disabled={isGeneratingReview}
                      >
                          中
                      </button>
                      <button 
                        onClick={() => handleReviewLangChange('EN')} 
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${reviewLang === 'EN' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        disabled={isGeneratingReview}
                      >
                          En
                      </button>
                  </div>
                  
                  <div className="relative group">
                    <select
                      value={reviewStyle}
                      onChange={(e) => setReviewStyle(e.target.value as ReviewStyle)}
                      className="appearance-none bg-white text-slate-700 font-bold text-sm py-2.5 pl-4 pr-10 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm min-w-[160px]"
                    >
                      <option value="GENTLE">温和评价型</option>
                      <option value="CRITICAL">批评/商榷型</option>
                      <option value="ACADEMIC">学术/研究型</option>
                      <option value="ESSAY">随笔/印象式</option>
                      <option value="NIETZSCHE">尼采式(风格化)</option>
                      <option value="COMPARATIVE">比较阅读型</option>
                      <option value="DIALOGUE">对话/商榷型</option>
                      <option value="SUDONGPO">苏东坡（古文）式</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => onGenerateReview(reviewStyle, reviewLang)} 
                    disabled={isGeneratingReview}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-lg font-bold shadow-lg shadow-slate-900/10 hover:bg-emerald-600 hover:shadow-emerald-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isGeneratingReview ? (
                        <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         撰写中...
                        </>
                    ) : (
                        <>
                         <Sparkles className="w-4 h-4" />
                         生成书评
                        </>
                    )}
                  </button>
               </div>
             </div>

             {/* Review Content Display */}
             {currentReview ? (
                 <div className={`bg-white p-8 md:p-12 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 transition-opacity duration-300 ${isGeneratingReview ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                     
                     {/* Header Metadata */}
                     <div className="mb-10 text-center border-b border-slate-100 pb-8">
                         <div className="flex flex-wrap justify-center gap-3 mb-6">
                            {currentReview.titles.map((t, i) => (
                                <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-sm font-medium text-slate-600">
                                   {t}
                                </span>
                            ))}
                         </div>
                         <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-6 leading-tight max-w-4xl mx-auto">
                           {currentReview.titles[0]}
                         </h2>
                         <div className="relative inline-block group/summary">
                            <div className="bg-emerald-50 text-emerald-800 px-6 py-3 rounded-xl text-lg font-medium border border-emerald-100/50 relative pr-12">
                                <Quote className="w-8 h-8 text-emerald-200 absolute -top-4 -left-4" />
                                {currentReview.oneSentenceSummary}
                                
                                <button 
                                    onClick={() => openShareModal({
                                        type: 'QUOTE', // Use QUOTE type for consistent card look
                                        title: currentReview.titles[0],
                                        author: data.summary?.author,
                                        text: currentReview.oneSentenceSummary,
                                        subText: "深度书评核心观点",
                                        footer: "BookMaster AI Analysis"
                                    })}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full shadow-sm text-emerald-600 opacity-0 group-hover/summary:opacity-100 transition-opacity hover:bg-emerald-500 hover:text-white"
                                    title="分享观点"
                                >
                                    <Share2 className="w-4 h-4" />
                                </button>
                            </div>
                         </div>
                     </div>

                     {/* Main Markdown Content - Beautified Headers */}
                     <article className="prose prose-slate prose-lg max-w-none 
                        prose-headings:font-bold prose-headings:text-slate-900 prose-headings:font-serif-sc
                        prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-l-[6px] prose-h2:border-emerald-500 prose-h2:pl-6 prose-h2:bg-gradient-to-r prose-h2:from-emerald-50 prose-h2:to-transparent prose-h2:py-3 prose-h2:rounded-r-lg
                        prose-h3:text-xl prose-h3:text-emerald-800 prose-h3:mt-8 prose-h3:mb-4 prose-h3:flex prose-h3:items-center prose-h3:before:content-[''] prose-h3:before:w-2 prose-h3:before:h-2 prose-h3:before:bg-emerald-400 prose-h3:before:rounded-full prose-h3:before:mr-3
                        prose-p:text-slate-600 prose-p:leading-8 
                        prose-blockquote:border-l-4 prose-blockquote:border-emerald-400 prose-blockquote:bg-slate-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-slate-700
                        prose-strong:text-emerald-700 prose-strong:font-bold"
                     >
                        <ReactMarkdown>{currentReview.contentMarkdown}</ReactMarkdown>
                     </article>

                     {/* Self Checklist */}
                     <div className="mt-16 bg-slate-50 rounded-2xl p-6 border border-slate-200">
                         <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            内容自检清单 (AI Self-Check)
                         </h4>
                         <div className="grid md:grid-cols-2 gap-4">
                             {currentReview.selfCheckList.map((item, idx) => (
                                 <div key={idx} className="flex items-start gap-3 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></div>
                                     {item}
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Action Footer */}
                     <div className="mt-10 pt-6 border-t border-slate-100 flex flex-wrap justify-end gap-4">
                        <button
                            onClick={() => handleCopyReview(currentReview.contentMarkdown)}
                            className={`flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all border shadow-sm ${
                                reviewCopied 
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20' 
                                : 'text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {reviewCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {reviewCopied ? "复制成功" : "复制书评"}
                        </button>
                        {/* Share button removed as per request */}
                     </div>
                 </div>
             ) : (
                 // Empty State
                 <div className="flex flex-col items-center justify-center py-20 bg-white/50 border border-dashed border-slate-300 rounded-[2rem]">
                     <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <AlignLeft className="w-8 h-8 text-slate-400" />
                     </div>
                     <p className="text-slate-500 font-medium text-lg">暂无书评内容</p>
                     <p className="text-slate-400 text-sm mt-1">请在上方选择风格并点击生成</p>
                 </div>
             )}
          </div>
        );

      case TabView.PLAN:
        return (
          <div className="max-w-4xl mx-auto animate-slideUp">
              <div className="bg-white/60 backdrop-blur-md p-6 rounded-[2rem] border border-white shadow-sm mb-8 flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-bold text-slate-800">七天行动计划</h3>
                    <p className="text-slate-500">将知识转化为行动的指南</p>
                </div>
                <div className="flex gap-2">
                     <button
                        onClick={() => copyToClipboard(data.actionPlan?.map(d => `Day ${d.day}: ${d.focus}\n${d.tasks.map(t=>'- '+t).join('\n')}`).join('\n\n') || "")}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="复制计划"
                    >
                        <Copy className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => openShareModal({
                            type: 'SUMMARY',
                            title: '7天行动计划',
                            text: data.actionPlan ? `Day 1 Focus: ${data.actionPlan[0].focus}\n\n${data.actionPlan[0].tasks[0]}` : "Action Plan",
                            footer: "BookMaster Action Guide",
                            subText: "Scan to see full 7-day plan"
                        })}
                        className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                        title="分享"
                    >
                        <Share2 className="w-5 h-5" />
                    </button>
                </div>
              </div>
              
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-10 py-4">
                {data.actionPlan?.map((day, idx) => (
                <div key={idx} className="relative pl-10 group">
                    <div className="absolute -left-[11px] top-6 w-6 h-6 rounded-full bg-slate-200 border-4 border-slate-50 group-hover:bg-emerald-500 group-hover:scale-125 transition-all duration-300 shadow-sm z-10"></div>
                    <div className="bg-white/80 backdrop-blur p-6 md:p-8 rounded-[1.5rem] border border-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2 border-b border-slate-100 pb-4">
                            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 text-xs font-bold uppercase tracking-wider transition-colors">Day {day.day}</span>
                            <h3 className="font-bold text-xl text-slate-800">{day.focus}</h3>
                        </div>
                        <ul className="space-y-4">
                            {day.tasks.map((task, tIdx) => (
                            <li key={tIdx} className="flex items-start gap-4 text-slate-600">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                <span className="leading-relaxed font-medium">{task}</span>
                            </li>
                            ))}
                        </ul>
                    </div>
                </div>
                ))}
            </div>
          </div>
        );

      default:
        return <div>Select a tab</div>;
    }
  };

  const tabs = [
    { id: TabView.SUMMARY, label: '全书总结', icon: BookOpen },
    { id: TabView.READER, label: '双语阅读', icon: Headphones }, 
    // Mind Map tab removed
    { id: TabView.REVIEW, label: '深度书评', icon: PenTool }, 
    { id: TabView.QUOTES, label: '精选金句', icon: Quote },
    { id: TabView.VOCAB, label: '核心词汇', icon: Languages },
    { id: TabView.PRACTICE, label: '深度测验', icon: CheckSquare },
    { id: TabView.PLAN, label: '行动计划', icon: Calendar },
  ];

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Floating Tab Navigation */}
      <div className="sticky top-20 z-30 mb-8 flex justify-center">
        <div className="bg-white/80 backdrop-blur-lg p-1.5 rounded-full border border-white/40 shadow-xl shadow-slate-200/50 flex flex-wrap justify-center gap-1 overflow-x-auto max-w-full">
            {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 whitespace-nowrap ${
                    isActive 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} />
                {tab.label}
                </button>
            );
            })}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px] transition-all pb-24">
        {renderContent()}
      </div>
    </div>
    
    <SocialShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        data={shareData} 
    />
    
    <ExportReportModal 
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={data}
    />
    </>
  );
};

export default Dashboard;
