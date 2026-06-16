import { useState } from 'react';
import Sidebar from './components/Sidebar';
import CalculatorCard from './components/CalculatorCard';
import { getActiveToolFromUrl, setActiveToolInUrl } from './utils/queryParams';

// Calculator Imports
import ChillerTonnage from './components/calculators/ChillerTonnage';
import FanPower from './components/calculators/FanPower';
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

  // Update active tool ID and update URL
  const handleSelectTool = (id: string) => {
    setActiveToolId(id);
    setActiveToolInUrl(id);
  };

  const activeTool = CALCULATOR_REGISTRY[activeToolId] || CALCULATOR_REGISTRY['chiller-tonnage'];
  const CalcComponent = activeTool.component;

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Fixed Sidebar */}
      <Sidebar activeToolId={activeToolId} onSelectTool={handleSelectTool} />

      {/* Main Workspace Scrollable Container */}
      <main className="flex-1 overflow-y-auto min-h-screen pb-12">
        {/* Top Glow Decorator */}
        <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-500 w-full"></div>
        
        <div className="p-6 md:p-8 space-y-6">
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
