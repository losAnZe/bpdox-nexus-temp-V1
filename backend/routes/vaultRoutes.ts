import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { VaultService } from '../services/VaultService';
import { ActivityService } from '../services/ActivityService';
import { AuthRequest, checkPermission } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// Multer storage for encrypted file uploads
const rootPath = process.cwd().endsWith('backend') ? '..' : '.';
const vaultFilesDir = path.join(process.cwd(), rootPath, 'vault-files');
if (!fs.existsSync(vaultFilesDir)) {
  fs.mkdirSync(vaultFilesDir, { recursive: true });
}

const memoryStorage = multer.memoryStorage();
const uploadVaultFile = multer({
  storage: memoryStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit for certificates/vault files
});

// GET: List all credentials (Masked Passwords & SSH Keys)
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

    // Return masked passwords & SSH keys by default
    const masked = credentials.map(c => ({
      ...c,
      password: '••••••••',
      ssh_key: c.ssh_key ? '••••••••' : null,
      has_ssh_key: Boolean(c.ssh_key),
      is_encrypted: true
    }));

    res.json(masked);
  } catch (error: any) {
    console.error("Fetch Vault Error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch credentials" });
  }
});

// POST: Reveal Decrypted Password
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

// POST: Reveal Decrypted SSH Key
router.post('/:id/reveal-ssh', checkPermission('vault', 'view'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const credential = await prisma.clientCredential.findUnique({
      where: { id },
      include: { client: { select: { company_name: true } } }
    });

    if (!credential) {
      return res.status(404).json({ error: "Credential record not found" });
    }

    if (!credential.ssh_key) {
      return res.status(404).json({ error: "No SSH key stored for this record" });
    }

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

    await ActivityService.log(
      authReq.user.id,
      "REVEAL_SSH_KEY",
      `Revealed SSH key for "${credential.title}" (${credential.client.company_name})`,
      "CREDENTIAL_VAULT",
      credential.id.toString(),
      ip
    );

    const decryptedSshKey = VaultService.decrypt(credential.ssh_key);

    res.json({
      id: credential.id,
      ssh_key: decryptedSshKey
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to decrypt SSH key" });
  }
});

// POST: Create New Credential
router.post('/', checkPermission('vault', 'create'), async (req: Request, res: Response) => {
  try {
    const { client_id, title, category, url, username, password, port, notes, ssh_key, is_confidential } = req.body;

    if (!client_id || !title || !username || !password) {
      return res.status(400).json({ error: "Client, Title, Username, and Password are required." });
    }

    const encryptedPassword = VaultService.encrypt(password);
    const encryptedSshKey = ssh_key ? VaultService.encrypt(ssh_key) : null;

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
        ssh_key: encryptedSshKey,
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
      password: '••••••••',
      ssh_key: credential.ssh_key ? '••••••••' : null,
      has_ssh_key: Boolean(credential.ssh_key)
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
    const { client_id, title, category, url, username, password, port, notes, ssh_key, is_confidential } = req.body;

    const existing = await prisma.clientCredential.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Credential record not found" });
    }

    let updatedPassword = existing.password;
    if (password && password !== '••••••••') {
      updatedPassword = VaultService.encrypt(password);
    }

    let updatedSshKey = existing.ssh_key;
    if (ssh_key !== undefined) {
      if (ssh_key === '' || ssh_key === null) {
        updatedSshKey = null;
      } else if (ssh_key !== '••••••••') {
        updatedSshKey = VaultService.encrypt(ssh_key);
      }
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
        ssh_key: updatedSshKey,
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
      password: '••••••••',
      ssh_key: updated.ssh_key ? '••••••••' : null,
      has_ssh_key: Boolean(updated.ssh_key)
    });

  } catch (error: any) {
    console.error("Update Vault Credential Error:", error);
    res.status(500).json({ error: error.message || "Failed to update credential" });
  }
});

