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
  pressure: 100,      // psig
  flowRate: 5000,     // lb/hr
  pipeSize: '3',      // NPS ID key
  velLimit: 8000,     // ft/min
};

export default function SteamPipe() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { pressure, flowRate, pipeSize, velLimit } = state;

  useEffect(() => {
    updateUrlForTool('steam-pipe', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const activePipe = PIPE_SIZES[pipeSize] || PIPE_SIZES['3'];
  const innerDia = activePipe.innerDia;

  // Saturated Steam Specific Volume vg (ft3/lb) regression
  // vg = 428.3 / (P_psia)^0.985
  const psia = pressure + 14.696;
  const vg = 428.3 / Math.pow(psia, 0.985);

  // Saturation Temperature (°F) regression
  // Tsat = 115.1 * psia^0.225
  const tsat = 115.1 * Math.pow(psia, 0.225);

  // Velocity V (ft/min) = (Flow * vg * 3.0558) / d^2
  const velocity = (flowRate * vg * 3.0558) / Math.pow(innerDia, 2);

  // Evaluation
  let status = 'Optimal';
  let statusColor = 'text-emerald-400';
  if (velocity > 12000) {
    status = 'Severe Acoustic & Erosion Hazard';
    statusColor = 'text-red-500 font-bold';
  } else if (velocity > velLimit) {
    status = 'Exceeds Recommended Sizing Velocity';
    statusColor = 'text-amber-400 font-semibold';
  } else if (velocity < 2000 && flowRate > 0) {
    status = 'Oversized (High Condensation Heat Loss)';
    statusColor = 'text-sky-400';
  }

  // Gauge percent math
  const maxVelRange = 15000;
  const velocityPct = Math.min(100, (velocity / maxVelRange) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
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
            max="400"
            step="5"
            value={pressure}
            onChange={(e) => handleChange('pressure', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Steam Flow Rate */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Steam Mass Flow Rate</label>
            <span className="text-sm font-bold text-emerald-400">{flowRate.toLocaleString()} lb/hr</span>
          </div>
          <input
            type="range"
            min="100"
            max="30000"
            step="250"
            value={flowRate}
            onChange={(e) => handleChange('flowRate', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Nominal Pipe Size */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Nominal Pipe Size (Sch 40 Steel)</label>
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

        {/* Velocity Limit */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Velocity Design Limit</label>
            <span className="text-sm font-bold text-amber-400">{velLimit.toLocaleString()} ft/min</span>
          </div>
          <input
            type="range"
            min="4000"
            max="12000"
            step="500"
            value={velLimit}
            onChange={(e) => handleChange('velLimit', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Steam Velocity</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {velocity.toLocaleString(undefined, { maximumFractionDigits: 0 })} fpm
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{(velocity / 60).toFixed(1)} ft/s</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Saturation Temp</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{tsat.toFixed(1)} °F</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{(tsat - 32 * 5/9).toFixed(1)} °C</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Specific Volume (vg)</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{vg.toFixed(3)} ft³/lb</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Absolute pressure: {psia.toFixed(1)} psia</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Flow Sizing Check</p>
            <p className={`text-xs font-black mt-2 leading-tight ${statusColor}`}>{status}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Target: 4,000 - 10,000 fpm</p>
          </div>
        </div>

        {/* Steam Velocity Visual Gauge */}
        <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            Velocity vs Acoustic/Erosion Limit (15,000 fpm)
          </h4>
          
          <div className="w-full space-y-2">
            <div className="w-full bg-slate-900 rounded-full h-5 overflow-hidden border border-slate-800 relative">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  velocity > 12000 ? 'bg-red-500' : velocity > velLimit ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${velocityPct}%` }}
              ></div>
              {/* Reference limit lines */}
              <div 
                className="absolute top-0 bottom-0 border-l border-white/40 border-dashed"
                style={{ left: `${(velLimit / maxVelRange) * 100}%` }}
                title="Design Limit"
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0 fpm</span>
              <span style={{ marginLeft: `${(velLimit / maxVelRange) * 100 - 35}%` }} className="text-amber-400 font-bold">
                Design Limit ({velLimit.toLocaleString()})
              </span>
              <span>15,000 fpm</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
