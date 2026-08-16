import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// GET: Current User Profile
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.id },
      select: { id: true, email: true, role: true, permissions: true, two_factor_enabled: true, two_factor_email: true }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT: Update 2FA Backup Email
router.put('/2fa-email', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { two_factor_email } = req.body;
    const cleanEmail = two_factor_email ? String(two_factor_email).trim() : null;

    const updated = await prisma.user.update({
      where: { id: authReq.user.id },
      data: { two_factor_email: cleanEmail },
      select: { id: true, email: true, two_factor_email: true }
    });

    res.json({ success: true, two_factor_email: updated.two_factor_email, message: "2FA backup email updated successfully" });
  } catch (error: any) {
    console.error("2FA Email Update Error:", error);
    res.status(500).json({ error: "Failed to update 2FA backup email" });
  }
});

// PUT: Update Profile (Email & Password)
router.put('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { email, currentPassword, newPassword } = req.body;
    const userId = authReq.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Verify Current Password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) return res.status(403).json({ error: "Incorrect current password" });

    // Prepare Update Data
    const updateData: any = { email };
    
    if (newPassword) {
       const salt = await bcrypt.genSalt(10);
       updateData.password_hash = await bcrypt.hash(newPassword, salt);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({ success: true, message: "Profile updated successfully" });

  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;