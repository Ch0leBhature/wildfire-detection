import { assessRisk } from '../services/riskService.js';

export const getStatistics = async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.validCoords;
    const result = await assessRisk(lat, lng, radius);
    res.json(result.summary);
  } catch (error) {
    next(error);
  }
};
