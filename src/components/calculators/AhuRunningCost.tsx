import { useEffect, useState, useRef } from 'react';
import { getToolStateFromUrl, updateUrlForTool } from '../../utils/queryParams';
import { Search, Calendar, Clock, MapPin, Thermometer, Wind, Info, Activity, Loader2, Sparkles } from 'lucide-react';

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
  gasRateUnit: 'therm', // 'therm' or 'ccf'
  useSpaceLoad: false,
  spaceCoolingLoad: 216000, // Btu/hr
  spaceHeatingLoad: 324000, // Btu/hr
  useSpaceLoadTimeframe: false,
  spaceLoadTimeframe: 0, // Btu/hr
};

const patm = 14.696; // Standard atmospheric pressure in psi

// Temperature conversion helpers
const convertFtoC = (f: number) => ((f - 32) * 5) / 9;

// Saturation vapor pressure (kPa) using Tetens equation
const getPwsKpa = (tc: number) => 0.61078 * Math.exp((17.27 * tc) / (tc + 237.3));

// Saturation vapor pressure in psi
const getPwsPsi = (tc: number) => getPwsKpa(tc) * 0.1450377;

// Humidity Ratio (W) in lb water / lb dry air
const getW = (dbF: number, rh: number) => {
  const tc = convertFtoC(dbF);
  const pwsPsi = getPwsPsi(tc);
  const pwPsi = pwsPsi * (rh / 100);
  return 0.62198 * (pwPsi / (patm - pwPsi));
};

// Enthalpy (h) in Btu/lb of dry air
const getEnthalpy = (dbF: number, W: number) => {
  return 0.24 * dbF + W * (1061 + 0.444 * dbF);
};

// Dew Point Temperature (Tdp) from actual vapor pressure
const getTdpF = (dbF: number, rh: number) => {
  const tc = convertFtoC(dbF);
  const pwsPsi = getPwsPsi(tc);
  const pwPsi = pwsPsi * (rh / 100);
  const pwKpa = pwPsi / 0.1450377;
  const lnP = Math.log(Math.max(1e-5, pwKpa / 0.61078));
  const tdpC = (237.3 * lnP) / (17.27 - lnP);
  return tdpC * 1.8 + 32;
};

// Saturation humidity ratio at a given dry bulb temp (rh = 100)
const getSatW = (dbF: number) => {
  return getW(dbF, 100);
};

// Relative humidity given dry bulb temp and humidity ratio
const getRhFromW = (dbF: number, W: number) => {
  const tc = convertFtoC(dbF);
  const pwsPsi = getPwsPsi(tc);
  const pwPsi = (W * patm) / (0.62198 + W);
  const calcRh = (pwPsi / pwsPsi) * 100;
  return Math.max(0, Math.min(100, calcRh));
};

