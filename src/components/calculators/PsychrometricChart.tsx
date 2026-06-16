import { useEffect, useState } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';

const DEFAULTS = {
  dbTemp: 75, // °F (Dry Bulb Temperature)
  rh: 50, // % (Relative Humidity)
};

const patm = 14.696; // Standard atmospheric pressure in psi

// Temperature conversion helpers
const convertFtoC = (f: number) => ((f - 32) * 5) / 9;
const convertCtoF = (c: number) => c * 1.8 + 32;

// Saturation vapor pressure (kPa) using Tetens equation
const getPwsKpa = (tc: number) => 0.61078 * Math.exp((17.27 * tc) / (tc + 237.3));

// Saturation vapor pressure in psi
const getPwsPsi = (tc: number) => getPwsKpa(tc) * 0.1450377;

export default function PsychrometricChart() {
  const [state, setState] = useState(() => getToolStateFromUrl(DEFAULTS));
  const { dbTemp, rh } = state;

  useEffect(() => {
    updateUrlForTool('psychrometric', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: number) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Perform thermodynamic calculations
  const tc = convertFtoC(dbTemp);
  const pwsPsi = getPwsPsi(tc);
  const pwPsi = pwsPsi * (rh / 100);

  // Humidity Ratio (W) in lb water / lb dry air
  const W = 0.62198 * (pwPsi / (patm - pwPsi));
  const Wgrains = W * 7000; // 7000 grains per pound

  // Dew Point Temperature (Tdp) from actual vapor pressure (kPa)
  const pwKpa = pwPsi / 0.1450377;
  const lnP = Math.log(Math.max(1e-5, pwKpa / 0.61078));
  const tdpC = (237.3 * lnP) / (17.27 - lnP);
  const tdpF = convertCtoF(tdpC);

  // Wet Bulb Temperature (Twb) using Stull's formula (valid for standard range and sea level)
  const twbC =
    tc * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
    Math.atan(tc + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  const twbF = convertCtoF(twbC);

  // Enthalpy (h) in Btu/lb of dry air
  const enthalpy = 0.24 * dbTemp + W * (1061 + 0.444 * dbTemp);

  // Specific Volume (v) in ft³/lb of dry air
  const volume = (0.370486 * (dbTemp + 459.67)) / (patm - pwPsi);

  // SVG dimensions and layout margins
  const svgW = 500;
  const svgH = 365;
  const chartXMin = 50;
  const chartXMax = 465;
  const chartYMin = 25;
  const chartYMax = 320;
  
  const getX = (db: number) => chartXMin + ((db - 30) / 80) * (chartXMax - chartXMin);
  const getY = (wGrains: number) => chartYMax - (wGrains / 200) * (chartYMax - chartYMin);

  // Generate paths for constant relative humidity lines
  const generateRhCurvePath = (targetRh: number) => {
    const points: string[] = [];
    for (let t = 30; t <= 110; t += 2) {
      const tempC = convertFtoC(t);
      const satPsi = getPwsPsi(tempC);
      const actPsi = satPsi * (targetRh / 100);
      const ratio = 0.62198 * (actPsi / (patm - actPsi));
      const grains = ratio * 7000;
      
      if (grains <= 200) {
        points.push(`${getX(t).toFixed(1)},${getY(grains).toFixed(1)}`);
      } else {
        // Stop drawing above 200 grains/lb boundary
        points.push(`${getX(t).toFixed(1)},${getY(200).toFixed(1)}`);
        break;
      }
    }
    return `M ${points.join(' L ')}`;
  };

  // SVG click selection handler
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * svgW;
    const clickY = ((e.clientY - rect.top) / rect.height) * svgH;

    if (clickX >= chartXMin && clickX <= chartXMax && clickY >= chartYMin && clickY <= chartYMax) {
      const clickedDb = 30 + ((clickX - chartXMin) / (chartXMax - chartXMin)) * 80;
      const clickedWgrains = ((chartYMax - clickY) / (chartYMax - chartYMin)) * 200;
      const clickedW = clickedWgrains / 7000;

      const tempC = convertFtoC(clickedDb);
      const satPsi = getPwsPsi(tempC);
      const actPsi = (clickedW * patm) / (0.62198 + clickedW);
      
      let calcRh = (actPsi / satPsi) * 100;
      calcRh = Math.max(0, Math.min(100, calcRh));

      handleChange('dbTemp', Math.round(clickedDb));
      handleChange('rh', Math.round(calcRh));
    }
  };

  // Vertical gridline boundaries based on saturation humidity ratios
  const getSatWgrains = (t: number) => {
    const tempC = convertFtoC(t);
    const satPsi = getPwsPsi(tempC);
    const ratio = 0.62198 * (satPsi / (patm - satPsi));
    return Math.min(200, ratio * 7000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
      {/* Inputs Column */}
      <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Air State Inputs</h3>
        </div>

        {/* Dry Bulb Temperature */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Dry Bulb Temperature</label>
            <span className="text-sm font-bold text-sky-400">{dbTemp} °F</span>
          </div>
          <input
            type="range"
            min="30"
            max="110"
            value={dbTemp}
            onChange={(e) => handleChange('dbTemp', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <input
            type="number"
            value={dbTemp}
            onChange={(e) => handleChange('dbTemp', Math.max(30, Math.min(110, parseInt(e.target.value) || 30)))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        {/* Relative Humidity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-semibold text-slate-300">Relative Humidity</label>
            <span className="text-sm font-bold text-emerald-400">{rh} %</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={rh}
            onChange={(e) => handleChange('rh', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <input
            type="number"
            value={rh}
            onChange={(e) => handleChange('rh', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Instructions/Help Note */}
        <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-300">Interactive Chart Tip:</strong> You can click directly inside the psychrometric chart on the right to place the point and calculate the respective temperature and humidity state values.
          </p>
        </div>
      </div>

      {/* Results Column */}
      <div className="lg:col-span-7 glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-md font-bold text-white uppercase tracking-wider">Calculated Air Properties</h3>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Wet Bulb Temp</p>
            <p className="text-xl font-black text-amber-400 mt-1">{twbF.toFixed(1)} °F</p>
          </div>
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Dew Point Temp</p>
            <p className="text-xl font-black text-blue-400 mt-1">{tdpF.toFixed(1)} °F</p>
          </div>
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Humidity Ratio</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{Wgrains.toFixed(1)} gr/lb</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{W.toFixed(5)} lb/lb</p>
          </div>
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Enthalpy (h)</p>
            <p className="text-xl font-black text-purple-400 mt-1">{enthalpy.toFixed(2)} Btu/lb</p>
          </div>
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Specific Volume</p>
            <p className="text-xl font-black text-sky-400 mt-1">{volume.toFixed(2)} ft³/lb</p>
          </div>
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Vapor Pressure</p>
            <p className="text-xl font-black text-pink-400 mt-1">{pwPsi.toFixed(4)} psi</p>
          </div>
        </div>

        {/* Dynamic Psychrometric Chart SVG */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[260px]">
          <svg 
            className="w-full max-w-[500px] h-[365px] cursor-crosshair select-none" 
            viewBox={`0 0 ${svgW} ${svgH}`}
            onClick={handleSvgClick}
          >
            {/* Chart Title */}
            <text x="250" y="15" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">PSYCHROMETRIC CHART (Sea Level, 14.696 psi)</text>

            {/* X-axis dry-bulb grid lines (vertical lines) */}
            {[30, 40, 50, 60, 70, 80, 90, 100, 110].map((t) => {
              const xPos = getX(t);
              const satW = getSatWgrains(t);
              const ySat = getY(satW);
              return (
                <g key={`x-grid-${t}`}>
                  <line 
                    x1={xPos} 
                    y1={chartYMax} 
                    x2={xPos} 
                    y2={ySat} 
                    stroke="#334155" 
                    strokeWidth="1" 
                    strokeDasharray="2 3" 
                  />
                  <text 
                    x={xPos} 
                    y={chartYMax + 15} 
                    fill="#94a3b8" 
                    fontSize="9" 
                    textAnchor="middle"
                  >
                    {t}
                  </text>
                </g>
              );
            })}
            <text x="250" y={chartYMax + 30} fill="#cbd5e1" fontSize="10" fontWeight="semibold" textAnchor="middle">Dry Bulb Temperature (°F)</text>

            {/* Y-axis humidity ratio grid lines (horizontal lines) */}
            {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((wg) => {
              const yPos = getY(wg);
              return (
                <g key={`y-grid-${wg}`}>
                  <line 
                    x1={chartXMin} 
                    y1={yPos} 
                    x2={chartXMax} 
                    y2={yPos} 
                    stroke="#1e293b" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={chartXMin - 8} 
                    y={yPos + 3} 
                    fill="#94a3b8" 
                    fontSize="9" 
                    textAnchor="end"
                  >
                    {wg}
                  </text>
                </g>
              );
            })}
            <text 
              x={15} 
              y="170" 
              fill="#cbd5e1" 
              fontSize="10" 
              fontWeight="semibold" 
              textAnchor="middle" 
              transform="rotate(-90 15 170)"
            >
              Humidity Ratio (grains/lb)
            </text>

            {/* Constant RH Curves (20%, 40%, 60%, 80%) */}
            {[20, 40, 60, 80].map((targetRh) => (
              <g key={`curve-group-${targetRh}`}>
                <path 
                  d={generateRhCurvePath(targetRh)} 
                  fill="none" 
                  stroke="#475569" 
                  strokeWidth="1.2" 
                />
                {/* Curve labels */}
                <text 
                  x={getX(95)} 
                  y={getY(getSatWgrains(95) * (targetRh / 100)) - 5} 
                  fill="#64748b" 
                  fontSize="8" 
                  fontWeight="bold"
                >
                  {targetRh}% RH
                </text>
              </g>
            ))}

            {/* Saturation Curve (100% RH) */}
            <path 
              d={generateRhCurvePath(100)} 
              fill="none" 
              stroke="#0ea5e9" 
              strokeWidth="2.5" 
            />
            <text 
              x={getX(55) - 30} 
              y={getY(getSatWgrains(55)) - 10} 
              fill="#0ea5e9" 
              fontSize="9" 
              fontWeight="bold"
              transform={`rotate(-28 ${getX(55)} ${getY(getSatWgrains(55))})`}
            >
              100% Saturation
            </text>

            {/* Plot boundary box */}
            <rect 
              x={chartXMin} 
              y={chartYMin} 
              width={chartXMax - chartXMin} 
              height={chartYMax - chartYMin} 
              fill="none" 
              stroke="#334155" 
              strokeWidth="1.5" 
            />

            {/* Current State Marker and Projections */}
            {Wgrains <= 200 && (
              <g>
                {/* Horizontal Guide to Y-Axis */}
                <line 
                  x1={chartXMin} 
                  y1={getY(Wgrains)} 
                  x2={getX(dbTemp)} 
                  y2={getY(Wgrains)} 
                  stroke="#10b981" 
                  strokeWidth="1" 
                  strokeDasharray="3 3" 
                />
                {/* Vertical Guide to X-Axis */}
                <line 
                  x1={getX(dbTemp)} 
                  y1={chartYMax} 
                  x2={getX(dbTemp)} 
                  y2={getY(Wgrains)} 
                  stroke="#0ea5e9" 
                  strokeWidth="1" 
                  strokeDasharray="3 3" 
                />
                {/* State Point Dot */}
                <circle 
                  cx={getX(dbTemp)} 
                  cy={getY(Wgrains)} 
                  r="6" 
                  fill="#10b981" 
                  stroke="#ffffff" 
                  strokeWidth="1.5"
                  className="animate-pulse" 
                />
                <circle 
                  cx={getX(dbTemp)} 
                  cy={getY(Wgrains)} 
                  r="12" 
                  fill="#10b981" 
                  fillOpacity="0.2" 
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
