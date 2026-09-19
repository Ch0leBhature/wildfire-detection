# 🔥 Geospatial Wildfire Risk Detection

AI-powered wildfire risk assessment system using machine learning, satellite remote sensing, and real-time weather data. Estimates wildfire risk for user-selected areas of up to 100 km radius using XGBoost classification, Google Earth Engine-derived features, and NASA FIRMS fire observations.

## Architecture

```
                     ┌─────────────────────────────────────┐
                     │         DATA SOURCES                │
                     │  Sentinel-2  •  DEM  •  Land Cover  │
                     │  Historical Weather  •  NASA FIRMS   │
                     └──────────────┬──────────────────────┘
                                    │
                            Google Earth Engine
                          (offline preprocessing)
                                    │
                            Grid Feature Dataset
                                    │
                         ┌──────────┴──────────┐
                         │   XGBoost Training   │
                         └──────────┬──────────┘
                                    │
                              model.pkl
                                    │
═══════════════════════════ RUNTIME ═════════════════════════
                                    │
    User → React + Leaflet → Node/Express Backend
                                    │
                    ┌────────────────┼────────────────┐
                    │                │                │
                  Grid         Open-Meteo        FIRMS API
               Generation       Weather          (optional)
                    │                │                │
                    └────────────────┼────────────────┘
                                    │
                           Feature Assembly
                                    │
                      Python ML Service (FastAPI)
                       XGBoost Inference → P(fire)
                                    │
                        GeoJSON Risk Grid
                                    │
                     React + Leaflet Risk Map
```

## Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+ with pip
- (Optional) NASA FIRMS API key for fire detection overlay

### 1. Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Python ML
cd ../ml && pip install -r requirements.txt
```

### 2. Generate Training Data & Train Model

```bash
# From project root
python -m ml.data_pipeline.build_training_set --mode=synthetic
python -m ml.training.train
```

This generates ~48,000 synthetic training samples for California and trains XGBoost + baseline models. The trained model is saved to `ml/models/model.pkl`.

### 3. Configure Environment

```bash
cp .env.example backend/.env
# Edit backend/.env to add your NASA FIRMS API key (optional)
```

### 4. Start Services

```bash
# Terminal 1: Python ML Service
cd /path/to/project
python -m uvicorn ml.inference.server:app --host 0.0.0.0 --port 8001

# Terminal 2: Node.js Backend
cd backend
node src/app.js

# Terminal 3: React Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

### 5. Use the Application

1. **Search** for a location (e.g., "Los Angeles" or "Sacramento")
2. **Select** an analysis radius (25, 50, 75, or 100 km)
3. Click **Analyze Risk**
4. Explore the colored risk grid — click cells for detailed feature breakdown
5. Toggle FIRMS fire detection overlay (requires API key)

## Project Structure

```
wildfire-risk/
├── frontend/               # React + Leaflet UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/        # RiskMap, RiskLegend
│   │   │   ├── Controls/   # LocationSearch, RadiusSelector, AnalyzeButton
│   │   │   └── Panels/     # WeatherPanel, RiskSummary, CellDetailPanel, FiresPanel
│   │   ├── hooks/          # useRiskAnalysis
│   │   ├── services/       # API client
│   │   └── utils/          # Risk colors/categories
│   └── package.json
│
├── backend/                # Node.js + Express API
│   ├── src/
│   │   ├── routes/         # AOI, risk, fires, weather, statistics
│   │   ├── controllers/    # Request handling
│   │   ├── services/       # Business logic
│   │   │   ├── aoiService.js       # AOI validation, bounding box
│   │   │   ├── gridService.js      # 5km grid generation (Turf.js)
│   │   │   ├── weatherService.js   # Open-Meteo API integration
│   │   │   ├── firmsService.js     # NASA FIRMS API integration
│   │   │   ├── featureService.js   # Static feature retrieval
│   │   │   └── riskService.js      # Risk orchestration pipeline
│   │   ├── db/             # PostGIS schema + connection
│   │   ├── config/         # Environment config
│   │   └── middleware/     # Validation, error handling
│   └── package.json
│
├── ml/                     # Python ML Pipeline
│   ├── data_pipeline/
│   │   ├── config.py           # Feature names, thresholds, paths
│   │   ├── build_training_set.py  # Synthetic/full data generation
│   │   ├── firms_ingestion.py  # Historical FIRMS processing
│   │   ├── weather_historical.py  # Open-Meteo archive API
│   │   └── feature_engineering.py # Feature joining/engineering
│   ├── training/
│   │   ├── train.py            # XGBoost + LR + RF training
│   │   ├── evaluate.py         # Detailed evaluation
│   │   └── shap_analysis.py    # SHAP feature importance
│   ├── inference/
│   │   ├── server.py           # FastAPI inference service
│   │   └── predictor.py        # Model loading + prediction
│   ├── models/                 # Saved model artifacts
│   │   ├── model.pkl           # Trained XGBoost model
│   │   └── model_metadata.json # Feature schema + metrics
│   └── requirements.txt
│
├── gee/                    # Google Earth Engine scripts
│   ├── scripts/
│   │   ├── extract_ndvi_ndmi.py   # Sentinel-2 vegetation indices
│   │   ├── extract_terrain.py     # SRTM elevation/slope
│   │   └── extract_landcover.py   # ESA WorldCover
│   └── README.md
│
├── data/                   # Data directories
│   ├── raw/
│   ├── processed/          # Training datasets
│   └── features/           # Precomputed grid features
│
├── docker-compose.yml      # Full stack deployment
└── .env.example
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/risk/current` | GET | Run risk assessment for lat/lng/radius |
| `/api/fires` | GET | Recent FIRMS fire detections for area |
| `/api/weather/current` | GET | Current weather conditions |
| `/api/aoi` | POST | Validate AOI and generate grid |
| `/api/grid/:id` | GET | Detailed cell information |
| `/api/statistics` | GET | AOI summary statistics |

