import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, FileText, CheckCircle2, ChevronRight, Loader2, Download, Check } from 'lucide-react';

function AutoResizeIframe({ srcDoc, className }: { srcDoc: string, className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'resize' && iframeRef.current && e.source === iframeRef.current.contentWindow) {
        setHeight(e.data.height);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      className={className}
      style={{ height: `${height}px`, overflow: 'hidden' }}
      scrolling="no"
      srcDoc={srcDoc}
    />
  );
}

export default function App() {
  const [url, setUrl] = useState('https://datawhalechina.github.io/hello-agents/#/');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('System Ready');
  const [statusMessage, setStatusMessage] = useState('等待输入内容源...');
  const [chapters, setChapters] = useState<{title: string, content: string, bodyClass?: string}[]>([]);
  const [globalCss, setGlobalCss] = useState('');
  const [aiDenoise, setAiDenoise] = useState(false);
    const [styleLearning, setStyleLearning] = useState(false);
    
    // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('docinsight_apiKey') || '');
  const [customBaseUrl, setCustomBaseUrl] = useState(() => localStorage.getItem('docinsight_baseUrl') || '');
  const [customModel, setCustomModel] = useState(() => localStorage.getItem('docinsight_model') || 'gpt-3.5-turbo');
  const [testResult, setTestResult] = useState<{success?: boolean, message?: string} | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    localStorage.setItem('docinsight_apiKey', customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    localStorage.setItem('docinsight_baseUrl', customBaseUrl);
  }, [customBaseUrl]);

  useEffect(() => {
    localStorage.setItem('docinsight_model', customModel);
  }, [customModel]);

  const pdfRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleExtract = async () => {
    if (!url) return;
    setLoading(true);
    setChapters([]);
    setStatusMessage('AI 引擎正在分析目录层级与结构...');
    setStatus('Engine Running');
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, aiDenoise, styleLearning, customApiKey, customBaseUrl, customModel })
      });
      const data = await res.json();
      if (data.error) {
        setStatusMessage(`解析失败: ${data.error}`);
        setStatus('Error');
      } else {
        setChapters(data.chapters || []);
        setGlobalCss(data.globalCss || "");
        setStatusMessage(`内容抓取完成，共 ${data.chapters?.length || 0} 个章节。已生成预览！`);
        setStatus('Analysis Complete');
      }
    } catch (e: any) {
      setStatusMessage(`网络或服务错误: ${e.message}`);
      setStatus('Network Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!formRef.current || !pdfRef.current) return;
    setStatusMessage('正在后端渲染并准备下载 PDF, 请允许弹窗...');
    const htmlInput = formRef.current.elements.namedItem('html') as HTMLInputElement;
    const bodyClassInput = formRef.current.elements.namedItem('bodyClass') as HTMLInputElement;
    if (htmlInput) {
       let fullHtml = `<div class="pdf-container">`;
       
       if (styleLearning && globalCss) {
           fullHtml += `<style>${globalCss}</style>`;
       }
       
       chapters.forEach((chapter, idx) => {
           fullHtml += `<div class="page-break-before mb-24">`;
           fullHtml += `<header style="border-top: 3px solid #111; padding-top: 2.5rem; margin-bottom: 3rem; position: relative; font-family: 'Noto Serif SC', serif;">`;
           fullHtml += `<div style="display:flex; justify-content: space-between; margin-bottom: 1.5rem; color: #9ca3af;">`;
           fullHtml += `<p style="font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">Chapter ${String(idx + 1).padStart(2, '0')}</p>`;
           fullHtml += `</div>`;
           fullHtml += `<h2 style="font-size: 2.25rem; font-weight: bold; color: #111;">${chapter.title}</h2>`;
           fullHtml += `</header>`;
           
           if (!styleLearning) {
              fullHtml += `<div class="custom-doc-style prose prose-sm md:prose-base max-w-none prose-gray
                                 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mt-12 [&>h1]:mb-6 [&>h1]:pb-3 [&>h1]:border-b [&>h1]:border-gray-200 [&>h1]:font-serif [&>h1]:text-gray-900
                                 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:font-serif [&>h2]:text-gray-800
                                 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:text-gray-800
                                 [&>p]:leading-[1.8] [&>p]:mb-6 [&>p]:text-justify [&>p]:text-gray-700
                                 [&>ul]:my-6 [&>ul>li]:mb-2 [&>ul>li]:pl-1 [&>ul]:text-gray-700
                                 [&>ol]:my-6 [&>ol>li]:mb-2 [&>ol>li]:pl-1 [&>ol]:text-gray-700
                                 [&>pre]:bg-[#F6F8FA] [&>pre]:p-5 [&>pre]:rounded-lg [&>pre]:text-[13px] [&>pre]:font-mono [&>pre]:border [&>pre]:border-gray-200 [&>pre]:my-8 [&>pre]:text-gray-800 [&>pre]:overflow-x-auto
                                 [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:my-8 [&>blockquote]:text-gray-500
                                 [&>img]:max-w-full [&>img]:h-auto [&>img]:my-10 [&>img]:rounded-lg [&>img]:border [&>img]:border-gray-100 [&>img]:shadow-sm
                                 [&>a]:text-blue-600 [&>a]:underline [&>a]:underline-offset-4 [&>a]:decoration-blue-600/30 hover:[&>a]:decoration-blue-600
                                 [&>table]:w-full [&>table]:my-8 [&>table]:border-collapse [&>table]:text-sm
                                 [&>table_th]:border [&>table_th]:border-gray-200 [&>table_th]:bg-gray-50 [&>table_th]:p-3 [&>table_th]:text-left [&>table_th]:font-semibold
                                 [&>table_td]:border [&>table_td]:border-gray-200 [&>table_td]:p-3">${chapter.content}</div>`;
           } else {
              fullHtml += `<div class="custom-doc-style">${chapter.content}</div>`;
           }
           fullHtml += `</div>`;
       });
       
       fullHtml += `</div>`;
       htmlInput.value = fullHtml;
       if (bodyClassInput) bodyClassInput.value = chapters[0]?.bodyClass || '';
    }
    formRef.current.submit();
    setTimeout(() => {
      setStatusMessage('任务完成！如果未开始下载，请检查浏览器是否拦截了弹窗。');
    }, 3000);
  };

  const handleTestConnection = async () => {
    if (!customApiKey || !customBaseUrl) {
      setTestResult({ success: false, message: '请填写 API Key 和 Base URL' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customApiKey, customBaseUrl, customModel })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: `连接成功 (AI回复: ${data.text})` });
      } else {
        setTestResult({ success: false, message: `连接失败: ${data.error}` });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: `网络错误: ${e.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="w-full h-screen bg-[#FBFBFA] text-[#2C2C2E] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-white shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2C2C2E] rounded flex items-center justify-center shadow-sm">
            <FileText size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">DocInsight <span className="font-serif italic font-normal text-gray-400 text-sm ml-1 hidden sm:inline">智览指南</span></h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors bg-gray-50 hover:bg-gray-100 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-200"
          >
            <Settings size={14} />
            <span className="font-medium hidden sm:inline">模型配置</span>
          </button>
        </div>
      </header>

      <main className="flex flex-col xl:flex-row flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className="w-full xl:w-[460px] bg-white border-r border-gray-200 p-6 md:p-10 flex flex-col overflow-y-auto shrink-0 z-10 custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="space-y-10 flex-1">
            <section>
              <div className="flex justify-between items-end mb-4">
                <label className="text-sm font-semibold text-gray-900">来源地址 (URL)</label>
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium tracking-wide">深度去噪过滤</span>
                    <button 
                      onClick={() => setAiDenoise(!aiDenoise)}
                      className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors shadow-inner ${aiDenoise ? 'bg-[#2C2C2E]' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${aiDenoise ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium tracking-wide">智能样式学习</span>
                    <button 
                      onClick={() => setStyleLearning(!styleLearning)}
                      className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors shadow-inner ${styleLearning ? 'bg-[#2C2C2E]' : 'bg-gray-200'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${styleLearning ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>
              </div>
              <div className="relative group">
                <input 
                  type="text" 
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="输入教程链接..."
                  className="w-full bg-[#FBFBFA] hover:bg-white text-gray-900 border border-gray-200 rounded-xl p-4 pr-32 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2C2C2E]/10 focus:border-[#2C2C2E]/40 transition-all shadow-sm"
                />
                <button 
                  onClick={handleExtract}
                  disabled={loading || !url}
                  className="absolute right-2 top-2 bottom-2 px-5 bg-[#2C2C2E] text-white rounded-lg text-sm font-medium hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center min-w-[70px]"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : '开始解析'}
                </button>
              </div>
              
              <div className="mt-4 flex items-start gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100/50">
                 <div className="mt-0.5 mt-0.5 text-blue-500"><CheckCircle2 size={16} /></div>
                 <p className="text-sm leading-relaxed text-blue-800/80 font-medium">{statusMessage}</p>
              </div>
            </section>

            <section className="flex-1 flex flex-col">
              <label className="text-sm font-semibold text-gray-900 mb-4">内容大纲与层级</label>
              <div className="space-y-1.5 flex-1 bg-[#FBFBFA] border border-gray-200 rounded-xl p-3 md:p-5 overflow-y-auto min-h-[300px] custom-scrollbar shadow-inner">
                {chapters.length === 0 && !loading && (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400 font-serif italic text-center px-6 leading-relaxed">
                    暂无内容结构，请在上方输入来源链接大纲开始提取内容。
                  </div>
                )}
                {chapters.map((ch, idx) => (
                  <div 
                    key={idx}
                    className="flex justify-between items-center py-2.5 px-3 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all text-sm group cursor-default shadow-sm hover:shadow"
                  >
                    <span className="truncate pr-4 text-gray-700 font-medium flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-400 bg-gray-100/80 border border-gray-200/50 px-1.5 py-0.5 rounded shadow-sm">{String(idx + 1).padStart(2, '0')}</span> 
                      {ch.title}
                    </span>
                    <Check size={14} className="text-green-500 opacity-60" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="pt-8 mt-6 border-t border-gray-100">
            {chapters.length > 0 ? (
              <button 
                onClick={handleDownloadPDF}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-medium text-base hover:bg-green-700 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                下载高质量 PDF
              </button>
            ) : (
              <button 
                disabled={true}
                className="w-full py-4 bg-[#2C2C2E] text-white rounded-xl font-medium text-base disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all relative overflow-hidden flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                   <>
                     <Loader2 size={18} className="animate-spin" />
                     正在抓取内容 ...
                   </>
                ) : (
                  <>
                    <Download size={18} />
                    等待解析与生成
                  </>
                )}
              </button>
            )}
            {/* Hidden form for downloading PDF safely in sandbox */}
            <form ref={formRef} action="/api/generate-pdf" method="POST" target="_blank" className="hidden">
               <input type="hidden" name="html" value="" />
               <input type="hidden" name="bodyClass" value="" />
               <input type="hidden" name="url" value={url} />
               <input type="hidden" name="filename" value={`${url.replace(/^https?:\/\//, '').split('/')[0] || 'Document'}.pdf`} />
            </form>
          </div>
        </aside>

        {/* Main Content: Document Preview */}
        <section className="flex-1 bg-[#EBEAE6] p-0 relative flex flex-col overflow-y-auto custom-scrollbar z-0 py-8">
          {!loading && chapters.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center select-none text-gray-300 min-h-[400px]">
              <FileText size={48} strokeWidth={1} className="mb-6 opacity-40" />
              <p className="text-xl font-serif italic tracking-wide">Document Preview Workspace</p>
            </div>
          )}
          
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 min-h-[400px]">
              <Loader2 size={36} className="animate-spin mb-4 text-indigo-500" />
              <p className="text-sm font-medium tracking-wide">
                正在调用大模型爬取与分析多页内容...
              </p>
            </div>
          )}

          {/* Document Preview */}
          <div className={`${chapters.length > 0 && !loading ? 'mx-auto relative visible opacity-100 bg-white/50 backdrop-blur-sm shadow-sm shrink-0 my-8 rounded-2xl border border-gray-200/50' : 'absolute left-[-9999px] top-[-9999px] pointer-events-none opacity-0 -z-50'} w-[100%] xl:w-[880px] max-w-[880px] transition-opacity duration-300 overflow-hidden`}>
            <div ref={pdfRef} className="w-full px-6 py-8 md:px-16 md:py-16">
               <div className="w-full">
                {/* Header Info */}
                 <div className="mb-12 border-b border-gray-200 pb-12">
                    <p className="text-sm font-semibold uppercase tracking-[0.1em] mb-6 text-indigo-500 bg-indigo-50 inline-block px-3 py-1 rounded-full">Document Workspace</p>
                    
                    <h1 className="text-4xl md:text-5xl font-serif font-black leading-tight tracking-tight break-words text-gray-900 mb-6">
                      {url.replace(/^https?:\/\//, '').split('/')[0] || 'Web Document'}
                    </h1>
                    
                    <p className="text-xl font-serif italic mt-4 text-gray-500 max-w-2xl leading-relaxed">
                      精编学习手册源自 Web2PDF 实时深度抓取引擎。
                    </p>
                    
                    <div className="mt-16 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
                         <h2 className="text-xl font-bold uppercase tracking-wider text-gray-900">Table of Contents</h2>
                         <span className="text-sm text-gray-400 font-serif italic">目录索引</span>
                      </div>
                      <ul className="space-y-5">
                        {chapters.map((ch, idx) => (
                           <li key={`toc-${idx}`} className="flex justify-between items-center text-lg font-serif">
                             <span className="flex-1 flex items-center justify-between text-gray-800">
                                <span className="pr-4 truncate font-medium"><span className="text-gray-300 mr-3 font-mono text-sm">{String(idx + 1).padStart(2, '0')}</span> {ch.title}</span>
                                <span className="border-b border-dotted border-gray-300 flex-1 mx-4 relative top-[-4px]"></span>
                                <span className="font-mono text-sm text-gray-400">P{String(idx + 1).padStart(2, '0')}</span>
                             </span>
                           </li>
                        ))}
                      </ul>
                    </div>
                 </div>

                {/* Chapters */}
                {chapters.map((chapter, idx) => (
                  <div key={`doc-${idx}`} className="mb-24 page-break-before break-inside-avoid">
                    <header className="border-t-[3px] border-[#111] pt-10 mb-12 relative">
                      <div className="flex justify-between items-baseline mb-6 text-gray-400">
                        <p className="text-xs font-bold uppercase tracking-[0.1em]">Chapter {String(idx + 1).padStart(2, '0')}</p>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-serif font-bold leading-tight text-[#111]">{chapter.title}</h2>
                    </header>

                    {styleLearning ? (
                       <AutoResizeIframe 
                         className="w-full border border-gray-100 rounded-xl bg-white shadow-sm"
                         srcDoc={`<html><head><base target="_blank" href="${url}"><style>html, body { height: auto !important; min-height: auto !important; overflow: hidden !important; position: static !important; margin: 0; padding: 20px; font-family: sans-serif; }\n${globalCss}</style><script>function sendHeight() { window.parent.postMessage({ type: 'resize', height: document.documentElement.scrollHeight + 40 }, '*'); } window.addEventListener('load', sendHeight); new ResizeObserver(sendHeight).observe(document.body);</script></head><body class="${chapter.bodyClass || ''}"><div class="custom-doc-style">${chapter.content}</div></body></html>`}
                       />
                    ) : (
                       <div 
                         className="custom-doc-style prose prose-sm md:prose-base max-w-none prose-gray
                                    [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mt-12 [&>h1]:mb-6 [&>h1]:pb-3 [&>h1]:border-b [&>h1]:border-gray-200 [&>h1]:font-serif [&>h1]:text-gray-900
                                    [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:font-serif [&>h2]:text-gray-800
                                    [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-3 [&>h3]:text-gray-800
                                    [&>p]:leading-[1.8] [&>p]:mb-6 [&>p]:text-justify [&>p]:text-gray-700
                                    [&>ul]:my-6 [&>ul>li]:mb-2 [&>ul>li]:pl-1 [&>ul]:text-gray-700
                                    [&>ol]:my-6 [&>ol>li]:mb-2 [&>ol>li]:pl-1 [&>ol]:text-gray-700
                                    [&>pre]:bg-[#F6F8FA] [&>pre]:p-5 [&>pre]:rounded-lg [&>pre]:text-[13px] [&>pre]:font-mono [&>pre]:border [&>pre]:border-gray-200 [&>pre]:my-8 [&>pre]:text-gray-800 [&>pre]:overflow-x-auto
                                    [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:my-8 [&>blockquote]:text-gray-500
                                    [&>img]:max-w-full [&>img]:h-auto [&>img]:my-10 [&>img]:rounded-lg [&>img]:border [&>img]:border-gray-100 [&>img]:shadow-sm
                                    [&>a]:text-blue-600 [&>a]:underline [&>a]:underline-offset-4 [&>a]:decoration-blue-600/30 hover:[&>a]:decoration-blue-600
                                    [&>table]:w-full [&>table]:my-8 [&>table]:border-collapse [&>table]:text-sm
                                    [&>table_th]:border [&>table_th]:border-gray-200 [&>table_th]:bg-gray-50 [&>table_th]:p-3 [&>table_th]:text-left [&>table_th]:font-semibold
                                    [&>table_td]:border [&>table_td]:border-gray-200 [&>table_td]:p-3"
                         dangerouslySetInnerHTML={{ __html: chapter.content }} 
                       />
                    )}
                  </div>
                ))}
                
                <footer className="mt-24 pt-10 border-t border-gray-200 flex flex-col items-center justify-center text-center page-break-inside-avoid">
                    <h4 className="text-sm font-semibold uppercase tracking-widest text-gray-900 mb-1">DocInsight AI</h4>
                    <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">Web-To-PDF Master / End of Document</p>
                </footer>
              </div>
            </div>
          </div>
        </section>

        {/* Status Bar Floating */}
        <div className="absolute bottom-6 right-6 lg:bottom-10 lg:right-10 bg-white shadow-xl shadow-black/5 border border-gray-200 rounded-full px-5 py-2.5 flex items-center gap-4 text-xs font-medium z-20 pointer-events-none">
          <span className="text-gray-500 uppercase tracking-wider bg-transparent">{status}</span>
          <div className={`w-2.5 h-2.5 rounded-full ${loading ? 'bg-indigo-500 animate-pulse' : 'bg-[#2C2C2E]'}`}></div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-900">核心服务配置</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-900 p-1 rounded-md transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-blue-50 text-blue-800 text-xs p-4 rounded-xl border border-blue-100/50 leading-relaxed font-medium">
                此处配置仅对本次会话有效。支持填入 OpenAI 兼容格式的 API (如 OpenAI, DeepSeek, vLLM) 来进行推理处理。<br/>
                如果留空，系统将使用平台默认引擎运行。
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">API Model</label>
                <input 
                  type="text" 
                  value={customModel}
                  onChange={e => setCustomModel(e.target.value)}
                  placeholder="如: gpt-3.5-turbo, deepseek-chat"
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">API Base URL</label>
                <input 
                  type="text" 
                  value={customBaseUrl}
                  onChange={e => setCustomBaseUrl(e.target.value)}
                  placeholder="如: https://api.openai.com/v1"
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">API Key</label>
                <input 
                  type="password" 
                  value={customApiKey}
                  onChange={e => setCustomApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-sm"
                />
              </div>
              
              {testResult && (
                <div className={`p-3 rounded-xl text-sm font-medium border ${testResult.success ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {testResult.message}
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex justify-between items-center">
              <button 
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 disabled:bg-gray-100 disabled:text-gray-400"
              >
                {isTesting && <Loader2 size={14} className="animate-spin" />}
                测试连接
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                className="px-6 py-2.5 bg-[#2C2C2E] text-white text-sm font-medium rounded-lg hover:bg-black transition-colors shadow-md"
              >
                保存配置并关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

