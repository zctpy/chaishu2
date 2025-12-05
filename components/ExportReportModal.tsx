
import React from 'react';
import { X, FileText, FileCode, FileType } from 'lucide-react';
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
     
     // Remove any "hidden in print" elements just in case, though we are using specific IDs
     
     return `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${data.summary?.title || 'Book Analysis Report'}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { background-color: #f8fafc; padding: 40px; font-family: 'Inter', sans-serif; }
                .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); }
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
            h2 { font-size: 16pt; font-weight: bold; color: #059669; border-left: 5px solid #059669; padding-left: 10px; margin-top: 30px; margin-bottom: 15px; }
            h3 { font-size: 14pt; font-weight: bold; margin-top: 20px; }
            p { line-height: 1.6; margin-bottom: 10px; }
            .bg-slate-50 { background-color: #f8fafc; padding: 15px; border: 1px solid #ddd; }
            .border { border: 1px solid #eee; }
            .text-emerald-600 { color: #059669; }
            .text-slate-500 { color: #64748b; }
            .italic { font-style: italic; }
            .font-bold { font-weight: bold; }
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
                <h2 className="font-bold text-lg">全书拆解报告预览</h2>
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
                    <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                        全书概览
                    </h2>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-800 leading-relaxed text-justify shadow-sm">
                        {data.summary?.overallSummary || '暂无总结'}
                    </div>
                </section>

                {/* Mind Map Section Removed */}

                {/* 3. Golden Quotes */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                        精选金句
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

                {/* 4. Vocabulary */}
                {data.vocab && data.vocab.length > 0 && (
                    <section className="mb-12 break-inside-avoid">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                            核心词汇表
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 5. Chapter Details */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                        章节深度解析
                    </h2>
                    <div className="space-y-8">
                        {data.summary?.chapters.map((c, i) => (
                            <div key={i} className="break-inside-avoid">
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

                {/* 6. Quiz Preview (Optional) */}
                {data.quiz && data.quiz.length > 0 && (
                    <section className="mb-12 break-inside-avoid">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                            思考练习
                        </h2>
                        <div className="space-y-4">
                            {data.quiz.slice(0, 3).map((q, i) => (
                                <div key={i} className="bg-slate-50 p-4 rounded-lg text-sm">
                                    <p className="font-bold text-slate-800 mb-2">Q{i+1}: {q.questionCn}</p>
                                    <p className="text-xs text-slate-500">解析: {q.explanationCn}</p>
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
