import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  inputType: 'resistivity', // 'resistivity' or 'conductivity'
  inputValue: 15.0, // measured value
  tempC: 22.0, // °C
  feedTds: 350, // ppm
  permeateTds: 7, // ppm
  feedFlow: 20, // GPM
  permeateFlow: 15, // GPM
};

export default function WaterPurityTemp() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));
  const { inputType, inputValue, tempC, feedTds, permeateTds, feedFlow, permeateFlow } = state;

  useEffect(() => {
    updateUrlForTool('water-purity', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // 1. Water Purity & Temperature Correction Calculations
  // Standard pure water temperature coefficient: ~2.15% per °C at 25°C
  const alpha = 0.0215;
  const tempCorrectionFactor = 1 / (1 + alpha * (tempC - 25));

  let measuredResistivity = 0;
  let measuredConductivity = 0;
  let correctedResistivity = 0;
  let correctedConductivity = 0;

  if (inputType === 'resistivity') {
    measuredResistivity = inputValue;
    measuredConductivity = inputValue > 0 ? 1 / inputValue : 0;
    
    // Apply correction factor to conductivity first, then invert
    correctedConductivity = measuredConductivity * tempCorrectionFactor;
    correctedResistivity = correctedConductivity > 0 ? 1 / correctedConductivity : 0;
  } else {
    measuredConductivity = inputValue;
    measuredResistivity = inputValue > 0 ? 1 / inputValue : 0;
    
    correctedConductivity = measuredConductivity * tempCorrectionFactor;
    correctedResistivity = correctedConductivity > 0 ? 1 / correctedConductivity : 0;
  }

  // Cap resistivity at the absolute theoretical limit of pure water (18.24 MΩ·cm at 25°C)
  if (correctedResistivity > 18.24) {
    correctedResistivity = 18.24;
    correctedConductivity = 0.0548;
  }

  // Purity class assessment
  let purityClass = 'Potable / Industrial Grade';
  let purityColor = 'text-slate-400';
  if (correctedResistivity >= 18.0) {
    purityClass = 'Type I (Ultrapure / Semiconductor Grade)';
    purityColor = 'text-sky-400';
  } else if (correctedResistivity >= 1.0) {
    purityClass = 'Type II (Deionized / Analytical Lab Grade)';
    purityColor = 'text-emerald-400';
  } else if (correctedResistivity >= 0.05) {
    purityClass = 'Type III (RO / General Laboratory Grade)';
    purityColor = 'text-amber-400';
  }

  // 2. RO Membrane Calculations
  const rejection = Math.max(0, Math.min(100, (1 - permeateTds / Math.max(1, feedTds)) * 100));
  const passage = 100 - rejection;
  const recovery = Math.max(0, Math.min(100, (permeateFlow / Math.max(0.1, feedFlow)) * 100));
  const concentrateFlow = Math.max(0, feedFlow - permeateFlow);
  
  // Mass balance to solve for concentrate TDS
  const concentrateTds = concentrateFlow > 0.01 
    ? (feedFlow * feedTds - permeateFlow * permeateTds) / concentrateFlow 
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5 max-h-[800px] overflow-y-auto">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Purity & Membrane Inputs</h3>
        </div>

        {/* Section 1: Water Purity Inputs */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. High Purity Loop Properties</h4>
          
          {/* Input Type Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                handleChange('inputType', 'resistivity');
                handleChange('inputValue', measuredResistivity || 15.0);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-all ${
                inputType === 'resistivity'
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Resistivity (MΩ·cm)
            </button>
            <button
              onClick={() => {
                handleChange('inputType', 'conductivity');
                handleChange('inputValue', measuredConductivity || 0.067);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-all ${
                inputType === 'conductivity'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Conductivity (μS/cm)
            </button>
          </div>

          {/* Measured Value */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-semibold text-slate-300">Measured Value</label>
              <span className="text-sm font-bold text-slate-300">
                {inputValue} {inputType === 'resistivity' ? 'MΩ·cm' : 'μS/cm'}
              </span>
            </div>
            <input
              type="number"
              step="0.001"
              value={inputValue}
              onChange={(e) => handleChange('inputValue', Math.max(0.001, parseFloat(e.target.value) || 0.001))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-semibold text-slate-300">Measured Temperature</label>
              <span className="text-sm font-bold text-sky-500">{tempC} °C ({((tempC * 1.8) + 32).toFixed(1)} °F)</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              value={tempC}
              onChange={(e) => handleChange('tempC', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>

        {/* Section 2: RO Membrane Inputs */}
        <div className="space-y-4 pt-3 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. RO Membrane Configuration</h4>
          
          {/* Feed & Permeate TDS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Feed Water TDS (ppm)</label>
              <input
                type="number"
                value={feedTds}
                onChange={(e) => handleChange('feedTds', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Permeate Water TDS (ppm)</label>
              <input
                type="number"
                step="0.1"
                value={permeateTds}
                onChange={(e) => handleChange('permeateTds', Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
              />
            </div>
          </div>

          {/* Feed & Permeate Flow */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Feed Flow (GPM)</label>
              <input
                type="number"
                value={feedFlow}
                onChange={(e) => handleChange('feedFlow', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Permeate Flow (GPM)</label>
              <input
                type="number"
                value={permeateFlow}
                onChange={(e) => handleChange('permeateFlow', Math.max(0.5, Math.min(feedFlow, parseFloat(e.target.value) || 0.5)))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Water Purity & Performance Metrics</h3>
        </div>

        {/* High Purity Results Grid */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">1. Temperature Compensated Water Purity</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Corrected Resistivity (25°C)</p>
              <p className="text-2xl font-black text-sky-400 mt-1">{correctedResistivity.toFixed(3)} MΩ·cm</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Measured: {measuredResistivity.toFixed(2)} MΩ·cm</p>
            </div>
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Corrected Conductivity (25°C)</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{correctedConductivity.toFixed(4)} μS/cm</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Measured: {measuredConductivity.toFixed(3)} μS/cm</p>
            </div>
          </div>
          <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase">Purity Classification:</span>
            <span className={`text-xs font-bold ${purityColor}`}>{purityClass}</span>
          </div>
        </div>

        {/* RO Membrane Performance */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">2. RO Membrane System Performance</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
              <p className="text-[9px] font-semibold text-slate-400 uppercase">Salt Rejection</p>
              <p className="text-lg font-black text-emerald-400 mt-0.5">{rejection.toFixed(2)} %</p>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
              <p className="text-[9px] font-semibold text-slate-400 uppercase">Salt Passage</p>
              <p className="text-lg font-black text-purple-400 mt-0.5">{passage.toFixed(2)} %</p>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
              <p className="text-[9px] font-semibold text-slate-400 uppercase">Recovery Rate</p>
              <p className="text-lg font-black text-sky-400 mt-0.5">{recovery.toFixed(1)} %</p>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
              <p className="text-[9px] font-semibold text-slate-400 uppercase">Concentrate Flow</p>
              <p className="text-lg font-black text-amber-500 mt-0.5">{concentrateFlow.toFixed(1)} GPM</p>
            </div>
          </div>
        </div>

        {/* RO Vessel SVG Diagram */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[200px]">
          <svg className="w-full max-w-[420px] h-[160px]" viewBox="0 0 420 160">
            {/* RO Vessel Body */}
            <rect x="110" y="45" width="200" height="70" fill="#1e293b" stroke="#475569" strokeWidth="2.5" rx="8" />
            {/* Center Core Tube */}
            <rect x="90" y="75" width="240" height="10" fill="#64748b" stroke="#475569" strokeWidth="1" />
            
            {/* Feed Inlet (Top left) */}
            <path d="M 50 40 L 95 40 L 95 60 L 110 60" fill="none" stroke="#38bdf8" strokeWidth="4" />
            <polygon points="110,60 102,56 102,64" fill="#38bdf8" />
            <text x="50" y="28" fill="#38bdf8" fontSize="9" fontWeight="bold">FEED: {feedFlow} GPM</text>
            <text x="50" y="38" fill="#94a3b8" fontSize="8">{feedTds} ppm TDS</text>

            {/* Permeate Outlet (Center right core) */}
            <path d="M 330 80 L 380 80" fill="none" stroke="#10b981" strokeWidth="4" />
            <polygon points="380,80 372,76 372,84" fill="#10b981" />
            <text x="385" y="68" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="end">PERMEATE: {permeateFlow} GPM</text>
            <text x="385" y="78" fill="#94a3b8" fontSize="8" textAnchor="end">{permeateTds} ppm TDS</text>

            {/* Concentrate Outlet (Bottom right) */}
            <path d="M 310 100 L 350 100 L 350 130 Q 350 135 360 135 L 380 135" fill="none" stroke="#f59e0b" strokeWidth="4" />
            <polygon points="380,135 372,131 372,139" fill="#f59e0b" />
            <text x="385" y="123" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end">CONCENTRATE: {concentrateFlow.toFixed(1)} GPM</text>
            <text x="385" y="133" fill="#94a3b8" fontSize="8" textAnchor="end">{Math.round(concentrateTds).toLocaleString()} ppm TDS</text>

            {/* Membrane spirals inside vessel */}
            <path d="M 125 50 L 125 110 M 155 50 L 155 110 M 185 50 L 185 110 M 215 50 L 215 110 M 245 50 L 245 110 M 275 50 L 275 110" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
            
            {/* Title */}
            <text x="210" y="153" fill="#cbd5e1" fontSize="11" fontWeight="bold" textAnchor="middle">REVERSE OSMOSIS VESSEL BALANCE</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
