import { Router, Request, Response } from 'express';
import { getFirestoreDb } from '../services/firestore';
import { asyncHandler } from '../middleware/errorHandler';
import { DimensionsRegistry } from '../types';

const router = Router();

// GET /api/dimensions - Get dimensions registry
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const db = getFirestoreDb();
  const dimensionsDoc = await db.collection('config').doc('dimensions').get();
  
  if (!dimensionsDoc.exists) {
    // Return default dimensions if not found
    const defaultDimensions: DimensionsRegistry = {
      dimensions_registry: {
        core_dimensions: {
          max_dimensions: 4,
          fields: ["technology", "business", "research", "personal"]
        },
        readiness_scale: {
          levels: 5,
          labels: ["idea", "concept", "prototype", "beta", "production"]
        },
        complexity_scale: {
          levels: 5,
          labels: ["trivial", "easy", "medium", "hard", "expert"]
        }
      }
    };
    res.json(defaultDimensions);
  } else {
    res.json(dimensionsDoc.data() as DimensionsRegistry);
  }
}));

export { router as dimensionsRouter }; 