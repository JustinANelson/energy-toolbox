import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  elect: 50000,   // kWh/yr
  gas: 10000,     // therms/yr
  oil: 500,       // gallons/yr
  lpg: 200,       // gallons/yr
};

export default function CarbonEmissions() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { elect, gas, oil, lpg } = state;

  useEffect(() => {
    updateUrlForTool('carbon-emissions', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations (EPA Greenhouse Gas Equivalencies Factors)
  // Electricity: 0.000389 MT CO2e / kWh
  // Natural Gas: 0.0053 MT CO2e / therm
  // Fuel Oil #2: 0.01021 MT CO2e / gallon
  // LPG/Propane: 0.00579 MT CO2e / gallon
  const mtElect = elect * 0.000389;
  const mtGas = gas * 0.0053;
  const mtOil = oil * 0.01021;
  const mtLpg = lpg * 0.00579;
  
  const totalEmissions = mtElect + mtGas + mtOil + mtLpg;

  // Equivalencies
  const carMiles = totalEmissions * 2564;
  const treesSequest = totalEmissions * 16.5;
  const coalAvoided = totalEmissions * 980;

  // Percentage breakdown
  const totalMtSafe = totalEmissions > 0 ? totalEmissions : 1;
  const electPct = (mtElect / totalMtSafe) * 100;
  const gasPct = (mtGas / totalMtSafe) * 100;
  const oilPct = (mtOil / totalMtSafe) * 100;
  const lpgPct = (mtLpg / totalMtSafe) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
        </div>
        {/* Electricity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual Grid Electricity</label>
            <span className="text-sm font-bold text-sky-400">{elect.toLocaleString()} kWh/yr</span>
          </div>
          <input
            type="range"
            min="1000"
            max="250000"
            step="5000"
            value={elect}
            onChange={(e) => handleChange('elect', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Natural Gas */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual Natural Gas</label>
            <span className="text-sm font-bold text-amber-400">{gas.toLocaleString()} therms/yr</span>
          </div>
          <input
            type="range"
            min="0"
            max="40000"
            step="500"
            value={gas}
            onChange={(e) => handleChange('gas', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Fuel Oil */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual Fuel Oil #2</label>
            <span className="text-sm font-bold text-purple-400">{oil.toLocaleString()} gallons/yr</span>
          </div>
          <input
            type="range"
            min="0"
            max="10000"
            step="200"
            value={oil}
            onChange={(e) => handleChange('oil', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* LPG/Propane */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Annual Propane / LPG</label>
            <span className="text-sm font-bold text-emerald-400">{lpg.toLocaleString()} gallons/yr</span>
          </div>
          <input
            type="range"
            min="0"
            max="10000"
            step="200"
            value={lpg}
            onChange={(e) => handleChange('lpg', parseInt(e.target.value))}
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
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl col-span-2 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Greenhouse Gas Footprint</p>
            <p className="text-4xl font-black text-red-400 mt-1">{totalEmissions.toFixed(2)} MT CO₂e / yr</p>
            <p className="text-xs text-slate-500 mt-1">Scope 1 Direct + Scope 2 Indirect Emissions</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Electricity (Scope 2)</p>
            <p className="text-xl font-bold text-sky-400 mt-1">{mtElect.toFixed(2)} MT CO₂e</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fossil Fuels (Scope 1)</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{(mtGas + mtOil + mtLpg).toFixed(2)} MT CO₂e</p>
          </div>
        </div>

        {/* Stacked Percentage Breakdown */}
        {totalEmissions > 0 && (
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Emission Source Breakdown</p>
            <div className="w-full h-6 rounded-lg overflow-hidden flex border border-slate-800">
              {mtElect > 0 && <div className="bg-sky-500 h-full transition-all" style={{ width: `${electPct}%` }} title={`Electric: ${electPct.toFixed(1)}%`} />}
              {mtGas > 0 && <div className="bg-amber-500 h-full transition-all" style={{ width: `${gasPct}%` }} title={`Gas: ${gasPct.toFixed(1)}%`} />}
              {mtOil > 0 && <div className="bg-purple-500 h-full transition-all" style={{ width: `${oilPct}%` }} title={`Oil: ${oilPct.toFixed(1)}%`} />}
              {mtLpg > 0 && <div className="bg-emerald-500 h-full transition-all" style={{ width: `${lpgPct}%` }} title={`LPG: ${lpgPct.toFixed(1)}%`} />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-semibold justify-center">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-sky-500" /> Elec ({electPct.toFixed(0)}%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Gas ({gasPct.toFixed(0)}%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-500" /> Oil ({oilPct.toFixed(0)}%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> LPG ({lpgPct.toFixed(0)}%)</span>
            </div>
          </div>
        )}

        {/* Equivalency Offset Visual Cards */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider text-center">
            Greenhouse Gas Equivalencies (Annual Impact)
          </h4>
          
          <div className="grid grid-cols-3 gap-3">
            {/* Trees Seedlings Card */}
            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center">
              <svg className="w-8 h-8 text-emerald-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
              <p className="text-lg font-black text-emerald-400 leading-tight">
                {treesSequest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">Tree Seedlings Sequestered for 10 yrs</p>
            </div>
            
            {/* Car Miles Card */}
            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center">
              <svg className="w-8 h-8 text-amber-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <p className="text-lg font-black text-amber-400 leading-tight">
                {carMiles.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">Miles Driven in Average Passenger Car</p>
            </div>

            {/* Coal avoided Card */}
            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center">
              <svg className="w-8 h-8 text-purple-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <p className="text-lg font-black text-purple-400 leading-tight">
                {coalAvoided.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">Pounds of Coal Burned equivalent</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
