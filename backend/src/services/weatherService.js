import axios from 'axios';
import { config } from '../config/index.js';

const weatherCache = new Map();

const getCacheKey = (lat, lng) => `${lat.toFixed(1)},${lng.toFixed(1)}`;

/**
 * Fetch current weather and recent rainfall for a single location.
 * Results are cached by rounded coordinates for config.weatherCacheTTL seconds.
 */
export const fetchCurrentWeather = async (lat, lng) => {
  const cacheKey = getCacheKey(lat, lng);
  const cached = weatherCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < config.weatherCacheTTL * 1000)) {
    return cached.data;
  }

  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lng,
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation',
        daily: 'precipitation_sum',
        past_days: 30,
        forecast_days: 1,
        timezone: 'auto'
      },
      timeout: 10000
    });

    const data = response.data;
    const current = data.current || {};
    const daily = data.daily || {};
    const precipArr = daily.precipitation_sum || [];

    // Daily array runs from oldest to newest; reverse so index 0 = most recent
    const recentPrecip = [...precipArr].reverse();
    const sumPrecip = (days) => recentPrecip.slice(0, days).reduce((a, b) => a + (b || 0), 0);

    const weatherData = {
      temperature_current: current.temperature_2m ?? 25,
      humidity_current: current.relative_humidity_2m ?? 50,
      wind_speed_current: current.wind_speed_10m ?? 10,
      rainfall_1d: sumPrecip(1),
      rainfall_3d: sumPrecip(3),
      rainfall_7d: sumPrecip(7),
      rainfall_30d: sumPrecip(30)
    };

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: weatherData });
    return weatherData;
  } catch (error) {
    console.error('Error fetching weather:', error.message);
    throw new Error('Failed to fetch weather data');
  }
};

/**
 * Fetch weather for a batch of grid cell centroids.
 *
 * Optimization: cells whose centroids round to the same 0.1° grid point
 * share a single API call (roughly 10 km resolution — fine for a 5 km grid).
 * This typically reduces hundreds of calls to just a handful.
 */
export const fetchBatchWeather = async (centroids) => {
  const resultMap = new Map();

  // Group centroids by cache key (0.1° ≈ 11 km at equator)
  const groups = new Map();
  for (const { grid_id, lat, lng } of centroids) {
    const key = getCacheKey(lat, lng);
    if (!groups.has(key)) {
      groups.set(key, { lat, lng, ids: [] });
    }
    groups.get(key).ids.push(grid_id);
  }

  // Fetch weather for each unique location
  const entries = [...groups.values()];
  const BATCH_SIZE = 5; // parallel requests at a time

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ lat, lng }) => fetchCurrentWeather(lat, lng))
    );

    for (let j = 0; j < batch.length; j++) {
      const weather = results[j].status === 'fulfilled'
        ? results[j].value
        : { temperature_current: 25, humidity_current: 50, wind_speed_current: 10,
            rainfall_1d: 0, rainfall_3d: 0, rainfall_7d: 0, rainfall_30d: 0 };

      for (const id of batch[j].ids) {
        resultMap.set(id, weather);
      }
    }
  }

  return resultMap;
};
