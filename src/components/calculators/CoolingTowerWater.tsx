import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  flow: 1500, // GPM (Circulation rate)
  range: 10, // °F (Temp difference across tower)
  currentCoc: 3.0, // Current cycles of concentration
  targetCoc: 6.0, // Target cycles of concentration
  waterCost: 4.5, // $/1000 gal
  sewerCost: 6.5, // $/1000 gal
  hours: 8760, // Operating hours per year
};

export default function CoolingTowerWater() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { flow, range, currentCoc, targetCoc, waterCost, sewerCost, hours } = state;

  useEffect(() => {
    updateUrlForTool('cooling-tower-water', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Calculations
  // Evaporation Rate E = 0.0008 * Flow * Range
  const evaporation = 0.0008 * flow * range; // GPM
  
  // Drift Rate D = 0.0002 * Flow (assuming 0.02% drift)
  const drift = 0.0002 * flow; // GPM

  // Current blowdown and makeup
  const currentBlowdown = Math.max(0, evaporation / (currentCoc - 1) - drift); // GPM
  const currentMakeup = evaporation + currentBlowdown + drift; // GPM

  // Target blowdown and makeup
  const targetBlowdown = Math.max(0, evaporation / (targetCoc - 1) - drift); // GPM
  const targetMakeup = evaporation + targetBlowdown + drift; // GPM

  // Savings
  const savedGpm = Math.max(0, currentMakeup - targetMakeup);
  const annualSavedGal = savedGpm * 60 * hours;
  const annualSavings = (annualSavedGal / 1000) * (waterCost + sewerCost);

  // Evaporation and Makeup volumes
  const annualMakeupGal = currentMakeup * 60 * hours;
  const annualBlowdownGal = currentBlowdown * 60 * hours;

  // Efficiency rating
  let efficiencyText = 'Standard';
  let ratingColor = 'text-amber-400';
  if (currentCoc >= 6.0) {
    efficiencyText = 'Excellent';
    ratingColor = 'text-emerald-400';
  } else if (currentCoc < 3.0) {
    efficiencyText = 'Low / Wasteful';
    ratingColor = 'text-red-400';
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Tower Operating Inputs</h3>
        </div>

        {/* Circulation Flow Rate */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Circulation Pump Flow</label>
            <span className="text-sm font-bold text-sky-400">{flow} GPM</span>
          </div>
          <input
            type="range"
            min="100"
            max="10000"
            step="100"
            value={flow}
            onChange={(e) => handleChange('flow', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <input
            type="number"
            value={flow}
            onChange={(e) => handleChange('flow', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        {/* Tower Range */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Cooling Range (Delta-T)</label>
            <span className="text-sm font-bold text-sky-500">{range} °F</span>
          </div>
          <input
            type="range"
            min="2"
            max="30"
            value={range}
            onChange={(e) => handleChange('range', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <input
            type="number"
            value={range}
            onChange={(e) => handleChange('range', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        {/* Cycles of Concentration (CoC) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Cycles</label>
            <input
              type="number"
              step="0.1"
              min="1.2"
              max="20"
              value={currentCoc}
              onChange={(e) => handleChange('currentCoc', Math.max(1.2, parseFloat(e.target.value) || 1.2))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
            <input
              type="range"
              min="1.5"
              max="10"
              step="0.1"
              value={currentCoc}
              onChange={(e) => handleChange('currentCoc', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Target Cycles</label>
            <input
              type="number"
              step="0.1"
              min="1.5"
              max="20"
              value={targetCoc}
              onChange={(e) => handleChange('targetCoc', Math.max(1.5, parseFloat(e.target.value) || 1.5))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500/50"
            />
            <input
              type="range"
              min="2"
              max="15"
              step="0.1"
              value={targetCoc}
              onChange={(e) => handleChange('targetCoc', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>

        {/* Utility Rates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Water Rate ($/kGal)</label>
            <input
              type="number"
              step="0.1"
              value={waterCost}
              onChange={(e) => handleChange('waterCost', Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sewer Rate ($/kGal)</label>
            <input
              type="number"
              step="0.1"
              value={sewerCost}
              onChange={(e) => handleChange('sewerCost', Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500/50"
            />
          </div>
        </div>

        {/* Running Hours */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual Running Hours</label>
            <span className="text-sm font-bold text-slate-300">{hours} hrs/yr</span>
          </div>
          <input
            type="range"
            min="500"
            max="8760"
            step="100"
            value={hours}
            onChange={(e) => handleChange('hours', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-500"
          />
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Live Calculated Results</h3>
        </div>

        {/* Savings Alert Panel */}
        {annualSavings > 0.01 && (
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="text-sm font-bold text-emerald-400">Cycles Optimization Savings</h4>
              <p className="text-xs text-slate-400 mt-0.5">By increasing Cycles of Concentration from {currentCoc.toFixed(1)} to {targetCoc.toFixed(1)}:</p>
            </div>
            <div className="text-right md:text-right">
              <p className="text-xl font-black text-emerald-400">${annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{(annualSavedGal / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} kGal Water Saved/yr</p>
            </div>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Evaporation Rate (E)</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{evaporation.toFixed(1)} GPM</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Constant (latent heat load)</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Makeup (M)</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{currentMakeup.toFixed(1)} GPM</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{(annualMakeupGal / 1000000).toFixed(2)} MGal/yr total buy</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Blowdown (B)</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{currentBlowdown.toFixed(1)} GPM</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{(annualBlowdownGal / 1000000).toFixed(2)} MGal/yr to sewer</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current CoC Rating</p>
            <p className={`text-2xl font-black mt-1 ${ratingColor}`}>{efficiencyText}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Current Cycles: {currentCoc.toFixed(1)}</p>
          </div>
        </div>

        {/* Cooling Tower SVG Flow Diagram */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[220px]">
          <svg className="w-full max-w-[400px] h-[190px]" viewBox="0 0 400 190">
            {/* Cooling Tower structure */}
            <path d="M 150 40 L 250 40 L 270 120 L 130 120 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            
            {/* Basin */}
            <rect x="120" y="120" width="160" height="20" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1.5" rx="3" />
            
            {/* Fan housing */}
            <rect x="180" y="25" width="40" height="15" fill="#475569" rx="2" />
            <line x1="185" y1="32" x2="215" y2="32" stroke="#cbd5e1" strokeWidth="3" />
            
            {/* Evaporation (Upwards arrows) */}
            <path d="M 200 20 L 200 5 M 190 20 L 190 8 M 210 20 L 210 8" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
            <text x="200" y="0" fill="#e2e8f0" fontSize="9" fontWeight="bold" textAnchor="middle">Evaporation: {evaporation.toFixed(1)} GPM</text>

            {/* Makeup Water (Left side input) */}
            <path d="M 20 130 L 120 130" fill="none" stroke="#06b6d4" strokeWidth="4" />
            <polygon points="120,130 110,126 110,134" fill="#06b6d4" />
            <text x="70" y="120" fill="#06b6d4" fontSize="10" fontWeight="bold" textAnchor="middle">Makeup: {currentMakeup.toFixed(1)} GPM</text>
            
            {/* Circulation Loops */}
            {/* Warm Water to tower (Top inlet) */}
            <path d="M 280 145 C 340 145 340 60 250 60" fill="none" stroke="#f87171" strokeWidth="3" />
            <polygon points="250,60 260,56 260,64" fill="#f87171" />
            <text x="325" y="100" fill="#f87171" fontSize="9" fontWeight="bold">Warm return ({flow} GPM)</text>

            {/* Chilled water out of basin */}
            <path d="M 280 130 L 310 130 C 330 130 330 155 310 155 L 280 155" fill="none" stroke="#38bdf8" strokeWidth="3" />
            
            {/* Blowdown (Right side output) */}
            <path d="M 200 135 L 200 175 L 300 175" fill="none" stroke="#f59e0b" strokeWidth="3" />
            <polygon points="300,175 290,171 290,179" fill="#f59e0b" />
            <text x="250" y="168" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">Blowdown: {currentBlowdown.toFixed(1)} GPM</text>

            {/* Labels */}
            <text x="200" y="85" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">COOLING TOWER</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