### Example Risk Request

```bash
curl 'http://localhost:3001/api/risk/current?lat=37.77&lng=-122.42&radius=25'
```

Returns GeoJSON FeatureCollection with risk probabilities per 5km grid cell.

## ML Model

### Features (12 total)

| Feature | Source | Description |
|---------|--------|-------------|
| `temperature_current` | Open-Meteo | Current temperature (°C) |
| `humidity_current` | Open-Meteo | Current relative humidity (%) |
| `wind_speed_current` | Open-Meteo | Current wind speed (km/h) |
| `rainfall_1d` | Open-Meteo | Rainfall, last 1 day (mm) |
| `rainfall_3d` | Open-Meteo | Rainfall, last 3 days (mm) |
| `rainfall_7d` | Open-Meteo | Rainfall, last 7 days (mm) |
| `rainfall_30d` | Open-Meteo | Rainfall, last 30 days (mm) |
| `ndvi` | Sentinel-2/GEE | Vegetation greenness index |
| `ndmi` | Sentinel-2/GEE | Vegetation moisture index |
| `elevation` | SRTM DEM | Mean elevation (m) |
| `slope` | SRTM DEM | Mean slope (degrees) |
| `land_cover` | ESA WorldCover | Dominant land cover class |

### Risk Categories

| Probability | Category | Color |
|------------|----------|-------|
| 0.00 – 0.30 | Low | 🟢 Green |
| 0.30 – 0.60 | Moderate | 🟡 Amber |
| 0.60 – 0.80 | High | 🟠 Orange |
| 0.80 – 1.00 | Very High | 🔴 Red |

### Model Performance (Validation Set)

| Model | ROC-AUC | F1 | Precision | Recall |
|-------|---------|-----|-----------|--------|
| **XGBoost** | 0.851 | 0.159 | 0.096 | 0.466 |
| Random Forest | 0.854 | 0.145 | 0.082 | 0.618 |
| Logistic Regression | 0.877 | 0.110 | 0.059 | 0.854 |

> Note: Low precision/F1 is expected given the 1.9% fire base rate (highly imbalanced).
> ROC-AUC of 0.85+ indicates strong discriminative ability.

### Top Feature Importance (XGBoost)

1. `rainfall_7d` — 21.7%
2. `rainfall_3d` — 12.1%
3. `land_cover` — 10.9%
4. `temperature_current` — 9.7%
5. `rainfall_30d` — 6.8%

## Development

### Without External APIs

The system works fully without external API keys:
- **Weather**: Open-Meteo API is free and requires no key
- **ML Model**: Pre-trained model is included; retrain with synthetic data anytime
- **FIRMS**: Optional; returns empty when no API key is configured
- **GEE**: Offline preprocessing; synthetic features are used as fallback

### With Docker

```bash
docker-compose up
```

This starts PostGIS, the ML service, the Node backend, and the frontend.

### Adding Real Satellite Data

1. Authenticate with Google Earth Engine: `earthengine authenticate`
2. Run GEE extraction scripts (see `gee/README.md`)
3. Place exported CSVs in `data/features/`
4. Retrain: `python -m ml.training.train`

## Key Design Decisions

- **XGBoost as primary model**: Best balance of accuracy and interpretability for tabular geospatial features
- **5km grid**: Matches satellite data resolution; keeps runtime bounded
- **100km max radius**: Server-side enforced to prevent abuse
- **GEE as offline engine**: No large raster downloads during user requests
- **Heuristic fallback**: Backend works even when ML service is down
- **Weather caching**: Nearby cells (within 0.1°) share weather data; 10-min TTL
- **FIRMS as overlay**: Clearly separated from predicted risk to avoid conflation

## License

MIT
