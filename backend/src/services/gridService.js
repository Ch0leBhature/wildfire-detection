import * as turf from '@turf/turf';

export const generateGrid = (aoiPolygon, bbox, centerLat) => {
  const cellSide = 5; // km
  const grid = turf.squareGrid(bbox, cellSide, { units: 'kilometers' });
  
  const filteredCells = grid.features.filter(cell => turf.booleanIntersects(cell, aoiPolygon));
  
  filteredCells.forEach((cell, index) => {
    const centroid = turf.centroid(cell);
    cell.properties = {
      ...cell.properties,
      grid_id: `grid_${index}`,
      centroid: {
        lng: centroid.geometry.coordinates[0],
        lat: centroid.geometry.coordinates[1]
      }
    };
  });

  return turf.featureCollection(filteredCells);
};
