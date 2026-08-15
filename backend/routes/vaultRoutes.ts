import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { VaultService } from '../services/VaultService';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, checkPermission } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// GET: List all credentials (Masked Passwords)
router.get('/', checkPermission('vault', 'view'), async (req: Request, res: Response) => {
  try {
    const { client_id, category, search } = req.query;
    const authReq = req as AuthRequest;

    // Determine if the requesting user can see confidential credentials
    const isSudoAdmin = authReq.user?.role === 'SUDO_ADMIN';
    let canViewConfidential = isSudoAdmin;

    if (!isSudoAdmin && authReq.user?.id) {
      const userRecord = await prisma.user.findUnique({
        where: { id: authReq.user.id },
        select: { permissions: true }
      });
      const perms = (userRecord?.permissions as any) || {};
      const vaultPerms: string[] = Array.isArray(perms?.vault) ? perms.vault : [];
      canViewConfidential = vaultPerms.includes('view_confidential');
    }
    
    let where: any = {};

    // Hide confidential credentials from unauthorized users
    if (!canViewConfidential) {
      where.is_confidential = false;
    }
    
    if (client_id && client_id !== 'ALL') {
      where.client_id = Number(client_id);
    }
    
    if (category && category !== 'ALL') {
      where.category = String(category);
    }

    if (search) {
      const q = String(search).toLowerCase();
      where.OR = [
        { title: { contains: q } },
        { username: { contains: q } },
        { url: { contains: q } },
        { client: { company_name: { contains: q } } }
      ];
    }

    const credentials = await prisma.clientCredential.findMany({
      where,
      include: {
        client: {
          select: { id: true, company_name: true, contact_person: true, email: true }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Return masked passwords by default
    const masked = credentials.map(c => ({
      ...c,
      password: '••••••••',
      is_encrypted: true
    }));

    res.json(masked);
  } catch (error: any) {
    console.error("Fetch Vault Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch credentials" });
  }
});

// POST: Reveal Decrypted Password (Logged in Activity Log)
router.post('/:id/reveal', checkPermission('vault', 'view'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const credential = await prisma.clientCredential.findUnique({
      where: { id },
      include: { client: { select: { company_name: true } } }
    });

    if (!credential) {
      return res.status(404).json({ error: "Credential record not found" });
    }

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

    // Log security audit for password reveal
    await ActivityService.log(
      authReq.user.id,
      "REVEAL_CREDENTIAL",
      `Revealed password for "${credential.title}" (${credential.client.company_name})`,
      "CREDENTIAL_VAULT",
      credential.id.toString(),
      ip
    );

    const decryptedPassword = VaultService.decrypt(credential.password);

    res.json({
      id: credential.id,
      password: decryptedPassword
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to decrypt password" });
  }
});

// POST: Create New Credential
router.post('/', checkPermission('vault', 'create'), async (req: Request, res: Response) => {
  try {
    const { client_id, title, category, url, username, password, port, notes, is_confidential } = req.body;

    if (!client_id || !title || !username || !password) {
      return res.status(400).json({ error: "Client, Title, Username, and Password are required." });
    }

    const encryptedPassword = VaultService.encrypt(password);

    const credential = await prisma.clientCredential.create({
      data: {
        client_id: Number(client_id),
        title,
        category: category || "Custom",
        url: url || null,
        username,
        password: encryptedPassword,
        port: port || null,
        notes: notes || null,
        is_confidential: Boolean(is_confidential) || false
      },
      include: {
        client: { select: { company_name: true } }
      }
    });

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    await ActivityService.log(
      authReq.user.id,
      "CREATE_CREDENTIAL",
      `Added vault credential "${title}" for ${credential.client.company_name}`,
      "CREDENTIAL_VAULT",
      credential.id.toString(),
      ip
    );

    res.status(201).json({
      ...credential,
      password: '••••••••'
    });

  } catch (error: any) {
    console.error("Create Vault Credential Error:", error);
    res.status(500).json({ error: error.message || "Failed to create credential" });
  }
});

// PUT: Update Credential
router.put('/:id', checkPermission('vault', 'edit'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { client_id, title, category, url, username, password, port, notes, is_confidential } = req.body;

    const existing = await prisma.clientCredential.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Credential record not found" });
    }

    let updatedPassword = existing.password;
    // Only re-encrypt if password was modified (and isn't the masked string)
    if (password && password !== '••••••••') {
      updatedPassword = VaultService.encrypt(password);
    }

    const updated = await prisma.clientCredential.update({
      where: { id },
      data: {
        client_id: client_id ? Number(client_id) : existing.client_id,
        title: title || existing.title,
        category: category || existing.category,
        url: url !== undefined ? url : existing.url,
        username: username || existing.username,
        password: updatedPassword,
        port: port !== undefined ? port : existing.port,
        notes: notes !== undefined ? notes : existing.notes,
        is_confidential: is_confidential !== undefined ? Boolean(is_confidential) : existing.is_confidential
      },
      include: {
        client: { select: { company_name: true } }
      }
    });

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    await ActivityService.log(
      authReq.user.id,
      "UPDATE_CREDENTIAL",
      `Updated vault credential "${updated.title}" for ${updated.client.company_name}`,
      "CREDENTIAL_VAULT",
      updated.id.toString(),
      ip
    );

    res.json({
      ...updated,
      password: '••••••••'
    });

  } catch (error: any) {
    console.error("Update Vault Credential Error:", error);
    res.status(500).json({ error: error.message || "Failed to update credential" });
  }
});

// DELETE: Delete Credential
router.delete('/:id', checkPermission('vault', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const credential = await prisma.clientCredential.findUnique({
      where: { id },
      include: { client: { select: { company_name: true } } }
    });

    if (!credential) {
      return res.status(404).json({ error: "Credential record not found" });
    }

    await prisma.clientCredential.delete({ where: { id } });

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    await ActivityService.log(
      authReq.user.id,
      "DELETE_CREDENTIAL",
      `Deleted vault credential "${credential.title}" for ${credential.client.company_name}`,
      "CREDENTIAL_VAULT",
      credential.id.toString(),
      ip
    );

    res.json({ success: true, message: "Credential deleted successfully" });

  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete credential" });
  }
});

export default router;
