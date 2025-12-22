
import React, { useState, useEffect } from 'react';

interface TechnicalTerminalProps {
  isError?: boolean;
  errorMessage?: string;
}

const LOG_MESSAGES = [
  "Initializing DE-CODE Pro CODE Rev 5.2...",
  "Establishing Gemini 3 Pro secure stream...",
  "Uploading 11,000px high-res vision context...",
  "Analyzing visual hierarchy & typography...",
  "Mapping 12-column responsive grid...",
  "Detecting sections: Hero, Speakers, Agenda...",
  "Synthesizing Tailwind utility classes...",
  "Compiling semantic HTML5 structure...",
  "Injecting Backend Asset placeholders...",
  "Applying Inter (Variable) font weight mapping...",
  "Finalizing production-grade manifest...",
];

const THINKING_SNIPPETS = [
  "<section class='py-20 bg-white'>",
  "flex flex-col lg:flex-row gap-8",
  "text-4xl font-extrabold tracking-tight",
  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  "shadow-[0_20px_50px_rgba(0,0,0,0.1)]",
  "{{ASSET_ID_HERO_BG}}",
  "const [open, setOpen] = useState(false);",
  "rounded-[2.5rem] overflow-hidden border",
  "transition-all duration-700 ease-in-out",
];

export const TechnicalTerminal: React.FC<TechnicalTerminalProps> = ({ isError, errorMessage }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [thought, setThought] = useState("");

  useEffect(() => {
    if (isError) {
      const errorMsg = errorMessage || "Design too complex for current token budget.";
      setLogs(prev => [...prev, `ERROR: ${errorMsg}`]);
      return;
    }

    let logIndex = 0;
    const logInterval = setInterval(() => {
      if (logIndex < LOG_MESSAGES.length) {
        setLogs(prev => [...prev, LOG_MESSAGES[logIndex]].slice(-6));
        logIndex++;
      }
    }, 1000);

    let thoughtIndex = 0;
    const thoughtInterval = setInterval(() => {
      setThought(prev => (prev + " " + THINKING_SNIPPETS[thoughtIndex % THINKING_SNIPPETS.length]).slice(-120));
      thoughtIndex++;
    }, 400);

    return () => {
      clearInterval(logInterval);
      clearInterval(thoughtInterval);
    };
  }, [isError]);

  return (
    <div className="w-full max-w-lg flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Code Thinking Stream */}
      {!isError && (
        <div className="h-8 overflow-hidden font-mono text-[9px] text-indigo-500/30 whitespace-nowrap mask-fade-edges">
          {thought}
        </div>
      )}

      {/* Terminal logs */}
      <div className={`bg-black/80 border ${isError ? 'border-red-500/40' : 'border-slate-800/80'} rounded-3xl p-7 font-mono text-[10px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl`}>
        <div className="flex gap-2 mb-5 border-b border-slate-800/50 pb-4 items-center">
          <div className={`w-2 h-2 rounded-full ${isError ? 'bg-red-500' : 'bg-indigo-500 animate-pulse'}`}></div>
          <span className="text-[8px] font-black tracking-[0.3em] uppercase opacity-30">Neural CODE Pulse</span>
          {isError && <span className="ml-auto text-red-500 text-[8px] font-bold">SYNTHESIS_FAIL</span>}
        </div>
        
        <div className="space-y-3 h-40 flex flex-col justify-end overflow-hidden">
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-4 transition-all duration-500 ${i === logs.length - 1 ? "opacity-100 translate-x-2" : "opacity-30"}`}>
              <span className="text-slate-700 select-none">#</span>
              <span className={log?.startsWith("ERROR") ? "text-red-400" : "text-indigo-200"}>{log}</span>
            </div>
          ))}
          {!isError && (
            <div className="flex gap-2 items-center opacity-40 ml-2">
              <div className="w-1 h-3 bg-indigo-500 animate-caret"></div>
              <span className="text-[8px] italic">compiling visual primitives...</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <h4 className={`text-[10px] font-black uppercase tracking-[0.6em] ${isError ? 'text-red-400' : 'text-indigo-400 animate-pulse'}`}>
          {isError ? "Synthesis Aborted" : "Synthesizing Design"}
        </h4>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest opacity-50">
          Pro CODE using Gemini 3 Pro
        </p>
      </div>

      <style>{`
        .mask-fade-edges {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
        @keyframes caret {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .animate-caret {
          animation: caret 0.8s infinite;
        }
      `}</style>
    </div>
  );
};
