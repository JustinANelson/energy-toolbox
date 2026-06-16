import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  pH: 7.8,
  tempF: 120, // °F
  calcium: 150, // mg/L as CaCO3 (Calcium Hardness)
  alkalinity: 120, // mg/L as CaCO3 (Total Alkalinity)
  tds: 400, // mg/L (Total Dissolved Solids)
};

export default function LangelierSatIndex() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));
  const { pH, tempF, calcium, alkalinity, tds } = state;

  useEffect(() => {
    updateUrlForTool('langelier-index', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Calculations
  const tempC = ((tempF - 32) * 5) / 9;

  // LSI Factors
  const A = (Math.log10(Math.max(1, tds)) - 1) / 10;
  const B = -13.12 * Math.log10(tempC + 273.15) + 34.55;
  const C = Math.log10(Math.max(0.1, calcium)) - 0.4;
  const D = Math.log10(Math.max(0.1, alkalinity));

  const pHs = (9.3 + A + B) - (C + D);
  const lsi = pH - pHs;
  const rsi = 2 * pHs - pH;

  // LSI assessment
  let lsiStatus = 'Balanced / Stable';
  let lsiColor = 'text-emerald-400';
  let pipeVisual = 'balanced'; // corrosive, scale, balanced
  if (lsi > 0.5) {
    lsiStatus = 'Scale Forming (Calcite Precipitating)';
    lsiColor = 'text-amber-400';
    pipeVisual = 'scale';
  } else if (lsi < -0.5) {
    lsiStatus = 'Corrosive (Under-saturated)';
    lsiColor = 'text-red-400';
    pipeVisual = 'corrosive';
  }

  // RSI assessment
  let rsiStatus = 'Balanced';
  let rsiColor = 'text-emerald-400';
  if (rsi < 5.5) {
    rsiStatus = 'Severe Scaling';
    rsiColor = 'text-red-500';
  } else if (rsi >= 5.5 && rsi < 6.2) {
    rsiStatus = 'Moderate Scaling';
    rsiColor = 'text-amber-400';
  } else if (rsi >= 6.2 && rsi <= 6.8) {
    rsiStatus = 'Neutral / Balanced';
    rsiColor = 'text-emerald-400';
  } else if (rsi > 6.8 && rsi <= 8.5) {
    rsiStatus = 'Moderate Corrosion';
    rsiColor = 'text-orange-400';
  } else {
    rsiStatus = 'Severe Corrosion';
    rsiColor = 'text-red-400';
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Water Chemistry Inputs</h3>
        </div>

        {/* pH */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">pH</label>
            <span className="text-sm font-bold text-sky-400">{pH.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="6.0"
            max="10.0"
            step="0.05"
            value={pH}
            onChange={(e) => handleChange('pH', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Water Temperature</label>
            <span className="text-sm font-bold text-sky-500">{tempF} °F ({tempC.toFixed(1)} °C)</span>
          </div>
          <input
            type="range"
            min="40"
            max="200"
            value={tempF}
            onChange={(e) => handleChange('tempF', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Calcium Hardness */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Calcium Hardness (as CaCO₃)</label>
            <span className="text-sm font-bold text-purple-400">{calcium} mg/L</span>
          </div>
          <input
            type="range"
            min="10"
            max="800"
            step="10"
            value={calcium}
            onChange={(e) => handleChange('calcium', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <input
            type="number"
            value={calcium}
            onChange={(e) => handleChange('calcium', Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Total Alkalinity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Total Alkalinity (as CaCO₃)</label>
            <span className="text-sm font-bold text-emerald-400">{alkalinity} mg/L</span>
          </div>
          <input
            type="range"
            min="10"
            max="600"
            step="5"
            value={alkalinity}
            onChange={(e) => handleChange('alkalinity', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <input
            type="number"
            value={alkalinity}
            onChange={(e) => handleChange('alkalinity', Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* TDS */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Total Dissolved Solids (TDS)</label>
            <span className="text-sm font-bold text-slate-300">{tds} mg/L</span>
          </div>
          <input
            type="range"
            min="10"
            max="3000"
            step="20"
            value={tds}
            onChange={(e) => handleChange('tds', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-500"
          />
          <input
            type="number"
            value={tds}
            onChange={(e) => handleChange('tds', Math.max(1, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500/50"
          />
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Stability Indices</h3>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Langelier Index (LSI)</p>
            <p className={`text-2xl font-black mt-1 ${lsiColor}`}>{lsi > 0 ? `+${lsi.toFixed(2)}` : lsi.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Status: {lsiStatus}</p>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ryznar Index (RSI)</p>
            <p className={`text-2xl font-black mt-1 ${rsiColor}`}>{rsi.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Status: {rsiStatus}</p>
          </div>
        </div>

        {/* Indicator Scale Bars */}
        <div className="space-y-4 p-4 bg-slate-900/30 border border-slate-800/80 rounded-xl">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">LSI Index Spectrum</h4>
          <div className="relative pt-4">
            {/* Range Bar */}
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-500 via-emerald-500 to-amber-500"></div>
            {/* Ticks */}
            <div className="flex justify-between text-[9px] text-slate-500 font-semibold mt-1.5 uppercase">
              <span>Corrosive (-2.0)</span>
              <span>Balanced (0.0)</span>
              <span>Scaling (+2.0)</span>
            </div>
            {/* Pointer */}
            {lsi >= -2 && lsi <= 2 && (
              <div 
                className="absolute top-1.5 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${((lsi + 2) / 4) * 100}%` }}
              >
                <div className="w-2.5 h-2.5 bg-white rounded-full border border-slate-900 shadow-md"></div>
                <span className="text-[9px] font-bold text-white mt-0.5">{lsi > 0 ? `+${lsi.toFixed(1)}` : lsi.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Pipe SVG Visualization */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[220px]">
          <svg className="w-full max-w-[400px] h-[180px]" viewBox="0 0 400 180">
            {/* Steel Pipe outer wall */}
            <rect x="50" y="50" width="300" height="80" fill="#334155" stroke="#475569" strokeWidth="2" rx="4" />
            
            {/* Flow stream channel */}
            <rect x="50" y="62" width="300" height="56" fill="#0284c7" fillOpacity="0.4" />
            <path d="M 60 90 L 340 90" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="6 15" strokeLinecap="round" className="animate-pulse" />

            {/* Corrosive visual - rust pitting */}
            {pipeVisual === 'corrosive' && (
              <g>
                {/* Rust deposits on inside */}
                <circle cx="120" cy="62" r="3" fill="#ea580c" />
                <circle cx="220" cy="118" r="4" fill="#ea580c" />
                <circle cx="180" cy="116" r="3" fill="#ea580c" />
                <circle cx="280" cy="64" r="5" fill="#ea580c" />
                {/* Corrosion pits */}
                <path d="M 115 50 Q 120 58 125 50" fill="none" stroke="#ea580c" strokeWidth="2.5" />
                <path d="M 275 50 Q 280 59 285 50" fill="none" stroke="#ea580c" strokeWidth="2.5" />
                <path d="M 215 130 Q 220 120 225 130" fill="none" stroke="#ea580c" strokeWidth="2.5" />
                
                <text x="200" y="165" fill="#f87171" fontSize="11" fontWeight="bold" textAnchor="middle">CORROSIVE WATER - DISSOLVES STEEL & COPPER</text>
              </g>
            )}

            {/* Scale forming visual - calcite layers */}
            {pipeVisual === 'scale' && (
              <g>
                {/* White calcite layer narrowing the flow */}
                <rect x="50" y="60" width="300" height="8" fill="#e2e8f0" rx="1" />
                <rect x="50" y="112" width="300" height="8" fill="#e2e8f0" rx="1" />
                {/* Clumpy deposit look */}
                <path d="M 80 68 Q 95 74 110 68 M 200 68 Q 220 76 240 68 M 150 112 Q 170 104 190 112" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                
                <text x="200" y="165" fill="#facc15" fontSize="11" fontWeight="bold" textAnchor="middle">SCALE FORMING - CALCITE CLOGS HEAT EXCHANGERS</text>
              </g>
            )}

            {/* Balanced pipe */}
            {pipeVisual === 'balanced' && (
              <g>
                {/* Faint passivated protection layer */}
                <rect x="50" y="61" width="300" height="2.5" fill="#10b981" fillOpacity="0.8" />
                <rect x="50" y="116.5" width="300" height="2.5" fill="#10b981" fillOpacity="0.8" />
                
                <text x="200" y="165" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle">BALANCED WATER - STABLE THERMAL LOOPS</text>
              </g>
            )}

            <text x="200" y="38" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">CLOSED LOOP INNER PIPE ANALYSIS</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
