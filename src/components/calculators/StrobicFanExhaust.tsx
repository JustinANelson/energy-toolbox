import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';
import { 
  Wind, 
  Zap, 
  DollarSign, 
  Activity, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Layers, 
  Settings,
  ArrowRight
} from 'lucide-react';

const DEFAULTS = {
  cfmDesign: 30000, // CFM (Design Lab Exhaust Flow)
  spDuctDesign: 2.5, // in. w.g. (Design Duct Static Pressure)
  spNozzleDesign: 1.5, // in. w.g. (Design Fan Discharge Nozzle Pressure)
  fanEff: 68, // % (Design Fan Static Efficiency)
  motorEff: 92, // % (Motor Efficiency)
  minVelocityLimit: 3000, // FPM (Minimum Safe Plume Exit Velocity)
  nozzleArea: 6.0, // sq ft (Nozzle Outlet Discharge Area)
  elecRate: 0.12, // $/kWh
  dayExhaustPct: 80, // % (Daytime exhaust flow fraction)
  nightExhaustPct: 40, // % (Nighttime exhaust flow fraction)
  minSpLimit: 0.8, // in. w.g. (Minimum static pressure setpoint under SPR)
  implementationCostVfd: 15000, // $ (VFD Plume control retrofit cost)
  implementationCostSpr: 25000, // $ (VFD + SPR control retrofit cost)
};

