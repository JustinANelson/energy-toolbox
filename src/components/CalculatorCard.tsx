import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { copyShareLink } from '../utils/queryParams';

interface CalculatorCardProps {
  title: string;
  category: string;
  description: string;
  children: React.ReactNode;
}

export default function CalculatorCard({
  title,
  category,
  description,
  children,
}: CalculatorCardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const success = await copyShareLink();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="glass-panel glass-panel-glow rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              {category}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white m-0">
            {title}
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed m-0">
            {description}
          </p>
        </div>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border transition-all duration-300 ${
            copied
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copied Link!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share Config</span>
            </>
          )}
        </button>
      </div>

      {/* Main Responsive Grid Container */}
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
