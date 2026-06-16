import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  cfm: 10000, // CFM
  staticPressure: 2.5, // in. w.g.
  fanEff: 65, // %
  isOaUnit: false, // false = Mixed Air, true = 100% OA
  oaFraction: 20, // %
  oatSummer: 85, // °F
  ratSummer: 75, // °F
  satSummer: 55, // °F
  oatWinter: 35, // °F
  ratWinter: 70, // °F
  satWinter: 100, // °F
  coolingSource: 'chw', // 'chw' or 'dx'
  chillerKwPerTon: 0.65, // kW/Ton
  dxEer: 11.0, // EER
  heatingSource: 'water', // 'water' or 'steam'
  waterBoilerEff: 82, // %
  steamRate: 24.0, // $/klb of steam
  fanHours: 4380, // hrs/yr
  coolHours: 1500, // hrs/yr
  heatHours: 2000, // hrs/yr
  elecRate: 0.12, // $/kWh
  gasRate: 1.20, // $/therm
};

export default function AhuRunningCost() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));
  const {
    cfm,
    staticPressure,
    fanEff,
    isOaUnit,
    oaFraction,
    oatSummer,
    ratSummer,
    satSummer,
    oatWinter,
    ratWinter,
    satWinter,
    coolingSource,
    chillerKwPerTon,
    dxEer,
    heatingSource,
    waterBoilerEff,
    steamRate,
    fanHours,
    coolHours,
    heatHours,
    elecRate,
    gasRate,
  } = state;

  useEffect(() => {
    updateUrlForTool('ahu-cost', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // --- Fan Calculations ---
  const fanBhp = (cfm * staticPressure) / (6356 * (fanEff / 100));
  const fanKw = (fanBhp * 0.7457) / 0.90; // assuming 90% motor efficiency
  const annualFanCost = fanKw * fanHours * elecRate;

  // --- Mixed Air Temp Calculations ---
  const currentOaFraction = isOaUnit ? 100 : oaFraction;
  const matSummer = isOaUnit ? oatSummer : oatSummer * (currentOaFraction / 100) + ratSummer * (1 - currentOaFraction / 100);
  const matWinter = isOaUnit ? oatWinter : oatWinter * (currentOaFraction / 100) + ratWinter * (1 - currentOaFraction / 100);

  // --- Cooling Load Calculations ---
  const coolingdT = Math.max(0, matSummer - satSummer);
  const coolLoadSens = 1.08 * cfm * coolingdT;
  const coolLoadTotal = coolLoadSens / 0.75; // assume 0.75 SHR
  const coolTons = coolLoadTotal / 12000;

  let coolKw = 0;
  if (coolingSource === 'dx') {
    coolKw = coolLoadTotal / (dxEer * 1000);
  } else {
    coolKw = coolTons * chillerKwPerTon;
  }
  const annualCoolCost = coolKw * coolHours * elecRate;

  // --- Heating Load Calculations ---
  const heatingdT = Math.max(0, satWinter - matWinter);
  const heatLoad = 1.08 * cfm * heatingdT; // Btu/hr

  let annualHeatCost = 0;
  let heatInputUnit = '';
  let heatInputValue = 0;
  if (heatingSource === 'water') {
    const boilerEffDec = waterBoilerEff / 100;
    const gasInputBtuHr = heatLoad / boilerEffDec;
    const thermsHr = gasInputBtuHr / 100000;
    heatInputValue = thermsHr * heatHours;
    heatInputUnit = 'therms/yr';
    annualHeatCost = heatInputValue * gasRate;
  } else {
    // Steam: assumes approx 1000 Btu/lb condensation heat
    const steamLbsHr = heatLoad / 1000;
    const steamKlbHr = steamLbsHr / 1000;
    heatInputValue = steamKlbHr * heatHours;
    heatInputUnit = 'klb/yr';
    annualHeatCost = heatInputValue * steamRate;
  }

  const totalCost = annualFanCost + annualCoolCost + annualHeatCost;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5 max-h-[820px] overflow-y-auto">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">AHU Specifications</h3>
        </div>

        {/* 1. Fan Parameters */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Fan Properties</h4>
          
          {/* CFM */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-[11px] font-semibold text-slate-300">Design Airflow</label>
              <span className="text-[11px] font-bold text-sky-400">{cfm.toLocaleString()} CFM</span>
            </div>
            <input
              type="range"
              min="1000"
              max="60000"
              step="500"
              value={cfm}
              onChange={(e) => handleChange('cfm', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Static Pressure & Fan Efficiency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-400">Static Pressure</label>
                <span className="text-[10px] font-bold text-slate-200">{staticPressure.toFixed(1)} in. wg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.1"
                value={staticPressure}
                onChange={(e) => handleChange('staticPressure', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-500"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-400">Fan/Motor Eff.</label>
                <span className="text-[10px] font-bold text-slate-200">{fanEff}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                value={fanEff}
                onChange={(e) => handleChange('fanEff', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Ventilation Setup */}
        <div className="space-y-3 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Ventilation & Air Mixing</h4>
          <div className="flex gap-2">
            <button
              onClick={() => handleChange('isOaUnit', false)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-all ${
                !isOaUnit
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Mixed Air Unit
            </button>
            <button
              onClick={() => handleChange('isOaUnit', true)}
              className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-all ${
                isOaUnit
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              100% Outside Air (DOAS)
            </button>
          </div>

          {!isOaUnit && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-400">Min Outdoor Air Fraction</label>
                <span className="text-[10px] font-bold text-sky-400">{oaFraction}% OA</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={oaFraction}
                onChange={(e) => handleChange('oaFraction', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          )}
        </div>

        {/* 3. Utility Hours & Rates */}
        <div className="space-y-4 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Scheduling & Rates</h4>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400">Fan Hours/yr</label>
              <input
                type="number"
                value={fanHours}
                onChange={(e) => handleChange('fanHours', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400">Cool Hours/yr</label>
              <input
                type="number"
                value={coolHours}
                onChange={(e) => handleChange('coolHours', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400">Heat Hours/yr</label>
              <input
                type="number"
                value={heatHours}
                onChange={(e) => handleChange('heatHours', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Electricity Rate ($/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={elecRate}
                onChange={(e) => handleChange('elecRate', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
            {heatingSource === 'water' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Gas Rate ($/therm)</label>
                <input
                  type="number"
                  step="0.05"
                  value={gasRate}
                  onChange={(e) => handleChange('gasRate', Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Steam Rate ($/klb)</label>
                <input
                  type="number"
                  step="0.5"
                  value={steamRate}
                  onChange={(e) => handleChange('steamRate', Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
            )}
          </div>
        </div>

        {/* 4. Equipment Efficiencies */}
        <div className="space-y-4 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Plant / Coil Sources</h4>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Cooling Source */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-300 uppercase block">Cooling Coil</label>
              <select
                value={coolingSource}
                onChange={(e) => handleChange('coolingSource', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="chw">Chilled Water (CHW)</option>
                <option value="dx">Direct Expansion (DX)</option>
              </select>
              {coolingSource === 'chw' ? (
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Chiller kW/Ton</label>
                  <input
                    type="number"
                    step="0.01"
                    value={chillerKwPerTon}
                    onChange={(e) => handleChange('chillerKwPerTon', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">DX Unit EER</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dxEer}
                    onChange={(e) => handleChange('dxEer', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* Heating Source */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-300 uppercase block">Heating Coil</label>
              <select
                value={heatingSource}
                onChange={(e) => handleChange('heatingSource', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
              >
                <option value="water">Hot Water (HW)</option>
                <option value="steam">Steam Coil</option>
              </select>
              {heatingSource === 'water' && (
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Boiler Eff. (%)</label>
                  <input
                    type="number"
                    value={waterBoilerEff}
                    onChange={(e) => handleChange('waterBoilerEff', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Annual AHU Operating Cost</h3>
        </div>

        {/* Grand Total Cost Display */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl text-center shadow-inner">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Annual Operating Cost</p>
          <p className="text-4xl font-black text-emerald-400 mt-2">
            ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
          </p>
          <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
            Based on {cfm.toLocaleString()} CFM system operating {fanHours} hours annually
          </p>
        </div>

        {/* KPI Cost Breakdown Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">1. Fan Power</p>
            <p className="text-lg font-black text-white mt-1">${annualFanCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{fanKw.toFixed(1)} kW load</p>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">2. Cooling</p>
            <p className="text-lg font-black text-white mt-1">${annualCoolCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{coolTons.toFixed(1)} Tons (avg)</p>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">3. Heating</p>
            <p className="text-lg font-black text-white mt-1">${annualHeatCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{heatInputValue.toFixed(0)} {heatInputUnit}</p>
          </div>
        </div>

        {/* AHU Schematic SVG */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[200px]">
          <svg className="w-full max-w-[440px] h-[160px]" viewBox="0 0 440 160">
            {/* AHU casing */}
            <rect x="60" y="40" width="320" height="80" fill="none" stroke="#475569" strokeWidth="2.5" />
            
            {/* Mixing Box (Left Inlet) */}
            {/* Outside air duct */}
            <path d="M 20 50 L 60 50" stroke="#38bdf8" strokeWidth="3" />
            <polygon points="60,50 52,46 52,54" fill="#38bdf8" />
            
            {/* Return air duct */}
            {!isOaUnit && (
              <>
                <path d="M 90 150 L 90 120" stroke="#cbd5e1" strokeWidth="3" />
                <polygon points="90,120 86,128 94,128" fill="#cbd5e1" />
                <text x="90" y="160" fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor="middle">RETURN</text>
              </>
            )}

            {/* Filter box */}
            <rect x="110" y="40" width="10" height="80" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            <line x1="115" y1="40" x2="115" y2="120" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
            
            {/* Heating Coil */}
            <rect x="150" y="45" width="20" height="70" fill="#f97316" fillOpacity="0.1" stroke="#f97316" strokeWidth="1.5" rx="2" />
            <path d="M 160 45 L 160 115" stroke="#f97316" strokeWidth="2" strokeDasharray="2 4" />
            
            {/* Cooling Coil */}
            <rect x="200" y="45" width="20" height="70" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="1.5" rx="2" />
            <path d="M 210 45 L 210 115" stroke="#3b82f6" strokeWidth="2" strokeDasharray="2 4" />

            {/* Fan section */}
            <circle cx="280" cy="80" r="25" fill="#334155" stroke="#475569" strokeWidth="1.5" />
            <circle cx="280" cy="80" r="6" fill="#cbd5e1" />
            {/* blades */}
            <line x1="280" y1="55" x2="280" y2="105" stroke="#cbd5e1" strokeWidth="2" className="animate-spin origin-[280px_80px]" style={{ animationDuration: '4s' }} />
            <line x1="255" y1="80" x2="305" y2="80" stroke="#cbd5e1" strokeWidth="2" className="animate-spin origin-[280px_80px]" style={{ animationDuration: '4s' }} />

            {/* Supply Air Discharge (Right) */}
            <path d="M 380 80 L 420 80" stroke="#a7f3d0" strokeWidth="4" />
            <polygon points="420,80 412,76 412,84" fill="#a7f3d0" />

            {/* Labels and values */}
            <text x="30" y="32" fill="#38bdf8" fontSize="8" fontWeight="bold">OUTSIDE AIR</text>
            <text x="30" y="42" fill="#94a3b8" fontSize="7">{isOaUnit ? '100%' : `${oaFraction}%`} fraction</text>
            <text x="160" y="32" fill="#f97316" fontSize="8" fontWeight="bold" textAnchor="middle">HEAT</text>
            <text x="160" y="128" fill="#94a3b8" fontSize="7" textAnchor="middle">{heatingSource === 'water' ? 'HW' : 'Steam'}</text>
            <text x="210" y="32" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">COOL</text>
            <text x="210" y="128" fill="#94a3b8" fontSize="7" textAnchor="middle">{coolingSource === 'chw' ? 'CHW' : 'DX'}</text>
            <text x="280" y="32" fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor="middle">FAN</text>
            <text x="280" y="128" fill="#94a3b8" fontSize="7" textAnchor="middle">{fanKw.toFixed(1)} kW</text>
            <text x="415" y="68" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="end">SUPPLY AIR</text>
            <text x="415" y="78" fill="#94a3b8" fontSize="7" textAnchor="end">{cfm.toLocaleString()} CFM</text>

            <text x="220" y="152" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">AIR HANDLING UNIT LAYOUT</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
