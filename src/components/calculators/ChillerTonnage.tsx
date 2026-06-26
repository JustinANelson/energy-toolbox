import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';
import { 
  Thermometer, 
  Zap, 
  Droplets, 
  Gauge, 
  Info, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ChevronRight,
  TrendingDown,
  Layers
} from 'lucide-react';

const DEFAULTS = {
  flow: 120, // GPM (Evaporator Chilled Water Flow)
  tempIn: 54, // °F (Evaporator Entering Water Temperature)
  tempOut: 44, // °F (Evaporator Leaving Water Temperature)
  power: 80, // kW (Chiller Compressor Power)
  designDeltaT: 12, // °F (Design Chilled Water Delta-T)
  condenserType: 'water', // 'water' = Water-Cooled, 'air' = Air-Cooled
  flowCond: 150, // GPM (Condenser Cooling Water Flow)
  tempInCond: 85, // °F (Entering Condenser Water Temp - ECWT)
  tempOutCond: 95, // °F (Leaving Condenser Water Temp - LCWT)
  powerCHWP: 10, // kW (Chilled Water Pump Power)
  powerCWP: 15, // kW (Condenser Water Pump Power)
  powerCTF: 8, // kW (Cooling Tower Fan Power)
};

export default function ChillerTonnage() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));
  const [activeTab, setActiveTab] = useState<'chiller' | 'system' | 'condenser'>('chiller');

  const { 
    flow, 
    tempIn, 
    tempOut, 
    power, 
    designDeltaT, 
    condenserType, 
    flowCond, 
    tempInCond, 
    tempOutCond, 
    powerCHWP, 
    powerCWP, 
    powerCTF 
  } = state;

  useEffect(() => {
    updateUrlForTool('chiller-tonnage', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // 1. Evaporator Calculations
  const deltaT = Math.max(0, tempIn - tempOut);
  const capacityBtuHr = flow * 500 * deltaT;
  const tonnage = capacityBtuHr / 12000;

  const kwPerTon = tonnage > 0.01 ? power / tonnage : 0;
  const cop = power > 0 ? (tonnage * 3.51685) / power : 0;
  const eer = power > 0 ? (tonnage * 12) / power : 0;

  // 2. Low Delta-T Syndrome & Pumping Excess
  const lowDeltaT = deltaT < designDeltaT;
  const excessFlowGpm = lowDeltaT && deltaT > 0 ? flow * (1 - deltaT / designDeltaT) : 0;
  // Estimated excess pump power index (assumes ~0.01 kW/GPM pumping design)
  const excessPumpingPowerKw = excessFlowGpm * 0.01;
  const annualPumpingLossKwh = excessPumpingPowerKw * 8760; // 24/7 run profile
  const annualPumpingLossCost = annualPumpingLossKwh * 0.12; // at typical $0.12/kWh

  // 3. Carnot COP & Thermodynamic Efficiency
  // Carnot COP = T_cold / (T_hot - T_cold) in absolute Rankine
  const tColdR = tempOut + 459.67;
  const tHotR = (condenserType === 'water' ? tempInCond : 95) + 459.67; // Assumes 95°F outdoor ambient for Air-Cooled
  const carnotCop = tHotR > tColdR ? tColdR / (tHotR - tColdR) : 0;
  const carnotEfficiencyRatio = carnotCop > 0 ? (cop / carnotCop) * 100 : 0;

  // 4. Condenser Heat Balance Verification (Water-Cooled Only)
  const capacityCondBtuHr = condenserType === 'water' ? flowCond * 500 * Math.max(0, tempOutCond - tempInCond) : 0;
  const tonnageCond = capacityCondBtuHr / 12000;
  const expectedRejectionBtuHr = capacityBtuHr + power * 3412.14;
  const heatBalanceErrorPercent = condenserType === 'water' && capacityCondBtuHr > 0 
    ? ((capacityCondBtuHr - expectedRejectionBtuHr) / expectedRejectionBtuHr) * 100 
    : 0;
  const isHeatBalanceValid = Math.abs(heatBalanceErrorPercent) <= 5.0;

  // 5. System-Level Auxiliaries
  const totalCHWPKw = powerCHWP;
  const totalCWPKw = condenserType === 'water' ? powerCWP : 0;
  const totalCTFKw = condenserType === 'water' ? powerCTF : 0;
  
  const totalSystemPower = power + totalCHWPKw + totalCWPKw + totalCTFKw;
  const systemKwPerTon = tonnage > 0.01 ? totalSystemPower / tonnage : 0;
  const systemCop = totalSystemPower > 0 ? (tonnage * 3.51685) / totalSystemPower : 0;

  // Chiller Efficiency Rating
  let efficiencyRating = 'Good';
  let ratingColor = 'text-emerald-400';
  if (kwPerTon > 0.85) {
    efficiencyRating = 'Poor';
    ratingColor = 'text-red-400';
  } else if (kwPerTon > 0.65) {
    efficiencyRating = 'Standard';
    ratingColor = 'text-amber-400';
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5 max-h-[820px] overflow-y-auto">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-400" /> Plant Inputs
          </h3>
        </div>

        {/* 1. Evaporator (Chilled Water) Inputs */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Evaporator (CHW Loop)</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-350">Evaporator Flow</label>
              <span className="text-xs font-bold text-emerald-400">{flow.toLocaleString()} GPM</span>
            </div>
            <input
              type="range"
              min="10"
              max="40000"
              step="50"
              value={flow}
              onChange={(e) => handleChange('flow', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
            <input
              type="number"
              value={flow}
              onChange={(e) => handleChange('flow', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Entering CHW (T-in)</label>
              <input
                type="number"
                step="0.5"
                value={tempIn}
                onChange={(e) => handleChange('tempIn', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Leaving CHW (T-out)</label>
              <input
                type="number"
                step="0.5"
                value={tempOut}
                onChange={(e) => handleChange('tempOut', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Design & Delta-T Syndrome Parameters */}
        <div className="space-y-3 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Design & Delta-T Syndrome</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-350">Design Delta-T (ΔTd)</label>
              <span className="text-xs font-bold text-blue-400">{designDeltaT}°F</span>
            </div>
            <input
              type="range"
              min="6"
              max="24"
              step="0.5"
              value={designDeltaT}
              onChange={(e) => handleChange('designDeltaT', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* 3. Chiller Compressor Power */}
        <div className="space-y-3 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Chiller Electrical Load</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-slate-350">Compressor Power</label>
              <span className="text-xs font-bold text-purple-400">{power.toLocaleString()} kW</span>
            </div>
            <input
              type="range"
              min="10"
              max="20000"
              step="50"
              value={power}
              onChange={(e) => handleChange('power', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
            />
            <input
              type="number"
              value={power}
              onChange={(e) => handleChange('power', Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-900/60 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Condenser Cooling Loop */}
        <div className="space-y-4 pt-3 border-t border-slate-900">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Condenser Loop</h4>
            <select
              value={condenserType}
              onChange={(e) => handleChange('condenserType', e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none"
            >
              <option value="water">Water-Cooled</option>
              <option value="air">Air-Cooled</option>
            </select>
          </div>

          {condenserType === 'water' ? (
            <div className="space-y-3 bg-slate-900/20 border border-slate-900 p-3 rounded-xl">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] font-semibold text-slate-355">Condenser Flow</label>
                  <span className="text-[10px] font-bold text-amber-400">{flowCond.toLocaleString()} GPM</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50000"
                  step="50"
                  value={flowCond}
                  onChange={(e) => handleChange('flowCond', parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Entering Cond. Water (ECWT)</label>
                  <input
                    type="number"
                    value={tempInCond}
                    onChange={(e) => handleChange('tempInCond', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900/60 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Leaving Cond. Water (LCWT)</label>
                  <input
                    type="number"
                    value={tempOutCond}
                    onChange={(e) => handleChange('tempOutCond', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900/60 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500 italic">
              Air-Cooled condenser loop assumes static heat rejection to outdoor air (design limit ambient 95°F).
            </p>
          )}
        </div>

        {/* 5. Central Plant Auxiliaries */}
        <div className="space-y-4 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Plant Auxiliaries (kW)</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-semibold text-slate-400">CHW Pump</label>
              <input
                type="number"
                value={powerCHWP}
                onChange={(e) => handleChange('powerCHWP', Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-slate-900/60 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            {condenserType === 'water' && (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Cond. Pump</label>
                  <input
                    type="number"
                    value={powerCWP}
                    onChange={(e) => handleChange('powerCWP', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900/60 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Tower Fan</label>
                  <input
                    type="number"
                    value={powerCTF}
                    onChange={(e) => handleChange('powerCTF', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900/60 border border-slate-850 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('chiller')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'chiller'
                ? 'border-blue-500 text-blue-400 font-bold bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Chiller Performance
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-400 font-bold bg-slate-900/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            System & Pumping Optimizer
          </button>
          {condenserType === 'water' && (
            <button
              onClick={() => setActiveTab('condenser')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === 'condenser'
                  ? 'border-blue-500 text-blue-400 font-bold bg-slate-900/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Condenser Heat Balance
            </button>
          )}
        </div>

        {/* Tab 1: Chiller Performance */}
        {activeTab === 'chiller' && (
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Chiller Capacity & Efficiency</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Cooling Capacity</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {tonnage.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tons
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {(capacityBtuHr / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} kBTU/hr
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Chiller Performance Ratio</p>
                <p className="text-2xl font-black text-sky-400 mt-1">{kwPerTon.toFixed(3)} kW/Ton</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Rating: <span className={`font-bold ${ratingColor}`}>{efficiencyRating}</span></p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Chiller COP & EER</p>
                <p className="text-lg font-black text-white mt-1">{cop.toFixed(2)} COP</p>
                <p className="text-[10px] text-slate-455 mt-0.5">{eer.toFixed(2)} EER</p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Carnot Thermodynamic Ratio</p>
                <p className="text-lg font-black text-purple-400 mt-1">{carnotEfficiencyRatio.toFixed(1)}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Carnot COP Limit: {carnotCop.toFixed(2)}</p>
              </div>
            </div>

            {/* SVG Schematic - Evaporator side */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[220px]">
              <svg className="w-full max-w-[400px] h-[180px]" viewBox="0 0 400 180">
                {/* Chiller Unit Box */}
                <rect x="120" y="40" width="160" height="100" rx="12" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                <text x="200" y="95" fill="#f8fafc" fontSize="13" fontWeight="bold" textAnchor="middle">CHILLER EVAP</text>
                
                {/* Warm Loop (Entering) */}
                <path d="M 20 60 L 120 60" fill="none" stroke="#f87171" strokeWidth="5" strokeLinecap="round" />
                <polygon points="120,60 112,56 112,64" fill="#f87171" />
                <text x="35" y="48" fill="#f87171" fontSize="9" fontWeight="bold">Warm In (CHWR)</text>
                <text x="35" y="76" fill="#f87171" fontSize="11" fontWeight="extrabold">{tempIn.toFixed(1)}°F</text>
      
                {/* Cold Loop (Leaving) */}
                <path d="M 120 120 L 20 120" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
                <polygon points="20,120 28,116 28,124" fill="#38bdf8" />
                <text x="35" y="108" fill="#38bdf8" fontSize="9" fontWeight="bold">Chilled Out (CHWS)</text>
                <text x="35" y="136" fill="#38bdf8" fontSize="11" fontWeight="extrabold">{tempOut.toFixed(1)}°F</text>
      
                {/* Water Flow Animation Indicator */}
                <circle cx="70" cy="60" r="2.5" fill="#ffffff" className="animate-ping" />
                <circle cx="70" cy="120" r="2.5" fill="#ffffff" className="animate-ping" />
      
                {/* Compressor Electricity Inlet */}
                <path d="M 200 180 L 200 140" fill="none" stroke="#c084fc" strokeWidth="3" strokeDasharray="3 2" />
                <text x="260" y="162" fill="#c084fc" fontSize="9" fontWeight="bold" textAnchor="middle">{power.toLocaleString()} kW input</text>
      
                {/* Tonnage Output label */}
                <text x="200" y="30" fill="#34d399" fontSize="11" fontWeight="extrabold" textAnchor="middle">
                  {tonnage.toLocaleString(undefined, { maximumFractionDigits: 1 })} Tons Capacity (dT = {deltaT.toFixed(1)}°F)
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* Tab 2: System & Pumping Optimizer */}
        {activeTab === 'system' && (
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Campus Pumping & Auxiliary Optimizer</h3>
            </div>

            {/* Delta-T Syndrome analysis cards */}
            {lowDeltaT ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-350 rounded-xl text-xs flex gap-3 text-left">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <span className="font-bold text-rose-400 block mb-0.5">Low Delta-T Syndrome Detected</span>
                  Actual temperature difference ({deltaT.toFixed(1)}°F) is below the design target ({designDeltaT}°F). 
                  To transfer the current cooling load, the central plant is pumping <span className="font-bold text-white">{excessFlowGpm.toFixed(0)} GPM of excess water</span>, 
                  creating a flow deficit and consuming an estimated <span className="font-bold text-white">{excessPumpingPowerKw.toFixed(1)} kW</span> of unnecessary pump energy.
                  <span className="block mt-1 font-semibold text-slate-300">
                    Estimated annual piping/pumping penalty: ${annualPumpingLossCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr (assuming 24/7 run profile)
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-350 rounded-xl text-xs flex gap-3 text-left">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <span className="font-bold text-emerald-400 block mb-0.5">Healthy System Delta-T</span>
                  Actual Delta-T ({deltaT.toFixed(1)}°F) exceeds or matches the design target ({designDeltaT}°F). No excess flow or delta-T penalty is currently incurred, maximizing district network transmission capacity.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Combined System Power</p>
                <p className="text-2xl font-black text-white mt-1">{totalSystemPower.toLocaleString()} kW</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Chiller: {power} kW | Aux: {totalSystemPower - power} kW
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">System kW/Ton</p>
                <p className="text-2xl font-black text-sky-400 mt-1">{systemKwPerTon.toFixed(3)} kW/Ton</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Includes pumps & fans (COP: {systemCop.toFixed(2)})</p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl col-span-2">
                <p className="text-[10px] font-semibold text-slate-450 uppercase tracking-wide block mb-2">Plant Load Breakdown</p>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-500 rounded-sm"></span>Chiller Compressor:</span>
                    <span className="font-bold">{power} kW ({((power / totalSystemPower) * 100).toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>CHW Pump:</span>
                    <span className="font-bold">{powerCHWP} kW ({((powerCHWP / totalSystemPower) * 100).toFixed(0)}%)</span>
                  </div>
                  {condenserType === 'water' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>Condenser Pump:</span>
                        <span className="font-bold">{powerCWP} kW ({((powerCWP / totalSystemPower) * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span>Cooling Tower Fan:</span>
                        <span className="font-bold">{powerCTF} kW ({((powerCTF / totalSystemPower) * 100).toFixed(0)}%)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Condenser Heat Balance */}
        {activeTab === 'condenser' && condenserType === 'water' && (
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Measured Condenser Heat Balance Audit</h3>
            </div>

            {isHeatBalanceValid ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex gap-3 text-left">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-450" />
                <div>
                  <span className="font-bold text-emerald-400 block mb-0.5">Heat Balance Check Passed (Error: {heatBalanceErrorPercent.toFixed(1)}%)</span>
                  The difference between measured condenser heat rejection and expected chiller output is within the standard 
                  industry calibration limit of ±5%. Flowmeters and temperature sensors are performing reliably.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex gap-3 text-left">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-450" />
                <div>
                  <span className="font-bold text-amber-400 block mb-0.5">Calibration Check Failed (Error: {heatBalanceErrorPercent.toFixed(1)}%)</span>
                  The measured condenser heat transfer differs from expected thermodynamic values by more than ±5%. 
                  Check for:
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-350">
                    <li>Evaporator or Condenser loop GPM sensor miscalibration</li>
                    <li>Fouled temperature thermistors (T-in or T-out sensors)</li>
                    <li>Refrigerant charge issues or compressor motor losses differing from kW meter readings</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Measured Condenser Heat Rejection</p>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  {tonnageCond.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tons
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {(capacityCondBtuHr / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} kBTU/hr (LCWT - ECWT = {(tempOutCond - tempInCond).toFixed(1)}°F)
                </p>
              </div>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Expected Thermodynamic Rejection</p>
                <p className="text-2xl font-black text-white mt-1">
                  {expectedRejectionTons.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tons
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {(expectedRejectionBtuHr / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} kBTU/hr (Evap + Compressor power)
                </p>
              </div>
            </div>

            {/* SVG Central Plant Water Loop Schematic */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[220px]">
              <svg className="w-full max-w-[420px] h-[180px]" viewBox="0 0 420 180">
                {/* Evaporator Side */}
                <rect x="60" y="45" width="80" height="90" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <text x="100" y="90" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">EVAPORATOR</text>
                
                {/* Condenser Side */}
                <rect x="180" y="45" width="80" height="90" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <text x="220" y="90" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">CONDENSER</text>
                
                {/* Compressor Coupling */}
                <path d="M 140 90 L 180 90" stroke="#a78bfa" strokeWidth="2.5" strokeDasharray="3 2" />
                
                {/* Chilled Water Loops */}
                <path d="M 10 60 L 60 60" fill="none" stroke="#f87171" strokeWidth="4" />
                <polygon points="60,60 52,56 52,64" fill="#f87171" />
                <path d="M 60 120 L 10 120" fill="none" stroke="#38bdf8" strokeWidth="4" />
                <polygon points="10,120 18,116 18,124" fill="#38bdf8" />
                
                <text x="12" y="52" fill="#f87171" fontSize="7" fontWeight="bold">CHWR: {tempIn.toFixed(0)}°F</text>
                <text x="12" y="112" fill="#38bdf8" fontSize="7" fontWeight="bold">CHWS: {tempOut.toFixed(0)}°F</text>
                <text x="35" y="85" fill="#a7f3d0" fontSize="7.5" fontWeight="extrabold" textAnchor="middle">{tonnage.toFixed(0)} Tons</text>

                {/* Condenser Water Loops */}
                <path d="M 260 60 L 320 60" fill="none" stroke="#fb7185" strokeWidth="4" />
                <polygon points="320,60 312,56 312,64" fill="#fb7185" />
                <path d="M 320 120 L 260 120" fill="none" stroke="#34d399" strokeWidth="4" />
                <polygon points="260,120 268,116 268,124" fill="#34d399" />
                
                <text x="315" y="52" fill="#fb7185" fontSize="7" fontWeight="bold" textAnchor="end">LCWT: {tempOutCond.toFixed(0)}°F</text>
                <text x="315" y="112" fill="#34d399" fontSize="7" fontWeight="bold" textAnchor="end">ECWT: {tempInCond.toFixed(0)}°F</text>
                <text x="290" y="85" fill="#fbcfe8" fontSize="7.5" fontWeight="extrabold" textAnchor="middle">{tonnageCond.toFixed(0)} Tons</text>

                {/* Cooling Tower box */}
                <rect x="330" y="45" width="80" height="90" rx="4" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
                <line x1="330" y1="90" x2="410" y2="90" stroke="#334155" strokeWidth="1" />
                <text x="370" y="70" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">TOWER</text>
                <text x="370" y="115" fill="#38bdf8" fontSize="7.5" fontWeight="bold" textAnchor="middle">BASIN</text>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
