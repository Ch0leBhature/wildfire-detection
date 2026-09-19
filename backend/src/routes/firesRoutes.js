import express from 'express';
import { getRecentFires } from '../controllers/firesController.js';
import { validateCoordinates } from '../middleware/validateRequest.js';

const router = express.Router();

// Middleware handles either bbox directly or lat/lng/radius calculation
router.get('/', (req, res, next) => {
  if (req.query.bbox) return next();
  return validateCoordinates(req, res, next);
}, getRecentFires);

export default router;