const formatHourLabel = (h: number) => {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
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
    gasRateUnit,
    useSpaceLoad,
    spaceCoolingLoad,
    spaceHeatingLoad,
    useSpaceLoadTimeframe,
    spaceLoadTimeframe,
  } = state;

  useEffect(() => {
    updateUrlForTool('ahu-cost', state);
  }, [state]);

  const handleChange = (key: keyof typeof DEFAULTS, value: any) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // --- Mode selection tab state ---
  const [activeTab, setActiveTab] = useState<'annual' | 'timeframe'>('annual');

  // --- Timeframe Mode State ---
  const [locationSearch, setLocationSearch] = useState('Chicago');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    name: 'Chicago, Illinois, United States',
    lat: 41.85003,
    lon: -87.65005,
    timezone: 'America/Chicago',
  });

  const [targetDate, setTargetDate] = useState('2026-06-11');
  const [startHour, setStartHour] = useState(18); // 6 PM
  const [endHour, setEndHour] = useState(22); // 10 PM

  const [matSetpoint, setMatSetpoint] = useState(55); // °F
  const [datSetpoint, setDatSetpoint] = useState(55); // °F
  const [ratSetpoint, setRatSetpoint] = useState(75); // °F (Return air temp)
  const [ratRh, setRatRh] = useState(50); // % (Return air relative humidity)
  const [controlStrategy, setControlStrategy] = useState<'fixed' | 'economizer'>('economizer');

  // Weather results state
  const [isWeatherDataLoading, setIsWeatherDataLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [isUsingHistoricalFallback, setIsUsingHistoricalFallback] = useState(false);
  const [fallbackYear, setFallbackYear] = useState<number | null>(null);
  const [hourlyResults, setHourlyResults] = useState<any[]>([]);
  const [selectedHour, setSelectedHour] = useState<number>(18);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- Annual calculations ---
  const fanBhp = (cfm * staticPressure) / (6356 * (fanEff / 100));
  const fanKw = (fanBhp * 0.7457) / 0.90; // assuming 90% motor efficiency
  const annualFanCost = fanKw * fanHours * elecRate;

  const currentOaFraction = isOaUnit ? 100 : oaFraction;
  const matSummer = isOaUnit ? oatSummer : oatSummer * (currentOaFraction / 100) + ratSummer * (1 - currentOaFraction / 100);
  const matWinter = isOaUnit ? oatWinter : oatWinter * (currentOaFraction / 100) + ratWinter * (1 - currentOaFraction / 100);

  // Load-based calculations for Annual Mode
  let calculatedSatSummer = satSummer;
  let calculatedSatWinter = satWinter;
  let satSummerClamped = false;
  let satWinterClamped = false;

  if (useSpaceLoad) {
    // satSummer = ratSummer - spaceCoolingLoad / (1.08 * cfm)
    const rawSatSummer = ratSummer - spaceCoolingLoad / (1.08 * cfm);
    calculatedSatSummer = Math.max(50, Math.min(ratSummer, rawSatSummer));
    if (rawSatSummer < 50 || rawSatSummer > ratSummer) {
      satSummerClamped = true;
    }

    // satWinter = ratWinter + spaceHeatingLoad / (1.08 * cfm)
    const rawSatWinter = ratWinter + spaceHeatingLoad / (1.08 * cfm);
    calculatedSatWinter = Math.max(ratWinter, Math.min(120, rawSatWinter));
    if (rawSatWinter < ratWinter || rawSatWinter > 120) {
      satWinterClamped = true;
    }
  }

  const effectiveSatSummer = useSpaceLoad ? calculatedSatSummer : satSummer;
  const effectiveSatWinter = useSpaceLoad ? calculatedSatWinter : satWinter;

  const coolingdT = Math.max(0, matSummer - effectiveSatSummer);
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

  const heatingdT = Math.max(0, effectiveSatWinter - matWinter);
  const heatLoad = 1.08 * cfm * heatingdT; // Btu/hr

  let annualHeatCost = 0;
  let heatInputUnit = '';
  let heatInputValue = 0;
  if (heatingSource === 'water') {
    const boilerEffDec = waterBoilerEff / 100;
    const gasInputBtuHr = heatLoad / boilerEffDec;
    const isCcf = gasRateUnit === 'ccf';
    const divisor = isCcf ? 103700 : 100000;
    const fuelHr = gasInputBtuHr / divisor;
    heatInputValue = fuelHr * heatHours;
    heatInputUnit = isCcf ? 'CCU/yr' : 'therms/yr';
    annualHeatCost = heatInputValue * gasRate;
  } else {
    const steamLbsHr = heatLoad / 1000;
    const steamKlbHr = steamLbsHr / 1000;
    heatInputValue = steamKlbHr * heatHours;
    heatInputUnit = 'klb/yr';
    annualHeatCost = heatInputValue * steamRate;
  }

  const totalCost = annualFanCost + annualCoolCost + annualHeatCost;

  // --- City lookup ---
  const handleCitySearch = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Weather fetch ---
  const fetchWeatherData = async () => {
    setIsWeatherDataLoading(true);
    setWeatherError(null);
    setIsUsingHistoricalFallback(false);
    setFallbackYear(null);

    try {
      const target = new Date(targetDate + 'T00:00:00');
      const today = new Date();
      const todayCompare = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      let finalDateStr = targetDate;
      const diffTime = target.getTime() - todayCompare.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Fallback for dates beyond the 15-day forecast horizon
      if (diffDays > 15) {
        const prevYear = today.getFullYear() - 1;
        const adjustedDate = new Date(target);
        adjustedDate.setFullYear(prevYear);

        const year = adjustedDate.getFullYear();
        const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
        const day = String(adjustedDate.getDate()).padStart(2, '0');
        finalDateStr = `${year}-${month}-${day}`;

        setIsUsingHistoricalFallback(true);
        setFallbackYear(prevYear);
      }

      // Check whether to use Archive or Forecast
      const archiveCutoff = new Date(todayCompare);
      archiveCutoff.setDate(archiveCutoff.getDate() - 2);

      const isArchive = new Date(finalDateStr + 'T00:00:00') < archiveCutoff;
      const baseUrl = isArchive
        ? 'https://archive-api.open-meteo.com/v1/archive'
        : 'https://api.open-meteo.com/v1/forecast';

      const url = `${baseUrl}?latitude=${selectedLocation.lat}&longitude=${selectedLocation.lon}&start_date=${finalDateStr}&end_date=${finalDateStr}&hourly=temperature_2m,relative_humidity_2m&temperature_unit=fahrenheit&timezone=auto`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to retrieve weather data.');
      }

      const data = await response.json();
      if (!data.hourly || !data.hourly.temperature_2m) {
        throw new Error('No weather measurements found for this date/location.');
      }

      setWeatherData(data);
    } catch (err: any) {
      setWeatherError(err.message || 'Error occurred while contacting weather service.');
    } finally {
      setIsWeatherDataLoading(false);
    }
  };

  // --- Timeframe energy calculation engine ---
  useEffect(() => {
    if (!weatherData || !weatherData.hourly) return;

    const temps = weatherData.hourly.temperature_2m;
    const rhs = weatherData.hourly.relative_humidity_2m;
    const times = weatherData.hourly.time;

    const results: any[] = [];
    const minOaFrac = isOaUnit ? 1.0 : oaFraction / 100;

    const fanBhpTimeframe = (cfm * staticPressure) / (6356 * (fanEff / 100));
    const fanKwTimeframe = (fanBhpTimeframe * 0.7457) / 0.90;
    const hourlyFanCost = fanKwTimeframe * 1 * elecRate;

    const limit = Math.min(endHour - 1, 23);
    for (let h = startHour; h <= limit; h++) {
      if (h < 0 || h >= temps.length) continue;

      const oat = temps[h];
      const oaRh = rhs[h];
      const timeStr = times[h];

      // Calculate psychrometrics for Outside Air
      const W_oa = getW(oat, oaRh);
      const h_oa = getEnthalpy(oat, W_oa);

      // Return Air state
      const W_ra = getW(ratSetpoint, ratRh);
      const h_ra = getEnthalpy(ratSetpoint, W_ra);

      // Damper modulation logic
      let x = minOaFrac;
      if (isOaUnit) {
        x = 1.0;
      } else if (controlStrategy === 'economizer') {
        if (oat > ratSetpoint) {
          x = minOaFrac;
        } else if (oat >= matSetpoint && oat <= ratSetpoint) {
          x = 1.0;
        } else {
          // oat < matSetpoint. Modulate to meet matSetpoint
          const requiredX = (ratSetpoint - matSetpoint) / (ratSetpoint - oat);
          x = Math.max(minOaFrac, Math.min(1.0, requiredX));
        }
      }

      // Mixed Air State
      const mat = x * oat + (1 - x) * ratSetpoint;
      const W_ma = x * W_oa + (1 - x) * W_ra;
      const h_ma = getEnthalpy(mat, W_ma);
      const maRh = getRhFromW(mat, W_ma);
      const tdp_ma = getTdpF(mat, maRh);

      // Load variables
      let q_cool_total = 0;
      let q_cool_sens = 0;
      let q_cool_latent = 0;
      let q_heat = 0;
      let coolKwTimeframe = 0;
      let heatFuelInput = 0;
      let coolCost = 0;
      let heatCost = 0;

      // Required supply temp (DAT) to maintain ratSetpoint under spaceLoadTimeframe
      let targetDat = datSetpoint;
      let rawTargetDat = datSetpoint;
      let targetDatClamped = false;

      if (useSpaceLoadTimeframe) {
        rawTargetDat = ratSetpoint - spaceLoadTimeframe / (1.08 * cfm);
        targetDat = Math.max(50, Math.min(120, rawTargetDat));
        targetDatClamped = rawTargetDat < 50 || rawTargetDat > 120;
      }

      if (mat > targetDat) {
        // Cooling required
        const W_sat_dat = getSatW(targetDat);
        const leavingW = Math.min(W_ma, W_sat_dat);
        const h_da = getEnthalpy(targetDat, leavingW);

        q_cool_total = Math.max(0, 4.5 * cfm * (h_ma - h_da));
        q_cool_sens = Math.max(0, 1.08 * cfm * (mat - targetDat));
        q_cool_latent = Math.max(0, q_cool_total - q_cool_sens);

        const tons = q_cool_total / 12000;
        if (coolingSource === 'dx') {
          coolKwTimeframe = q_cool_total / (dxEer * 1000);
        } else {
          coolKwTimeframe = tons * chillerKwPerTon;
        }
        coolCost = coolKwTimeframe * 1 * elecRate;
      } else if (mat < targetDat) {
        // Heating required
        q_heat = Math.max(0, 1.08 * cfm * (targetDat - mat));

        if (heatingSource === 'water') {
          const boilerEffDec = waterBoilerEff / 100;
          const gasInputBtuHr = q_heat / boilerEffDec;
          const isCcf = gasRateUnit === 'ccf';
          const divisor = isCcf ? 103700 : 100000;
          heatFuelInput = gasInputBtuHr / divisor; // therms/hr or CCU/hr
          heatCost = heatFuelInput * 1 * gasRate;
        } else {
          const steamLbsHr = q_heat / 1000;
          heatFuelInput = steamLbsHr / 1000; // klb/hr
          heatCost = heatFuelInput * 1 * steamRate;
        }
      }

      const totalHourlyCost = hourlyFanCost + coolCost + heatCost;

      results.push({
        hour: h,
        timeLabel: formatHourLabel(h),
        timeStr,
        oat,
        oaRh,
        W_oa,
        h_oa,
        rat: ratSetpoint,
        ratRh,
        W_ra,
        h_ra,
        oaFraction: x * 100,
        mat,
        W_ma,
        h_ma,
        maRh,
        tdp_ma,
        dat: targetDat,
        datRequired: rawTargetDat,
        datClamped: targetDatClamped,
        q_cool_total,
        q_cool_sens,
        q_cool_latent,
        q_heat,
        coolKw: coolKwTimeframe,
        coolTons: q_cool_total / 12000,
        heatFuelInput,
        fanKw: fanKwTimeframe,
        fanCost: hourlyFanCost,
        coolCost,
        heatCost,
        totalCost: totalHourlyCost,
      });
    }

    setHourlyResults(results);

    // Reset selected hour if out of bounds
    if (results.length > 0) {
      const hasHour = results.some((r) => r.hour === selectedHour);
      if (!hasHour) {
        setSelectedHour(results[0].hour);
      }
    }
  }, [
    weatherData,
    startHour,
    endHour,
    matSetpoint,
    datSetpoint,
    ratSetpoint,
    ratRh,
    controlStrategy,
    cfm,
    staticPressure,
    fanEff,
    isOaUnit,
    oaFraction,
    coolingSource,
    chillerKwPerTon,
    dxEer,
    heatingSource,
    waterBoilerEff,
    steamRate,
    elecRate,
    gasRate,
    gasRateUnit,
    useSpaceLoadTimeframe,
    spaceLoadTimeframe,
  ]);

  // --- Timeframe totals ---
  const totalPeriodCost = hourlyResults.reduce((acc, r) => acc + r.totalCost, 0);
  const totalPeriodFanCost = hourlyResults.reduce((acc, r) => acc + r.fanCost, 0);
  const totalPeriodCoolCost = hourlyResults.reduce((acc, r) => acc + r.coolCost, 0);
  const totalPeriodHeatCost = hourlyResults.reduce((acc, r) => acc + r.heatCost, 0);

  const totalPeriodFanKwh = hourlyResults.reduce((acc, r) => acc + r.fanKw, 0);
  const totalPeriodCoolKwh = hourlyResults.reduce((acc, r) => acc + r.coolKw, 0);
  const totalPeriodHeatFuel = hourlyResults.reduce((acc, r) => acc + r.heatFuelInput, 0);

  const maxTons = Math.max(0, ...hourlyResults.map((r) => r.coolTons));
  const maxHeatingKbtu = Math.max(0, ...hourlyResults.map((r) => r.q_heat / 1000));

  const activeHourData = hourlyResults.find((r) => r.hour === selectedHour) || hourlyResults[0];

  // Supply air properties for schematic
  let supplyAirRh = 0;
  if (activeHourData) {
    if (activeHourData.q_cool_total > 0) {
      const leavingW = Math.min(activeHourData.W_ma, getSatW(activeHourData.dat));
      supplyAirRh = getRhFromW(activeHourData.dat, leavingW);
    } else if (activeHourData.q_heat > 0) {
      supplyAirRh = getRhFromW(activeHourData.dat, activeHourData.W_ma);
    } else {
      supplyAirRh = activeHourData.maRh;
    }
  }

  // --- SVG Charts builders ---
  const renderTempChart = () => {
    if (hourlyResults.length === 0) return null;

    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const allTemps = hourlyResults.flatMap((r) => [r.oat, r.mat, r.rat, r.dat]);
    const minT = Math.floor(Math.min(...allTemps) - 2);
    const maxT = Math.ceil(Math.max(...allTemps) + 2);
    const span = Math.max(10, maxT - minT);

    const getX = (index: number) => paddingLeft + (index / (hourlyResults.length - 1 || 1)) * chartW;
    const getY = (temp: number) => height - paddingBottom - ((temp - minT) / span) * chartH;

    const getPath = (key: string) => {
      return hourlyResults
        .map((r, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(r[key]).toFixed(1)}`)
        .join(' ');
    };

    return (
      <svg className="w-full h-[180px] bg-slate-950/60 rounded-xl border border-slate-800 p-2" viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const tValue = minT + p * span;
          const yPos = height - paddingBottom - p * chartH;
          return (
            <g key={`y-grid-${idx}`}>
              <line x1={paddingLeft} y1={yPos} x2={width - paddingRight} y2={yPos} stroke="#1e293b" strokeWidth="1" strokeDasharray="1 4" />
              <text x={paddingLeft - 6} y={yPos + 3} fill="#64748b" fontSize="8" textAnchor="end">
                {Math.round(tValue)}°F
              </text>
            </g>
          );
        })}

        {hourlyResults.map((r, i) => {
          const xPos = getX(i);
          return (
            <g key={`x-lbl-${i}`}>
              <line x1={xPos} y1={height - paddingBottom} x2={xPos} y2={height - paddingBottom + 4} stroke="#334155" strokeWidth="1" />
              <text x={xPos} y={height - paddingBottom + 12} fill="#64748b" fontSize="8" textAnchor="middle">
                {r.timeLabel}
              </text>
            </g>
          );
        })}

        {hourlyResults.map((r, i) => {
          if (r.hour !== selectedHour) return null;
          const xPos = getX(i);
          return (
            <line
              key="sel-line"
              x1={xPos}
              y1={paddingTop}
              x2={xPos}
              y2={height - paddingBottom}
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          );
        })}

        <path d={getPath('oat')} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        <path d={getPath('mat')} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
        <path d={getPath('rat')} fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 2" />
        <path d={getPath('dat')} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />

        {hourlyResults.map((r, i) => {
          if (r.hour !== selectedHour) return null;
          return (
            <g key="sel-dots">
              <circle cx={getX(i)} cy={getY(r.oat)} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx={getX(i)} cy={getY(r.mat)} r="4" fill="#a855f7" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx={getX(i)} cy={getY(r.dat)} r="4" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>
    );
  };

  const renderLoadChart = () => {
    if (hourlyResults.length === 0) return null;

    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const coolingLoads = hourlyResults.map((r) => r.q_cool_total / 1000);
    const heatingLoads = hourlyResults.map((r) => r.q_heat / 1000);
    const maxL = Math.max(10, Math.max(...coolingLoads, ...heatingLoads) * 1.1);

    const getX = (index: number) => paddingLeft + (index / (hourlyResults.length - 1 || 1)) * chartW;
    const getY = (load: number) => height - paddingBottom - (load / maxL) * chartH;

    const getPath = (loads: number[]) => {
      return hourlyResults
        .map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(loads[i]).toFixed(1)}`)
        .join(' ');
    };

    const getAreaPath = (loads: number[]) => {
      const lineD = getPath(loads);
      if (!lineD) return '';
      const startX = getX(0).toFixed(1);
      const endX = getX(hourlyResults.length - 1).toFixed(1);
      const yZero = (height - paddingBottom).toFixed(1);
      return `${lineD} L ${endX} ${yZero} L ${startX} ${yZero} Z`;
    };

    return (
      <svg className="w-full h-[180px] bg-slate-950/60 rounded-xl border border-slate-800 p-2" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="coolGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const lValue = p * maxL;
          const yPos = height - paddingBottom - p * chartH;
          return (
            <g key={`y-grid-load-${idx}`}>
              <line x1={paddingLeft} y1={yPos} x2={width - paddingRight} y2={yPos} stroke="#1e293b" strokeWidth="1" strokeDasharray="1 4" />
              <text x={paddingLeft - 6} y={yPos + 3} fill="#64748b" fontSize="8" textAnchor="end">
                {Math.round(lValue)}k
              </text>
            </g>
          );
        })}

        {hourlyResults.map((r, i) => {
          const xPos = getX(i);
          return (
            <g key={`x-lbl-load-${i}`}>
              <line x1={xPos} y1={height - paddingBottom} x2={xPos} y2={height - paddingBottom + 4} stroke="#334155" strokeWidth="1" />
              <text x={xPos} y={height - paddingBottom + 12} fill="#64748b" fontSize="8" textAnchor="middle">
                {r.timeLabel}
              </text>
            </g>
          );
        })}

        {hourlyResults.map((r, i) => {
          if (r.hour !== selectedHour) return null;
          const xPos = getX(i);
          return (
            <line
              key="sel-line-load"
              x1={xPos}
              y1={paddingTop}
              x2={xPos}
              y2={height - paddingBottom}
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          );
        })}

        {Math.max(...coolingLoads) > 0 && <path d={getAreaPath(coolingLoads)} fill="url(#coolGrad)" />}
        {Math.max(...heatingLoads) > 0 && <path d={getAreaPath(heatingLoads)} fill="url(#heatGrad)" />}

        {Math.max(...coolingLoads) > 0 && <path d={getPath(coolingLoads)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />}
        {Math.max(...heatingLoads) > 0 && <path d={getPath(heatingLoads)} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />}

        {hourlyResults.map((r, i) => {
          if (r.hour !== selectedHour) return null;
          return (
            <g key="sel-dots-load">
              {r.q_cool_total > 0 && (
                <circle cx={getX(i)} cy={getY(r.q_cool_total / 1000)} r="4" fill="#3b82f6" stroke="#0f172a" strokeWidth="1.5" />
              )}
              {r.q_heat > 0 && <circle cx={getX(i)} cy={getY(r.q_heat / 1000)} r="4" fill="#f97316" stroke="#0f172a" strokeWidth="1.5" />}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Top Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('annual')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'annual'
              ? 'border-emerald-500 text-emerald-400 font-bold bg-slate-900/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Annual Operating Cost
        </button>
        <button
          onClick={() => setActiveTab('timeframe')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'timeframe'
              ? 'border-emerald-500 text-emerald-400 font-bold bg-slate-900/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Timeframe Weather Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Left Inputs Column */}
        <div className="lg:col-span-5 glass-panel rounded-2xl border border-slate-800 bg-slate-950/40 p-6 space-y-5 max-h-[820px] overflow-y-auto">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-md font-bold text-white uppercase tracking-wider">AHU Specifications</h3>
          </div>

          {/* 1. Fan Parameters */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Fan Properties</h4>
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
                type="button"
                onClick={() => handleChange('isOaUnit', false)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-all ${
                  !isOaUnit
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Mixed Air Unit
              </button>
              <button
                type="button"
                onClick={() => handleChange('isOaUnit', true)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-all ${
                  isOaUnit
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 font-bold'
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
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activeTab === 'annual' ? '3. Scheduling & Rates' : '3. Utility Rates'}
            </h4>

            {activeTab === 'annual' && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Fan Hours/yr</label>
                  <input
                    type="number"
                    value={fanHours}
                    onChange={(e) => handleChange('fanHours', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Cool Hours/yr</label>
                  <input
                    type="number"
                    value={coolHours}
                    onChange={(e) => handleChange('coolHours', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-slate-400">Heat Hours/yr</label>
                  <input
                    type="number"
                    value={heatHours}
                    onChange={(e) => handleChange('heatHours', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400">Electricity Rate ($/kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  value={elecRate}
                  onChange={(e) => handleChange('elecRate', Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                />
              </div>
              {heatingSource === 'water' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Gas Rate Unit</label>
                  <select
                    value={gasRateUnit}
                    onChange={(e) => handleChange('gasRateUnit', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="therm">Therms ($/therm)</option>
                    <option value="ccf">CCU / CCF ($/CCU)</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Steam Rate ($/klb)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={steamRate}
                    onChange={(e) => handleChange('steamRate', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              )}
            </div>
            {heatingSource === 'water' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">
                    Gas Rate ({gasRateUnit === 'ccf' ? '$/CCU' : '$/therm'})
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={gasRate}
                    onChange={(e) => handleChange('gasRate', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}
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
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
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
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Design Conditions & Space Loads (Annual Mode Only) */}
          {activeTab === 'annual' && (
            <div className="space-y-4 pt-3 border-t border-slate-900">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Design Conditions & Space Loads</h4>
              
              {/* Design Temps Accordion/Inputs */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-slate-350 uppercase block">A. Design Temperatures (°F)</h5>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400">Summer OAT</label>
                    <input
                      type="number"
                      value={oatSummer}
                      onChange={(e) => handleChange('oatSummer', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400">Summer RAT</label>
                    <input
                      type="number"
                      value={ratSummer}
                      onChange={(e) => handleChange('ratSummer', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400">Summer DAT</label>
                    <input
                      type="number"
                      value={useSpaceLoad ? Math.round(effectiveSatSummer) : satSummer}
                      disabled={useSpaceLoad}
                      onChange={(e) => handleChange('satSummer', parseInt(e.target.value) || 0)}
                      className={`w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none ${
                        useSpaceLoad && 'opacity-50 cursor-not-allowed text-emerald-400 font-bold'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400">Winter OAT</label>
                    <input
                      type="number"
                      value={oatWinter}
                      onChange={(e) => handleChange('oatWinter', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400">Winter RAT</label>
                    <input
                      type="number"
                      value={ratWinter}
                      onChange={(e) => handleChange('ratWinter', parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-slate-400">Winter DAT</label>
                    <input
                      type="number"
                      value={useSpaceLoad ? Math.round(effectiveSatWinter) : satWinter}
                      disabled={useSpaceLoad}
                      onChange={(e) => handleChange('satWinter', parseInt(e.target.value) || 0)}
                      className={`w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none ${
                        useSpaceLoad && 'opacity-50 cursor-not-allowed text-orange-400 font-bold'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Space Load Toggle & Slider/Inputs */}
              <div className="space-y-3 pt-2 border-t border-slate-900">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-350 uppercase">B. Space Load Control</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSpaceLoad}
                      onChange={(e) => handleChange('useSpaceLoad', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {useSpaceLoad ? (
                  <div className="space-y-3 bg-slate-900/30 p-3 rounded-lg border border-slate-850">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-semibold text-slate-400">Space Sensible Cooling Load</label>
                        <span className="text-[10px] font-bold text-emerald-400">
                          {spaceCoolingLoad.toLocaleString()} Btu/h ({(spaceCoolingLoad / 12000).toFixed(1)} Tons)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="12000"
                        max="600000"
                        step="12000"
                        value={spaceCoolingLoad}
                        onChange={(e) => handleChange('spaceCoolingLoad', parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-semibold text-slate-400">Space Sensible Heating Load</label>
                        <span className="text-[10px] font-bold text-orange-400">
                          {spaceHeatingLoad.toLocaleString()} Btu/h
                        </span>
                      </div>
                      <input
                        type="range"
                        min="12000"
                        max="600000"
                        step="12000"
                        value={spaceHeatingLoad}
                        onChange={(e) => handleChange('spaceHeatingLoad', parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>

                    {/* Calculated DAT results & Warnings */}
                    <div className="text-[10px] space-y-1 pt-1.5 border-t border-slate-900/60">
                      <div className="flex justify-between">
                        <span className="text-slate-450">Calculated Summer DAT:</span>
                        <span className={`font-bold ${satSummerClamped ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {effectiveSatSummer.toFixed(1)}°F {satSummerClamped && '(Clamped)'}
                        </span>
                      </div>
                      {satSummerClamped && (
                        <p className="text-[9px] text-amber-500 font-medium text-left">
                          * Required DAT went outside [50°F, {ratSummer}°F]. Consider increasing CFM or lowering cooling load.
                        </p>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-450">Calculated Winter DAT:</span>
                        <span className={`font-bold ${satWinterClamped ? 'text-amber-400' : 'text-orange-400'}`}>
                          {effectiveSatWinter.toFixed(1)}°F {satWinterClamped && '(Clamped)'}
                        </span>
                      </div>
                      {satWinterClamped && (
                        <p className="text-[9px] text-amber-500 font-medium text-left">
                          * Required DAT went outside [{ratWinter}°F, 120°F]. Consider increasing CFM or lowering heating load.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic text-left">
                    Enable space load control to automatically calculate supply temperatures based on the thermal needs of the space.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Columns: Renders depending on Mode tab */}
        <div className="lg:col-span-7 space-y-6">
          {activeTab === 'annual' ? (
            /* --- ANNUAL COST CALCULATOR RESULTS --- */
            <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/20 p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-md font-bold text-white uppercase tracking-wider">Annual AHU Operating Cost</h3>
              </div>

              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl text-center shadow-inner">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Annual Operating Cost</p>
                <p className="text-4xl font-black text-emerald-400 mt-2">
                  ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                </p>
                <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                  Based on {cfm.toLocaleString()} CFM system operating {fanHours} hours annually
                </p>
              </div>

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

              {/* Annual Schematic */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-center min-h-[200px]">
                <svg className="w-full max-w-[440px] h-[160px]" viewBox="0 0 440 160">
                  <rect x="60" y="40" width="320" height="80" fill="none" stroke="#475569" strokeWidth="2.5" />
                  <path d="M 20 50 L 60 50" stroke="#38bdf8" strokeWidth="3" />
                  <polygon points="60,50 52,46 52,54" fill="#38bdf8" />
                  
                  {!isOaUnit && (
                    <>
                      <path d="M 90 150 L 90 120" stroke="#cbd5e1" strokeWidth="3" />
                      <polygon points="90,120 86,128 94,128" fill="#cbd5e1" />
                      <text x="90" y="160" fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor="middle">RETURN</text>
                    </>
                  )}

                  {/* Damper blades in Annual mode (static visual) */}
                  <line x1="60" y1="50" x2="72" y2="50" stroke="#ef4444" strokeWidth="1.5" transform={`rotate(${90 - currentOaFraction * 0.9}, 60, 50)`} />
                  {!isOaUnit && (
                    <line x1="90" y1="120" x2="90" y2="108" stroke="#ef4444" strokeWidth="1.5" transform={`rotate(${currentOaFraction * 0.9}, 90, 120)`} />
                  )}

                  <rect x="110" y="40" width="10" height="80" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                  <line x1="115" y1="40" x2="115" y2="120" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                  
                  <rect x="150" y="45" width="20" height="70" fill="#f97316" fillOpacity="0.1" stroke="#f97316" strokeWidth="1.5" rx="2" />
                  <path d="M 160 45 L 160 115" stroke="#f97316" strokeWidth="2" strokeDasharray="2 4" />
                  
                  <rect x="200" y="45" width="20" height="70" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="1.5" rx="2" />
                  <path d="M 210 45 L 210 115" stroke="#3b82f6" strokeWidth="2" strokeDasharray="2 4" />

                  <circle cx="280" cy="80" r="25" fill="#334155" stroke="#475569" strokeWidth="1.5" />
                  <circle cx="280" cy="80" r="6" fill="#cbd5e1" />
                  <line x1="280" y1="55" x2="280" y2="105" stroke="#cbd5e1" strokeWidth="2" className="animate-spin origin-[280px_80px]" style={{ animationDuration: '4s' }} />
                  <line x1="255" y1="80" x2="305" y2="80" stroke="#cbd5e1" strokeWidth="2" className="animate-spin origin-[280px_80px]" style={{ animationDuration: '4s' }} />

                  <path d="M 380 80 L 420 80" stroke="#a7f3d0" strokeWidth="4" />
                  <polygon points="420,80 412,76 412,84" fill="#a7f3d0" />

                  <text x="30" y="32" fill="#38bdf8" fontSize="8" fontWeight="bold">OUTSIDE AIR</text>
                  <text x="30" y="42" fill="#94a3b8" fontSize="7">{isOaUnit ? '100%' : `${oaFraction}%`} fraction</text>
                  <text x="160" y="32" fill="#f97316" fontSize="8" fontWeight="bold" textAnchor="middle">HEAT</text>
                  <text x="160" y="128" fill="#94a3b8" fontSize="7" textAnchor="middle">{heatingSource === 'water' ? 'HW' : 'Steam'}</text>
                  <text x="210" y="32" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">COOL</text>
                  <text x="210" y="128" fill="#94a3b8" fontSize="7" textAnchor="middle">{coolingSource === 'chw' ? 'CHW' : 'DX'}</text>
                  <text x="280" y="32" fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor="middle">FAN</text>
                  <text x="280" y="128" fill="#94a3b8" fontSize="7" textAnchor="middle">{fanKw.toFixed(1)} kW</text>
                  <text x="415" y="68" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="end">SUPPLY AIR</text>
                  <text x="415" y="76" fill="#94a3b8" fontSize="6.5" textAnchor="end">
                    Cool: {Math.round(effectiveSatSummer)}°F | Heat: {Math.round(effectiveSatWinter)}°F
                  </text>
                  <text x="415" y="84" fill="#94a3b8" fontSize="6.5" textAnchor="end">{cfm.toLocaleString()} CFM</text>
                  <text x="220" y="152" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">AIR HANDLING UNIT LAYOUT</text>
                </svg>
              </div>
            </div>
          ) : (
            /* --- TIMEFRAME WEATHER-DRIVEN ANALYSIS RESULTS --- */
            <div className="space-y-6">
              {/* Configuration Panel */}
              <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/30 p-5 space-y-4">
                <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Timeframe & Setpoint Parameters</h3>
                  <span className="text-[9px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 animate-pulse" /> WEATHER DRIVEN
                  </span>
                </div>

                {/* Location Search Container */}
                <div ref={searchContainerRef} className="relative space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" /> Weather Station Location
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search city (e.g. New York, Chicago...)"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCitySearch(locationSearch);
                          setShowSearchDropdown(true);
                        }
                      }}
                      className="flex-1 bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 placeholder:text-slate-650"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleCitySearch(locationSearch);
                        setShowSearchDropdown(true);
                      }}
                      className="px-3.5 py-1.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 text-xs font-semibold rounded flex items-center gap-1 transition-all cursor-pointer"
                    >
                      {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                      Search
                    </button>
                  </div>

                  {/* Active selected location tag */}
                  <div className="text-[10px] text-sky-400/90 font-medium flex items-center gap-1 mt-1 bg-sky-950/20 py-0.5 px-2 rounded border border-sky-900/10 w-fit">
                    <span className="text-slate-400">Current Station:</span>
                    <span className="text-slate-200 font-bold">{selectedLocation.name}</span>
                    <span className="text-slate-500 font-mono">({selectedLocation.lat.toFixed(2)}°, {selectedLocation.lon.toFixed(2)}°)</span>
                  </div>

                  {/* Search Results Dropdown */}
                  {showSearchDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-950 border border-slate-850 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-900/60">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedLocation({
                              name: `${item.name}, ${item.admin1 ? item.admin1 + ', ' : ''}${item.country}`,
                              lat: item.latitude,
                              lon: item.longitude,
                              timezone: item.timezone,
                            });
                            setLocationSearch(`${item.name}, ${item.country}`);
                            setShowSearchDropdown(false);
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-slate-350 hover:bg-slate-900 hover:text-white flex flex-col gap-0.5 transition-all cursor-pointer"
                        >
                          <span className="font-semibold text-slate-200">
                            {item.name}, {item.admin1 && `${item.admin1}, `}
                            {item.country}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Lat: {item.latitude.toFixed(2)}, Lon: {item.longitude.toFixed(2)} | {item.timezone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date & Time bounds */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-sky-400" /> Target Date
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" /> Start Hour
                    </label>
                    <select
                      value={startHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setStartHour(val);
                        if (val >= endHour) setEndHour(val + 1);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    >
                      {Array.from({ length: 24 }).map((_, h) => (
                        <option key={`start-${h}`} value={h}>
                          {formatHourLabel(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" /> End Hour
                    </label>
                    <select
                      value={endHour}
                      onChange={(e) => setEndHour(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    >
                      {Array.from({ length: 24 }).map((_, h) => {
                        const hourVal = h + 1;
                        const label = hourVal === 24 ? '12 AM (Next Day)' : formatHourLabel(hourVal);
                        return (
                          <option key={`end-${hourVal}`} value={hourVal} disabled={hourVal <= startHour}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Sub Setpoints Config */}
                <div className="space-y-3 pt-3 border-t border-slate-900">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Setpoint & Damper Configurations</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Control Strategy */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-450">Damper Operation Strategy</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setControlStrategy('fixed')}
                          className={`flex-1 py-1 text-xs font-semibold rounded border transition-all ${
                            controlStrategy === 'fixed'
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-255'
                          }`}
                        >
                          Fixed Min OA Fraction
                        </button>
                        <button
                          type="button"
                          onClick={() => setControlStrategy('economizer')}
                          className={`flex-1 py-1 text-xs font-semibold rounded border transition-all ${
                            controlStrategy === 'economizer'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-255'
                          }`}
                        >
                          Temp Economizer (Free Cool)
                        </button>
                      </div>
                    </div>

                    {/* Setpoints */}
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-semibold text-slate-400">Mixed Air SP (MAT)</label>
                        <span className="text-[10px] font-bold text-slate-200">
                          {isOaUnit ? 'N/A' : controlStrategy === 'fixed' ? 'Auto Mixed' : `${matSetpoint}°F`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="45"
                        max="75"
                        value={matSetpoint}
                        onChange={(e) => setMatSetpoint(parseInt(e.target.value))}
                        disabled={isOaUnit || controlStrategy === 'fixed'}
                        className={`w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-500 ${
                          (isOaUnit || controlStrategy === 'fixed') && 'opacity-30 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    {/* Control Strategy */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-400">Discharge Temp (DAT) Control</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleChange('useSpaceLoadTimeframe', false)}
                          className={`flex-1 py-1 text-xs font-semibold rounded border transition-all ${
                            !useSpaceLoadTimeframe
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-205'
                          }`}
                        >
                          Fixed DAT Setpoint
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChange('useSpaceLoadTimeframe', true)}
                          className={`flex-1 py-1 text-xs font-semibold rounded border transition-all ${
                            useSpaceLoadTimeframe
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-205'
                          }`}
                        >
                          Load-Based DAT
                        </button>
                      </div>
                    </div>

                    {useSpaceLoadTimeframe ? (
                      <div className="space-y-1 md:col-span-2 bg-slate-900/30 p-3 rounded-lg border border-slate-850">
                        <div className="flex justify-between">
                          <label className="text-[10px] font-semibold text-slate-400">Estimated Space Sensible Load</label>
                          <span className={`text-[10px] font-bold ${spaceLoadTimeframe > 0 ? 'text-emerald-400' : spaceLoadTimeframe < 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                            {spaceLoadTimeframe > 0 ? `+${spaceLoadTimeframe.toLocaleString()} Btu/h (Cooling)` : spaceLoadTimeframe < 0 ? `${spaceLoadTimeframe.toLocaleString()} Btu/h (Heating)` : 'Neutral (0 Btu/h)'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-300000"
                          max="300000"
                          step="10000"
                          value={spaceLoadTimeframe}
                          onChange={(e) => handleChange('spaceLoadTimeframe', parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="text-[10px] flex justify-between pt-1 border-t border-slate-900/60 mt-1">
                          <span className="text-slate-450">Calculated Required DAT:</span>
                          <span className="text-slate-200 font-semibold font-mono">
                            {(ratSetpoint - spaceLoadTimeframe / (1.08 * cfm)).toFixed(1)}°F
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-[10px] font-semibold text-slate-400">Discharge Air SP (DAT)</label>
                          <span className="text-[10px] font-bold text-emerald-400">{datSetpoint}°F</span>
                        </div>
                        <input
                          type="range"
                          min="45"
                          max="110"
                          value={datSetpoint}
                          onChange={(e) => setDatSetpoint(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    )}

                    {/* Return Air */}
                    {!isOaUnit && (
                      <>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <label className="text-[10px] font-semibold text-slate-400">Return Temp (RAT)</label>
                            <span className="text-[10px] font-bold text-slate-200">{ratSetpoint}°F</span>
                          </div>
                          <input
                            type="range"
                            min="65"
                            max="80"
                            value={ratSetpoint}
                            onChange={(e) => setRatSetpoint(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <label className="text-[10px] font-semibold text-slate-400">Return RH</label>
                            <span className="text-[10px] font-bold text-slate-200">{ratRh}% RH</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={ratRh}
                            onChange={(e) => setRatRh(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-slate-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Calculate Trigger Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={fetchWeatherData}
                    disabled={isWeatherDataLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 disabled:from-slate-850 disabled:to-slate-850 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isWeatherDataLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Fetching Weather Data...
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" /> Fetch Weather & Calculate Load
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status messages / info boxes */}
              {weatherError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Error loading weather station: </span>
                    {weatherError}
                  </div>
                </div>
              )}

              {isUsingHistoricalFallback && (
                <div className="p-4.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-start gap-2.5">
                  <Info className="w-4.5 h-4.5 mt-0.5 flex-shrink-0 text-amber-400" />
                  <div>
                    <span className="font-bold block text-amber-400 mb-0.5">Historical Fallback Mode Active</span>
                    The requested target date ({targetDate}) is beyond the weather forecast horizon. 
                    Weather records from the previous year (<span className="font-semibold text-white">June 11, {fallbackYear}</span>) 
                    have been fetched to simulate typical seasonal operations.
                  </div>
                </div>
              )}

              {hourlyResults.length > 0 ? (
                /* --- CALCULATED RESULTS DASHBOARD --- */
                <div className="space-y-6">
                  {/* Period Totals display */}
                  <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-inner text-center">
                    <p className="text-[11px] font-bold text-slate-450 uppercase tracking-widest">Calculated Operating Cost for Period</p>
                    <p className="text-4.5xl font-black text-emerald-400 mt-2.5">
                      ${totalPeriodCost.toFixed(2)}
                    </p>
                    <p className="text-[9.5px] text-slate-500 mt-1 font-semibold">
                      Sum of {hourlyResults.length} operating hours ({formatHourLabel(startHour)} to {formatHourLabel(endHour)}) on {targetDate}
                    </p>
                  </div>

                  {/* Period breakdown grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                      <p className="text-[9.5px] font-bold text-sky-450 uppercase tracking-wider">Fan Energy</p>
                      <p className="text-base font-black text-white mt-0.5">${totalPeriodFanCost.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{totalPeriodFanKwh.toFixed(1)} kWh used</p>
                    </div>

                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                      <p className="text-[9.5px] font-bold text-purple-400 uppercase tracking-wider">Cooling Load</p>
                      <p className="text-base font-black text-white mt-0.5">${totalPeriodCoolCost.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Max {maxTons.toFixed(1)} Tons | {totalPeriodCoolKwh.toFixed(1)} kWh</p>
                    </div>

                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                      <p className="text-[9.5px] font-bold text-orange-400 uppercase tracking-wider">Heating Load</p>
                      <p className="text-base font-black text-white mt-0.5">${totalPeriodHeatCost.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">Max {maxHeatingKbtu.toFixed(0)} kBTU/h | {totalPeriodHeatFuel.toFixed(1)} {heatingSource === 'water' ? (gasRateUnit === 'ccf' ? 'CCU' : 'therms') : 'klb'}</p>
                    </div>
                  </div>

                  {/* Timeline Scrub Slider */}
                  <div className="space-y-2.5 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" /> Hourly Details Timeline
                      </span>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                        Active Hour: {formatHourLabel(selectedHour)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={startHour}
                      max={Math.min(endHour - 1, 23)}
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono px-0.5">
                      <span>{formatHourLabel(startHour)}</span>
                      <span>{formatHourLabel(Math.min(endHour - 1, 23))}</span>
                    </div>
                  </div>

                  {/* Dynamic Hourly AHU Layout Schematic */}
                  {activeHourData && (
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col items-center justify-center min-h-[200px] relative">
                      <div className="absolute top-3 right-3 text-[9px] text-slate-500 font-mono">
                        Hour: <span className="text-slate-350 font-bold">{formatHourLabel(selectedHour)}</span>
                      </div>
                      
                      <svg className="w-full max-w-[440px] h-[160px]" viewBox="0 0 440 160">
                        {/* Casing */}
                        <rect x="60" y="40" width="320" height="80" fill="none" stroke="#475569" strokeWidth="2.5" />
                        
                        {/* Outside air inlet */}
                        <path d="M 20 50 L 60 50" stroke="#38bdf8" strokeWidth="3" />
                        <polygon points="60,50 52,46 52,54" fill="#38bdf8" />
                        
                        {/* Return air inlet */}
                        {!isOaUnit && (
                          <>
                            <path d="M 90 150 L 90 120" stroke="#cbd5e1" strokeWidth="3" />
                            <polygon points="90,120 86,128 94,128" fill="#cbd5e1" />
                            <text x="90" y="160" fill="#cbd5e1" fontSize="8" fontWeight="bold" textAnchor="middle">RETURN</text>
                          </>
                        )}

                        {/* Damper blades (animated/rotatable) */}
                        <line 
                          x1="60" 
                          y1="50" 
                          x2="72" 
                          y2="50" 
                          stroke="#f43f5e" 
                          strokeWidth="2" 
                          transform={`rotate(${90 - activeHourData.oaFraction * 0.9}, 60, 50)`} 
                        />
                        {!isOaUnit && (
                          <line 
                            x1="90" 
                            y1="120" 
                            x2="90" 
                            y2="108" 
                            stroke="#f43f5e" 
                            strokeWidth="2" 
                            transform={`rotate(${activeHourData.oaFraction * 0.9}, 90, 120)`} 
                          />
                        )}

                        {/* Filter */}
                        <rect x="110" y="40" width="10" height="80" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                        <line x1="115" y1="40" x2="115" y2="120" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                        
                        {/* Heating Coil */}
                        <rect 
                          x="150" 
                          y="45" 
                          width="20" 
                          height="70" 
                          fill={activeHourData.q_heat > 0 ? '#f97316' : '#475569'} 
                          fillOpacity={activeHourData.q_heat > 0 ? 0.15 : 0} 
                          stroke={activeHourData.q_heat > 0 ? '#f97316' : '#475569'} 
                          strokeWidth="1.5" 
                          rx="2" 
                        />
                        <path 
                          d="M 160 45 L 160 115" 
                          stroke={activeHourData.q_heat > 0 ? '#f97316' : '#475569'} 
                          strokeWidth="2" 
                          strokeDasharray={activeHourData.q_heat > 0 ? 'none' : '2 4'} 
                        />
                        
                        {/* Cooling Coil */}
                        <rect 
                          x="200" 
                          y="45" 
                          width="20" 
                          height="70" 
                          fill={activeHourData.q_cool_total > 0 ? '#3b82f6' : '#475569'} 
                          fillOpacity={activeHourData.q_cool_total > 0 ? 0.15 : 0} 
                          stroke={activeHourData.q_cool_total > 0 ? '#3b82f6' : '#475569'} 
                          strokeWidth="1.5" 
                          rx="2" 
                        />
                        <path 
                          d="M 210 45 L 210 115" 
                          stroke={activeHourData.q_cool_total > 0 ? '#3b82f6' : '#475569'} 
                          strokeWidth="2" 
                          strokeDasharray={activeHourData.q_cool_total > 0 ? 'none' : '2 4'} 
                        />

                        {/* Fan */}
                        <circle cx="280" cy="80" r="25" fill="#334155" stroke="#475569" strokeWidth="1.5" />
                        <circle cx="280" cy="80" r="6" fill="#cbd5e1" />
                        <line x1="280" y1="55" x2="280" y2="105" stroke="#cbd5e1" strokeWidth="2" className="animate-spin origin-[280px_80px]" style={{ animationDuration: '3s' }} />
                        <line x1="255" y1="80" x2="305" y2="80" stroke="#cbd5e1" strokeWidth="2" className="animate-spin origin-[280px_80px]" style={{ animationDuration: '3s' }} />

                        {/* Supply Air Output */}
                        <path d="M 380 80 L 420 80" stroke="#a7f3d0" strokeWidth="4" />
                        <polygon points="420,80 412,76 412,84" fill="#a7f3d0" />

                        {/* Text values */}
                        <text x="15" y="24" fill="#38bdf8" fontSize="8" fontWeight="bold">OUTSIDE AIR (OAT)</text>
                        <text x="15" y="34" fill="#94a3b8" fontSize="7">{activeHourData.oat.toFixed(1)}°F | {activeHourData.oaRh.toFixed(0)}% RH</text>
                        
                        {!isOaUnit && (
                          <>
                            <text x="90" y="142" fill="#cbd5e1" fontSize="7.5" fontWeight="bold" textAnchor="middle">RETURN</text>
                            <text x="90" y="150" fill="#94a3b8" fontSize="6.5" textAnchor="middle">{activeHourData.rat.toFixed(0)}°F | {activeHourData.ratRh}% RH</text>
                          </>
                        )}

                        <text x="135" y="138" fill="#a855f7" fontSize="7.5" fontWeight="bold" textAnchor="middle">MIXED AIR (MAT)</text>
                        <text x="135" y="146" fill="#a855f7" fontSize="7" fontWeight="bold" textAnchor="middle">
                          {activeHourData.mat.toFixed(1)}°F | {activeHourData.maRh.toFixed(0)}%
                        </text>
                        
                        <text x="160" y="24" fill={activeHourData.q_heat > 0 ? '#f97316' : '#64748b'} fontSize="7.5" fontWeight="bold" textAnchor="middle">HEAT</text>
                        <text x="160" y="128" fill="#94a3b8" fontSize="6.5" textAnchor="middle">
                          {activeHourData.q_heat > 0 ? `${(activeHourData.q_heat / 1000).toFixed(0)} kBTU/h` : 'OFF'}
                        </text>
                        
                        <text x="210" y="24" fill={activeHourData.q_cool_total > 0 ? '#3b82f6' : '#64748b'} fontSize="7.5" fontWeight="bold" textAnchor="middle">COOL</text>
                        <text x="210" y="128" fill="#94a3b8" fontSize="6.5" textAnchor="middle">
                          {activeHourData.q_cool_total > 0 ? `${activeHourData.coolTons.toFixed(1)} Tons` : 'OFF'}
                        </text>
                        
                        <text x="280" y="24" fill="#cbd5e1" fontSize="7.5" fontWeight="bold" textAnchor="middle">FAN</text>
                        <text x="280" y="128" fill="#94a3b8" fontSize="6.5" textAnchor="middle">{activeHourData.fanKw.toFixed(1)} kW</text>
                        
                        <text x="420" y="24" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="end">SUPPLY AIR (DAT)</text>
                        <text x="420" y="34" fill="#94a3b8" fontSize="7.5" textAnchor="end">
                          {activeHourData.dat.toFixed(0)}°F | {supplyAirRh.toFixed(0)}% RH
                        </text>
                        
                        <text x="220" y="152" fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle">
                          AHU MIXING OPERATION ({activeHourData.oaFraction.toFixed(0)}% OA)
                        </text>
                      </svg>
                    </div>
                  )}

                  {/* Hourly details metrics grid */}
                  {activeHourData && activeHourData.datClamped && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-start gap-2 mb-3 text-left w-full">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
                      <div>
                        <span className="font-bold text-amber-400">Required Supply Temperature Clamped:</span>{' '}
                        The required DAT to maintain the space temperature at this hour was calculated as{' '}
                        <span className="font-bold text-white">{activeHourData.datRequired.toFixed(1)}°F</span>, 
                        which is outside the standard operating range of [50°F, 120°F]. The supply air has been clamped to{' '}
                        <span className="font-bold text-white">{activeHourData.dat.toFixed(0)}°F</span>. 
                        The space setpoint may not be fully maintained. Increase airflow (CFM) or reduce the space load.
                      </div>
                    </div>
                  )}

                  {activeHourData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/30 border border-slate-850 p-4 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-slate-500 uppercase font-semibold">Outside Dewpoint</p>
                        <p className="text-sm font-bold text-slate-200">{getTdpF(activeHourData.oat, activeHourData.oaRh).toFixed(1)}°F</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-slate-500 uppercase font-semibold">Mixed Dewpoint</p>
                        <p className="text-sm font-bold text-slate-200">{activeHourData.tdp_ma.toFixed(1)}°F</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-slate-500 uppercase font-semibold">Cooling Sensible</p>
                        <p className="text-sm font-bold text-sky-400">{(activeHourData.q_cool_sens / 1000).toFixed(1)} kBTU/h</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-slate-500 uppercase font-semibold">Cooling Latent</p>
                        <p className="text-sm font-bold text-purple-400">{(activeHourData.q_cool_latent / 1000).toFixed(1)} kBTU/h</p>
                      </div>
                    </div>
                  )}

                  {/* Line Charts */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-sky-400" /> Temperature Profiles (°F)
                      </h4>
                      {renderTempChart()}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[10px] text-slate-450 mt-1 font-semibold">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#38bdf8] rounded"></span>Outside Temp (OAT)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#a855f7] rounded"></span>Mixed Air (MAT)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#64748b] border-t border-dashed"></span>Return Air (RAT)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#10b981] rounded"></span>Discharge Temp (DAT)</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-orange-400" /> Coil Demands (kBTU/hr)
                      </h4>
                      {renderLoadChart()}
                      <div className="flex gap-4 justify-center text-[10px] text-slate-450 mt-1 font-semibold">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2 bg-[#3b82f6] rounded-sm opacity-60"></span>Cooling Demand</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2 bg-[#f97316] rounded-sm opacity-60"></span>Heating Demand</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* --- CALL TO ACTION PLACEHOLDER --- */
                <div className="h-[400px] bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="p-4 bg-sky-500/10 rounded-full border border-sky-500/20 text-sky-400">
                    <Activity className="w-8 h-8 animate-pulse" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">No Timeframe Weather Data</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Search for a location, select a target date and timeframe on the left, then click <strong>"Fetch Weather & Calculate"</strong> to perform the weather-driven analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
