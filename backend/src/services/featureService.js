export const getStaticFeatures = (gridCells) => {
  const featuresMap = new Map();
  
  // DEVELOPMENT FALLBACK: generate realistic synthetic features based on cell centroid
  gridCells.features.forEach(cell => {
    const { grid_id, centroid } = cell.properties;
    const lat = centroid.lat;
    
    // Higher NDVI near equator and temperate, lower in extremes
    const latAbs = Math.abs(lat);
    let baseNdvi = 0.5;
    if (latAbs < 20) baseNdvi = 0.7 + Math.random() * 0.2; // Tropical
    else if (latAbs < 45) baseNdvi = 0.4 + Math.random() * 0.4; // Temperate
    else baseNdvi = 0.1 + Math.random() * 0.3; // Polar/Desert approx
    
    const ndvi = Math.min(0.9, Math.max(0.1, baseNdvi));
    const ndmi = Math.max(0.05, ndvi - (0.1 + Math.random() * 0.2));
    const elevation = 100 + Math.random() * 1900;
    const slope = Math.random() * 45;
    
    // Random weighted land cover
    const lcR = Math.random();
    let land_cover = 1; // forest
    if (lcR > 0.3) land_cover = 2; // shrubland
    if (lcR > 0.5) land_cover = 3; // grassland
    if (lcR > 0.75) land_cover = 4; // cropland
    if (lcR > 0.90) land_cover = 5; // urban
    if (lcR > 0.95) land_cover = 6; // barren
    
    featuresMap.set(grid_id, {
      ndvi,
      ndmi,
      elevation,
      slope,
      land_cover
    });
  });
  
  return featuresMap;
};
