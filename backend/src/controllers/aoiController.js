import { validateAndCreateAOI } from '../services/aoiService.js';
import { generateGrid } from '../services/gridService.js';

export const postAOI = async (req, res, next) => {
  try {
    const { lat, lng, radius } = req.validCoords;
    const aoi = validateAndCreateAOI(lat, lng, radius);
    const grid = generateGrid(aoi.aoiPolygon, aoi.bbox, lat);
    
    res.json({
      aoi: {
        center: aoi.center,
        radiusKm: aoi.radiusKm,
        bbox: aoi.bbox,
        polygon: aoi.aoiPolygon
      },
      grid
    });
  } catch (error) {
    next(error);
  }
};
