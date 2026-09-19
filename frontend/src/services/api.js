import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const analyzeRisk = async (lat, lng, radius) => {
  const response = await api.get(`/risk/current`, {
    params: { lat, lng, radius }
  });
  return response.data;
};

export const getRecentFires = async (lat, lng, radius) => {
  const response = await api.get(`/fires`, {
    params: { lat, lng, radius }
  });
  return response.data;
};

export const getCurrentWeather = async (lat, lng) => {
  const response = await api.get(`/weather/current`, {
    params: { lat, lng }
  });
  return response.data;
};

export const geocodeLocation = async (query) => {
  const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
    params: {
      format: 'json',
      q: query
    },
    headers: {
      'User-Agent': 'WildfireRiskDetection/1.0'
    }
  });
  return response.data;
};
