import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  width: 30,         // ft
  length: 40,        // ft
  targetIllum: 50,   // fc (Footcandles)
  lumensPerFix: 4000,// lm
  cu: 0.70,          // Coefficient of Utilization
  llf: 0.80,         // Light Loss Factor
  fixWatts: 40,      // Watts
};

export default function RoomLumen() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));

  const { width, length, targetIllum, lumensPerFix, cu, llf, fixWatts } = state;

  useEffect(() => {
    updateUrlForTool('room-lumen', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform Calculations
  const area = width * length;
  const reqLumens = (targetIllum * area) / (cu * llf);
  const numFixtures = Math.max(1, Math.ceil(reqLumens / lumensPerFix));
  const totalPowerWatts = numFixtures * fixWatts;
  const lpd = totalPowerWatts / area; // W/sq ft

  // Determine Grid Layout for Visualizer
  const aspect = length / width;
  let cols = Math.round(Math.sqrt(numFixtures * aspect));
  cols = Math.max(1, cols);
  let rows = Math.ceil(numFixtures / cols);

  // Re-adjust to avoid blank final rows if possible
  if (cols * (rows - 1) >= numFixtures) {
    rows = rows - 1;
  }

  // Create array of fixtures
  const fixturesArray = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (fixturesArray.length < numFixtures) {
        fixturesArray.push({ r, c });
      }
    }
  }

  // Visual aspect-ratio bounds
  const svgWidth = 320;
  const svgHeight = 220;
  const padding = 20;
  const maxW = svgWidth - 2 * padding;
  const maxH = svgHeight - 2 * padding;

  let rectW = maxW;
  let rectH = maxH;

  if (aspect > 1) {
    // Length is longer, map length to width of SVG
    rectW = maxW;
    rectH = maxW / aspect;
    if (rectH > maxH) {
      rectH = maxH;
      rectW = maxH * aspect;
    }
  } else {
    // Width is wider, map width to height of SVG
    rectH = maxH;
    rectW = maxH * aspect;
    if (rectW > maxW) {
      rectW = maxW;
      rectH = maxW / aspect;
    }
  }

  const rectX = (svgWidth - rectW) / 2;
  const rectY = (svgHeight - rectH) / 2;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">System Inputs</h3>
        </div>
        {/* Room Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Room Width (ft)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => handleChange('width', Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Room Length (ft)</label>
            <input
              type="number"
              value={length}
              onChange={(e) => handleChange('length', Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Target Illuminance */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Target Illuminance</label>
            <span className="text-sm font-bold text-amber-400">{targetIllum} Footcandles (fc)</span>
          </div>
          <input
            type="range"
            min="5"
            max="150"
            value={targetIllum}
            onChange={(e) => handleChange('targetIllum', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Lumens per Fixture */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Fixture Lumens</label>
            <span className="text-sm font-bold text-sky-400">{lumensPerFix.toLocaleString()} lm</span>
          </div>
          <input
            type="range"
            min="1000"
            max="15000"
            step="500"
            value={lumensPerFix}
            onChange={(e) => handleChange('lumensPerFix', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Fixture Power Watts */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Fixture Power</label>
            <span className="text-sm font-bold text-purple-400">{fixWatts} Watts</span>
          </div>
          <input
            type="range"
            min="5"
            max="250"
            step="5"
            value={fixWatts}
            onChange={(e) => handleChange('fixWatts', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* CU and LLF */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Coeff. of Utilization (CU)</label>
            <input
              type="number"
              step="0.05"
              value={cu}
              onChange={(e) => handleChange('cu', Math.max(0.1, Math.min(1, parseFloat(e.target.value) || 0)))}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Light Loss Factor (LLF)</label>
            <input
              type="number"
              step="0.05"
              value={llf}
              onChange={(e) => handleChange('llf', Math.max(0.1, Math.min(1, parseFloat(e.target.value) || 0)))}
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
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Required Fixtures</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{numFixtures} Units</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Arranged in a {cols}×{rows} grid</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Lighting Load</p>
            <p className="text-2xl font-black text-purple-400 mt-1">{(totalPowerWatts / 1000).toFixed(3)} kW</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{totalPowerWatts.toLocaleString()} Total Watts</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Lighting Power Density</p>
            <p className="text-2xl font-black text-sky-400 mt-1">{lpd.toFixed(3)} W/ft²</p>
            <p className="text-[10px] text-slate-500 mt-0.5">LPD over {area.toLocaleString()} sq ft area</p>
          </div>
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Est. Lux Level</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{(targetIllum * 10.764).toFixed(0)} Lux</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Equivalent to {targetIllum} fc</p>
          </div>
        </div>

        {/* Fixture Grid SVG Layout */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[240px]">
          <svg className="w-full max-w-[340px] h-[220px]" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {/* Room Boundary */}
            <rect x={rectX} y={rectY} width={rectW} height={rectH} fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
            
            {/* Dimension text */}
            <text x={rectX + rectW / 2} y={rectY - 5} fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
              {length} ft length
            </text>
            <text x={rectX - 8} y={rectY + rectH / 2} fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle" transform={`rotate(-90, ${rectX - 8}, ${rectY + rectH / 2})`}>
              {width} ft width
            </text>

            {/* Render Fixtures */}
            {fixturesArray.map((fix, idx) => {
              // Spacing math
              // We divide width & height by cols & rows to get spacing.
              // To center the lights: index + 0.5
              const xRatio = (fix.c + 0.5) / cols;
              const yRatio = (fix.r + 0.5) / rows;
              const cx = rectX + rectW * xRatio;
              const cy = rectY + rectH * yRatio;

              return (
                <g key={idx}>
                  {/* Glowing halo */}
                  <circle cx={cx} cy={cy} r="10" fill="#f59e0b" fillOpacity="0.25" className="animate-pulse" />
                  {/* Fixture dot */}
                  <circle cx={cx} cy={cy} r="3" fill="#fbbf24" stroke="#ffffff" strokeWidth="0.5" />
                </g>
              );
            })}
          </svg>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-1">
            Top-down fixture layout
          </div>
        </div>
      </div>
    </div>
  );
}
