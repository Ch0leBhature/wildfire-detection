import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  firmsApiKey: process.env.NASA_FIRMS_API_KEY || '',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8001',
  nodeEnv: process.env.NODE_ENV || 'development',
  maxRadius: 100,
  gridSize: 5000,
  riskThresholds: {
    low: 0.3,
    moderate: 0.6,
    high: 0.8
  },
  weatherCacheTTL: 600
};
