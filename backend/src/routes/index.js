import express from 'express';
import aoiRoutes from './aoiRoutes.js';
import riskRoutes from './riskRoutes.js';
import firesRoutes from './firesRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import statisticsRoutes from './statisticsRoutes.js';

const router = express.Router();

router.use('/aoi', aoiRoutes);
router.use('/risk', riskRoutes);
router.use('/fires', firesRoutes);
router.use('/weather', weatherRoutes);
router.use('/statistics', statisticsRoutes);

export default router;
