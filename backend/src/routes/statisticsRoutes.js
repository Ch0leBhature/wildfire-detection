import express from 'express';
import { getStatistics } from '../controllers/statisticsController.js';
import { validateCoordinates } from '../middleware/validateRequest.js';

const router = express.Router();

router.get('/', validateCoordinates, getStatistics);

export default router;
