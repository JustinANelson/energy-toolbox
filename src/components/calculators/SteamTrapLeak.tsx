import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  pressure: 100, // psig
  diameter: 0.125, // inches (1/8")
  severity: 0.5, // 0.2 = Leaking, 0.5 = Blowing, 1.0 = Stuck Open
  hours: 8760, // hrs/yr
  cost: 18, // $/klb of steam
};

const ORIFICE_OPTIONS = [
  { label: '1/32"', value: 0.03125 },
  { label: '1/16"', value: 0.0625 },
  { label: '3/32"', value: 0.09375 },
  { label: '1/8" (Std)', value: 0.125 },
  { label: '3/16"', value: 0.1875 },
  { label: '1/4"', value: 0.25 },
  { label: '3/8"', value: 0.375 },
  { label: '1/2"', value: 0.5 },
];

export default function SteamTrapLeak() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { pressure, diameter, severity, hours, cost } = state;

  useEffect(() => {
    updateUrlForTool('steam-trap-leak', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Calculations
  // Napier's Formula: Flow (lb/hr) = 40.43 * D^2 * P_absolute * C_d (severity)
  const pAbs = pressure + 14.696;
  const flowRate = 40.43 * Math.pow(diameter, 2) * pAbs * severity; // lb/hr
  const annualLossLbs = flowRate * hours;
  const annualLossKlb = annualLossLbs / 1000;
  const annualCost = annualLossKlb * cost;

  // Energy Loss (assuming ~1,000 Btu/lb of steam enthalpy change)
  const annualEnergyMmbtu = annualLossLbs / 1000; // 1,000 Btu/lb * lbs / 1,000,000 = lbs / 1,000 = Klb
  
  // Carbon Emissions: EPA Natural Gas factor ~117.3 lb CO2 per MMBtu, assuming 80% boiler efficiency
  const co2EmissionsMt = (annualEnergyMmbtu * 117.3) / (0.8 * 2204.62);
  const carsEquivalent = co2EmissionsMt / 4.6; // 1 car = 4.6 MT CO2e/yr

  // Visual severity label
  let severityLabel = 'Blowing';
  let severityColor = 'text-amber-400';
  if (severity <= 0.25) {
    severityLabel = 'Leaking';
    severityColor = 'text-sky-400';
  } else if (severity > 0.75) {
    severityLabel = 'Stuck Fully Open';
    severityColor = 'text-red-400';
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Trap & Steam Inputs</h3>
        </div>

        {/* Steam Pressure */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Steam Pressure</label>
            <span className="text-sm font-bold text-sky-400">{pressure} psig</span>
          </div>
          <input
            type="range"
            min="2"
            max="300"
            value={pressure}
            onChange={(e) => handleChange('pressure', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <input
            type="number"
            value={pressure}
            onChange={(e) => handleChange('pressure', Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        {/* Orifice Diameter */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Orifice Diameter (inches)</label>
            <span className="text-sm font-bold text-emerald-400">{diameter.toFixed(5)}"</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {ORIFICE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange('diameter', opt.value)}
                className={`py-1 text-xs font-semibold rounded border transition-all ${
                  Math.abs(diameter - opt.value) < 0.0001
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            type="number"
            step="0.001"
            value={diameter}
            onChange={(e) => handleChange('diameter', Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Leak Severity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Leak Severity / Trap State</label>
            <span className={`text-sm font-bold ${severityColor}`}>{severityLabel} ({Math.round(severity * 100)}%)</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.00"
            step="0.05"
            value={severity}
            onChange={(e) => handleChange('severity', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-semibold uppercase">
            <span>Minor (5%)</span>
            <span>Blowing (50%)</span>
            <span>Stuck Open (100%)</span>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Operating Hours</label>
            <span className="text-sm font-bold text-slate-300">{hours} hrs/yr</span>
          </div>
          <input
            type="range"
            min="100"
            max="8760"
            step="100"
            value={hours}
            onChange={(e) => handleChange('hours', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-500"
          />
          <input
            type="number"
            value={hours}
            onChange={(e) => handleChange('hours', Math.min(8760, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500/50"
          />
        </div>

        {/* Steam Cost */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Steam Cost</label>
            <span className="text-sm font-bold text-purple-400">${cost} / klb</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            value={cost}
            onChange={(e) => handleChange('cost', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <input
            type="number"
            value={cost}
            onChange={(e) => handleChange('cost', Math.max(0, parseInt(e.target.value) || 0))}
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Steam Loss Rate</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{flowRate.toFixed(1)} lb/hr</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Napier's Orifice equation</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Annual Financial Loss</p>
            <p className="text-2xl font-black text-red-400 mt-1">${annualCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Cost: {annualLossKlb.toFixed(1)} klb wasted</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Energy Waste</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{annualEnergyMmbtu.toFixed(0)} MMBtu</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Enthalpy basis (~1k Btu/lb)</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">CO2 Footprint</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{co2EmissionsMt.toFixed(1)} MT CO2e</p>
            <p className="text-[10px] text-slate-500 mt-0.5">≈ {carsEquivalent.toFixed(1)} cars/yr offset</p>
          </div>
        </div>

        {/* Steam Trap SVG Visualization */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
          <svg className="w-full max-w-[400px] h-[180px]" viewBox="0 0 400 180">
            {/* Pipe connections */}
            <rect x="10" y="70" width="100" height="20" fill="#475569" stroke="#334155" strokeWidth="1" />
            <rect x="290" y="70" width="100" height="20" fill="#475569" stroke="#334155" strokeWidth="1" />
            
            {/* Flanges */}
            <rect x="100" y="60" width="10" height="40" fill="#64748b" rx="2" />
            <rect x="290" y="60" width="10" height="40" fill="#64748b" rx="2" />
            
            {/* Steam Trap Body */}
            <path d="M 110 50 L 290 50 C 310 50 310 110 290 110 L 110 110 C 90 110 90 50 110 50 Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <circle cx="200" cy="80" r="25" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            
            {/* Thermostatic element / Disc */}
            <rect x="195" y="70" width="10" height="20" fill="#cbd5e1" rx="1" />
            
            {/* Steam flowing inside */}
            <path d="M 25 80 L 195 80" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" strokeDasharray="5 15" strokeDashoffset="2" />
            
            {/* Orifice location indicator */}
            <line x1="205" y1="80" x2="290" y2="80" stroke="#f43f5e" strokeWidth="3" strokeDasharray="3 3" />
            
            {/* Condensate bottom */}
            <path d="M 115 105 Q 200 115 285 105" fill="none" stroke="#38bdf8" strokeWidth="4" />
            
            {/* Failed Leaking Steam venting from outlet */}
            {flowRate > 0 && (
              <g>
                <path 
                  d="M 300 80 Q 340 75 390 60 Q 370 85 390 95 Q 340 85 300 80" 
                  fill="#ffffff" 
                  fillOpacity={0.15 + (severity * 0.35)} 
                  className="animate-pulse" 
                />
                {/* Custom particle pings */}
                <circle cx="340" cy="78" r={2 + severity * 4} fill="#ffffff" fillOpacity="0.8" className="animate-ping" />
                <circle cx="370" cy="74" r={1 + severity * 3} fill="#ffffff" fillOpacity="0.5" className="animate-ping" />
              </g>
            )}

            <text x="200" y="35" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">INVERTED BUCKET / DISC TRAP</text>
            <text x="55" y="55" fill="#e2e8f0" fontSize="10" fontWeight="bold" textAnchor="middle">Steam In</text>
            <text x="345" y="55" fill="#f43f5e" fontSize="10" fontWeight="extrabold" textAnchor="middle">
              {flowRate > 10 ? 'BLOWING STEAM!' : 'OK / NORMAL'}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
