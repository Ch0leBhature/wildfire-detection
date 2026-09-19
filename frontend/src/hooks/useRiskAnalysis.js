import { useState, useCallback } from 'react';
import { analyzeRisk, getRecentFires, getCurrentWeather } from '../services/api';

export const useRiskAnalysis = () => {
  const [riskData, setRiskData] = useState(null);       // GeoJSON FeatureCollection
  const [firesData, setFiresData] = useState(null);      // GeoJSON FeatureCollection
  const [weatherData, setWeatherData] = useState(null);  // weather object
  const [summary, setSummary] = useState(null);           // risk summary stats
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const analyze = useCallback(async (lat, lng, radius) => {
    setLoading(true);
    setError(null);
    setSelectedCell(null);
    setAnalysisComplete(false);

    try {
      // Run risk analysis and fire detection in parallel
      const [riskRes, firesRes, weatherRes] = await Promise.allSettled([
        analyzeRisk(lat, lng, radius),
        getRecentFires(lat, lng, radius),
        getCurrentWeather(lat, lng)
      ]);

      // Risk analysis is required
      if (riskRes.status === 'rejected') {
        throw new Error(riskRes.reason?.message || 'Failed to analyze risk');
      }

      const riskResult = riskRes.value;

      // The API returns { aoi, grid: FeatureCollection, summary }
      setRiskData(riskResult.grid || riskResult);
      setSummary(riskResult.summary || null);

      // Fires are optional
      if (firesRes.status === 'fulfilled' && firesRes.value) {
        setFiresData(firesRes.value);
      } else {
        setFiresData(null);
        console.warn('FIRMS data unavailable:', firesRes.reason?.message);
      }

      // Weather is optional
      if (weatherRes.status === 'fulfilled' && weatherRes.value) {
        setWeatherData(weatherRes.value);
      } else {
        // Extract weather from first grid cell as fallback
        const firstCell = riskResult.grid?.features?.[0]?.properties;
        if (firstCell) {
          setWeatherData({
            temperature_current: firstCell.temperature_current,
            humidity_current: firstCell.humidity_current,
            wind_speed_current: firstCell.wind_speed_current,
            rainfall_1d: firstCell.rainfall_1d,
            rainfall_3d: firstCell.rainfall_3d,
            rainfall_7d: firstCell.rainfall_7d,
            rainfall_30d: firstCell.rainfall_30d
          });
        }
      }

      setAnalysisComplete(true);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to analyze risk. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectCell = useCallback((cell) => {
    setSelectedCell(cell);
  }, []);

  const clear = useCallback(() => {
    setRiskData(null);
    setFiresData(null);
    setWeatherData(null);
    setSummary(null);
    setError(null);
    setSelectedCell(null);
    setAnalysisComplete(false);
  }, []);

  return {
    riskData,
    firesData,
    weatherData,
    summary,
    loading,
    error,
    selectedCell,
    analysisComplete,
    analyze,
    selectCell,
    clear
  };
};
