import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, authorize } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// GET: List Users (Admins can view)
router.get('/', authorize(['SUDO_ADMIN', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, permissions: true, two_factor_enabled: true, created_at: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST: Create User (SUDO ONLY)
router.post('/', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { email, password, role, permissions } = req.body;
    
    if (role === 'SUDO_ADMIN') {
        return res.status(403).json({ error: "Cannot assign Sudo Admin role directly." });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const newUser = await prisma.user.create({
      data: {
        email,
        password_hash: hash,
        role: role || 'USER',
        permissions: permissions || null
      }
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await ActivityService.log(authReq.user.id, "CREATE_USER", `Created user: ${email} as ${role}`, "USER", newUser.id.toString(), ip as string);

    res.status(201).json({ id: newUser.id, email: newUser.email, permissions: newUser.permissions });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PUT: Update User Role (SUDO ONLY)
router.put('/:id/role', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;
    const authReq = req as AuthRequest;
    
    // Safety check: Cannot assign Sudo Admin role unless you are Sudo Admin
    if (role === 'SUDO_ADMIN' && authReq.user.role !== 'SUDO_ADMIN') {
        return res.status(403).json({ error: "Insufficient permissions to assign SUDO role." });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true, permissions: true }
    });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(
        authReq.user.id, 
        "UPDATE_ROLE", 
        `Updated user ${updatedUser.email} role to ${role}`, 
        "USER", 
        userId.toString(), 
        ip as string
    );

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to update role" });
  }
});

// PUT: Update User Permissions Matrix (SUDO ONLY)
router.put('/:id/permissions', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { permissions } = req.body;
    
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: "User not found" });
    }

    if (target.role === 'SUDO_ADMIN') {
      return res.status(403).json({ error: "Cannot restrict Sudo Admin permissions." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { permissions },
      select: { id: true, email: true, role: true, permissions: true }
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(
      authReq.user.id,
      "UPDATE_PERMISSIONS",
      `Updated IAM permissions for user ${updatedUser.email}`,
      "USER",
      userId.toString(),
      ip as string
    );

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update permissions" });
  }
});

// PUT: Reset User Password (SUDO ONLY)
router.put('/:id/password', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { password, email } = req.body;

    if (!password || String(password).trim().length < 4) {
      return res.status(400).json({ error: "New password must be at least 4 characters long." });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return res.status(404).json({ error: "User not found." });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const updateData: any = { password_hash: hash };
    if (email && String(email).trim() !== '' && email !== target.email) {
      updateData.email = String(email).trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, role: true }
    });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(
      authReq.user.id,
      "RESET_PASSWORD",
      `Reset password for user: ${updatedUser.email}`,
      "USER",
      userId.toString(),
      ip as string
    );

    res.json({ success: true, message: `Password updated for ${updatedUser.email}` });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: error.message || "Failed to reset password" });
  }
});


// DELETE: Remove User (SUDO ONLY)
router.delete('/:id', authorize(['SUDO_ADMIN']), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });

    if (target?.role === 'SUDO_ADMIN') {
        return res.status(403).json({ error: "Cannot delete the Owner" });
    }
    
    await prisma.user.delete({ where: { id } });

    const authReq = req as AuthRequest;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await ActivityService.log(authReq.user.id, "DELETE_USER", `Deleted user: ${target?.email}`, "USER", id.toString(), ip as string);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;