# VITH.AI - Sorry for the issues lately, hopefully the fix will be there soon

**React** • **TypeScript** • **Vite** • **TailwindCSS** • **Mapbox** • **Supabase** • **Gemini** • **EarthEngine**

VITH.AI is a satellite-powered agricultural and land analytics platform that combines Sentinel-2 satellite imagery, Google Earth Engine processing, real-time weather data, soil science databases, and AI-driven crop planning into a single web dashboard.

Users draw polygonal regions on an interactive map and receive vegetation health analysis (NDVI), climate analytics, soil profiling, air quality data, land use classification, land suitability scoring, and AI-generated crop planning recommendations.

## What VITH.AI Does
VITH.AI enables users to:
* Map and manage regions on an interactive satellite map with polygon drawing tools
* Monitor vegetation health using NDVI analysis from Sentinel-2 10m resolution imagery
* Access detailed soil health profiling from the ISRIC SoilGrids database
* Monitor air quality with PM2.5, PM10, and AQI readings
* Classify land use from ESA WorldCover satellite data via Google Earth Engine
* AI-based crop planning with visual field layouts, intercropping strategies, and crop rotation plans
* Compare two regions side-by-side with synchronized analytics charts
* Export crop plans as PDF documents

## Key Features

### Interactive Satellite Mapping
* Satellite and dark basemap styles powered by Mapbox GL JS
* Polygon drawing with a pen tool for custom region boundaries
* Region editing and deletion with boundary modification
* Fly-to animations when selecting regions from the list
* NDVI overlay from Google Earth Engine tile service
* Location search with Mapbox geocoding and reverse geocoding
* Auto-detection of region type (rural vs urban) using GEE land use data

### NDVI Vegetation Analysis
Sentinel-2 imagery is processed through Google Earth Engine to calculate the Normalized Difference Vegetation Index. This NDVI data is displayed as a semi-transparent raster layer above the satellite basemap.

*NDVI = (NIR - Red) / (NIR + Red)*

| NDVI Range | Vegetation Status |
| :--- | :--- |
| Below 0.2 | Critical / bare soil |
| 0.2 to 0.4 | Stressed vegetation |
| 0.4 to 0.6 | Moderate vegetation |
| Above 0.6 | Healthy vegetation |

### Climate Analytics Dashboard
Per-region weather analysis with current conditions, precipitation trends (incl. evapotranspiration), temperature ranges, soil moisture (surface & deep), and selectable date range. Air quality monitoring with AQI, PM2.5 levels, and color-coded indicators.

### Soil Health Profiling
Soil data fetched from the ISRIC SoilGrids REST API at 250m resolution:
* Soil classification (WRB taxonomy) with descriptions and icons
* pH measurement with rating
* Organic carbon content & Total nitrogen content
* Cation exchange capacity (CEC)
* Bulk density & Coarse fragment percentage
* Soil composition (sand, silt, clay percentages) with USDA texture class
* Water retention: field capacity, wilting point, available water capacity
* Donut chart to visualize soil composition

### Land Use Classification
ESA WorldCover 10m land cover classification via Google Earth Engine (Cropland, tree cover, grassland, shrubland, built-up, water, bare/sparse, wetland, snow/ice, mangroves, moss/lichen). Interactive donut chart with percentage breakdown. Used for urban region detection (30%+ built-up area triggers urban mode) and water body edge case detection (80%+ water blocks crop planning).

### Land Suitability Scoring
Radar chart of six land suitability metrics:
* Soil quality (from SoilGrids data)
* Water access (rainfall and soil moisture)
* Climate suitability (temperature and precipitation patterns)
* Topography (elevation and slope from SRTM 30m DEM)
* Drainage assessment & Nutrient level scoring

### AI Crop Planning
Dual-approach crop planning system:

**Local Agronomy Model:**
A client-side scoring engine with 50+ crop profiles that runs immediately. Detects climate region from location text and scores each crop against field signals. Allocates area proportionally to suitability scores, generates intercropping pairs, and 3-season rotation plans.

**Live AI Planner:**
Calls Google Gemini 2.5 Pro with full field context (NDVI, soil, weather, suitability, land use data). The AI response replaces the local model when available.

**Crop Visualization & Plan Outputs:**
* Static dot grid fills the entire field polygon with crop markers
* Zone allocation pie chart with percentage breakdown
* Per-zone details: area percentage, spacing, water needs, yield estimate, season, reasoning
* Intercropping pair suggestions with spacing guidance
* 3-season crop rotation plan
* Water saving percentage and revenue boost estimates
* PDF export of the complete crop plan

### Edge Case Detection
The system detects unsuitable regions and blocks crop planning:
* **Water bodies:** ESA WorldCover "Water" land use percentage (80%+)
* **Extreme deserts:** Annual rainfall from CHIRPS via GEE (Below 50mm, or keyword match)
* **Polar regions:** Average latitude of polygon coordinates (Above 66 degrees, or keyword match)
* **High altitude:** Elevation from SRTM via GEE (Above 5000m)
* **Urban regions:** ESA WorldCover "Built-up" percentage (30%+)

## Architecture
```text
User / Browser
      │
      ▼
   Frontend
React + Mapbox GL JS + Tailwind + shadcn
      │
      ▼
Edge Functions (Supabase - Deno)
      │
 ┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
 ▼               ▼               ▼               ▼               ▼               ▼               
Mapbox Token   Field Analysis   Land Analytics  NDVI Tiles      NDVI Series     Soil Data
(Mapbox API)   (GEE + AI)       (GEE)           (GEE)           (GEE)           (SoilGrids)
                   │               │               │               │               │
                   ▼               ▼               ▼               ▼               ▼
             AI Crop Planning   Land Use        Tile Service    Time-Series     Soil Properties
             (Gemini 2.5 Pro)   + Suitability                                   (250m)
                   │
                   ▼
            Crop Recommendations

      │
      ▼
External Data Sources
      │
 ┌───────────────┬───────────────┬───────────────┬───────────────┐
 ▼               ▼               ▼               ▼               ▼
Google Earth    Open-Meteo     SoilGrids       Mapbox         Sentinel-2 
Engine          (Weather)      (Soil Data)     (Maps API)    ESA WorldCover
                                                              SRTM • CHIRPS
```

## Tech Stack
* **Frontend:** React 18 + TypeScript 5
* **Build Tool:** Vite 5
* **Styling:** Tailwind CSS 3 + shadcn/ui
* **Mapping:** Mapbox GL JS 3
* **Charts:** Recharts
* **Backend:** Supabase Edge Functions (Deno)
* **Satellite:** Google Earth Engine
* **AI:** Google Gemini 2.5 Pro
* **Weather:** Open-Meteo
* **Soil:** ISRIC SoilGrids

## Installation
```bash
git clone https://github.com/your-org/VITH.AI
cd VITH.AI
npm install
npm run dev
```

## Environment Variables
```env
MAPBOX_TOKEN=
GEE_SERVICE_ACCOUNT_JSON=
GEE_PROJECT_ID=
GROQ_API_KEY=
GROQ_MODEL=
```
*Note: Open-Meteo and ISRIC SoilGrids are free public APIs that do not require API keys.*

## License
GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007
