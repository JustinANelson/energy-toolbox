import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  width: 20, // ft
  length: 30, // ft
  height: 10, // ft
  occupants: 4, // people
  lighting: 300, // Watts
  equipment: 500, // Watts
  wallArea: 250, // sq ft
  wallU: 0.08, // Btu/h-sq ft-°F
  windowArea: 60, // sq ft
  windowU: 0.50, // Btu/h-sq ft-°F
  windowShgc: 0.40,
  infiltration: 0.5, // ACH
  tempOutSummer: 95, // °F
  tempInSummer: 75, // °F
  tempOutWinter: 15, // °F
  tempInWinter: 70, // °F
};

export default function RoomLoadEstimator() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));
  const {
    width,
    length,
    height,
    occupants,
    lighting,
    equipment,
    wallArea,
    wallU,
    windowArea,
    windowU,
    windowShgc,
    infiltration,
    tempOutSummer,
    tempInSummer,
    tempOutWinter,
    tempInWinter,
  } = state;

  useEffect(() => {
    updateUrlForTool('room-load', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Intermediate Geometry Calculations
  const roomArea = width * length;
  const roomVolume = roomArea * height;
  const infiltrationCfm = (roomVolume * infiltration) / 60;

  // Temperature Deltas
  const coolingdT = Math.max(0, tempOutSummer - tempInSummer);
  const heatingdT = Math.max(0, tempInWinter - tempOutWinter);

  // --- COOLING LOAD CALCULATIONS ---
  // Sensible Gains
  const coolWallSens = wallU * wallArea * coolingdT;
  const coolWindowSens = windowU * windowArea * coolingdT;
  const coolSolarSens = windowArea * 150 * windowShgc; // peak solar radiation base of 150 Btu/hr-sq ft
  const coolPeopleSens = occupants * 250;
  const coolLightingSens = lighting * 3.412;
  const coolEquipSens = equipment * 3.412;
  const coolInfSens = 1.08 * infiltrationCfm * coolingdT;

  const totalCoolSensible =
    coolWallSens +
    coolWindowSens +
    coolSolarSens +
    coolPeopleSens +
    coolLightingSens +
    coolEquipSens +
    coolInfSens;

  // Latent Gains
  const coolPeopleLat = occupants * 200;
  const coolInfLat = 4840 * infiltrationCfm * 0.006; // standard summer delta humidity ratio of 0.006 lb/lb
  const totalCoolLatent = coolPeopleLat + coolInfLat;

  const totalCoolLoad = totalCoolSensible + totalCoolLatent;
  const coolTons = totalCoolLoad / 12000;
  const sqFtPerTon = coolTons > 0.01 ? roomArea / coolTons : 0;
  const sensibleHeatRatio = totalCoolLoad > 1 ? totalCoolSensible / totalCoolLoad : 1;

  // --- HEATING LOAD CALCULATIONS ---
  const heatWallLoss = wallU * wallArea * heatingdT;
  const heatWindowLoss = windowU * windowArea * heatingdT;
  const heatInfLoss = 1.08 * infiltrationCfm * heatingdT;
  const totalHeatLoad = heatWallLoss + heatWindowLoss + heatInfLoss;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5 max-h-[800px] overflow-y-auto">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Room & Load Inputs</h3>
        </div>

        {/* Room Dimensions */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Room Geometry</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Width (ft)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => handleChange('width', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Length (ft)</label>
              <input
                type="number"
                value={length}
                onChange={(e) => handleChange('length', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400">Height (ft)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => handleChange('height', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Computed: <span className="text-slate-300 font-semibold">{roomArea} sq ft</span> | <span className="text-slate-300 font-semibold">{roomVolume.toLocaleString()} cu ft</span>
          </p>
        </div>

        {/* Design Conditions */}
        <div className="space-y-3 pt-2 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Design Temperatures (°F)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400">Summer Outdoor / Setpoint</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={tempOutSummer}
                  onChange={(e) => handleChange('tempOutSummer', parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50"
                  title="Summer Outdoor Design Temp"
                />
                <input
                  type="number"
                  value={tempInSummer}
                  onChange={(e) => handleChange('tempInSummer', parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50"
                  title="Summer Indoor Setpoint"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400">Winter Outdoor / Setpoint</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={tempOutWinter}
                  onChange={(e) => handleChange('tempOutWinter', parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500/50"
                  title="Winter Outdoor Design Temp"
                />
                <input
                  type="number"
                  value={tempInWinter}
                  onChange={(e) => handleChange('tempInWinter', parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-orange-500/50"
                  title="Winter Indoor Setpoint"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Envelope Details */}
        <div className="space-y-4 pt-2 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Envelope (Walls & Windows)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-300">Wall Area (sq ft)</label>
                <span className="text-[10px] font-bold text-slate-400">{wallArea}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2000"
                step="20"
                value={wallArea}
                onChange={(e) => handleChange('wallArea', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-300">Wall U-Value</label>
                <span className="text-[10px] font-bold text-slate-400">{wallU.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.50"
                step="0.01"
                value={wallU}
                onChange={(e) => handleChange('wallU', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-300">Window Area (sq ft)</label>
                <span className="text-[10px] font-bold text-slate-400">{windowArea}</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="5"
                value={windowArea}
                onChange={(e) => handleChange('windowArea', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-300">Window SHGC</label>
                <span className="text-[10px] font-bold text-slate-400">{windowShgc.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={windowShgc}
                onChange={(e) => handleChange('windowShgc', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Internal Loads & Infiltration */}
        <div className="space-y-4 pt-2 border-t border-slate-900">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Internal Loads & Air Exchange</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[10px] font-semibold text-slate-300">Occupancy (People)</label>
              <span className="text-[10px] font-bold text-purple-400">{occupants}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={occupants}
              onChange={(e) => handleChange('occupants', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-300">Lighting (Watts)</label>
                <span className="text-[10px] font-bold text-amber-400">{lighting} W</span>
              </div>
              <input
                type="range"
                min="0"
                max="3000"
                step="50"
                value={lighting}
                onChange={(e) => handleChange('lighting', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-slate-300">Equipment (Watts)</label>
                <span className="text-[10px] font-bold text-pink-400">{equipment} W</span>
              </div>
              <input
                type="range"
                min="0"
                max="5000"
                step="100"
                value={equipment}
                onChange={(e) => handleChange('equipment', parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-pink-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-[10px] font-semibold text-slate-300">Infiltration Air Changes (ACH)</label>
              <span className="text-[10px] font-bold text-slate-400">{infiltration.toFixed(2)} ACH ({Math.round(infiltrationCfm)} CFM)</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="3.00"
              step="0.05"
              value={infiltration}
              onChange={(e) => handleChange('infiltration', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Estimated Loads</h3>
        </div>

        {/* Cooling/Heating Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Peak Cooling Requirement</p>
            <p className="text-2xl font-black text-white mt-1">
              {coolTons.toFixed(2)} Tons
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {Math.round(totalCoolLoad).toLocaleString()} Btu/hr
            </p>
            <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5 flex justify-between">
              <span>Sensible: {Math.round(totalCoolSensible).toLocaleString()} ({Math.round(sensibleHeatRatio * 100)}%)</span>
              <span>Latent: {Math.round(totalCoolLatent).toLocaleString()}</span>
            </div>
          </div>

          <div className="p-4 bg-orange-950/10 border border-orange-500/20 rounded-xl">
            <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Peak Heating Requirement</p>
            <p className="text-2xl font-black text-white mt-1">
              {Math.round(totalHeatLoad).toLocaleString()} Btu/hr
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {(totalHeatLoad / 3.412).toFixed(0)} Watts equivalent
            </p>
            <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5 flex justify-between">
              <span>Conductive Loss: {Math.round(heatWallLoss + heatWindowLoss).toLocaleString()}</span>
              <span>Inf Loss: {Math.round(heatInfLoss).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Load Sizing Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
            <p className="text-[9px] font-semibold text-slate-400 uppercase">Unit Density</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">{Math.round(sqFtPerTon)} sq ft/Ton</p>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
            <p className="text-[9px] font-semibold text-slate-400 uppercase">Cooling Power</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">{(totalCoolLoad / roomArea).toFixed(1)} Btu/h-ft²</p>
          </div>
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
            <p className="text-[9px] font-semibold text-slate-400 uppercase">Heating Power</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">{(totalHeatLoad / roomArea).toFixed(1)} Btu/h-ft²</p>
          </div>
        </div>

        {/* Envelope Diagram SVG */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[220px]">
          <svg className="w-full max-w-[400px] h-[190px]" viewBox="0 0 400 190">
            {/* Room Boundary Box (Walls) */}
            <rect x="80" y="45" width="240" height="110" fill="none" stroke="#475569" strokeWidth="3" rx="4" />
            
            {/* Floor/Ground Line */}
            <line x1="40" y1="155" x2="360" y2="155" stroke="#334155" strokeWidth="2" />
            
            {/* Window */}
            <rect x="180" y="45" width="40" height="6" fill="#0ea5e9" stroke="#38bdf8" strokeWidth="1" />
            <text x="200" y="38" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">WINDOW</text>

            {/* Heat Transfer Arrows (Cooling - Inward Heat) */}
            {/* Solar heat arrow */}
            <path d="M 200 15 L 200 42" fill="none" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
            <polygon points="200,43 196,37 204,37" fill="#f59e0b" />
            <text x="200" y="10" fill="#f59e0b" fontSize="8" fontWeight="extrabold" textAnchor="middle">SOLAR: {Math.round(coolSolarSens)} Btu/h</text>

            {/* Wall conductive heat gains */}
            <path d="M 50 100 L 76 100" fill="none" stroke="#f87171" strokeWidth="1.5" />
            <polygon points="77,100 71,96 71,104" fill="#f87171" />
            <text x="40" y="92" fill="#f87171" fontSize="8" fontWeight="bold">WALLS: {Math.round(coolWallSens)} Btu/h</text>

            {/* Infiltration arrow */}
            <path d="M 95 140 C 95 120 120 120 135 120" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
            <polygon points="137,120 131,116 131,124" fill="#cbd5e1" />
            <text x="90" y="115" fill="#cbd5e1" fontSize="8" fontWeight="bold">INF: {Math.round(coolInfSens + coolInfLat)} Btu/h</text>

            {/* Internal Gains (Render icons/labeled circles inside room) */}
            <g transform="translate(140, 80)">
              <circle cx="0" cy="0" r="14" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="1" />
              <text x="0" y="3" fill="#60a5fa" fontSize="8" fontWeight="bold" textAnchor="middle">PEOPLE</text>
              <text x="0" y="12" fill="#93c5fd" fontSize="7" textAnchor="middle">{Math.round(coolPeopleSens + coolPeopleLat)} Btu/h</text>
            </g>

            <g transform="translate(200, 80)">
              <circle cx="0" cy="0" r="14" fill="#eab308" fillOpacity="0.1" stroke="#eab308" strokeWidth="1" />
              <text x="0" y="3" fill="#facc15" fontSize="8" fontWeight="bold" textAnchor="middle">LIGHTS</text>
              <text x="0" y="12" fill="#fef08a" fontSize="7" textAnchor="middle">{Math.round(coolLightingSens)} Btu/h</text>
            </g>

            <g transform="translate(260, 80)">
              <circle cx="0" cy="0" r="14" fill="#ec4899" fillOpacity="0.1" stroke="#ec4899" strokeWidth="1" />
              <text x="0" y="3" fill="#f472b6" fontSize="8" fontWeight="bold" textAnchor="middle">PLUG</text>
              <text x="0" y="12" fill="#fbcfe8" fontSize="7" textAnchor="middle">{Math.round(coolEquipSens)} Btu/h</text>
            </g>

            {/* Titles */}
            <text x="200" y="178" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle">ROOM ENVELOPE THERMAL GAINS (COOLING MODE)</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
