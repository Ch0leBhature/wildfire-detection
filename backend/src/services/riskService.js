import { validateAndCreateAOI } from './aoiService.js';
import { generateGrid } from './gridService.js';
import { getStaticFeatures } from './featureService.js';
import { fetchBatchWeather } from './weatherService.js';
import { config } from '../config/index.js';
import axios from 'axios';

const FEATURE_NAMES = [
  'temperature_current', 'humidity_current', 'wind_speed_current',
  'rainfall_1d', 'rainfall_3d', 'rainfall_7d', 'rainfall_30d',
  'ndvi', 'ndmi', 'elevation', 'slope', 'land_cover'
];

export const getRiskCategory = (probability, thresholds) => {
  if (probability >= thresholds.high) return 'Very High';
  if (probability >= thresholds.moderate) return 'High';
  if (probability >= thresholds.low) return 'Moderate';
  return 'Low';
};

/**
 * Heuristic fallback when the Python ML service is unavailable.
 * Produces a rough 0-1 risk score from raw feature values.
 */
const heuristicRisk = (wf, sf) => {
  let risk = 0.3
    + (wf.temperature_current - 25) * 0.015
    - wf.humidity_current * 0.005
    + wf.wind_speed_current * 0.01
    - wf.rainfall_7d * 0.05
    - (sf.ndvi - 0.5) * 0.3;

  // Land cover adjustment
  if (sf.land_cover === 2 || sf.land_cover === 1) risk += 0.05; // shrub/forest
  if (sf.land_cover === 5) risk -= 0.1; // urban
  if (sf.land_cover === 0) risk -= 0.2; // water

  return Math.min(1, Math.max(0, risk));
};

export const assessRisk = async (lat, lng, radiusKm) => {
  // 1. Validate AOI and generate grid
  const aoi = validateAndCreateAOI(lat, lng, radiusKm);
  const gridCells = generateGrid(aoi.aoiPolygon, aoi.bbox, lat);

  if (gridCells.features.length === 0) {
    return {
      aoi: { center: aoi.center, radiusKm: aoi.radiusKm, bbox: aoi.bbox },
      grid: gridCells,
      summary: { totalCells: 0, avgRisk: 0, cellsByCategory: { Low: 0, Moderate: 0, High: 0, 'Very High': 0 } }
    };
  }

  // 2. Get static features (satellite/terrain)
  const staticFeatures = getStaticFeatures(gridCells);

  // 3. Get current weather for grid centroids
  const centroids = gridCells.features.map(f => ({
    grid_id: f.properties.grid_id,
    lat: f.properties.centroid.lat,
    lng: f.properties.centroid.lng
  }));
  const weatherFeaturesMap = await fetchBatchWeather(centroids);

  // 4. Assemble feature vectors in exact order
  const featuresList = [];
  const cellReferences = [];

  gridCells.features.forEach(cell => {
    const gridId = cell.properties.grid_id;
    const sf = staticFeatures.get(gridId);
    const wf = weatherFeaturesMap.get(gridId);

    const vector = [
      wf.temperature_current, wf.humidity_current, wf.wind_speed_current,
      wf.rainfall_1d, wf.rainfall_3d, wf.rainfall_7d, wf.rainfall_30d,
      sf.ndvi, sf.ndmi, sf.elevation, sf.slope, sf.land_cover
    ];

    featuresList.push(vector);
    cellReferences.push({ cell, sf, wf });
  });

  // 5. Call ML service or use fallback
  let probabilities = [];
  let modelVersion = 'heuristic-fallback';

  try {
    const mlResponse = await axios.post(`${config.mlServiceUrl}/predict`, {
      features: featuresList,
      feature_names: FEATURE_NAMES
    }, { timeout: 10000 });

    // ML service returns { predictions: [{probability, category}, ...], model_version }
    probabilities = mlResponse.data.predictions.map(p => p.probability);
    modelVersion = mlResponse.data.model_version || 'unknown';
  } catch (error) {
    console.warn('ML Service unavailable, using fallback heuristic:', error.message);
    probabilities = cellReferences.map(({ sf, wf }) => heuristicRisk(wf, sf));
  }

  // 6. Assign predictions to grid cells and compute summary
  let totalRisk = 0;
  const cellsByCategory = { Low: 0, Moderate: 0, High: 0, 'Very High': 0 };

  cellReferences.forEach(({ cell, sf, wf }, index) => {
    const probability = probabilities[index];
    const category = getRiskCategory(probability, config.riskThresholds);

    cell.properties = {
      ...cell.properties,
      // Weather features
      temperature_current: wf.temperature_current,
      humidity_current: wf.humidity_current,
      wind_speed_current: wf.wind_speed_current,
      rainfall_1d: wf.rainfall_1d,
      rainfall_3d: wf.rainfall_3d,
      rainfall_7d: wf.rainfall_7d,
      rainfall_30d: wf.rainfall_30d,
      // Static features
      ndvi: sf.ndvi,
      ndmi: sf.ndmi,
      elevation: sf.elevation,
      slope: sf.slope,
      land_cover: sf.land_cover,
      // Prediction
      probability,
      category,
      model_version: modelVersion
    };

    totalRisk += probability;
    cellsByCategory[category]++;
  });

  return {
    aoi: {
      center: aoi.center,
      radiusKm: aoi.radiusKm,
      bbox: aoi.bbox
    },
    grid: gridCells,
    summary: {
      totalCells: gridCells.features.length,
      avgRisk: gridCells.features.length ? +(totalRisk / gridCells.features.length).toFixed(4) : 0,
      cellsByCategory,
      modelVersion
    }
  };
};