// POST: Upload Encrypted File to Vault Record
router.post('/:id/upload-file', checkPermission('vault', 'edit'), uploadVaultFile.single('file'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const credential = await prisma.clientCredential.findUnique({ where: { id } });
    if (!credential) {
      return res.status(404).json({ error: "Credential record not found" });
    }

    // Encrypt file buffer
    const encryptedBuffer = VaultService.encryptBuffer(req.file.buffer);
    
    // Save to disk
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const diskFileName = `${id}-${Date.now()}-${safeName}.enc`;
    const diskPath = path.join(vaultFilesDir, diskFileName);

    fs.writeFileSync(diskPath, encryptedBuffer);

    const fileMeta = {
      id: Date.now().toString(),
      originalName: req.file.originalname,
      diskFileName,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    const existingFiles = (credential.attached_files as any[]) || [];
    const updatedFiles = [...existingFiles, fileMeta];

    const updated = await prisma.clientCredential.update({
      where: { id },
      data: { attached_files: updatedFiles }
    });

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    await ActivityService.log(
      authReq.user.id,
      "UPLOAD_VAULT_FILE",
      `Uploaded encrypted file "${req.file.originalname}" to "${credential.title}"`,
      "CREDENTIAL_VAULT",
      credential.id.toString(),
      ip
    );

    res.json({
      attached_files: updated.attached_files
    });

  } catch (error: any) {
    console.error("Vault Upload Error:", error);
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

// GET: Download & Decrypt Vault File
router.get('/:id/download-file/:fileId', checkPermission('vault', 'view'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { fileId } = req.params;

    const credential = await prisma.clientCredential.findUnique({ where: { id } });
    if (!credential) {
      return res.status(404).json({ error: "Credential record not found" });
    }

    const files = (credential.attached_files as any[]) || [];
    const fileMeta = files.find(f => f.id === fileId || f.diskFileName === fileId);

    if (!fileMeta) {
      return res.status(404).json({ error: "File not found" });
    }

    const diskPath = path.join(vaultFilesDir, fileMeta.diskFileName);
    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    const encryptedData = fs.readFileSync(diskPath);
    const decryptedBuffer = VaultService.decryptBuffer(encryptedData);

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    await ActivityService.log(
      authReq.user.id,
      "DOWNLOAD_VAULT_FILE",
      `Downloaded decrypted file "${fileMeta.originalName}" from "${credential.title}"`,
      "CREDENTIAL_VAULT",
      credential.id.toString(),
      ip
    );

    res.setHeader('Content-Type', fileMeta.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName)}"`);
    res.send(decryptedBuffer);

  } catch (error: any) {
    console.error("Vault Download Error:", error);
    res.status(500).json({ error: error.message || "Failed to download file" });
  }
});

// DELETE: Remove Vault File
router.delete('/:id/delete-file/:fileId', checkPermission('vault', 'edit'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { fileId } = req.params;

    const credential = await prisma.clientCredential.findUnique({ where: { id } });
    if (!credential) {
      return res.status(404).json({ error: "Credential record not found" });
    }

    const files = (credential.attached_files as any[]) || [];
    const fileMeta = files.find(f => f.id === fileId || f.diskFileName === fileId);

    if (!fileMeta) {
      return res.status(404).json({ error: "File not found" });
    }

    const diskPath = path.join(vaultFilesDir, fileMeta.diskFileName);
    if (fs.existsSync(diskPath)) {
      try { fs.unlinkSync(diskPath); } catch (e) {}
    }

    const updatedFiles = files.filter(f => f.id !== fileId && f.diskFileName !== fileId);

    const updated = await prisma.clientCredential.update({
      where: { id },
      data: { attached_files: updatedFiles }
    });

    const authReq = req as AuthRequest;
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
    await ActivityService.log(
      authReq.user.id,
      "DELETE_VAULT_FILE",
      `Deleted file "${fileMeta.originalName}" from "${credential.title}"`,
      "CREDENTIAL_VAULT",
      credential.id.toString(),
      ip
    );

    res.json({ success: true, attached_files: updated.attached_files });

  } catch (error: any) {
    console.error("Vault File Delete Error:", error);
    res.status(500).json({ error: error.message || "Failed to delete file" });
  }
});

// DELETE: Delete Credential Record
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

    // Clean up associated files from disk
    const files = (credential.attached_files as any[]) || [];
    files.forEach(f => {
      if (f.diskFileName) {
        const diskPath = path.join(vaultFilesDir, f.diskFileName);
        if (fs.existsSync(diskPath)) {
          try { fs.unlinkSync(diskPath); } catch (e) {}
        }
      }
    });

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
