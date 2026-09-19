import axios from 'axios';
import { config } from '../config/index.js';

export const fetchRecentFires = async (bbox, days = 7) => {
  if (!config.firmsApiKey || config.firmsApiKey === 'your_firms_map_key_here') {
    console.warn('NASA FIRMS API Key not configured. Returning empty fires array.');
    return [];
  }

  const [west, south, east, north] = bbox;
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${config.firmsApiKey}/VIIRS_SNPP_NRT/${west},${south},${east},${north}/${days}`;

  try {
    const response = await axios.get(url);
    if (!response.data || typeof response.data !== 'string') return [];
    
    const lines = response.data.trim().split('\n');
    if (lines.length <= 1) return []; // Only header
    
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i]; });
      
      return {
        lat: parseFloat(obj.latitude),
        lng: parseFloat(obj.longitude),
        brightness: parseFloat(obj.bright_ti4),
        confidence: obj.confidence,
        acq_date: obj.acq_date,
        acq_time: obj.acq_time,
        frp: parseFloat(obj.frp),
        satellite: obj.satellite
      };
    }).filter(f => !isNaN(f.lat) && !isNaN(f.lng));

  } catch (error) {
    console.error('Error fetching FIRMS data:', error.message);
    return [];
  }
};

export const firesToGeoJSON = (fires) => {
  const features = fires.map(fire => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [fire.lng, fire.lat]
    },
    properties: { ...fire }
  }));

  return {
    type: 'FeatureCollection',
    features
  };
};
