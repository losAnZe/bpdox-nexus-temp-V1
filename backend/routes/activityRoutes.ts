import { Router, Request, Response } from 'express';
import { ActivityService } from '../services/ActivityService';
import { checkPermission } from '../middleware/authMiddleware';

const router = Router();

// GET: Recent Activity Logs (Requires activity: view permission)
router.get('/', checkPermission('activity', 'view'), async (req: Request, res: Response) => {
  try {
    const logs = await ActivityService.getLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

export default router;