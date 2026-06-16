import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  area: 2000,         // sq ft
  ashraeLimit: 0.82,  // W/sq ft (ASHRAE 90.1 standard)
  watts1: 36,         // Watts
  count1: 35,         // count
  watts2: 12,         // Watts
  count2: 25,         // count
};

export default function LPDCalculator() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { area, ashraeLimit, watts1, count1, watts2, count2 } = state;

  useEffect(() => {
    updateUrlForTool('lpd-calc', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const load1 = watts1 * count1;
  const load2 = watts2 * count2;
  const totalWatts = load1 + load2;
  const lpd = area > 0 ? totalWatts / area : 0;
  const complianceDiff = ashraeLimit - lpd;
  const savingsPct = ashraeLimit > 0 ? (complianceDiff / ashraeLimit) * 100 : 0;

  const complies = lpd <= ashraeLimit;

  // Visual percentages
  const maxLpdRef = Math.max(ashraeLimit, lpd) * 1.25;
  const lpdPct = Math.min(100, (lpd / maxLpdRef) * 100);
  const ashraePct = Math.min(100, (ashraeLimit / maxLpdRef) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
        </div>
        {/* Space Area */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Space Area</label>
            <span className="text-sm font-bold text-emerald-400">{area.toLocaleString()} sq ft</span>
          </div>
          <input
            type="range"
            min="100"
            max="15000"
            step="100"
            value={area}
            onChange={(e) => handleChange('area', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* ASHRAE Code Limit */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">ASHRAE 90.1 LPD Limit</label>
            <span className="text-sm font-bold text-sky-400">{ashraeLimit.toFixed(2)} W/ft²</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="2.0"
            step="0.05"
            value={ashraeLimit}
            onChange={(e) => handleChange('ashraeLimit', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        <div className="border-t border-slate-800 my-4 pt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Fixture Type 1 (e.g. Troffers)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Watts/Fixture</label>
              <input
                type="number"
                value={watts1}
                onChange={(e) => handleChange('watts1', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Fixture Count</label>
              <input
                type="number"
                value={count1}
                onChange={(e) => handleChange('count1', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Fixture Type 2 (e.g. Downlights)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Watts/Fixture</label>
              <input
                type="number"
                value={watts2}
                onChange={(e) => handleChange('watts2', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Fixture Count</label>
              <input
                type="number"
                value={count2}
                onChange={(e) => handleChange('count2', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Design LPD</p>
            <p className={`text-2xl font-black mt-1 ${complies ? 'text-emerald-400' : 'text-red-400'}`}>
              {lpd.toFixed(3)} W/ft²
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Total lighting load: {totalWatts} Watts</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Compliance Status</p>
            <p className={`text-2xl font-black mt-1 ${complies ? 'text-emerald-400' : 'text-red-400'}`}>
              {complies ? 'COMPLIANT' : 'EXCEEDS LIMIT'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {complies 
                ? `${savingsPct.toFixed(1)}% below energy code` 
                : `${Math.abs(savingsPct).toFixed(1)}% above energy code`}
            </p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl col-span-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Annual Consumption Contribution</p>
            <p className="text-xl font-bold text-sky-400 mt-1">
              {( (totalWatts * 3000) / 1000 ).toLocaleString(undefined, {maximumFractionDigits:0})} kWh / yr
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Based on estimated 3,000 annual operating hours</p>
          </div>
        </div>

        {/* Visual Bar Comparison Chart */}
        <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-xl space-y-6">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider text-center">
            LPD Comparison Chart
          </h4>
          
          <div className="space-y-4">
            {/* Design LPD Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">Design LPD (Proposed)</span>
                <span className={complies ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {lpd.toFixed(3)} W/ft²
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${complies ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${lpdPct}%` }}
                ></div>
              </div>
            </div>

            {/* ASHRAE Limit Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">ASHRAE 90.1 Code Limit</span>
                <span className="text-sky-400 font-bold">
                  {ashraeLimit.toFixed(2)} W/ft²
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800">
                <div 
                  className="bg-sky-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${ashraePct}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 text-center">
            Comparing total fixtures power ({totalWatts}W) over space area ({area} sq ft).
          </div>
        </div>
      </div>
    </div>
  );
}
