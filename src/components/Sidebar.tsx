import React, { useState } from 'react';
import { 
  Wind, 
  Lightbulb, 
  Droplets, 
  Wrench, 
  DollarSign, 
  Zap, 
  Search, 
  ChevronRight, 
  Cpu,
  X
} from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const TOOLS: Tool[] = [
  {
    id: 'chiller-tonnage',
    name: 'Chiller Tonnage',
    category: 'HVAC',
    description: 'Calculate cooling capacity, COP, EER, and chiller electrical load.'
  },
  {
    id: 'fan-power',
    name: 'Fan Power',
    category: 'HVAC',
    description: 'Calculate fan Brake Horsepower (BHP), motor input power, and system airflow.'
  },
  {
    id: 'psychrometric',
    name: 'Psychrometric Chart',
    category: 'HVAC',
    description: 'Calculate wet bulb, dew point, enthalpy, and specific volume. Click inside the dynamic chart to plot air states.'
  },
  {
    id: 'room-lumen',
    name: 'Room Calc (Lumen)',
    category: 'Lighting',
    description: 'Determine required number of lighting fixtures using the Lumen Method.'
  },
  {
    id: 'lpd-calc',
    name: 'Lighting Power Density',
    category: 'Lighting',
    description: 'Calculate space LPD and compare against ASHRAE 90.1 energy code limits.'
  },
  {
    id: 'pipe-velocity',
    name: 'Pipe Velocity & Friction',
    category: 'District Energy',
    description: 'Determine pipe water velocity and frictional head loss.'
  },
  {
    id: 'steam-pipe',
    name: 'Steam Pipe Sizing',
    category: 'District Energy',
    description: 'Calculate steam velocity, carrying capacity, and pressure drop.'
  },
  {
    id: 'cooling-tower-water',
    name: 'Cooling Tower Water',
    category: 'District Energy',
    description: 'Calculate water balance, evaporation, blowdown, and cycles of concentration savings.'
  },
  {
    id: 'boiler-efficiency',
    name: 'Boiler Efficiency',
    category: 'O&M',
    description: 'Estimate boiler combustion efficiency and stack losses.'
  },
  {
    id: 'compressed-air',
    name: 'Compressed Air Leaks',
    category: 'O&M',
    description: 'Determine annual cost and energy losses from compressed air system leaks.'
  },
  {
    id: 'steam-trap-leak',
    name: 'Steam Trap Leak Cost',
    category: 'O&M',
    description: 'Calculate steam loss, fuel waste, carbon footprint, and costs from failed steam traps.'
  },
  {
    id: 'simple-payback',
    name: 'Simple Payback & ROI',
    category: 'Financial',
    description: 'Calculate payback period, Net Present Value (NPV), and ROI for energy projects.'
  },
  {
    id: 'carbon-emissions',
    name: 'Carbon Footprint',
    category: 'Energy',
    description: 'Calculate Scope 1 and Scope 2 greenhouse gas emissions.'
  }
];

export interface Category {
  name: string;
  icon: React.ComponentType<any>;
  color: string;
}

export const CATEGORIES: Record<string, Category> = {
  'HVAC': { name: 'HVAC', icon: Wind, color: 'text-sky-400 bg-sky-500/10' },
  'Lighting': { name: 'Lighting', icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10' },
  'District Energy': { name: 'District Energy', icon: Droplets, color: 'text-blue-400 bg-blue-500/10' },
  'O&M': { name: 'O&M', icon: Wrench, color: 'text-emerald-400 bg-emerald-500/10' },
  'Financial': { name: 'Financial', icon: DollarSign, color: 'text-purple-400 bg-purple-500/10' },
  'Energy': { name: 'Energy', icon: Zap, color: 'text-red-400 bg-red-500/10' }
};

interface SidebarProps {
  activeToolId: string;
  onSelectTool: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeToolId, onSelectTool, isOpen, onClose }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = TOOLS.filter(tool =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tools by category
  const groupedTools: Record<string, Tool[]> = {};
  filteredTools.forEach(tool => {
    if (!groupedTools[tool.category]) {
      groupedTools[tool.category] = [];
    }
    groupedTools[tool.category].push(tool);
  });

  return (
    <aside className={`w-80 flex-shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col h-screen fixed lg:sticky top-0 left-0 z-40 transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0`}>
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white m-0 leading-tight">
              EnergyToolbox
            </h1>
            <p className="text-xs text-slate-400 font-medium">Professional Engineering Suite</p>
          </div>
        </div>

        {/* Close Button on Mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all border border-transparent hover:border-slate-800"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Section */}
      <div className="p-4 border-b border-slate-900">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search calculators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      {/* Tools List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.keys(CATEGORIES).map((catName) => {
          const catTools = groupedTools[catName];
          if (!catTools || catTools.length === 0) return null;

          const category = CATEGORIES[catName];
          const Icon = category.icon;

          return (
            <div key={catName} className="space-y-2">
              <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className={`p-1 rounded-md ${category.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>{category.name}</span>
              </div>

              <div className="space-y-1">
                {catTools.map((tool) => {
                  const isActive = tool.id === activeToolId;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onSelectTool(tool.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between group transition-all duration-200 ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      <span className="truncate pr-2">{tool.name}</span>
                      <ChevronRight 
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isActive 
                            ? 'text-emerald-400 translate-x-0.5' 
                            : 'text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredTools.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No calculators found
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Production Ready</span>
        </div>
        <span className="text-[10px] text-slate-600 font-mono">v1.2.0</span>
      </div>
    </aside>
  );
}
