export const validateCoordinates = (req, res, next) => {
  const lat = parseFloat(req.query.lat || req.body.lat);
  const lng = parseFloat(req.query.lng || req.body.lng);
  const radius = parseFloat(req.query.radius || req.body.radius);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Invalid latitude. Must be between -90 and 90.' });
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Invalid longitude. Must be between -180 and 180.' });
  }

  if (radius && ![25, 50, 75, 100].includes(radius)) {
    return res.status(400).json({ error: 'Invalid radius. Must be 25, 50, 75, or 100 km.' });
  }

  req.validCoords = { lat, lng, radius: radius || 25 };
  next();
};
