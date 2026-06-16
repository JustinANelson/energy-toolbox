import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  flueTemp: 370,      // °F
  airTemp: 70,        // °F
  o2: 4.5,            // % Oxygen in flue gas
  fuelType: 'Gas',    // Gas, Oil, Propane
  fuelCost: 0.95,     // $/therm or $/gallon
  annualUse: 60000,   // therms/yr or gallons/yr
};

export default function BoilerEfficiency() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { flueTemp, airTemp, o2, fuelType, fuelCost, annualUse } = state;

  useEffect(() => {
    updateUrlForTool('boiler-efficiency', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const dT = Math.max(0, flueTemp - airTemp);
  const excessAir = o2 < 20.9 ? (o2 / (20.9 - o2)) * 100 : 0;

  // Stack loss calculation constants based on fuel type
  let stackLossPct = 0;
  let unitLabel = 'therms';
  
  if (fuelType === 'Gas') {
    stackLossPct = dT * (0.044 + 0.00011 * excessAir);
    unitLabel = 'therms';
  } else if (fuelType === 'Oil') {
    stackLossPct = dT * (0.046 + 0.00008 * excessAir);
    unitLabel = 'gallons';
  } else { // Propane
    stackLossPct = dT * (0.045 + 0.00009 * excessAir);
    unitLabel = 'gallons';
  }

  // Cap stack loss between 1% and 50%
  stackLossPct = Math.max(1, Math.min(50, stackLossPct));
  
  // Assume radiation & jacket losses = 2.0%
  const radiationLoss = 2.0;
  const efficiency = 100 - stackLossPct - radiationLoss;

  const totalFuelCost = annualUse * fuelCost;
  
  // Potential Savings calculations (Baseline vs Optimized to 85.0% or 3% increase)
  const baselineEff = Math.min(82, efficiency - 3);
  const fuelCostAtOptimized = totalFuelCost * (baselineEff / Math.max(50, efficiency));
  const potentialSavings = Math.max(0, totalFuelCost - fuelCostAtOptimized);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
        </div>
        {/* Fuel Type selection */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Fuel Type</label>
          <select
            value={fuelType}
            onChange={(e) => handleChange('fuelType', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="Gas">Natural Gas (therms)</option>
            <option value="Oil">Fuel Oil #2 (gallons)</option>
            <option value="Propane">Propane (gallons)</option>
          </select>
        </div>

        {/* Flue Gas Temp */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Stack (Flue Gas) Temp</label>
            <span className="text-sm font-bold text-emerald-400">{flueTemp} °F</span>
          </div>
          <input
            type="range"
            min="200"
            max="700"
            step="5"
            value={flueTemp}
            onChange={(e) => handleChange('flueTemp', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Flue O2 % */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Flue Gas O₂ Content</label>
            <span className="text-sm font-bold text-sky-400">{o2.toFixed(1)} %</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="12.0"
            step="0.1"
            value={o2}
            onChange={(e) => handleChange('o2', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Combustion Air Temp */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Combustion Air Intake Temp</label>
            <span className="text-sm font-bold text-purple-400">{airTemp} °F</span>
          </div>
          <input
            type="range"
            min="40"
            max="120"
            value={airTemp}
            onChange={(e) => handleChange('airTemp', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Annual Fuel consumption and Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Annual Consumption ({unitLabel})</label>
            <input
              type="number"
              value={annualUse}
              onChange={(e) => handleChange('annualUse', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Fuel Unit Cost ($/{fuelType === 'Gas' ? 'therm' : 'gal'})</label>
            <input
              type="number"
              step="0.05"
              value={fuelCost}
              onChange={(e) => handleChange('fuelCost', Math.max(0, parseFloat(e.target.value) || 0))}
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Combustion Efficiency</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{efficiency.toFixed(1)} %</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Stack Loss: {stackLossPct.toFixed(1)}% | Jacket: {radiationLoss.toFixed(1)}%</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Excess Air</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{excessAir.toFixed(1)} %</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Corresponds to {o2.toFixed(1)}% oxygen</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Annual Fuel Spending</p>
            <p className="text-2xl font-black text-sky-400 mt-1">${totalFuelCost.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">For {annualUse.toLocaleString()} {unitLabel} / year</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Potential Tuning Savings</p>
            <p className="text-2xl font-black text-amber-400 mt-1">${potentialSavings.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">By tuning flue O₂ to lower target</p>
          </div>
        </div>

        {/* Circular Dial Gauge SVG */}
        <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            Boiler Combustion Efficiency
          </h4>
          
          <svg className="w-[180px] h-[100px]" viewBox="0 0 200 110">
            {/* Background Arch */}
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#1e293b" strokeWidth="16" strokeLinecap="round" />
            
            {/* Colored/Value Arch */}
            <path 
              d="M 20 100 A 80 80 0 0 1 180 100" 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="16" 
              strokeLinecap="round" 
              strokeDasharray={`${(efficiency / 100) * 251.2} 251.2`} 
            />

            {/* Efficiency Value Label */}
            <text x="100" y="90" fill="#ffffff" fontSize="24" fontWeight="black" textAnchor="middle">
              {efficiency.toFixed(1)}%
            </text>
            <text x="100" y="105" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
              EFFICIENCY
            </text>
          </svg>

          <div className="text-[10px] text-slate-500 text-center mt-2 max-w-sm leading-relaxed">
            Boiler stack temperatures above 350°F or oxygen levels above 4.5% generally indicate energy saving opportunities through tube cleaning or air-fuel ratio tuning.
          </div>
        </div>
      </div>
    </div>
  );
}
