import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const PIPE_SIZES: Record<string, { name: string; innerDia: number }> = {
  '1': { name: '1" NPS (Sch 40)', innerDia: 1.049 },
  '1.5': { name: '1-1/2" NPS (Sch 40)', innerDia: 1.610 },
  '2': { name: '2" NPS (Sch 40)', innerDia: 2.067 },
  '2.5': { name: '2-1/2" NPS (Sch 40)', innerDia: 2.469 },
  '3': { name: '3" NPS (Sch 40)', innerDia: 3.068 },
  '4': { name: '4" NPS (Sch 40)', innerDia: 4.026 },
  '6': { name: '6" NPS (Sch 40)', innerDia: 6.065 },
  '8': { name: '8" NPS (Sch 40)', innerDia: 7.981 },
  '10': { name: '10" NPS (Sch 40)', innerDia: 10.020 },
  '12': { name: '12" NPS (Sch 40)', innerDia: 11.938 },
};

const DEFAULTS = {
  flow: 150,           // GPM
  pipeSize: '3',       // Nominal ID lookup
  pipeLength: 100,     // ft
  roughness: 130,      // C-Factor (Steel is 130, Plastic 150, Cast Iron 100)
};

export default function PipeVelocity() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { flow, pipeSize, pipeLength, roughness } = state;

  useEffect(() => {
    updateUrlForTool('pipe-velocity', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const activePipe = PIPE_SIZES[pipeSize] || PIPE_SIZES['3'];
  const innerDia = activePipe.innerDia;

  // Velocity = (GPM * 0.4085) / d^2
  const velocity = (flow * 0.4085) / Math.pow(innerDia, 2);

  // Hazen-Williams Head Loss: h_f = 0.2083 * (100/C)^1.852 * (GPM^1.852 / d^4.8655) * (Length/100)
  const lossPer100 = 0.2083 * Math.pow(100 / roughness, 1.852) * (Math.pow(flow, 1.852) / Math.pow(innerDia, 4.8655));
  const headLoss = (lossPer100 * pipeLength) / 100;
  const psiLoss = headLoss * 0.433527; // 1 ft water = 0.4335 psi

  // Sizing Advice
  let advice = 'Recommended Velocity';
  let adviceColor = 'text-emerald-400 font-semibold';
  if (velocity > 10) {
    advice = 'Excessive Velocity (Erosion Risk)';
    adviceColor = 'text-red-400 font-bold';
  } else if (velocity > 8) {
    advice = 'High Velocity (Acoustic Noise Risk)';
    adviceColor = 'text-amber-400 font-semibold';
  } else if (velocity < 2 && flow > 0) {
    advice = 'Low Velocity (Sediment Deposition Risk)';
    adviceColor = 'text-sky-400 font-semibold';
  }

  // Animation Speed
  const animSpeed = velocity > 0.01 ? Math.max(0.1, Math.min(6, 12 / velocity)) : 0;

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
            <label className="text-sm font-semibold text-slate-300">Flow Rate</label>
            <span className="text-sm font-bold text-emerald-400">{flow} GPM</span>
          </div>
          <input
            type="range"
            min="5"
            max="1000"
            step="5"
            value={flow}
            onChange={(e) => handleChange('flow', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Nominal Pipe Size */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Pipe Nominal Size (Sch 40 Steel)</label>
          <select
            value={pipeSize}
            onChange={(e) => handleChange('pipeSize', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          >
            {Object.entries(PIPE_SIZES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.name} (ID: {info.innerDia.toFixed(3)}")
              </option>
            ))}
          </select>
        </div>

        {/* Pipe Length */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Pipe Run Length</label>
            <span className="text-sm font-bold text-sky-400">{pipeLength} ft</span>
          </div>
          <input
            type="range"
            min="10"
            max="1500"
            step="10"
            value={pipeLength}
            onChange={(e) => handleChange('pipeLength', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* C-Factor / Roughness */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Hazen-Williams Roughness (C-Factor)</label>
          <select
            value={roughness}
            onChange={(e) => handleChange('roughness', parseInt(e.target.value))}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="150">C=150 (Plastic / PVC)</option>
            <option value="140">C=140 (Copper / Stainless Steel)</option>
            <option value="130">C=130 (New Carbon Steel - Default)</option>
            <option value="100">C=100 (Aged Cast Iron / Rusty Steel)</option>
          </select>
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fluid Velocity</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{velocity.toFixed(2)} ft/s</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{(velocity * 0.3048).toFixed(2)} m/s</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pressure Drop</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{psiLoss.toFixed(2)} psi</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Over {pipeLength} ft total length</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Friction Head Loss</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{headLoss.toFixed(2)} ft H₂O</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{lossPer100.toFixed(2)} ft head per 100 ft pipe</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Flow Sizing Check</p>
            <p className={`text-sm font-black mt-1.5 ${adviceColor}`}>{advice}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Range limit: 2 - 8 ft/s</p>
          </div>
        </div>

        {/* Pipe Flow Animation SVG */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
          {animSpeed > 0 && (
            <style>{`
              @keyframes flow-move {
                0% { transform: translateX(0px); }
                100% { transform: translateX(120px); }
              }
              .water-flow-element {
                animation: flow-move ${animSpeed}s linear infinite;
              }
            `}</style>
          )}

          <svg className="w-full max-w-[360px] h-[150px]" viewBox="0 0 360 150">
            {/* Pipe Outline */}
            <rect x="20" y="50" width="320" height="50" fill="none" stroke="#475569" strokeWidth="4" />
            {/* Fluid fill background */}
            <rect x="22" y="52" width="316" height="46" fill="#1d4ed8" fillOpacity="0.3" />
            
            {/* Animated particles */}
            {animSpeed > 0 && (
              <g className="water-flow-element" clipPath="url(#pipe-clip)">
                <defs>
                  <clipPath id="pipe-clip">
                    <rect x="22" y="52" width="316" height="46" />
                  </clipPath>
                </defs>
                {/* Horizontal flow lines at different offsets to simulate fluid */}
                <line x1="-100" y1="65" x2="-20" y2="65" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="5 15" strokeLinecap="round" />
                <line x1="20" y1="65" x2="100" y2="65" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="5 15" strokeLinecap="round" />
                <line x1="140" y1="65" x2="220" y2="65" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="5 15" strokeLinecap="round" />
                <line x1="260" y1="65" x2="340" y2="65" stroke="#60a5fa" strokeWidth="2.5" strokeDasharray="5 15" strokeLinecap="round" />
                
                <line x1="-50" y1="85" x2="30" y2="85" stroke="#3b82f6" strokeWidth="3.5" strokeDasharray="8 20" strokeLinecap="round" />
                <line x1="70" y1="85" x2="150" y2="85" stroke="#3b82f6" strokeWidth="3.5" strokeDasharray="8 20" strokeLinecap="round" />
                <line x1="190" y1="85" x2="270" y2="85" stroke="#3b82f6" strokeWidth="3.5" strokeDasharray="8 20" strokeLinecap="round" />
              </g>
            )}

            {/* Pipe diameter labels */}
            <text x="180" y="40" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle">
              {activePipe.name}
            </text>
            <text x="180" y="78" fill="#ffffff" fontSize="13" fontWeight="black" textAnchor="middle">
              {velocity.toFixed(1)} ft/s Flow
            </text>
          </svg>

          <div className="absolute bottom-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Water Velocity inside pipe
          </div>
        </div>
      </div>
    </div>
  );
}
