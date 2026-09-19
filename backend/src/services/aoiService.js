import * as turf from '@turf/turf';
import { config } from '../config/index.js';

export const validateAndCreateAOI = (lat, lng, radiusKm) => {
  if (lat < -90 || lat > 90) throw new Error('Invalid latitude');
  if (lng < -180 || lng > 180) throw new Error('Invalid longitude');
  
  const validRadii = [25, 50, 75, 100];
  if (!validRadii.includes(radiusKm)) throw new Error('Invalid radius');

  const center = turf.point([lng, lat]);
  const aoiPolygon = turf.circle(center, radiusKm, { units: 'kilometers' });
  const bbox = turf.bbox(aoiPolygon);

  return {
    center: { lat, lng },
    radiusKm,
    bbox,
    aoiPolygon
  };
};
