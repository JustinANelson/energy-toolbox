import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  cfm: 5000,     // CFM
  sp: 2.0,       // in. w.g.
  fanEff: 70,    // %
  motorEff: 92,  // %
};

export default function FanPower() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { cfm, sp, fanEff, motorEff } = state;

  useEffect(() => {
    updateUrlForTool('fan-power', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const airHp = (cfm * sp) / 6356;
  const bhp = airHp / (fanEff / 100);
  const electricalKw = (bhp * 0.7457) / (motorEff / 100);

  // Dynamic animation duration based on CFM
  const spinDuration = Math.max(0.2, Math.min(10, 25000 / cfm));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
        </div>
        {/* Airflow */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Airflow Rate</label>
            <span className="text-sm font-bold text-emerald-400">{cfm.toLocaleString()} CFM</span>
          </div>
          <input
            type="range"
            min="500"
            max="40000"
            step="500"
            value={cfm}
            onChange={(e) => handleChange('cfm', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <input
            type="number"
            value={cfm}
            onChange={(e) => handleChange('cfm', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Static Pressure */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Static Pressure</label>
            <span className="text-sm font-bold text-sky-400">{sp.toFixed(2)} in. w.g.</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={sp}
            onChange={(e) => handleChange('sp', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <input
            type="number"
            step="0.01"
            value={sp}
            onChange={(e) => handleChange('sp', Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        {/* Fan Efficiency */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Fan Efficiency</label>
            <span className="text-sm font-bold text-amber-400">{fanEff} %</span>
          </div>
          <input
            type="range"
            min="30"
            max="95"
            value={fanEff}
            onChange={(e) => handleChange('fanEff', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <input
            type="number"
            value={fanEff}
            onChange={(e) => handleChange('fanEff', Math.max(1, Math.min(100, parseInt(e.target.value) || 0)))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Motor Efficiency */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Motor Efficiency</label>
            <span className="text-sm font-bold text-purple-400">{motorEff} %</span>
          </div>
          <input
            type="range"
            min="50"
            max="98"
            value={motorEff}
            onChange={(e) => handleChange('motorEff', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <input
            type="number"
            value={motorEff}
            onChange={(e) => handleChange('motorEff', Math.max(1, Math.min(100, parseInt(e.target.value) || 0)))}
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Electric Power Input</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{electricalKw.toFixed(2)} kW</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{(electricalKw * 1.341).toFixed(2)} HP equivalent</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Brake Power (BHP)</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{bhp.toFixed(2)} HP</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Required at fan shaft</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Air Power (AHP)</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{airHp.toFixed(2)} HP</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Ideal power with 100% eff.</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Combined Efficiency</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{((fanEff * motorEff) / 100).toFixed(1)} %</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Fan Efficiency × Motor Efficiency</p>
          </div>
        </div>

        {/* Fan Animation SVG */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
          <style>{`
            @keyframes fan-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .fan-blades {
              transform-origin: 100px 100px;
              animation: fan-spin ${spinDuration}s linear infinite;
            }
          `}</style>
          
          <svg className="w-[180px] h-[180px]" viewBox="0 0 200 200">
            {/* Fan Housing Outer */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="#334155" strokeWidth="4" />
            <circle cx="100" cy="100" r="70" fill="#1e293b" />
            
            {/* Air discharge nozzle */}
            <path d="M 170 100 L 210 100 L 210 170 L 140 150 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <path d="M 180 110 L 205 110" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
            <path d="M 180 130 L 205 130" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
            <path d="M 180 150 L 205 150" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
            
            {/* Blades group with animation */}
            <g className="fan-blades">
              {/* Hub */}
              <circle cx="100" cy="100" r="15" fill="#475569" stroke="#64748b" strokeWidth="2" />
              {/* Blade 1 */}
              <path d="M 100 85 C 115 85, 120 50, 100 35 C 80 50, 85 85, 100 85 Z" fill="#334155" stroke="#475569" />
              {/* Blade 2 */}
              <path d="M 115 100 C 115 115, 150 120, 165 100 C 150 80, 115 85, 115 100 Z" fill="#334155" stroke="#475569" />
              {/* Blade 3 */}
              <path d="M 100 115 C 85 115, 80 150, 100 165 C 120 150, 115 115, 100 115 Z" fill="#334155" stroke="#475569" />
              {/* Blade 4 */}
              <path d="M 85 100 C 85 85, 50 80, 35 100 C 50 120, 85 115, 85 100 Z" fill="#334155" stroke="#475569" />
            </g>

            {/* Fan Center cap */}
            <circle cx="100" cy="100" r="5" fill="#f8fafc" />
          </svg>
          
          <div className="absolute bottom-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Air Flow Speed Visualized
          </div>
        </div>
      </div>
    </div>
  );
}
