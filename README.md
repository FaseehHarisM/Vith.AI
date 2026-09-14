# VITH.AI 
**à´µà´¿à´¤àµà´¤àµà´—àµà´£à´‚ à´ªà´¤àµà´¤àµà´—àµà´£à´‚ (Good Seed, Tenfold Yield)**

**VITH.AI** is a "Satellite-Powered Agronomist in your pocket." We take billion-dollar space technology and turn it into simple, actionable daily advice for farmers without requiring them to install a single piece of hardware on their land.

## The Problem
Farming today relies heavily on guesswork. To get scientific data about soil health, moisture levels, or early disease detection, small-scale farmers would normally have to purchase expensive IoT sensors or hire expert consultants. Because this is unaffordable, farmers often lose money due to bad weather, poor crop choices, and over-watering.

## The Solution
VITH.AI solves this by bringing space technology directly to the farmer's smartphone. 

### How it Works (The Magic)
1. **Just Draw:** A farmer (or Krishi Bhavan officer) opens the app and draws a shape around their farm on the map.
2. **Instant Satellite Scan:** The app instantly connects to Google Earth Engine and pulls live data about the farm's soil quality, historical rainfall, and current vegetation health from space.
3. **AI Crop Planning:** Our Artificial Intelligence analyzes this data and creates a custom field layout. It tells the farmer exactly *what* to plant, *where* to plant it, and *how* to mix crops (like planting Pepper alongside Coconut) to maximize profit.
4. **Daily Voice Advice:** It generates a simple 0-100 "Farm Health Score" and gives a daily instruction (e.g., "High humidity today, avoid watering"). 
5. **Malayalam Voice:** If the farmer cannot read complex charts, they just tap a button and the AI **speaks the advice aloud in Malayalam**.
6. **WhatsApp Sharing:** With one click, export a beautiful "Farm Report Card" to share on WhatsApp with buyers, loan officers, or agricultural officials.

---

## Key Features for Hackathon Judges

* **Highly Scalable:** Zero hardware required. You can analyze any farm, anywhere in the world, just by drawing on the map.
* **Highly Inclusive:** Translates complex satellite data into simple Malayalam voice commands that any traditional farmer can understand.
* **FPO & Gov Officer Mode:** Includes district-level monitoring tools so agricultural officers can see the health of thousands of farms at a single glance.
* **Live Satellite Feeds:** Integrates live data from Sentinel-2 (for vegetation health), SoilGrids (for soil properties), and Open-Meteo (for hyper-local climate).
* **Smart Fallbacks:** The app is bulletproofed against internet timeouts. If a satellite API fails, our local Agronomy Engine instantly kicks in to ensure the farmer always receives guidance.

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
      Göé
      Gû+
   Frontend
React + Mapbox GL JS + Tailwind + shadcn
      Göé
      Gû+
Edge Functions (Supabase - Deno)
      Göé
 GöîGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGö¼GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGö¼GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGö¼GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGö¼GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGö¼GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÉ
 Gû+               Gû+               Gû+               Gû+               Gû+               Gû+               
Mapbox Token   Field Analysis   Land Analytics  NDVI Tiles      NDVI Series     Soil Data
(Mapbox API)   (GEE + AI)       (GEE)           (GEE)           (GEE)           (SoilGrids)
                   Göé               Göé               Göé               Göé               Göé
                   Gû+               Gû+               Gû+               Gû+               Gû+
             AI Crop Planning   Land Use        Tile Service    Time-Series     Soil Properties
             (Gemini 2.5 Pro)   + Suitability                                   (250m)
                   Göé
                   Gû+
            Crop Recommendations

      Göé
      Gû+
External Data Sources
      Göé
 GöîGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGö¼GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGö¼GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGö¼GöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÇGöÉ
 Gû+               Gû+               Gû+               Gû+               Gû+
Google Earth    Open-Meteo     SoilGrids       Mapbox         Sentinel-2 
Engine          (Weather)      (Soil Data)     (Maps API)    ESA WorldCover
                                                              SRTM GÇó CHIRPS
```


## Tech Stack
* **Frontend:** React, Vite, Tailwind CSS, Mapbox GL JS
* **Backend:** Supabase Edge Functions (Serverless Deno)
* **Space Data:** Google Earth Engine (Sentinel-2, ESA WorldCover, SRTM, CHIRPS)
* **AI Engine:** Google Gemini 2.5 Pro / Llama 3 (via Groq)
* **Climate & Soil:** Open-Meteo, ISRIC SoilGrids API

## Run Locally
```bash
# Install dependencies
npm install

# Start the local API server and Frontend
npm run dev
```

*Built for AI Conclave 2026 Hackathon.*

