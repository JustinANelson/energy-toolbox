import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const ORIFICES: Record<string, { label: string; dia: number }> = {
  '1/64': { label: '1/64" Orifice', dia: 0.015625 },
  '1/32': { label: '1/32" Orifice', dia: 0.03125 },
  '1/16': { label: '1/16" Orifice', dia: 0.0625 },
  '1/8': { label: '1/8" Orifice (Standard Leak)', dia: 0.125 },
  '1/4': { label: '1/4" Orifice (Large Leak)', dia: 0.250 },
  '3/8': { label: '3/8" Orifice (Severe Pipe Rupture)', dia: 0.375 },
};

const DEFAULTS = {
  orifice: '1/8',
  pressure: 100,        // psig
  cost: 0.12,          // $/kWh
  specificPower: 20,   // kW / 100 CFM
  hours: 8760,         // hr/yr (continuous operation)
};

export default function CompressedAir() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { orifice, pressure, cost, specificPower, hours } = state;

  useEffect(() => {
    updateUrlForTool('compressed-air', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const activeOrifice = ORIFICES[orifice] || ORIFICES['1/8'];
  const dia = activeOrifice.dia;

  // CFM Leak = 23.5 * d^2 * (P + 14.7)
  const leakCfm = 23.5 * Math.pow(dia, 2) * (pressure + 14.7);
  const wastedKw = leakCfm * (specificPower / 100);
  const annualCost = wastedKw * hours * cost;
  
  // Equivalent energy lost in MWh
  const annualMwh = (wastedKw * hours) / 1000;

  // Particle speed and amount based on leak size
  const particleRate = dia > 0.2 ? '0.2s' : dia > 0.1 ? '0.5s' : '1.2s';
  const particleSize = dia * 40;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
        </div>
        {/* Orifice Diameter */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Estimated Leak Orifice Size</label>
          <select
            value={orifice}
            onChange={(e) => handleChange('orifice', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          >
            {Object.entries(ORIFICES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label} ({info.dia.toFixed(4)}")
              </option>
            ))}
          </select>
        </div>

        {/* Compressed Air Pressure */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">System Pressure</label>
            <span className="text-sm font-bold text-sky-400">{pressure} psig</span>
          </div>
          <input
            type="range"
            min="70"
            max="150"
            step="5"
            value={pressure}
            onChange={(e) => handleChange('pressure', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Electricity Rate */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Electricity Tariff Rate</label>
            <span className="text-sm font-bold text-amber-400">${cost.toFixed(3)} / kWh</span>
          </div>
          <input
            type="range"
            min="0.04"
            max="0.40"
            step="0.01"
            value={cost}
            onChange={(e) => handleChange('cost', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Compressor Specific Power */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Compressor Specific Power</label>
            <span className="text-sm font-bold text-purple-400">{specificPower} kW / 100 CFM</span>
          </div>
          <input
            type="range"
            min="12"
            max="28"
            value={specificPower}
            onChange={(e) => handleChange('specificPower', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Annual Running Hours */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual System Operating Hours</label>
            <span className="text-sm font-bold text-emerald-400">{hours.toLocaleString()} hr/yr</span>
          </div>
          <input
            type="range"
            min="500"
            max="8760"
            step="250"
            value={hours}
            onChange={(e) => handleChange('hours', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Annual Leakage Cost</p>
            <p className="text-2xl font-black text-red-400 mt-1">
              ${annualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} / yr
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Potential O&M savings value</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Leak Rate</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{leakCfm.toFixed(1)} CFM</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{(leakCfm * 1.699).toFixed(1)} m³/hr</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Compressor Power Waste</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{wastedKw.toFixed(2)} kW</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Continuous power loss at load</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Annual Energy Waste</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{annualMwh.toFixed(1)} MWh</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Equivalent electrical consumption</p>
          </div>
        </div>

        {/* Leak Animation Visualizer */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
          <style>{`
            @keyframes air-leak {
              0% { transform: translateY(0px) scale(0.6); opacity: 0.8; }
              50% { opacity: 0.6; }
              100% { transform: translateY(-70px) scale(2.2); opacity: 0; }
            }
            .leak-puff {
              animation: air-leak ${particleRate} infinite ease-out;
            }
            .leak-puff-2 {
              animation: air-leak ${particleRate} infinite ease-out;
              animation-delay: 0.25s;
            }
          `}</style>
          
          <svg className="w-[240px] h-[150px]" viewBox="0 0 200 120">
            {/* Gray Compressed Air Main Pipe */}
            <rect x="0" y="80" width="200" height="24" fill="#64748b" stroke="#475569" strokeWidth="2" />
            <circle cx="100" cy="80" r={Math.max(2, Math.min(10, particleSize))} fill="#090d16" />
            
            {/* Animated Air Leak particles */}
            <g transform="translate(100, 80)">
              {leakCfm > 0.1 && (
                <>
                  <circle cx="0" cy="0" r={Math.max(2, Math.min(12, particleSize * 1.5))} fill="#38bdf8" fillOpacity="0.4" className="leak-puff" />
                  <circle cx="0" cy="0" r={Math.max(2, Math.min(12, particleSize * 1.2))} fill="#60a5fa" fillOpacity="0.3" className="leak-puff-2" />
                </>
              )}
            </g>

            {/* Label */}
            <text x="100" y="115" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
              {activeOrifice.label} at {pressure} psig
            </text>
          </svg>
          
          <div className="absolute bottom-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Air leakage visualization
          </div>
        </div>
      </div>
    </div>
  );
}
