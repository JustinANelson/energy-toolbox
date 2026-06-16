import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  flow: 120, // GPM
  tempIn: 54, // °F
  tempOut: 44, // °F
  power: 80, // kW
};

export default function ChillerTonnage() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { flow, tempIn, tempOut, power } = state;

  useEffect(() => {
    updateUrlForTool('chiller-tonnage', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const deltaT = Math.max(0, tempIn - tempOut);
  const capacityBtuHr = flow * 500 * deltaT;
  const tonnage = capacityBtuHr / 12000;
  
  const kwPerTon = tonnage > 0.01 ? power / tonnage : 0;
  const cop = power > 0 ? (tonnage * 3.51685) / power : 0;
  const eer = power > 0 ? (tonnage * 12) / power : 0;

  // Efficiency Evaluation
  let efficiencyRating = 'Good';
  let ratingColor = 'text-emerald-400';
  if (kwPerTon > 0.85) {
    efficiencyRating = 'Poor';
    ratingColor = 'text-red-400';
  } else if (kwPerTon > 0.65) {
    efficiencyRating = 'Standard';
    ratingColor = 'text-amber-400';
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
        </div>
        {/* Flow Rate */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Chilled Water Flow</label>
            <span className="text-sm font-bold text-emerald-400">{flow} GPM</span>
          </div>
          <input
            type="range"
            min="10"
            max="1000"
            step="5"
            value={flow}
            onChange={(e) => handleChange('flow', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <input
            type="number"
            value={flow}
            onChange={(e) => handleChange('flow', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Entering Water Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Entering Chilled Water (T-in)</label>
            <span className="text-sm font-bold text-sky-400">{tempIn} °F</span>
          </div>
          <input
            type="range"
            min="42"
            max="80"
            value={tempIn}
            onChange={(e) => handleChange('tempIn', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <input
            type="number"
            value={tempIn}
            onChange={(e) => handleChange('tempIn', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        {/* Leaving Water Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Leaving Chilled Water (T-out)</label>
            <span className="text-sm font-bold text-sky-500">{tempOut} °F</span>
          </div>
          <input
            type="range"
            min="36"
            max="65"
            value={tempOut}
            onChange={(e) => handleChange('tempOut', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <input
            type="number"
            value={tempOut}
            onChange={(e) => handleChange('tempOut', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        {/* Compressor Power Input */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Compressor Electrical Load</label>
            <span className="text-sm font-bold text-purple-400">{power} kW</span>
          </div>
          <input
            type="range"
            min="10"
            max="500"
            step="5"
            value={power}
            onChange={(e) => handleChange('power', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <input
            type="number"
            value={power}
            onChange={(e) => handleChange('power', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Live Calculated Results</h3>
        </div>
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cooling Capacity</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{tonnage.toFixed(1)} Tons</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{(capacityBtuHr / 1000).toFixed(0)} kBTU/hr</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Efficiency Rating</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{cop.toFixed(2)} COP</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{eer.toFixed(2)} EER</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Chiller Performance</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{kwPerTon.toFixed(3)} kW/Ton</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Lower is better</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">System Delta-T</p>
            <p className={`text-2xl font-black mt-1 ${ratingColor}`}>{deltaT.toFixed(1)} °F</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Rating: {efficiencyRating}</p>
          </div>
        </div>

        {/* SVG Visualization */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[220px]">
          <svg className="w-full max-w-[400px] h-[180px]" viewBox="0 0 400 180">
            {/* Chiller Unit Box */}
            <rect x="120" y="40" width="160" height="100" rx="12" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <text x="200" y="95" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">CHILLER EVAP</text>
            
            {/* Warm Loop (Entering) */}
            <path d="M 20 60 L 120 60" fill="none" stroke="#f87171" strokeWidth="6" strokeLinecap="round" />
            <polygon points="120,60 110,55 110,65" fill="#f87171" />
            <text x="35" y="48" fill="#f87171" fontSize="10" fontWeight="bold">Warm In</text>
            <text x="35" y="78" fill="#f87171" fontSize="11" fontWeight="extrabold">{tempIn.toFixed(0)}°F</text>

            {/* Cold Loop (Leaving) */}
            <path d="M 120 120 L 20 120" fill="none" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
            <polygon points="20,120 30,115 30,125" fill="#38bdf8" />
            <text x="35" y="108" fill="#38bdf8" fontSize="10" fontWeight="bold">Chilled Out</text>
            <text x="35" y="138" fill="#38bdf8" fontSize="11" fontWeight="extrabold">{tempOut.toFixed(0)}°F</text>

            {/* Water Flow Animation Indicator */}
            <circle cx="70" cy="60" r="3" fill="#ffffff" className="animate-ping" />
            <circle cx="70" cy="120" r="3" fill="#ffffff" className="animate-ping" />

            {/* Compressor Electricity Inlet */}
            <path d="M 200 180 L 200 140" fill="none" stroke="#c084fc" strokeWidth="4" strokeDasharray="4 2" />
            <text x="250" y="165" fill="#c084fc" fontSize="10" fontWeight="bold" textAnchor="middle">{power.toFixed(0)} kW input</text>

            {/* Cooling output labels */}
            <text x="200" y="30" fill="#34d399" fontSize="12" fontWeight="extrabold" textAnchor="middle">{tonnage.toFixed(1)} Tons Cooling Capacity</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
