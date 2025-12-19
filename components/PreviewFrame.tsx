
import React, { useEffect, useRef, useState } from 'react';

interface PreviewFrameProps {
  htmlCode: string;
}

export const PreviewFrame: React.FC<PreviewFrameProps> = ({ htmlCode }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlCode);
        doc.close();
      }
    }
  }, [htmlCode, viewMode]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Device Toggle Bar */}
      <div className="h-12 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div>
        </div>
        
        <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
          <button 
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'desktop' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fas fa-desktop"></i> Desktop
          </button>
          <button 
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'mobile' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i className="fas fa-mobile-alt"></i> Mobile
          </button>
        </div>

        <div className="w-20"></div> {/* Spacer for balance */}
      </div>

      {/* Frame Container */}
      <div className="flex-1 bg-slate-950 overflow-auto flex justify-center p-4 scrollbar-hide">
        <div 
          className={`transition-all duration-500 ease-in-out bg-white shadow-2xl overflow-hidden h-full ${
            viewMode === 'mobile' ? 'w-[375px] rounded-[3rem] border-[8px] border-slate-800 ring-4 ring-slate-900' : 'w-full rounded-lg'
          }`}
        >
          <iframe
            ref={iframeRef}
            title="Design Preview"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
