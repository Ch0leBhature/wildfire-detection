import { assessRisk } from '../services/riskService.js';

export const getCurrentRisk = async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.validCoords;
    const riskAssessment = await assessRisk(lat, lng, radius);
    res.json(riskAssessment);
  } catch (error) {
    next(error);
  }
};

export const getCellDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    // In a real implementation this would fetch from a DB/cache
    // For now we just return a stub structure
    res.json({
      grid_id: id,
      message: 'Detailed cell info requires caching state or DB in full implementation.',
      features: {}
    });
  } catch (error) {
    next(error);
  }
};
