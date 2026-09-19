import express from 'express';
import { postAOI } from '../controllers/aoiController.js';
import { validateCoordinates } from '../middleware/validateRequest.js';

const router = express.Router();

router.post('/', validateCoordinates, postAOI);

export default router;
