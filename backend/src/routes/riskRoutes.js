import express from 'express';
import { getCurrentRisk, getCellDetails } from '../controllers/riskController.js';
import { validateCoordinates } from '../middleware/validateRequest.js';

const router = express.Router();

router.get('/current', validateCoordinates, getCurrentRisk);
router.get('/history', (req, res) => res.json({ message: 'Historical risk - coming soon' }));
router.get('/grid/:id', getCellDetails);

export default router;
