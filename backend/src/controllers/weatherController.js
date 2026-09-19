import { fetchCurrentWeather } from '../services/weatherService.js';

export const getCurrentWeather = async (req, res, next) => {
  try {
    const { lat, lng } = req.validCoords;
    const weather = await fetchCurrentWeather(lat, lng);
    res.json(weather);
  } catch (error) {
    next(error);
  }
};
