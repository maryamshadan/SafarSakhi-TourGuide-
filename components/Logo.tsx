import React from 'react';
import { Language } from '../types';

export const Logo = ({ 
  className = "w-10 h-10", 
  showText = false, 
  language = 'en' 
}: { 
  className?: string; 
  showText?: boolean; 
  language?: Language; 
}) => (
  <div className="flex items-center gap-2.5">
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className="absolute inset-0 bg-primary-500/20 rounded-2xl blur-md"></div>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full relative z-10 drop-shadow-sm">
        {/* Outer Circular Badge */}
        <circle cx="50" cy="50" r="46" fill="white" stroke="#2563EB" strokeWidth="3" />
        {/* Minaret / Architectural Dome Motif (Charminar / Kakatiya arch silhouette) */}
        <path d="M50 18C53.5 18 56 21 56 25V34H44V25C44 21 46.5 18 50 18Z" fill="#2563EB" />
        <path d="M34 46C34 38 41 34 50 34C59 34 66 38 66 46V54H34V46Z" fill="#1D4ED8" />
        <path d="M26 54H74V80H26V54Z" fill="#2563EB" />
        {/* Grand Arch Gateway */}
        <path d="M38 80V60C38 53.37 43.37 48 50 48C56.63 48 62 53.37 62 60V80H38Z" fill="white" />
        {/* Guiding Navigation Beacon */}
        <circle cx="50" cy="62" r="4.5" fill="#F97316" />
        <path d="M50 56V52M50 72V68M44 62H40M60 62H56" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
        {/* Safety Shield Accent */}
        <path d="M72 20C72 16 67 12 62 12C57 12 52 16 52 20C52 26 62 34 62 34C62 34 72 26 72 20Z" fill="#10B981" />
        <circle cx="62" cy="20" r="3" fill="white" />
      </svg>
    </div>
    {showText && (
      <div className="flex flex-col select-none">
        <div className="flex items-center gap-1.5">
          <span className="font-sans font-black text-slate-900 dark:text-white text-lg tracking-tight leading-none">TourGuide</span>
          <span className="text-[8px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">Telangana</span>
        </div>
        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-tight mt-0.5">Heritage & Safe Navigation</span>
      </div>
    )}
  </div>
);
