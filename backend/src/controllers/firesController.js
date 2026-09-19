import { fetchRecentFires, firesToGeoJSON } from '../services/firmsService.js';
import { validateAndCreateAOI } from '../services/aoiService.js';

export const getRecentFires = async (req, res, next) => {
  try {
    let bbox;
    if (req.query.bbox) {
      bbox = req.query.bbox.split(',').map(Number);
    } else {
      const { lat, lng, radius } = req.validCoords;
      const aoi = validateAndCreateAOI(lat, lng, radius);
      bbox = aoi.bbox;
    }
    
    const fires = await fetchRecentFires(bbox);
    res.json(firesToGeoJSON(fires));
  } catch (error) {
    next(error);
  }
};
