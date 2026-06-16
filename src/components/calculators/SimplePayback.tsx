import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  cost: 45000,               // Initial Investment ($)
  electSavings: 8000,        // Annual Electric Savings ($)
  gasSavings: 3000,          // Annual Gas/Fuel Savings ($)
  maintenanceSavings: 1000,  // Annual O&M Savings ($)
  life: 15,                  // Years
  discountRate: 8,           // %
};

export default function SimplePayback() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { cost, electSavings, gasSavings, maintenanceSavings, life, discountRate } = state;

  useEffect(() => {
    updateUrlForTool('simple-payback', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const netSavings = electSavings + gasSavings + maintenanceSavings;
  const payback = netSavings > 0 ? cost / netSavings : 0;
  const roi = cost > 0 ? (netSavings / cost) * 100 : 0;

  // NPV calculation
  const r = discountRate / 100;
  let npv = -cost;
  if (r > 0) {
    const annuityFactor = (1 - Math.pow(1 + r, -life)) / r;
    npv = netSavings * annuityFactor - cost;
  } else {
    npv = netSavings * life - cost;
  }

  // Generate cumulative cash flows for the chart
  const cashFlows: number[] = [];
  let cumulative = -cost;
  cashFlows.push(cumulative); // Year 0
  
  // Show up to 15 years in chart to keep it clean, or the actual life
  const maxChartYears = Math.min(20, life);
  for (let year = 1; year <= maxChartYears; year++) {
    cumulative += netSavings;
    cashFlows.push(cumulative);
  }

  // Chart scaling math
  const maxAbsVal = Math.max(...cashFlows.map(Math.abs), 1000);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
        </div>
        {/* Initial Capital Cost */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Initial Project Investment</label>
            <span className="text-sm font-bold text-emerald-400">${cost.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="5000"
            max="250000"
            step="5000"
            value={cost}
            onChange={(e) => handleChange('cost', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Electricity Savings */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual Electricity Savings</label>
            <span className="text-sm font-bold text-sky-400">${electSavings.toLocaleString()} / yr</span>
          </div>
          <input
            type="range"
            min="0"
            max="50000"
            step="1000"
            value={electSavings}
            onChange={(e) => handleChange('electSavings', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Gas / Fuel Savings */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual Gas / Fuel Savings</label>
            <span className="text-sm font-bold text-amber-400">${gasSavings.toLocaleString()} / yr</span>
          </div>
          <input
            type="range"
            min="0"
            max="50000"
            step="1000"
            value={gasSavings}
            onChange={(e) => handleChange('gasSavings', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Maintenance / O&M Savings */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual O&M Savings (or Cost if negative)</label>
            <span className="text-sm font-bold text-purple-400">${maintenanceSavings.toLocaleString()} / yr</span>
          </div>
          <input
            type="range"
            min="-5000"
            max="20000"
            step="500"
            value={maintenanceSavings}
            onChange={(e) => handleChange('maintenanceSavings', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Lifespan and Discount Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Project Lifespan (Years)</label>
            <input
              type="number"
              value={life}
              onChange={(e) => handleChange('life', Math.max(1, Math.min(50, parseInt(e.target.value) || 0)))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Discount Rate (%)</label>
            <input
              type="number"
              value={discountRate}
              onChange={(e) => handleChange('discountRate', Math.max(0, Math.min(40, parseFloat(e.target.value) || 0)))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Simple Payback Period</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {payback > 0 ? `${payback.toFixed(2)} Years` : 'N/A'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Net Annual Savings: ${netSavings.toLocaleString()} / yr</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Net Present Value (NPV)</p>
            <p className={`text-2xl font-black mt-1 ${npv >= 0 ? 'text-sky-400' : 'text-red-400'}`}>
              ${npv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">At {discountRate}% discount rate</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Simple ROI</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{roi.toFixed(1)} %</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Annual yield relative to cost</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Cumulative Return</p>
            <p className="text-2xl font-black text-amber-400 mt-1">
              ${(netSavings * life - cost).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Gross cash return over {life} years</p>
          </div>
        </div>

        {/* Financial Cash Flow Bar Chart SVG */}
        <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            Cumulative Project Cash Flow (Years 0 - {maxChartYears})
          </h4>
          
          <div className="w-full h-[150px] flex items-end gap-1 px-2">
            {cashFlows.map((val, idx) => {
              // Calculate height percentage relative to maximum absolute value
              const pct = (Math.abs(val) / maxAbsVal) * 90; // scale to max 90% of height
              const isNegative = val < 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full mb-1 bg-slate-900 text-[10px] text-slate-200 border border-slate-800 rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    Year {idx}: ${val.toLocaleString(undefined, {maximumFractionDigits:0})}
                  </div>
                  
                  {/* Bar */}
                  <div 
                    className={`w-full rounded-t transition-all duration-500 ${
                      isNegative ? 'bg-red-500/40 hover:bg-red-500/60' : 'bg-emerald-500/50 hover:bg-emerald-500/70'
                    }`}
                    style={{ height: `${pct}%` }}
                  ></div>
                  
                  {/* Label */}
                  <span className="text-[9px] text-slate-500 mt-1 font-mono">{idx}</span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-slate-500 text-center mt-2">
            Bars show cash position each year. The transition to green represents the payback breakeven.
          </div>
        </div>
      </div>
    </div>
  );
}