export default function StrobicFanExhaust() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));
  const [activeTab, setActiveTab] = useState<'annual' | 'diurnal'>('annual');

  const { 
    cfmDesign, 
    spDuctDesign, 
    spNozzleDesign, 
    fanEff, 
    motorEff, 
    minVelocityLimit, 
    nozzleArea, 
    elecRate, 
    dayExhaustPct, 
    nightExhaustPct, 
    minSpLimit,
    implementationCostVfd,
    implementationCostSpr
  } = state;

  useEffect(() => {
    updateUrlForTool('strobic-exhaust', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // --- Calculation Constants ---
  const vfdEff = 0.97; // 97% VFD efficiency
  const co2Intensity = 0.000389; // MT CO2e / kWh (US Grid average)

  // Minimum flow rate required to maintain plume discharge velocity
  const cfmMinPlume = nozzleArea * minVelocityLimit;

  // --- Engine to Calculate Fan Power for a Specific Exhaust CFM ---
  const calculateFanState = (cfmExh: number, strategy: 'bypass' | 'vfd-plume' | 'vfd-spr') => {
    let cfmFan = cfmDesign;
    let cfmBypass = 0;
    let spDuct = spDuctDesign;
    let spNozzle = spNozzleDesign;

    if (strategy === 'bypass') {
      // Fan always runs at design flow; bypass damper opens to make up the difference
      cfmFan = cfmDesign;
      cfmBypass = Math.max(0, cfmDesign - cfmExh);
      spDuct = spDuctDesign;
      spNozzle = spNozzleDesign;
    } else if (strategy === 'vfd-plume') {
      // Fan slows down to match load, but cannot go below minimum plume flow limit
      cfmFan = Math.max(cfmExh, cfmMinPlume);
      cfmBypass = Math.max(0, cfmMinPlume - cfmExh);
      spDuct = spDuctDesign; // static pressure remains fixed
      spNozzle = spNozzleDesign * Math.pow(cfmFan / cfmDesign, 2);
    } else if (strategy === 'vfd-spr') {
      // Fan slows down like plume control, but duct static pressure setpoint is also reset
      cfmFan = Math.max(cfmExh, cfmMinPlume);
      cfmBypass = Math.max(0, cfmMinPlume - cfmExh);
      
      // Duct Static Pressure Reset Curve
      const exhRatio = cfmExh / cfmDesign;
      spDuct = minSpLimit + (spDuctDesign - minSpLimit) * Math.pow(exhRatio, 2);
      spNozzle = spNozzleDesign * Math.pow(cfmFan / cfmDesign, 2);
    }

    const spTotal = spDuct + spNozzle;
    const fanBhp = (cfmFan * spTotal) / (6356 * (fanEff / 100));
    
    // Motor efficiency + VFD efficiency penalty for VFD strategies
    const motorEffDec = motorEff / 100;
    const systemEff = strategy === 'bypass' ? motorEffDec : motorEffDec * vfdEff;
    const powerKw = (fanBhp * 0.7457) / systemEff;

    // Actual discharge velocity (FPM)
    const dischargeVelocity = cfmFan / nozzleArea;

    return {
      cfmFan,
      cfmBypass,
      spDuct,
      spNozzle,
      spTotal,
      fanBhp,
      powerKw,
      dischargeVelocity
    };
  };

  // --- Diurnal Load Profiles ---
  const cfmDay = cfmDesign * (dayExhaustPct / 100);
  const cfmNight = cfmDesign * (nightExhaustPct / 100);

  // Day & Night fan states for each strategy
  const stateBypassDay = calculateFanState(cfmDay, 'bypass');
  const stateBypassNight = calculateFanState(cfmNight, 'bypass');

  const statePlumeDay = calculateFanState(cfmDay, 'vfd-plume');
  const statePlumeNight = calculateFanState(cfmNight, 'vfd-plume');

  const stateSprDay = calculateFanState(cfmDay, 'vfd-spr');
  const stateSprNight = calculateFanState(cfmNight, 'vfd-spr');

  // --- Annual Energy Totals ---
  const hoursPerDay = 12;
  const daysPerYear = 365;

  const annualKwhBypass = (stateBypassDay.powerKw * hoursPerDay + stateBypassNight.powerKw * hoursPerDay) * daysPerYear;
  const annualKwhPlume = (statePlumeDay.powerKw * hoursPerDay + statePlumeNight.powerKw * hoursPerDay) * daysPerYear;
  const annualKwhSpr = (stateSprDay.powerKw * hoursPerDay + stateSprNight.powerKw * hoursPerDay) * daysPerYear;

  const annualCostBypass = annualKwhBypass * elecRate;
  const annualCostPlume = annualKwhPlume * elecRate;
  const annualCostSpr = annualKwhSpr * elecRate;

  // --- Savings & Financial Analysis ---
  const savingsPlumeCost = Math.max(0, annualCostBypass - annualCostPlume);
  const savingsSprCost = Math.max(0, annualCostBypass - annualCostSpr);

  const savingsPlumeKwh = Math.max(0, annualKwhBypass - annualKwhPlume);
  const savingsSprKwh = Math.max(0, annualKwhBypass - annualKwhSpr);

  const carbonSavedPlume = savingsPlumeKwh * co2Intensity;
  const carbonSavedSpr = savingsSprKwh * co2Intensity;

  const paybackPlume = savingsPlumeCost > 0 ? implementationCostVfd / savingsPlumeCost : 0;
  const paybackSpr = savingsSprCost > 0 ? implementationCostSpr / savingsSprCost : 0;

  // --- Diagnostic Warnings ---
  const hasPlumeVelocityWarning = cfmMinPlume > cfmDesign;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Left Input Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5 max-h-[820px] overflow-y-auto">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" /> Lab Fan Inputs
          </h3>
        </div>

        {/* 1. Design Airflow & Pressure */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Design Fan Specs</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-350">Design Lab Exhaust Flow</label>
              <span className="text-xs font-bold text-sky-400">{cfmDesign.toLocaleString()} CFM</span>
            </div>
            <input
              type="range"
              min="2000"
              max="150000"
              step="1000"
              value={cfmDesign}
              onChange={(e) => handleChange('cfmDesign', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
            />
            <input
              type="number"
              value={cfmDesign}
              onChange={(e) => handleChange('cfmDesign', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Design Duct SP (in. wg)</label>
              <input
                type="number"
                step="0.1"
                value={spDuctDesign}
                onChange={(e) => handleChange('spDuctDesign', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Design Nozzle SP (in. wg)</label>
              <input
                type="number"
                step="0.1"
                value={spNozzleDesign}
                onChange={(e) => handleChange('spNozzleDesign', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Fan Static Eff. (%)</label>
              <input
                type="number"
                value={fanEff}
                onChange={(e) => handleChange('fanEff', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Motor Eff. (%)</label>
              <input
                type="number"
                value={motorEff}
                onChange={(e) => handleChange('motorEff', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Plume Safety & Discharge Parameters */}
        <div className="space-y-4 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Plume & Discharge Limits</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Nozzle Outlet Area (sq ft)</label>
              <input
                type="number"
                step="0.1"
                value={nozzleArea}
                onChange={(e) => handleChange('nozzleArea', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Min Plume Velocity (FPM)</label>
              <input
                type="number"
                step="100"
                value={minVelocityLimit}
                onChange={(e) => handleChange('minVelocityLimit', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Calculated Minimum Plume Airflow: <span className="text-slate-350 font-bold">{cfmMinPlume.toLocaleString()} CFM</span> ({((cfmMinPlume / cfmDesign) * 100).toFixed(0)}% of design)
          </p>
        </div>

        {/* 3. Diurnal Lab Load Profile */}
        <div className="space-y-4 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Diurnal Exhaust Profile</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-355">Daytime Exhaust Load (12 hrs)</label>
              <span className="text-xs font-bold text-amber-400">{dayExhaustPct}% Flow</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={dayExhaustPct}
              onChange={(e) => handleChange('dayExhaustPct', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-[10px] text-slate-500">Equivalent day flow: {(cfmDay).toLocaleString()} CFM</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-355">Nighttime Exhaust Load (12 hrs)</label>
              <span className="text-xs font-bold text-indigo-400">{nightExhaustPct}% Flow</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={nightExhaustPct}
              onChange={(e) => handleChange('nightExhaustPct', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-[10px] text-slate-500">Equivalent night flow: {(cfmNight).toLocaleString()} CFM</p>
          </div>
        </div>

        {/* 4. Controls Reset & Cost Specs */}
        <div className="space-y-4 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Controls & Financials</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Min SPR SP (in. wg)</label>
              <input
                type="number"
                step="0.1"
                value={minSpLimit}
                onChange={(e) => handleChange('minSpLimit', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Electricity Rate ($/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={elecRate}
                onChange={(e) => handleChange('elecRate', Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">VFD Plume Retrofit ($)</label>
              <input
                type="number"
                step="1000"
                value={implementationCostVfd}
                onChange={(e) => handleChange('implementationCostVfd', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">VFD + SPR Retrofit ($)</label>
              <input
                type="number"
                step="1000"
                value={implementationCostSpr}
                onChange={(e) => handleChange('implementationCostSpr', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column Results */}
      <div className="lg:col-span-7 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('annual')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'annual'
                ? 'border-blue-500 text-blue-400 font-bold bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Annual Savings & ROI
          </button>
          <button
            onClick={() => setActiveTab('diurnal')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'diurnal'
                ? 'border-blue-500 text-blue-400 font-bold bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Day/Night Operational States
          </button>
        </div>

        {/* Tab 1: Annual Savings & ROI */}
        {activeTab === 'annual' && (
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400 animate-pulse" /> Retrofit Savings Summary
              </h3>
            </div>

            {hasPlumeVelocityWarning && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-350 rounded-xl text-xs flex gap-3 text-left">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-450" />
                <div>
                  <span className="font-bold text-rose-400 block mb-0.5">Incorrect Nozzle Layout Configuration</span>
                  Minimum plume velocity airflow ({cfmMinPlume.toLocaleString()} CFM) exceeds design fan capacity ({cfmDesign.toLocaleString()} CFM). 
                  Please check the nozzle discharge area or lower the plume velocity requirements to prevent fan overload.
                </div>
              </div>
            )}

            {/* Savings Comparison Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-center">
                <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Baseline Cost</p>
                <p className="text-base font-black text-rose-400 mt-1">
                  ${annualCostBypass.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">Bypass Control</p>
              </div>

              <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">VFD (Plume Speed)</p>
                <p className="text-base font-black text-white mt-1">
                  ${annualCostPlume.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                </p>
                <p className="text-[9px] text-emerald-400 font-bold mt-0.5">
                  Save ${savingsPlumeCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                </p>
              </div>

              <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">VFD + SP Reset</p>
                <p className="text-base font-black text-white mt-1">
                  ${annualCostSpr.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                </p>
                <p className="text-[9px] text-emerald-400 font-bold mt-0.5">
                  Save ${savingsSprCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                </p>
              </div>
            </div>

            {/* Financial ROI and Carbon Reduction Cards */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Capital Payback Period (Simple)
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>VFD Plume Control:</span>
                    <span className="font-bold text-white">
                      {paybackPlume > 0 ? `${paybackPlume.toFixed(1.5)} years` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>VFD + Static Pressure Reset:</span>
                    <span className="font-bold text-emerald-400">
                      {paybackSpr > 0 ? `${paybackSpr.toFixed(1.5)} years` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-400" /> Annual Carbon Reduction
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>VFD Plume Control:</span>
                    <span className="font-bold text-white">{carbonSavedPlume.toFixed(1)} MT CO2e/yr</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>VFD + Static Pressure Reset:</span>
                    <span className="font-bold text-purple-400">{carbonSavedSpr.toFixed(1)} MT CO2e/yr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Strobic Bypass System SVG */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[220px]">
              <svg className="w-full max-w-[440px] h-[160px]" viewBox="0 0 440 160">
                {/* Lab Duct Inflow */}
                <path d="M 20 100 L 140 100" fill="none" stroke="#cbd5e1" strokeWidth="4" />
                <polygon points="140,100 132,96 132,104" fill="#cbd5e1" />
                <text x="30" y="88" fill="#94a3b8" fontSize="8" fontWeight="bold">LAB EXHAUST</text>
                <text x="30" y="112" fill="#cbd5e1" fontSize="9" fontWeight="bold">Day: {cfmDay.toLocaleString()} CFM</text>

                {/* Bypass damper air inlet */}
                <path d="M 100 20 L 100 80" fill="none" stroke="#38bdf8" strokeWidth="3" />
                <polygon points="100,80 96,72 104,72" fill="#38bdf8" />
                <text x="100" y="12" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">BYPASS AIR</text>

                {/* Fan plenum box */}
                <rect x="140" y="50" width="120" height="70" rx="8" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                <text x="200" y="90" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">STROBIC FAN</text>
                <text x="200" y="105" fill="#94a3b8" fontSize="8" textAnchor="middle">Eff: {fanEff}%</text>

                {/* Jet Plume Outflow */}
                <path d="M 200 50 L 200 10" fill="none" stroke="#a78bfa" strokeWidth="6" />
                <polygon points="200,10 195,20 205,20" fill="#a78bfa" />
                <text x="260" y="32" fill="#a78bfa" fontSize="8" fontWeight="bold" textAnchor="middle">HIGH VELOCITY PLUME</text>
                <text x="260" y="44" fill="#cbd5e1" fontSize="7" textAnchor="middle">Min limit: {minVelocityLimit} FPM</text>

                {/* Visual Bypass Damper blades */}
                <line x1="100" y1="50" x2="112" y2="50" stroke="#f43f5e" strokeWidth="2" className="origin-[100px_50px] rotate-[45deg]" />
              </svg>
            </div>
          </div>
        )}

        {/* Tab 2: Diurnal Operational States */}
        {activeTab === 'diurnal' && (
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Day vs Night Operational State Profile</h3>
            </div>

            <div className="space-y-4">
              {/* Day State Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  Daytime Operations (12 hrs @ {dayExhaustPct}% load)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse divide-y divide-slate-800">
                    <thead>
                      <tr className="text-slate-450 font-semibold text-[10px] uppercase">
                        <th className="py-2">Control Strategy</th>
                        <th className="py-2">Fan Flow (CFM)</th>
                        <th className="py-2">Bypass Flow (CFM)</th>
                        <th className="py-2">Nozzle Velocity (FPM)</th>
                        <th className="py-2">Total SP (in. wg)</th>
                        <th className="py-2">Fan Power (kW)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 font-medium">
                      <tr>
                        <td className="py-2.5 text-slate-400">Baseline Bypass</td>
                        <td className="py-2.5">{stateBypassDay.cfmFan.toLocaleString()}</td>
                        <td className="py-2.5 text-blue-400">{stateBypassDay.cfmBypass.toLocaleString()}</td>
                        <td className="py-2.5">{stateBypassDay.dischargeVelocity.toFixed(0)}</td>
                        <td className="py-2.5">{stateBypassDay.spTotal.toFixed(2)}</td>
                        <td className="py-2.5 font-bold text-white">{stateBypassDay.powerKw.toFixed(1)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400">VFD Plume Control</td>
                        <td className="py-2.5">{statePlumeDay.cfmFan.toLocaleString()}</td>
                        <td className="py-2.5 text-blue-400">{statePlumeDay.cfmBypass.toLocaleString()}</td>
                        <td className="py-2.5">{statePlumeDay.dischargeVelocity.toFixed(0)}</td>
                        <td className="py-2.5">{statePlumeDay.spTotal.toFixed(2)}</td>
                        <td className="py-2.5 font-bold text-white">{statePlumeDay.powerKw.toFixed(1)}</td>
                      </tr>
                      <tr className="bg-emerald-500/5">
                        <td className="py-2.5 text-emerald-400 font-bold">VFD + Duct SPR</td>
                        <td className="py-2.5 font-semibold text-emerald-300">{stateSprDay.cfmFan.toLocaleString()}</td>
                        <td className="py-2.5 text-blue-400">{stateSprDay.cfmBypass.toLocaleString()}</td>
                        <td className="py-2.5">{stateSprDay.dischargeVelocity.toFixed(0)}</td>
                        <td className="py-2.5 text-emerald-300">{stateSprDay.spTotal.toFixed(2)}</td>
                        <td className="py-2.5 font-bold text-emerald-300">{stateSprDay.powerKw.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Night State Table */}
              <div className="space-y-2 pt-2 border-t border-slate-900">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  Nighttime Operations (12 hrs @ {nightExhaustPct}% load)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse divide-y divide-slate-800">
                    <thead>
                      <tr className="text-slate-455 font-semibold text-[10px] uppercase">
                        <th className="py-2">Control Strategy</th>
                        <th className="py-2">Fan Flow (CFM)</th>
                        <th className="py-2">Bypass Flow (CFM)</th>
                        <th className="py-2">Nozzle Velocity (FPM)</th>
                        <th className="py-2">Total SP (in. wg)</th>
                        <th className="py-2">Fan Power (kW)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 font-medium">
                      <tr>
                        <td className="py-2.5 text-slate-400">Baseline Bypass</td>
                        <td className="py-2.5">{stateBypassNight.cfmFan.toLocaleString()}</td>
                        <td className="py-2.5 text-blue-400">{stateBypassNight.cfmBypass.toLocaleString()}</td>
                        <td className="py-2.5">{stateBypassNight.dischargeVelocity.toFixed(0)}</td>
                        <td className="py-2.5">{stateBypassNight.spTotal.toFixed(2)}</td>
                        <td className="py-2.5 font-bold text-white">{stateBypassNight.powerKw.toFixed(1)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400">VFD Plume Control</td>
                        <td className="py-2.5">{statePlumeNight.cfmFan.toLocaleString()}</td>
                        <td className="py-2.5 text-blue-400">{statePlumeNight.cfmBypass.toLocaleString()}</td>
                        <td className="py-2.5">{statePlumeNight.dischargeVelocity.toFixed(0)}</td>
                        <td className="py-2.5">{statePlumeNight.spTotal.toFixed(2)}</td>
                        <td className="py-2.5 font-bold text-white">{statePlumeNight.powerKw.toFixed(1)}</td>
                      </tr>
                      <tr className="bg-emerald-500/5">
                        <td className="py-2.5 text-emerald-400 font-bold">VFD + Duct SPR</td>
                        <td className="py-2.5 font-semibold text-emerald-300">{stateSprNight.cfmFan.toLocaleString()}</td>
                        <td className="py-2.5 text-blue-400">{stateSprNight.cfmBypass.toLocaleString()}</td>
                        <td className="py-2.5">{stateSprNight.dischargeVelocity.toFixed(0)}</td>
                        <td className="py-2.5 text-emerald-300">{stateSprNight.spTotal.toFixed(2)}</td>
                        <td className="py-2.5 font-bold text-emerald-300">{stateSprNight.powerKw.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
