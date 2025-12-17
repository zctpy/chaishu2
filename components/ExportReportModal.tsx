
import React from 'react';
import { X, FileText, FileCode, FileType, Layout, PanelTop, Smartphone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AnalysisResult } from '../types';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AnalysisResult;
}

const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  // --- Shared Content Generator ---
  // This generates the inner HTML for the tabs (Summary, Quotes, Vocab, etc.)
  // so we can reuse it for both Sidebar and Top-Nav layouts.
  const renderTabContent = () => {
    return `
      <!-- Summary Tab -->
      <div id="summary" class="tab-pane active">
          <div class="card">
              <h1 class="text-4xl font-black text-slate-900 mb-2">${data.summary?.title}</h1>
              <p class="text-xl text-emerald-600 serif italic mb-8">${data.summary?.author}</p>
              <div class="prose prose-lg max-w-none text-slate-600 leading-loose text-justify">
                  ${data.summary?.overallSummary.replace(/\n/g, '<br/>')}
              </div>
          </div>
          <div class="space-y-6">
              ${data.summary?.chapters.map((c, i) => `
                <div class="card hover:shadow-lg transition-shadow">
                    <h3 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                        <span class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 text-sm flex items-center justify-center">${i + 1}</span>
                        ${c.chapterTitle}
                    </h3>
                    <p class="text-slate-600 leading-relaxed text-justify">${c.summary}</p>
                </div>
              `).join('')}
          </div>
      </div>

      <!-- Quotes Tab -->
      <div id="quotes" class="tab-pane">
          <h2 class="text-3xl font-bold text-slate-800 mb-6">精选金句 (${data.quotes?.length || 0})</h2>
          <div class="grid gap-6">
              ${data.quotes?.map(q => `
                <div class="card border-l-4 border-l-emerald-500">
                    <p class="text-2xl serif font-bold text-slate-800 mb-4 leading-relaxed">"${q.text}"</p>
                    <p class="text-lg text-slate-600 mb-4">${q.translation}</p>
                    <div class="bg-slate-50 p-3 rounded-lg text-sm text-slate-500">💡 ${q.reason}</div>
                </div>
              `).join('')}
          </div>
      </div>

      <!-- Vocab Tab -->
      <div id="vocab" class="tab-pane">
          <h2 class="text-3xl font-bold text-slate-800 mb-6">核心词汇 (${data.vocab?.length || 0})</h2>
          <div class="card">
              <div class="divide-y divide-slate-100">
                  ${data.vocab?.map(v => `
                    <div class="py-6 first:pt-0 last:pb-0 flex flex-col md:flex-row gap-6">
                        <div class="w-48 shrink-0">
                            <h3 class="text-2xl font-bold text-slate-900">${v.word}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="bg-slate-100 px-2 py-0.5 rounded text-sm font-mono text-slate-500">${v.ipa}</span>
                                <span class="text-emerald-600 font-bold text-sm uppercase">${v.pos}</span>
                            </div>
                        </div>
                        <div>
                            <p class="text-lg text-slate-700 mb-2">${v.meaning}</p>
                            <p class="text-slate-500 italic">Example: ${v.sentence}</p>
                        </div>
                    </div>
                  `).join('')}
              </div>
          </div>
      </div>

      <!-- Review Tab -->
      <div id="review" class="tab-pane">
           <div class="card min-h-[600px]">
              ${data.bookReview ? `
                <h1 class="text-3xl font-black text-center mb-8 serif">${data.bookReview.titles[0]}</h1>
                <blockquote class="text-xl text-center italic text-slate-500 mb-10 border-l-4 border-emerald-500 pl-4 py-2 bg-emerald-50/50 rounded-r-xl">
                    "${data.bookReview.oneSentenceSummary}"
                </blockquote>
                <div class="prose prose-lg max-w-none mx-auto">
                    ${data.bookReview.contentMarkdown.replace(/\n/g, '<br/>')}
                </div>
                <div class="mt-12 bg-slate-50 p-6 rounded-2xl">
                    <h4 class="font-bold text-emerald-800 mb-4">✅ 读后自检</h4>
                    <ul class="space-y-2">
                        ${data.bookReview.selfCheckList.map(item => `<li class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>${item}</li>`).join('')}
                    </ul>
                </div>
              ` : '<p class="text-center text-slate-400">暂无书评数据</p>'}
           </div>
      </div>

      <!-- Plan Tab -->
      <div id="plan" class="tab-pane">
          <h2 class="text-3xl font-bold text-slate-800 mb-6">7天行动计划</h2>
          <div class="space-y-6">
              ${data.actionPlan?.map(day => `
                <div class="card flex gap-6 items-start">
                    <div class="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">D${day.day}</div>
                    <div>
                        <h3 class="text-xl font-bold text-slate-800 mb-4">${day.focus}</h3>
                        <ul class="space-y-3">
                            ${day.tasks.map(t => `<li class="flex items-start gap-3 text-slate-600"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></span>${t}</li>`).join('')}
                        </ul>
                    </div>
                </div>
              `).join('')}
          </div>
      </div>

      <!-- Quiz Tab -->
      <div id="quiz" class="tab-pane">
          <h2 class="text-3xl font-bold text-slate-800 mb-6">深度测验</h2>
          <div class="space-y-6">
              ${data.quiz?.map((q, i) => `
                <div class="card">
                    <div class="flex gap-4 mb-4">
                        <span class="text-slate-300 font-black text-4xl select-none">0${i+1}</span>
                        <h3 class="text-lg font-bold text-slate-800 mt-2">${q.questionCn}</h3>
                    </div>
                    <div class="space-y-2 mb-6 pl-10">
                        ${q.optionsCn.map((opt, oi) => `
                            <div class="p-3 rounded-lg border border-slate-100 ${oi === q.correctAnswerIndex ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'text-slate-600'}">
                                ${opt} ${oi === q.correctAnswerIndex ? '✓' : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="pl-10 text-sm text-slate-500 border-t border-slate-100 pt-4">
                        <span class="font-bold text-slate-700">解析：</span> ${q.explanationCn}
                    </div>
                </div>
              `).join('')}
          </div>
      </div>
      
      <!-- Podcast Tab -->
      <div id="podcast" class="tab-pane">
          <h2 class="text-3xl font-bold text-slate-800 mb-6">播客脚本</h2>
          <div class="card bg-slate-50 border border-slate-200 font-mono text-sm leading-relaxed">
              ${data.podcast?.script.map(line => `
                <div class="mb-4">
                    <strong class="uppercase text-slate-400 text-xs tracking-wider">${line.speaker}</strong>
                    <p class="text-slate-800 mt-1">${line.text}</p>
                </div>
              `).join('') || '<p class="text-slate-400">暂无播客脚本</p>'}
          </div>
      </div>
    `;
  };

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

  // --- 1. Interactive Sidebar Layout (Existing) ---
  const getInteractiveHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${data.summary?.title || 'Interactive Report'}</title>
          <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Serif+SC:wght@500;700&display=swap" rel="stylesheet">
          <style>
              body { font-family: 'Inter', sans-serif; background-color: #f1f5f9; height: 100vh; overflow: hidden; display: flex; }
              .sidebar { width: 260px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; padding: 20px; flex-shrink: 0; }
              .content { flex: 1; overflow-y: auto; padding: 40px; scroll-behavior: smooth; }
              .nav-item { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; color: #64748b; text-decoration: none; margin-bottom: 4px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
              .nav-item:hover { background-color: #f8fafc; color: #0f172a; }
              .nav-item.active { background-color: #ecfdf5; color: #059669; }
              .tab-pane { display: none; animation: fadeIn 0.4s ease; max-width: 900px; margin: 0 auto; }
              .tab-pane.active { display: block; }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
              .card { background: white; border-radius: 20px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 20px; }
              .serif { font-family: 'Noto Serif SC', serif; }
              ::-webkit-scrollbar { width: 8px; }
              ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          </style>
      </head>
      <body>
          <div class="sidebar">
              <div class="mb-8 px-2 flex items-center gap-2">
                  <div class="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">B</div>
                  <span class="font-extrabold text-slate-800 text-lg">BookMaster</span>
              </div>
              <nav>
                  <a onclick="switchTab('summary')" id="nav-summary" class="nav-item active">📖 全书总结</a>
                  <a onclick="switchTab('quotes')" id="nav-quotes" class="nav-item">✨ 精选金句</a>
                  <a onclick="switchTab('vocab')" id="nav-vocab" class="nav-item">🔤 核心词汇</a>
                  <a onclick="switchTab('review')" id="nav-review" class="nav-item">🖋️ 深度书评</a>
                  <a onclick="switchTab('plan')" id="nav-plan" class="nav-item">📅 行动计划</a>
                  <a onclick="switchTab('quiz')" id="nav-quiz" class="nav-item">🧩 深度测验</a>
                  <a onclick="switchTab('podcast')" id="nav-podcast" class="nav-item">🎙️ 播客脚本</a>
              </nav>
              <div class="mt-auto pt-6 text-xs text-slate-400 border-t border-slate-100 text-center">
                  Generated by AI
              </div>
          </div>

          <div class="content">
              ${renderTabContent()}
          </div>

          <script>
              function switchTab(id) {
                  // Hide all panes
                  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
                  // Deactivate all nav items
                  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                  
                  // Show target
                  document.getElementById(id).classList.add('active');
                  document.getElementById('nav-' + id).classList.add('active');
              }
          </script>
      </body>
      </html>
    `;
  };

  // --- 2. App View Layout (Top Nav) - NEW ---
  const getAppViewHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${data.summary?.title || 'App View Report'}</title>
          <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Noto+Serif+SC:wght@500;700&display=swap" rel="stylesheet">
          <style>
              body { font-family: 'Inter', sans-serif; background-color: #f8fafc; min-height: 100vh; padding-top: 80px; }
              
              /* Top Navigation Bar */
              .top-nav {
                  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
                  background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px);
                  border-bottom: 1px solid #e2e8f0;
                  height: 60px;
                  display: flex; align-items: center; justify-content: center;
                  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
              }
              
              /* Scrollable Container for Nav Items */
              .nav-container {
                  display: flex; gap: 8px; overflow-x: auto; max-width: 100%;
                  scrollbar-width: none; /* Firefox */
                  -ms-overflow-style: none;  /* IE 10+ */
                  padding: 0 20px;
                  height: 100%;
                  align-items: center;
              }
              .nav-container::-webkit-scrollbar { display: none; /* Chrome/Safari */ }
              
              .nav-item {
                  white-space: nowrap;
                  padding: 8px 16px;
                  border-radius: 100px;
                  font-size: 14px; font-weight: 600; color: #64748b;
                  cursor: pointer; transition: all 0.2s;
                  border: 1px solid transparent;
                  user-select: none;
              }
              .nav-item:hover { background-color: #f1f5f9; color: #334155; }
              .nav-item.active { 
                  background-color: #10b981; color: white; 
                  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
              }

              .container { max-width: 800px; margin: 0 auto; padding: 20px; padding-bottom: 60px; }
              
              .tab-pane { display: none; animation: fadeIn 0.4s ease; }
              .tab-pane.active { display: block; }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
              
              .card { background: white; border-radius: 24px; padding: 24px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); margin-bottom: 24px; border: 1px solid #f1f5f9; }
              .serif { font-family: 'Noto Serif SC', serif; }
              
              @media (min-width: 768px) {
                  .card { padding: 40px; }
                  .container { padding: 40px; }
              }

              /* Typography overrides */
              h1 { color: #0f172a; }
          </style>
      </head>
      <body>
          <div class="top-nav">
              <div class="nav-container">
                  <div onclick="switchTab('summary')" id="nav-summary" class="nav-item active">全书总结</div>
                  <div onclick="switchTab('quotes')" id="nav-quotes" class="nav-item">精选金句</div>
                  <div onclick="switchTab('vocab')" id="nav-vocab" class="nav-item">核心词汇</div>
                  <div onclick="switchTab('review')" id="nav-review" class="nav-item">深度书评</div>
                  <div onclick="switchTab('plan')" id="nav-plan" class="nav-item">行动计划</div>
                  <div onclick="switchTab('quiz')" id="nav-quiz" class="nav-item">深度测验</div>
                  <div onclick="switchTab('podcast')" id="nav-podcast" class="nav-item">播客脚本</div>
              </div>
          </div>

          <div class="container">
              ${renderTabContent()}
          </div>

          <script>
              function switchTab(id) {
                  document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
                  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                  document.getElementById(id).classList.add('active');
                  document.getElementById('nav-' + id).classList.add('active');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
              }
          </script>
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
    a.download = `${data.summary?.title || 'report'}_simple.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportInteractive = () => {
      const html = getInteractiveHTML();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.summary?.title || 'report'}_interactive_sidebar.html`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleExportAppView = () => {
      const html = getAppViewHTML();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.summary?.title || 'report'}_app_view.html`;
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
            <div className="flex items-center gap-3">
                
                {/* Interactive Report Button (Sidebar) */}
                <button
                    onClick={handleExportInteractive}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors font-bold text-xs md:text-sm shadow-lg shadow-emerald-900/40 border border-emerald-500"
                    title="适合电脑端查看"
                >
                    <Layout className="w-4 h-4" />
                    <span className="hidden md:inline">侧边栏网页 (PC)</span>
                    <span className="md:hidden">网页</span>
                </button>

                {/* App View Button (Top Nav) - NEW */}
                <button
                    onClick={handleExportAppView}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors font-bold text-xs md:text-sm shadow-lg shadow-purple-900/40 border border-purple-500"
                    title="适合手机端查看"
                >
                    <Smartphone className="w-4 h-4" />
                    <span className="hidden md:inline">App视图 (手机)</span>
                    <span className="md:hidden">App</span>
                </button>

                <button
                    onClick={handleExportHTML}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors font-medium text-xs md:text-sm border border-slate-600 hidden md:flex"
                >
                    <FileCode className="w-4 h-4 text-orange-400" />
                    长网页 (Print)
                </button>
                <button
                    onClick={handleExportWord}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors font-medium text-xs md:text-sm shadow-md hidden md:flex"
                >
                    <FileType className="w-4 h-4 text-blue-300" />
                    Word
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

        {/* Printable Content Container (Visible in Modal, used for Print/Word generation) */}
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
                                                {opt} {oi === q.correctAnswerIndex ? '✓' : ''}
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
