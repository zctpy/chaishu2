
import React from 'react';
import { X, FileText, FileCode, FileType } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult } from '../types';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AnalysisResult;
}

const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const getExportHTML = () => {
     const content = document.getElementById('printable-content');
     if (!content) return '';
     
     const clone = content.cloneNode(true) as HTMLElement;
     
     return `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${data.summary?.title || 'Book Analysis Report'}</title>
            <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
            <style>
                body { background-color: #f8fafc; padding: 40px; font-family: 'Inter', sans-serif; }
                .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); }
                @media print {
                   body { padding: 0; background: white; }
                   .container { box-shadow: none; max-width: 100%; padding: 0; }
                   .break-inside-avoid { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                ${clone.innerHTML}
            </div>
        </body>
        </html>
     `;
  };

  const handleExportHTML = () => {
    const html = getExportHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.summary?.title || 'report'}_bookmaster.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportWord = () => {
     const content = document.getElementById('printable-content');
     if (!content) return;
     
     // Simple HTML doc wrapper for Word with basic inline styling mapping
     const preHtml = `
     <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
     <head>
        <meta charset='utf-8'>
        <title>Export</title>
        <style>
            body { font-family: 'Microsoft YaHei', sans-serif; font-size: 12pt; }
            h1 { font-size: 24pt; font-weight: bold; text-align: center; margin-bottom: 20px; }
            h2 { font-size: 16pt; font-weight: bold; color: #059669; border-left: 5px solid #059669; padding-left: 10px; margin-top: 30px; margin-bottom: 15px; background-color: #f0fdf4; padding-top: 5px; padding-bottom: 5px; }
            h3 { font-size: 14pt; font-weight: bold; margin-top: 20px; color: #1e293b; }
            p { line-height: 1.6; margin-bottom: 10px; text-align: justify; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; font-weight: bold; }
            ul { margin-bottom: 10px; }
            li { margin-bottom: 5px; }
            .bg-slate-50 { background-color: #f8fafc; padding: 15px; border: 1px solid #ddd; }
            .text-emerald-600 { color: #059669; }
            .italic { font-style: italic; }
            .font-bold { font-weight: bold; }
            .speaker-label { font-weight: bold; color: #475569; margin-bottom: 2px; }
        </style>
     </head>
     <body>`;
     
     const postHtml = "</body></html>";
     const html = preHtml + content.innerHTML + postHtml;

     const blob = new Blob(['\ufeff', html], {
         type: 'application/msword'
     });
     
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${data.summary?.title || 'report'}_bookmaster.doc`;
     a.click();
     URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white/50 backdrop-blur-sm overflow-y-auto animate-fadeIn" aria-modal="true">
      <div className="min-h-screen flex flex-col bg-white">
          
        {/* Toolbar */}
        <div className="sticky top-0 h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md z-50">
            <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-lg">全书拆解总报告</h2>
            </div>
            <div className="flex items-center gap-4">
            <button
                onClick={handleExportHTML}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors font-medium border border-slate-600"
            >
                <FileCode className="w-4 h-4 text-orange-400" />
                导出网页 (HTML)
            </button>
            <button
                onClick={handleExportWord}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-lg shadow-emerald-900/20"
            >
                <FileType className="w-4 h-4 text-white" />
                导出 Word (.doc)
            </button>
            <div className="w-px h-6 bg-slate-700 mx-2"></div>
            <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
            </div>
        </div>

        {/* Printable Content Container */}
        <div className="flex-1 bg-slate-100 p-8 overflow-y-auto">
            <div id="printable-content" className="max-w-4xl mx-auto bg-white p-12 shadow-xl rounded-2xl">
                
                {/* Report Header */}
                <div className="text-center border-b-2 border-emerald-500 pb-8 mb-10">
                    <h1 className="text-4xl font-extrabold text-slate-900 mb-3">{data.summary?.title || '未命名书籍'}</h1>
                    <p className="text-xl text-slate-500 font-medium">{data.summary?.author}</p>
                    <div className="flex items-center justify-center gap-2 mt-6 text-slate-400 text-sm uppercase tracking-widest">
                        <span className="w-8 h-px bg-slate-300"></span>
                        <span>BookMaster AI Intelligent Analysis</span>
                        <span className="w-8 h-px bg-slate-300"></span>
                    </div>
                </div>

                {/* 1. Overall Summary */}
                <section className="mb-12 break-inside-avoid">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                        一、全书概览
                    </h2>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-800 leading-relaxed text-justify shadow-sm">
                        <ReactMarkdown>{data.summary?.overallSummary || '暂无总结'}</ReactMarkdown>
                    </div>
                </section>

                {/* 2. Chapter Details */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                        二、章节深度解析
                    </h2>
                    <div className="space-y-8">
                        {data.summary?.chapters.map((c, i) => (
                            <div key={i} className="break-inside-avoid mb-6">
                                <h3 className="font-bold text-xl text-slate-800 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center">{i+1}</span>
                                    {c.chapterTitle}
                                </h3>
                                <div className="pl-8 text-slate-600 text-sm leading-7 text-justify border-l border-slate-200 ml-3">
                                    {c.summary}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. Golden Quotes */}
                {data.quotes && data.quotes.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                        三、精选金句
                    </h2>
                    <div className="grid gap-4">
                        {data.quotes?.map((q, i) => (
                            <div key={i} className="bg-white p-5 rounded-lg border border-slate-100 shadow-sm break-inside-avoid relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500"></div>
                                <p className="font-serif italic text-lg text-slate-800 mb-3 leading-relaxed">"{q.text}"</p>
                                <p className="text-slate-600 font-medium mb-2">{q.translation}</p>
                                <div className="bg-slate-50 p-2 rounded text-xs text-slate-500 flex gap-2">
                                    <span className="font-bold text-emerald-600 shrink-0">解析</span>
                                    {q.reason}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                )}

                {/* 4. Vocabulary */}
                {data.vocab && data.vocab.length > 0 && (
                    <section className="mb-12 break-inside-avoid">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                            四、核心词汇表
                        </h2>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {data.vocab.map((v, i) => (
                                <div key={i} className="flex justify-between items-start pb-3 border-b border-slate-100 break-inside-avoid">
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-slate-900 text-lg">{v.word}</span>
                                            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1 rounded">{v.ipa}</span>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600">{v.pos}</span>
                                    </div>
                                    <div className="text-right max-w-[60%]">
                                        <p className="text-sm text-slate-700 font-medium">{v.meaning}</p>
                                        <p className="text-xs text-slate-400 italic mt-1">{v.sentence}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 5. Book Review */}
                {data.bookReview && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                            五、深度书评
                        </h2>
                        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                             <h3 className="text-xl font-bold mb-2">{data.bookReview.titles[0]}</h3>
                             <p className="italic text-slate-500 mb-6 border-l-2 border-emerald-300 pl-3">"{data.bookReview.oneSentenceSummary}"</p>
                             <div className="prose prose-slate max-w-none text-justify">
                                 <ReactMarkdown>{data.bookReview.contentMarkdown}</ReactMarkdown>
                             </div>
                        </div>
                    </section>
                )}

                {/* 6. Action Plan */}
                {data.actionPlan && data.actionPlan.length > 0 && (
                    <section className="mb-12 break-inside-avoid">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                            六、七天行动计划
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.actionPlan.map((day, i) => (
                                <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100 break-inside-avoid">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded">Day {day.day}</span>
                                        <span className="font-bold text-slate-800">{day.focus}</span>
                                    </div>
                                    <ul className="list-disc list-inside text-sm text-slate-600 pl-1">
                                        {day.tasks.map((task, t) => (
                                            <li key={t}>{task}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 7. Reader Content (Bilingual) */}
                {data.readerContent && data.readerContent.length > 0 && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                            七、双语阅读精选
                        </h2>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="w-1/2 p-3 text-left font-bold text-slate-700">原文</th>
                                    <th className="w-1/2 p-3 text-left font-bold text-slate-700">译文</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.readerContent.slice(0, 10).map((seg, i) => (
                                    <tr key={i} className="border-b border-slate-100">
                                        <td className="p-3 text-slate-800 leading-relaxed font-serif">{seg.original}</td>
                                        <td className="p-3 text-slate-600 leading-relaxed">{seg.translation}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {data.readerContent.length > 10 && (
                            <p className="text-center text-xs text-slate-400 mt-2 italic">* 仅展示前10段，完整内容请在APP内查看</p>
                        )}
                    </section>
                )}

                {/* 8. Podcast Script */}
                {data.podcast && (
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                            八、播客脚本 ({data.podcast.title})
                        </h2>
                        <div className="space-y-3 font-mono text-sm bg-slate-50 p-6 rounded-xl border border-slate-100">
                            {data.podcast.script.map((line, i) => (
                                <div key={i} className="mb-2 break-inside-avoid">
                                    <span className="font-bold text-slate-700 uppercase mr-2">{line.speaker}:</span>
                                    <span className="text-slate-600">{line.text}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 9. Quiz (Optional) */}
                {data.quiz && data.quiz.length > 0 && (
                    <section className="mb-12 break-inside-avoid">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4 bg-emerald-50 py-2 rounded-r-lg">
                            九、思考练习
                        </h2>
                        <div className="space-y-4">
                            {data.quiz.slice(0, 5).map((q, i) => (
                                <div key={i} className="bg-slate-50 p-4 rounded-lg text-sm border border-slate-100 break-inside-avoid">
                                    <p className="font-bold text-slate-800 mb-2">Q{i+1}: {q.questionCn}</p>
                                    <ul className="list-disc list-inside mb-2 text-slate-600 pl-2">
                                        {q.optionsCn.map((opt, oi) => (
                                            <li key={oi} className={oi === q.correctAnswerIndex ? 'font-bold text-emerald-600' : ''}>
                                                {opt} {oi === q.correctAnswerIndex && '(正确)'}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">解析: {q.explanationCn}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                <div className="mt-20 pt-8 border-t border-slate-100 text-center break-inside-avoid">
                    <p className="text-sm text-slate-400 font-medium">Generated by BookMaster AI</p>
                    <p className="text-xs text-slate-300 mt-1">Visit us to learn more</p>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
