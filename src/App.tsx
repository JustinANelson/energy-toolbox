import { useState } from 'react';
import Sidebar from './components/Sidebar';
import CalculatorCard from './components/CalculatorCard';
import { getActiveToolFromUrl, setActiveToolInUrl } from './utils/queryParams';
import { Menu } from 'lucide-react';

// Calculator Imports
import ChillerTonnage from './components/calculators/ChillerTonnage';
import FanPower from './components/calculators/FanPower';
import PsychrometricChart from './components/calculators/PsychrometricChart';
import RoomLoadEstimator from './components/calculators/RoomLoadEstimator';
import RoomLumen from './components/calculators/RoomLumen';
import LPDCalculator from './components/calculators/LPDCalculator';
import PipeVelocity from './components/calculators/PipeVelocity';
import SteamPipe from './components/calculators/SteamPipe';
import CoolingTowerWater from './components/calculators/CoolingTowerWater';
import BoilerEfficiency from './components/calculators/BoilerEfficiency';
import CompressedAir from './components/calculators/CompressedAir';
import SteamTrapLeak from './components/calculators/SteamTrapLeak';
import SimplePayback from './components/calculators/SimplePayback';
import CarbonEmissions from './components/calculators/CarbonEmissions';
import LangelierSatIndex from './components/calculators/LangelierSatIndex';
import WaterPurityTemp from './components/calculators/WaterPurityTemp';

// Map tool ID to details and component
const CALCULATOR_REGISTRY: Record<string, {
  title: string;
  category: string;
  description: string;
  component: React.ComponentType<any>;
}> = {
  'chiller-tonnage': {
    title: 'Chiller Tonnage & Performance',
    category: 'HVAC',
    description: 'Determine evaporator cooling capacity (Tons), system delta-T, COP/EER, and power ratios.',
    component: ChillerTonnage
  },
  'fan-power': {
    title: 'Fan Power & Efficiency',
    category: 'HVAC',
    description: 'Calculate fan Brake Horsepower (BHP), electrical input kW, and combined efficiency based on static pressure and airflow.',
    component: FanPower
  },
  'psychrometric': {
    title: 'Psychrometric Chart Properties',
    category: 'HVAC',
    description: 'Calculate wet bulb, dew point, enthalpy, specific volume, and humidity ratio. Plot and view air states directly on the chart.',
    component: PsychrometricChart
  },
  'room-load': {
    title: 'Room Heat & Cool Load Estimator',
    category: 'HVAC',
    description: 'Calculate peak heating and cooling loads (sensible and latent) based on structural components, design temperatures, and internal heat loads.',
    component: RoomLoadEstimator
  },
  'room-lumen': {
    title: 'Lighting Lumen Method (Room Calc)',
    category: 'Lighting',
    description: 'Calculate the quantity and layout of fixtures needed to achieve a target average illuminance (footcandles/lux).',
    component: RoomLumen
  },
  'lpd-calc': {
    title: 'Lighting Power Density (LPD)',
    category: 'Lighting',
    description: 'Assess total lighting load and compare proposed building Lighting Power Density against ASHRAE 90.1 energy code limits.',
    component: LPDCalculator
  },
  'pipe-velocity': {
    title: 'Water Pipe Velocity & friction loss',
    category: 'District Energy',
    description: 'Calculate water velocity and frictional pressure drop in Schedule 40 steel pipes using the Hazen-Williams equation.',
    component: PipeVelocity
  },
  'steam-pipe': {
    title: 'Steam Pipe Sizing & velocity',
    category: 'District Energy',
    description: 'Calculate saturated steam velocity, specific volume, and temperature to check pipe sizing against acoustic erosion limits.',
    component: SteamPipe
  },
  'cooling-tower-water': {
    title: 'Cooling Tower Water Balance',
    category: 'District Energy',
    description: 'Calculate water balance, evaporation, blowdown, and potential savings from optimizing cycles of concentration.',
    component: CoolingTowerWater
  },
  'boiler-efficiency': {
    title: 'Boiler Combustion Efficiency',
    category: 'O&M',
    description: 'Evaluate boiler combustion stack losses, excess air, and fuel efficiency using standard flue gas measurements.',
    component: BoilerEfficiency
  },
  'compressed-air': {
    title: 'Compressed Air Leak Cost',
    category: 'O&M',
    description: 'Determine energy waste, compressor kW overhead, and annual costs incurred from air leaks through orifices.',
    component: CompressedAir
  },
  'steam-trap-leak': {
    title: 'Steam Trap Leak Cost',
    category: 'O&M',
    description: 'Calculate steam loss, fuel waste, carbon footprint, and costs from failed steam traps.',
    component: SteamTrapLeak
  },
  'simple-payback': {
    title: 'Simple Payback & Investment ROI',
    category: 'Financial',
    description: 'Evaluate simple payback period, Net Present Value (NPV), and ROI of energy retrofits based on utility savings.',
    component: SimplePayback
  },
  'carbon-emissions': {
    title: 'Carbon Footprint & offsets',
    category: 'Energy',
    description: 'Determine Scope 1 and Scope 2 greenhouse gas emissions (MT CO2e) with trees and miles equivalencies.',
    component: CarbonEmissions
  },
  'langelier-index': {
    title: 'Langelier Saturation Index (LSI)',
    category: 'Water Quality',
    description: 'Determine water scaling and corrosive tendencies using LSI and Ryznar indices.',
    component: LangelierSatIndex
  },
  'water-purity': {
    title: 'Ultrapure Water & RO Membrane',
    category: 'Water Quality',
    description: 'Convert resistivity/conductivity with temperature correction and calculate RO membrane recovery and salt rejection.',
    component: WaterPurityTemp
  }
};

export default function App() {
  const [activeToolId, setActiveToolId] = useState<string>(() => {
    const urlTool = getActiveToolFromUrl();
    if (urlTool && CALCULATOR_REGISTRY[urlTool]) {
      return urlTool;
    }
    return 'chiller-tonnage';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Update active tool ID and update URL
  const handleSelectTool = (id: string) => {
    setActiveToolId(id);
    setActiveToolInUrl(id);
    setIsMobileMenuOpen(false); // Close sidebar on mobile after selection
  };

  const activeTool = CALCULATOR_REGISTRY[activeToolId] || CALCULATOR_REGISTRY['chiller-tonnage'];
  const CalcComponent = activeTool.component;

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans overflow-x-hidden">
      {/* Backdrop overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar with mobile toggle state */}
      <Sidebar 
        activeToolId={activeToolId} 
        onSelectTool={handleSelectTool} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Scrollable Container */}
      <main className="flex-1 overflow-y-auto min-h-screen pb-12 w-full">
        {/* Top Glow Decorator */}
        <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-500 w-full"></div>
        
        {/* Mobile Top Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-white tracking-tight">EnergyToolbox</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">v1.2.0</span>
        </header>

        <div className="p-4 md:p-8 space-y-6">
          {/* Main Card */}
          <CalculatorCard
            title={activeTool.title}
            category={activeTool.category}
            description={activeTool.description}
          >
            <CalcComponent />
          </CalculatorCard>
        </div>
      </main>
    </div>
  );
}
