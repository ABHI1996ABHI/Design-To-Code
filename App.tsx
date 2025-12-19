
import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { FileUploader } from './components/FileUploader';
import { PreviewFrame } from './components/PreviewFrame';
import { TechnicalTerminal } from './components/TechnicalTerminal';
import { generateCodeFromDesign } from './services/geminiService';
import { AppStatus, AppView, FileUpload, GeneratedCode, HistoryItem } from './types';

const App: React.FC = () => {
  // Navigation & View State
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [previousView, setPreviousView] = useState<AppView>(AppView.DASHBOARD);
  
  // App Logic State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [uploadedFile, setUploadedFile] = useState<FileUpload | null>(null);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'css' | 'javascript'>('preview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Section Naming, Prompt & Persistence
  const [sectionName, setSectionName] = useState('');
  const [userGuidance, setUserGuidance] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Typography State
  const [fontFamily, setFontFamily] = useState('Inter');

  // Asset & Content Mapping State
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [localAssetInputs, setLocalAssetInputs] = useState<Record<string, string>>({});
  const [textEdits, setTextEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem('decode_history_v3');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('decode_history_v3', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    let interval: number;
    if (status === AppStatus.ANALYZING) {
      setProgress(5);
      interval = window.setInterval(() => setProgress(p => (p < 95 ? p + 0.5 : p)), 150);
    } else if (status === AppStatus.SUCCESS) {
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    } else if (status !== AppStatus.GENERATING) setProgress(0);
    return () => clearInterval(interval);
  }, [status]);

  const navigateTo = (view: AppView) => {
    if (currentView !== AppView.DOCUMENTATION) {
      setPreviousView(currentView);
    }
    setCurrentView(view);
  };

  const handleCloseDocs = () => {
    setCurrentView(previousView);
  };

  const handleInsertPrompt = (text: string) => {
    setUserGuidance(prev => prev ? `${prev}\n${text}` : text);
    setCurrentView(AppView.CONVERTER);
  };

  const detectedAssets = useMemo(() => {
    if (!generatedCode) return [];
    const matches = generatedCode.html.match(/\{\{ASSET_ID_[^}]+\}\}/g);
    return matches ? Array.from(new Set(matches)) : [];
  }, [generatedCode]);

  const editableTextBlocks = useMemo(() => {
    if (!generatedCode) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(generatedCode.html, 'text/html');
    const texts: string[] = [];
    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    let node: Node | null;
    while((node = walker.nextNode())) {
      const content = node.textContent?.trim();
      if (content && content.length > 1 && !texts.includes(content)) {
        texts.push(content);
      }
    }
    return texts;
  }, [generatedCode]);

  const applyCustomizations = (rawHtml: string) => {
    let finalHtml = rawHtml;
    Object.entries(assetUrls).forEach(([placeholder, url]) => {
      const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      finalHtml = finalHtml.replace(new RegExp(escapedPlaceholder, 'g'), String(url));
    });

    finalHtml = finalHtml.replace(/\{\{ASSET_ID_([^}]+)\}\}/g, (_, id) => 
      `https://placehold.co/800x600/1e293b/6366f1?text=${id}`
    );

    if (Object.keys(textEdits).length > 0) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(finalHtml, 'text/html');
      const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
      let node: Node | null;
      while((node = walker.nextNode())) {
        const originalText = node.textContent?.trim();
        if (originalText && textEdits[originalText]) {
          const leadingWs = node.textContent!.match(/^\s*/)![0];
          const trailingWs = node.textContent!.match(/\s*$/)![0];
          node.textContent = leadingWs + textEdits[originalText] + trailingWs;
        }
      }
      finalHtml = doc.body.innerHTML;
    }
    return finalHtml;
  };

  const handleGenerate = async (isRefine: boolean = false) => {
    if (!uploadedFile) return;
    setStatus(AppStatus.ANALYZING);
    setErrorMessage(null);
    try {
      const code = await generateCodeFromDesign(
        uploadedFile.base64, 
        userGuidance, 
        isRefine ? generatedCode : null
      );
      setGeneratedCode(code);
      setStatus(AppStatus.SUCCESS);

      const historyItem: HistoryItem = {
        id: editingId || Date.now().toString(),
        name: sectionName || `Section ${history.length + 1}`,
        timestamp: Date.now(),
        code,
        previewUrl: uploadedFile.previewUrl,
        fontFamily
      };

      setHistory(prev => {
        const filtered = editingId ? prev.filter(item => item.id !== editingId) : prev;
        return [historyItem, ...filtered].slice(0, 50);
      });
      setEditingId(historyItem.id);
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      setErrorMessage(error.message || "Synthesis failed.");
    }
  };

  const handleLoadFromHistory = (item: HistoryItem) => {
    setGeneratedCode(item.code);
    setSectionName(item.name);
    setEditingId(item.id);
    setFontFamily(item.fontFamily || 'Inter');
    setUploadedFile({
      file: new File([], "historical.png"),
      previewUrl: item.previewUrl,
      base64: item.previewUrl
    });
    setTextEdits({});
    setAssetUrls({});
    setActiveTab('preview');
    setCurrentView(AppView.CONVERTER);
  };

  const handleDeleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this module?')) {
      setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleApplyAsset = (placeholder: string) => {
    const url = localAssetInputs[placeholder];
    if (url) setAssetUrls(prev => ({ ...prev, [placeholder]: url }));
  };

  const handleTextEdit = (original: string, updated: string) => {
    setTextEdits(prev => ({ ...prev, [original]: updated }));
  };

  const handleManualCodeEdit = (type: keyof GeneratedCode, value: string) => {
    if (!generatedCode) return;
    setGeneratedCode({
      ...generatedCode,
      [type]: value
    });
  };

  const resetState = () => {
    setUploadedFile(null);
    setGeneratedCode(null);
    setStatus(AppStatus.IDLE);
    setErrorMessage(null);
    setAssetUrls({});
    setLocalAssetInputs({});
    setTextEdits({});
    setSectionName('');
    setUserGuidance('');
    setEditingId(null);
  };

  const getFullHtmlForPreview = () => {
    if (!generatedCode) return '';
    const finalHtml = applyCustomizations(generatedCode.html);
    const googleFontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="${googleFontUrl}" rel="stylesheet">
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css"/>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css"/>
  <style>
    body { padding: 40px; background-color: #f8fafc; display: flex; justify-content: center; margin: 0; }
    .preview-container { 
      width: 100%; 
      max-width: 1350px; 
      font-family: '${fontFamily}', sans-serif;
    }
    .container { margin-right: auto; margin-left: auto; padding-left: 15px; padding-right: 15px; max-width: 1350px; }
    @media (max-width: 768px) {
      body { padding: 10px; }
      .preview-container { max-width: 100%; }
      .container { max-width: 100%; }
    }
  </style>
  ${generatedCode.css}
</head>
<body>
  <div class="preview-container">${finalHtml}</div>
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js"></script>
  ${generatedCode.javascript}
</body>
</html>`;
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    const finalHtml = applyCustomizations(generatedCode.html);
    let code = '';
    if (activeTab === 'html') code = finalHtml;
    else if (activeTab === 'css') {
      code = generatedCode.css.replace('</style>', `  .section-wrapper { font-family: '${fontFamily}', sans-serif; max-width: 1350px; margin: 0 auto; }\n</style>`);
    }
    else if (activeTab === 'javascript') code = generatedCode.javascript;
    
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenFullPreview = () => {
    const fullHtml = getFullHtmlForPreview();
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const isDark = theme === 'dark';

  const trademarkFooter = (
    <footer className={`w-full py-12 flex flex-col items-center gap-6 transition-all duration-500 border-t ${isDark ? 'bg-[#020617] border-slate-800/50' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center gap-4">
        <div className="relative w-10 h-10 flex items-center justify-center">
           <div className="absolute inset-0 bg-indigo-600 rounded-xl transform rotate-6 shadow-xl shadow-indigo-500/20"></div>
           <div className="absolute inset-0 bg-slate-900 rounded-xl transform -rotate-3 border border-slate-700"></div>
           <i className="fas fa-code text-indigo-400 text-sm relative z-10"></i>
        </div>
        <div className="flex flex-col leading-none text-left">
          <h1 className="text-xl font-black tracking-tighter">
            DE<span className="text-indigo-500">//</span>CODE
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Design to CODE</span>
        </div>
      </div>
      <div className="text-center px-4">
        <p className={`text-[14px] font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Designed and Developed by: <span className={`font-bold ml-1 ${isDark ? 'text-white' : 'text-black'}`}>Sachitanand Rai</span> - Product Manager (Times Internet)
        </p>
      </div>
    </footer>
  );

  const docPrompts = [
    {
      title: "Core Width Constraint",
      prompt: "The component's maximum width must be exactly 1350px. Use a wrapper class (e.g., .section-wrapper) if necessary to enforce this limit globally.",
      icon: "fa-arrows-left-right"
    },
    {
      title: "Heading Typography Standards",
      prompt: "You MUST use the classes .page_hdng5 or .page-hdng for the main section headings. All font-sizes must be specified in px (pixels) to match design fidelity.",
      icon: "fa-heading"
    },
    {
      title: "Semantic HTML Structure",
      prompt: "HTML MUST always start with a <section> tag containing a unique, descriptive class (e.g., 'section-feature-module-xyz'). All nested markup must reside inside this parent container.",
      icon: "fa-code"
    },
    {
      title: "CSS Scope & Encapsulation",
      prompt: "Every CSS rule MUST use the unique parent section class as a prefix (e.g., '.section-feature-module-xyz .title { ... }') to prevent global style pollution or collisions.",
      icon: "fa-shield-halved"
    },
    {
      title: "Asset Management Pipeline",
      prompt: "Use template variables: {{ASSET_ID_[UNIQUE_NAME]}}. These are mandatory placeholders for images that will be dynamically mapped to production backend paths.",
      icon: "fa-images"
    },
    {
      title: "Bootstrap & Slick Integration",
      prompt: "Use Bootstrap 5 classes for grid layouts and spacing. Assume Slick Slider is available globally for carousels; initialize via script tags within the section scope.",
      icon: "fa-bolt"
    }
  ];

  return (
    <div className={`min-h-screen transition-all duration-700 flex flex-col ${isDark ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Navbar 
        theme={theme} 
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
        onShowDocs={() => navigateTo(AppView.DOCUMENTATION)} 
        onGoHome={() => setCurrentView(AppView.DASHBOARD)}
      />
      
      {progress > 0 && (
        <div className="fixed top-16 left-0 w-full h-[3px] z-[60] overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Main content scroll container */}
      <div className="flex-1 flex flex-col pt-16 overflow-y-auto scrollbar-hide">
        <div className="flex-1">
          {currentView === AppView.DASHBOARD && (
            <main className="pb-8 px-6 lg:px-16 max-w-[1920px] mx-auto">
              <header className="my-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Project Overview</p>
                  <h1 className="text-5xl font-black uppercase tracking-tighter">My Modules</h1>
                </div>
                <button 
                  onClick={() => { resetState(); setCurrentView(AppView.CONVERTER); }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.1em] shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-3"
                >
                  Start DE-CODE <i className="fas fa-plus"></i>
                </button>
              </header>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
                   <p className="text-[10px] font-black uppercase opacity-40 mb-1">Total Modules</p>
                   <h3 className="text-4xl font-black">{history.length}</h3>
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
                   <p className="text-[10px] font-black uppercase opacity-40 mb-1">Latest Font</p>
                   <h3 className="text-xl font-black truncate">{history[0]?.fontFamily || 'Inter'}</h3>
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
                   <p className="text-[10px] font-black uppercase opacity-40 mb-1">Saved Assets</p>
                   <h3 className="text-4xl font-black">{history.reduce((acc, curr) => acc + (curr.code.html.match(/\{\{ASSET_ID_/g)?.length || 0), 0)}</h3>
                </div>
                <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
                   <p className="text-[10px] font-black uppercase opacity-40 mb-1">System Health</p>
                   <h3 className="text-4xl font-black text-emerald-500">100%</h3>
                </div>
              </section>

              {history.length === 0 ? (
                <div className={`flex flex-col items-center justify-center p-20 rounded-[3rem] border-2 border-dashed ${isDark ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50'} text-center mb-20`}>
                   <i className="fas fa-layer-group text-4xl mb-6 opacity-20"></i>
                   <h2 className="text-xl font-black uppercase mb-2">No Modules Found</h2>
                   <p className="text-[12px] opacity-40 max-w-xs mb-8">Begin your project by converting your first high-fidelity design module.</p>
                   <button onClick={() => { resetState(); setCurrentView(AppView.CONVERTER); }} className="text-indigo-500 font-bold uppercase text-[10px] tracking-widest hover:underline transition-all">Upload Blueprint Now</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-20">
                  {history.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => handleLoadFromHistory(item)}
                      className={`group relative rounded-[2.5rem] overflow-hidden border transition-all duration-500 cursor-pointer ${isDark ? 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900' : 'bg-white border-slate-100 shadow-xl hover:shadow-2xl'}`}
                    >
                      <div className="aspect-[16/10] overflow-hidden relative">
                        <img src={item.previewUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                           <div className="flex gap-3">
                              <button onClick={(e) => { e.stopPropagation(); handleLoadFromHistory(item); }} className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-all"><i className="fas fa-edit text-xs"></i></button>
                              <button onClick={(e) => handleDeleteHistoryItem(e, item.id)} className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-500 transition-all"><i className="fas fa-trash-can text-xs"></i></button>
                           </div>
                        </div>
                      </div>
                      <div className="p-8">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-black uppercase tracking-tight truncate flex-1 pr-4">{item.name}</h4>
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-indigo-500/10 text-indigo-400">v3.0</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><i className="fas fa-font"></i> {item.fontFamily}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>
          )}

          {currentView === AppView.DOCUMENTATION && (
            <main className="pb-20 px-6 lg:px-16 max-w-[1920px] mx-auto relative">
              <header className="my-12">
                <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Technical Standards</p>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h1 className="text-5xl font-black uppercase tracking-tighter">Engineering Prompts</h1>
                  <button 
                    onClick={handleCloseDocs}
                    className="text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all w-fit"
                  >
                    <i className="fas fa-arrow-left mr-2"></i> Back to Workspace
                  </button>
                </div>
                <p className="text-[13px] opacity-40 max-w-2xl mt-4 leading-relaxed">
                  The DE-CODE engine operates on a strict set of architectural constraints. These prompts are integrated into the Gemini Vision context to ensure every module is production-ready.
                </p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {docPrompts.map((doc, i) => (
                  <div key={i} className={`p-10 rounded-[2.5rem] border flex flex-col transition-all duration-500 hover:scale-[1.02] ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                      <i className={`fas ${doc.icon} text-indigo-500`}></i>
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight mb-4">{doc.title}</h3>
                    <div className={`flex-1 p-5 rounded-2xl font-mono text-[11px] leading-relaxed mb-6 ${isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
                      {doc.prompt}
                    </div>
                    <div className="mt-auto flex items-center gap-4">
                      <button 
                        onClick={() => { navigator.clipboard.writeText(doc.prompt); alert('Prompt copied!'); }}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-all"
                      >
                        Copy <i className="fas fa-copy ml-1"></i>
                      </button>
                      <button 
                        onClick={() => handleInsertPrompt(doc.prompt)}
                        className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                        title="Insert into Design Guidance"
                      >
                        <i className="fas fa-plus text-[11px]"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          )}

          {currentView === AppView.CONVERTER && (
            <main className="px-6 lg:px-10 max-w-[1920px] mx-auto py-8 flex flex-col gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[85vh]">
                <section className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
                  <div className={`flex-1 flex flex-col rounded-[2rem] overflow-hidden border transition-all duration-500 shadow-xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className="p-5 space-y-4 border-b border-slate-800/10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Module Config</h3>
                        <button onClick={() => setCurrentView(AppView.DASHBOARD)} className="text-[9px] font-bold text-slate-500 hover:text-indigo-500 transition-all">Back to Dashboard</button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Section Name (e.g. Card Grid)"
                        className={`w-full p-2.5 text-[11px] font-bold rounded-xl border outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        value={sectionName}
                        onChange={(e) => setSectionName(e.target.value)}
                      />
                      <textarea 
                        rows={3}
                        placeholder="Design Guidance (e.g. 'Make titles blue', 'Add more padding')..."
                        className={`w-full p-2.5 text-[10px] rounded-xl border outline-none resize-none ${isDark ? 'bg-slate-950 border-slate-800 text-target text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                        value={userGuidance}
                        onChange={(e) => setUserGuidance(e.target.value)}
                      />
                    </div>

                    {!uploadedFile ? (
                      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                        <FileUploader onFileSelect={setUploadedFile} isLoading={status === AppStatus.ANALYZING} />
                        <p className="text-[9px] mt-6 text-slate-500 font-bold uppercase tracking-widest opacity-40">Drop UI Module to Synthesize</p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className={`flex-1 relative min-h-[400px] overflow-hidden flex items-center justify-center p-4 ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                          <img src={uploadedFile.previewUrl} className="max-w-full max-h-full object-contain rounded-xl" alt="Preview" />
                          {(status === AppStatus.ANALYZING || status === AppStatus.ERROR) && (
                            <div className="absolute inset-0 glass bg-slate-950/80 z-30 flex flex-col items-center justify-center p-6 text-white text-center">
                              <TechnicalTerminal isError={status === AppStatus.ERROR} />
                              {status === AppStatus.ERROR && (
                                <button onClick={() => handleGenerate(false)} className="mt-8 px-6 py-2 bg-indigo-600 rounded-lg text-[10px] font-bold uppercase">Retry</button>
                              )}
                            </div>
                          )}
                        </div>
                        <footer className={`p-4 border-t flex gap-2 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'}`}>
                          <button onClick={() => handleGenerate(false)} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95">Initiate Code</button>
                          {generatedCode && (
                            <button onClick={() => handleGenerate(true)} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95">Update Design</button>
                          )}
                          <button onClick={resetState} className="w-12 py-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><i className="fas fa-trash-can text-xs"></i></button>
                        </footer>
                      </div>
                    )}
                  </div>
                </section>

                <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
                  <div className={`flex-1 flex flex-col rounded-[2rem] overflow-hidden border transition-all duration-500 shadow-xl ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'}`}>
                    {!generatedCode ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30 min-h-[600px]">
                        <i className="fas fa-laptop-code text-4xl mb-4"></i>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Ready to Code</p>
                      </div>
                    ) : (
                      <>
                        <nav className={`h-14 border-b flex items-center justify-between px-6 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex gap-4">
                            {(['preview', 'html', 'css', 'javascript'] as const).map(tab => (
                              <button key={tab} onClick={() => setActiveTab(tab)} className={`text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-indigo-500 border-b-2 border-indigo-500 pb-1' : 'text-slate-500 hover:text-slate-300'}`}>{tab}</button>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={handleOpenFullPreview} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded-lg transition-all" title="Open in full screen">
                              <i className="fas fa-external-link-alt mr-2"></i> Full Page
                            </button>
                            {activeTab !== 'preview' && (
                              <button onClick={handleCopyCode} className="px-4 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-lg shadow-lg shadow-indigo-500/20">
                                {copied ? 'Copied!' : 'Copy Module Code'}
                              </button>
                            )}
                            <button onClick={() => setCurrentView(AppView.DASHBOARD)} className="px-4 py-1.5 bg-slate-800 text-white text-[9px] font-black uppercase rounded-lg">Exit</button>
                          </div>
                        </nav>

                        <div className="flex-1 flex overflow-hidden min-h-[700px]">
                          <aside className={`w-72 border-r flex flex-col overflow-hidden ${isDark ? 'border-slate-800 bg-slate-950/20' : 'border-slate-100 bg-slate-50/20'}`}>
                             <div className={`flex border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <button className={`flex-1 py-3 text-[9px] font-black uppercase border-b-2 border-indigo-500 text-indigo-500 transition-all`}>Asset Editor</button>
                             </div>
                             <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                                <div>
                                  <h4 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-3">Typography</h4>
                                  <div className="space-y-3 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                    <div>
                                      <label className="text-[7px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Font Family (Google)</label>
                                      <input 
                                        type="text" 
                                        className={`w-full p-2 text-[10px] rounded-lg border outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200'}`} 
                                        value={fontFamily} 
                                        onChange={(e) => setFontFamily(e.target.value)}
                                        placeholder="e.g. Playfair Display"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-3">Live Text</h4>
                                  <div className="space-y-3">
                                    {editableTextBlocks.map((text, i) => (
                                      <textarea key={i} className={`w-full p-2 text-[10px] rounded-lg border outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`} value={textEdits[text] || text} onChange={(e) => handleTextEdit(text, e.target.value)} />
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-3">Images</h4>
                                  <div className="space-y-5">
                                    {detectedAssets.map((asset, i) => {
                                      const variableName = asset.replace('{{ASSET_ID_', '').replace('}}', '');
                                      return (
                                        <div key={i} className="space-y-1.5">
                                          <label className="text-[7px] font-black uppercase tracking-widest text-indigo-400 block ml-1">
                                            {variableName}
                                          </label>
                                          <div className="flex gap-2">
                                            <input 
                                              type="text" 
                                              placeholder="Image URL..." 
                                              className={`flex-1 p-2 text-[10px] rounded-lg border outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200'}`} 
                                              value={localAssetInputs[asset] || ''} 
                                              onChange={(e) => setLocalAssetInputs(p => ({...p, [asset]: e.target.value}))} 
                                            />
                                            <button onClick={() => handleApplyAsset(asset)} className="px-2 bg-indigo-600 text-white rounded-lg transition-all active:scale-95">
                                              <i className="fas fa-check text-[10px]"></i>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {detectedAssets.length === 0 && (
                                      <p className="text-[9px] opacity-40 italic text-center">No image assets detected.</p>
                                    )}
                                  </div>
                                </div>
                             </div>
                          </aside>
                          <div className="flex-1 relative bg-[#0b0f19] p-2">
                            {activeTab === 'preview' ? (
                              <PreviewFrame htmlCode={getFullHtmlForPreview()} />
                            ) : (
                              <div className="h-full flex flex-col bg-slate-900 rounded-xl">
                                <textarea 
                                  className="flex-1 bg-transparent p-8 font-mono text-[12px] leading-relaxed text-indigo-100/80 outline-none resize-none selection:bg-indigo-500/30"
                                  value={activeTab === 'html' ? applyCustomizations(generatedCode.html) : (activeTab === 'css' ? generatedCode.css : generatedCode.javascript)}
                                  onChange={(e) => handleManualCodeEdit(activeTab === 'html' ? 'html' : (activeTab === 'css' ? 'css' : 'javascript'), e.target.value)}
                                  spellCheck={false}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </div>
            </main>
          )}
        </div>
        
        {/* Permanent Footer Placement */}
        <div className="mt-auto relative z-10 w-full shrink-0">
          {trademarkFooter}
        </div>
      </div>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
      `}</style>
    </div>
  );
};

export default App;
