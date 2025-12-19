
import React from 'react';

interface NavbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onShowDocs?: () => void;
  onGoHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, onToggleTheme, onShowDocs, onGoHome }) => {
  return (
    <nav className={`w-full h-16 border-b fixed top-0 z-50 flex items-center justify-between px-6 lg:px-10 transition-all duration-500 ${theme === 'dark' ? 'bg-slate-950/80 border-slate-800/50 text-white' : 'bg-white/80 border-slate-200 text-slate-900'} glass`}>
      <div onClick={onGoHome} className="flex items-center gap-3 group cursor-pointer">
        <div className="relative w-9 h-9 flex items-center justify-center">
           <div className="absolute inset-0 bg-indigo-600 rounded-lg transform rotate-6 group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-indigo-500/20"></div>
           <div className="absolute inset-0 bg-slate-900 rounded-lg transform -rotate-3 group-hover:rotate-0 transition-transform duration-300 border border-slate-700"></div>
           <i className="fas fa-code text-indigo-400 text-sm relative z-10"></i>
        </div>
        <div className="flex flex-col leading-none">
          <h1 className="text-lg font-extrabold tracking-tighter">
            DE<span className="text-indigo-500">//</span>CODE
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Design to CODE</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest opacity-60">
          <button onClick={onGoHome} className="hover:text-indigo-500 hover:opacity-100 transition-all">Dashboard</button>
          <button onClick={onShowDocs} className="hover:text-indigo-500 hover:opacity-100 transition-all">Documentation</button>
          <div className="h-4 w-px bg-slate-500/30"></div>
        </div>
        
        <button 
          onClick={onToggleTheme}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-amber-400 hover:border-amber-400/50' : 'bg-slate-50 border-slate-200 text-indigo-600 hover:border-indigo-600/50'}`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
        
        <button className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all transform active:scale-95 shadow-lg shadow-indigo-500/20">
          Pro Account <i className="fas fa-crown text-[10px]"></i>
        </button>
      </div>
    </nav>
  );
};
