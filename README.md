# Energy Toolbox ⚡

Energy Toolbox is a premium, high-performance web application containing a suite of professional engineering calculators and utilities. Built for energy engineers, facility operators, and HVAC professionals, it provides rapid, precise calculations across thermal, electrical, fluid dynamics, and financial domains.

Visit the live application at [justnels.com](https://justnels.com).

---

## 🛠️ Category & Tool Catalog

### 💨 HVAC Systems

1. **[Chiller Tonnage & Performance](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/ChillerTonnage.tsx)**
   * **Description:** Determine evaporator cooling capacity (Tons), system delta-T, COP/EER, and power ratios (kW/Ton) based on flow rate and temperature inputs.
2. **[Fan Power & Efficiency](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/FanPower.tsx)**
   * **Description:** Calculate fan Brake Horsepower (BHP), electrical input kW, and combined efficiency based on static pressure and design airflow.
3. **[Psychrometric Chart Properties](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/PsychrometricChart.tsx)**
   * **Description:** Determine thermodynamic air state properties (wet bulb temperature, dew point, humidity ratio, enthalpy, specific volume, and vapor pressure) at sea level. Includes an interactive SVG psychrometric chart plotter.
4. **[Room Heat & Cool Load Estimator](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/RoomLoadEstimator.tsx)**
   * **Description:** Estimate peak sensible and latent heating and cooling loads based on structural surfaces (walls, windows, roofs), design ambient conditions, ventilation rates, and internal loads (people, lighting, equipment).
5. **[AHU Operating Cost Calculator](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/AhuRunningCost.tsx)**
   * **Description:** 
     * **Annual Mode:** Estimate annual operating costs of an Air Handling Unit (AHU) covering fan power, cooling coils (Direct Expansion vs. Chilled Water), and heating coils (Hot Water vs. Steam).
     * **Timeframe Weather Analysis:** Select a specific date/hour timeframe and locate weather records via the Open-Meteo API. Simulates real-world dynamic outside air damper adjustments (economizer modulations) and psychrometric dehumidification loads for that period.

### 💡 Lighting & Power

6. **[Lighting Lumen Method (Room Calc)](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/RoomLumen.tsx)**
   * **Description:** Calculate the required quantity and spatial layout of light fixtures to achieve a target average illuminance (footcandles or lux) using the zonal cavity method.
7. **[Lighting Power Density (LPD)](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/LPDCalculator.tsx)**
   * **Description:** Assess total lighting power loads and compare proposed Building Area or Space-by-Space Lighting Power Density values against ASHRAE 90.1 energy code guidelines.

### 🌊 District Energy & Hydraulics

8. **[Water Pipe Velocity & Friction Loss](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/PipeVelocity.tsx)**
   * **Description:** Calculate water velocity and frictional head loss in Schedule 40 steel pipes using the Hazen-Williams empirical equation.
9. **[Steam Pipe Sizing & Velocity](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/SteamPipe.tsx)**
   * **Description:** Calculate saturated steam velocity, specific volume, and temperature to check pipe sizing against acoustic erosion limits.
10. **[Cooling Tower Water Balance](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/CoolingTowerWater.tsx)**
    * **Description:** Estimate cooling tower evaporation, blowdown, and makeup water rates, and determine utility cost savings by optimizing cycles of concentration.

### ⚙️ Operations & Maintenance (O&M)

11. **[Boiler Combustion Efficiency](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/BoilerEfficiency.tsx)**
    * **Description:** Evaluate boiler stack heat losses, excess air percentages, and fuel combustion efficiency using flue gas measurements.
12. **[Compressed Air Leak Cost](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/CompressedAir.tsx)**
    * **Description:** Determine annual energy waste, compressor kW overhead, and costs incurred from air leaks through orifices.
13. **[Steam Trap Leak Cost](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/SteamTrapLeak.tsx)**
    * **Description:** Estimate steam loss rates, fuel waste, carbon footprints, and financial losses resulting from failed steam traps using Napier's formula.

### 📈 Financial & Project Analysis

14. **[Simple Payback & Investment ROI](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/SimplePayback.tsx)**
    * **Description:** Evaluate simple payback periods, Net Present Value (NPV), and Return on Investment (ROI) of retrofit projects based on implementation cost, utility savings, and discount rates.

### 🌍 Sustainability & Environmental

15. **[Carbon Footprint & Offsets](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/CarbonEmissions.tsx)**
    * **Description:** Calculate Scope 1 (fuel combustion) and Scope 2 (purchased electricity) greenhouse gas emissions, and display equivalencies (e.g. tree offsets, passenger vehicle miles).

### 🧪 Water Quality

16. **[Langelier Saturation Index (LSI)](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/LangelierSatIndex.tsx)**
    * **Description:** Determine water scaling and corrosive tendencies using LSI and Ryznar Stability Index (RSI) indices.
17. **[Ultrapure Water & RO Membrane](file:///c:/Users/justnels/energy-toolbox/src/components/calculators/WaterPurityTemp.tsx)**
    * **Description:** Convert resistivity and conductivity with temperature correction and calculate Reverse Osmosis (RO) membrane recovery and salt rejection rates.

---

## 💻 Tech Stack

* **Framework:** React 19 (TypeScript)
* **Build System:** Vite 8
* **Styling:** Tailwind CSS 4
* **Icons:** Lucide React
* **Hosting:** Custom domain (static deployment)

---

## 🚀 Getting Started

### Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

### Production
Build the optimized application bundle:
```bash
npm run build
```
The output will be compiled to the `/dist` directory.
