import express from 'express';
import { getCurrentWeather } from '../controllers/weatherController.js';
import { validateCoordinates } from '../middleware/validateRequest.js';

const router = express.Router();

router.get('/current', validateCoordinates, getCurrentWeather);

export default router;
