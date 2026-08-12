import { Router, Request, Response } from 'express';
import multer from 'multer';
import { UpdateService } from '../services/UpdateService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max update size
});

// GET: Current System & Version Info
router.get('/status', async (req: Request, res: Response) => {
  try {
    const details = await UpdateService.getSystemDetails();
    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch update status" });
  }
});

// POST: Upload & Apply System Update ZIP (SUDO_ADMIN / Owner Only)
router.post('/upload', authorize(['SUDO_ADMIN']), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No update package file (.zip) provided." });
    }

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

    const result = await UpdateService.applyUpdatePackage(
      req.file.buffer,
      authReq.user.id,
      ip
    );

    res.json(result);
  } catch (error: any) {
    console.error("Update failed:", error);
    res.status(500).json({ error: error.message || "System update failed." });
  }
});

export default router;
