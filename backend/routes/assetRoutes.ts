import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest, authorize, checkPermission } from '../middleware/authMiddleware';
import { ActivityService } from '../services/ActivityService';
import { ReminderService } from '../services/ReminderService';

const router = Router();
const prisma = new PrismaClient();

// ==========================================
// 1. GET ALL ASSETS (with Search & Filters)
// ==========================================
router.get('/', checkPermission('assets', 'view'), async (req: Request, res: Response) => {
  try {
    const { client_id, asset_type, status, search } = req.query;
    const authReq = req as AuthRequest;

    // Determine if the requesting user can see confidential assets
    const isSudoAdmin = authReq.user?.role === 'SUDO_ADMIN';
    let canViewConfidential = isSudoAdmin;

    if (!isSudoAdmin && authReq.user?.id) {
      const userRecord = await prisma.user.findUnique({
        where: { id: authReq.user.id },
        select: { permissions: true }
      });
      const perms = (userRecord?.permissions as any) || {};
      const assetPerms: string[] = Array.isArray(perms?.assets) ? perms.assets : [];
      canViewConfidential = assetPerms.includes('view_confidential');
    }

    const where: Prisma.ClientAssetWhereInput = {};

    // Hide confidential assets from unauthorized users
    if (!canViewConfidential) {
      where.is_confidential = false;
    }

    if (client_id) {
      where.client_id = Number(client_id);
    }

    if (asset_type && asset_type !== 'ALL') {
      where.asset_type = asset_type as string;
    }

    if (status && status !== 'ALL') {
      where.status = status as string;
    }

    if (search) {
      const searchStr = search as string;
      where.OR = [
        { asset_name: { contains: searchStr } },
        { provider: { contains: searchStr } },
        {
          client: {
            company_name: { contains: searchStr }
          }
        }
      ];
    }

    const assets = await prisma.clientAsset.findMany({
      where,
      include: {
        client: true
      },
      orderBy: {
        expiry_date: 'asc'
      }
    });

    res.json(assets);
  } catch (error) {
    console.error("Fetch Assets Error:", error);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});

// ==========================================
// 2. GET SINGLE ASSET
// ==========================================
router.get('/:id', checkPermission('assets', 'view'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const asset = await prisma.clientAsset.findUnique({
      where: { id },
      include: {
        client: true
      }
    });

    if (!asset) return res.status(404).json({ error: "Asset not found" });

    res.json(asset);
  } catch (error) {
    console.error("Fetch Single Asset Error:", error);
    res.status(500).json({ error: "Failed to fetch asset" });
  }
});

// ==========================================
// 3. CREATE ASSET
// ==========================================
router.post('/', checkPermission('assets', 'create'), async (req: Request, res: Response) => {
  try {
    const {
      client_id,
      asset_type,
      asset_name,
      provider,
      plan,
      purchase_date,
      activation_date,
      expiry_date,
      renewal_cost,
      billing_cycle,
      status,
      alert_email,
      notes,
      attachments,
      is_confidential
    } = req.body;

    if (!client_id || !asset_type || !asset_name || !expiry_date || renewal_cost === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let finalStatus = status || "ACTIVE";
    if (finalStatus !== 'INACTIVE') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(expiry_date);
      expiry.setHours(0, 0, 0, 0);
      const diffMs = expiry.getTime() - today.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        finalStatus = 'EXPIRED';
      } else if (daysRemaining <= 30) {
        finalStatus = 'EXPIRING';
      } else {
        finalStatus = 'ACTIVE';
      }
    }

    const authReq = req as AuthRequest;
    const isSudoAdmin = authReq.user?.role === 'SUDO_ADMIN';
    let canManageConfidential = isSudoAdmin;

    if (!isSudoAdmin && authReq.user?.id) {
      const userRecord = await prisma.user.findUnique({
        where: { id: authReq.user.id },
        select: { permissions: true }
      });
      const perms = (userRecord?.permissions as any) || {};
      const assetPerms: string[] = Array.isArray(perms?.assets) ? perms.assets : [];
      canManageConfidential = assetPerms.includes('view_confidential');
    }

    const newAsset = await prisma.clientAsset.create({
      data: {
        client_id: Number(client_id),
        asset_type,
        asset_name,
        provider: provider || "",
        plan: plan || "",
        purchase_date: new Date(purchase_date),
        activation_date: new Date(activation_date),
        expiry_date: new Date(expiry_date),
        renewal_cost: new Prisma.Decimal(renewal_cost),
        billing_cycle: billing_cycle || "Yearly",
        status: finalStatus,
        alert_email: alert_email ? String(alert_email).trim() : null,
        notes: notes || "",
        attachments: attachments || [],
        reminders_sent: [],
        is_confidential: canManageConfidential ? (Boolean(is_confidential) || false) : false
      }
    });

    if (authReq.user) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await ActivityService.log(
        authReq.user.id,
        "CREATE_ASSET",
        `Created Asset "${asset_name}" (${asset_type}) for client ID ${client_id}`,
        "CLIENT_ASSET",
        newAsset.id.toString(),
        ip as string
      );
    }

    ReminderService.checkSingleAssetReminder(newAsset.id).catch(err => {
      console.error("[assetRoutes] Error in instant reminder check:", err);
    });

    res.status(201).json(newAsset);
  } catch (error) {
    console.error("Create Asset Error:", error);
    res.status(500).json({ error: "Failed to create asset" });
  }
});

// ==========================================
// 4. UPDATE ASSET
// ==========================================
router.put('/:id', checkPermission('assets', 'edit'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const {
      client_id,
      asset_type,
      asset_name,
      provider,
      plan,
      purchase_date,
      activation_date,
      expiry_date,
      renewal_cost,
      billing_cycle,
      status,
      alert_email,
      notes,
      attachments,
      is_confidential
    } = req.body;

    const existing = await prisma.clientAsset.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Asset not found" });

    let updatedReminders = existing.reminders_sent;
    const oldExpiry = new Date(existing.expiry_date).getTime();
    const newExpiry = expiry_date ? new Date(expiry_date).getTime() : oldExpiry;
    
    if (oldExpiry !== newExpiry) {
      updatedReminders = [];
    }

    let finalStatus = status !== undefined ? status : existing.status;
    if (finalStatus !== 'INACTIVE') {
      const targetExpiry = expiry_date ? new Date(expiry_date) : new Date(existing.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetExpiry.setHours(0, 0, 0, 0);
      const diffMs = targetExpiry.getTime() - today.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) {
        finalStatus = 'EXPIRED';
      } else if (daysRemaining <= 30) {
        finalStatus = 'EXPIRING';
      } else {
        finalStatus = 'ACTIVE';
      }
    }

    const authReq = req as AuthRequest;
    const isSudoAdmin = authReq.user?.role === 'SUDO_ADMIN';
    let canManageConfidential = isSudoAdmin;

    if (!isSudoAdmin && authReq.user?.id) {
      const userRecord = await prisma.user.findUnique({
        where: { id: authReq.user.id },
        select: { permissions: true }
      });
      const perms = (userRecord?.permissions as any) || {};
      const assetPerms: string[] = Array.isArray(perms?.assets) ? perms.assets : [];
      canManageConfidential = assetPerms.includes('view_confidential');
    }

    const updated = await prisma.clientAsset.update({
      where: { id },
      data: {
        client_id: client_id ? Number(client_id) : undefined,
        asset_type,
        asset_name,
        provider,
        plan,
        purchase_date: purchase_date ? new Date(purchase_date) : undefined,
        activation_date: activation_date ? new Date(activation_date) : undefined,
        expiry_date: expiry_date ? new Date(expiry_date) : undefined,
        renewal_cost: renewal_cost !== undefined ? new Prisma.Decimal(renewal_cost) : undefined,
        billing_cycle,
        status: finalStatus,
        alert_email: alert_email !== undefined ? (alert_email ? String(alert_email).trim() : null) : undefined,
        notes,
        attachments,
        reminders_sent: updatedReminders as Prisma.InputJsonValue,
        is_confidential: canManageConfidential
          ? (is_confidential !== undefined ? Boolean(is_confidential) : undefined)
          : existing.is_confidential
      }
    });

    if (authReq.user) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await ActivityService.log(
        authReq.user.id,
        "UPDATE_ASSET",
        `Updated Asset "${updated.asset_name}" (${updated.asset_type})`,
        "CLIENT_ASSET",
        id.toString(),
        ip as string
      );
    }

    ReminderService.checkSingleAssetReminder(updated.id).catch(err => {
      console.error("[assetRoutes] Error in instant reminder check:", err);
    });

    res.json(updated);
  } catch (error) {
    console.error("Update Asset Error:", error);
    res.status(500).json({ error: "Failed to update asset" });
  }
});

// ==========================================
// 5. DELETE ASSET
// ==========================================
router.delete('/:id', checkPermission('assets', 'delete'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const deleted = await prisma.clientAsset.delete({
      where: { id }
    });

    const authReq = req as AuthRequest;
    if (authReq.user) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await ActivityService.log(
        authReq.user.id,
        "DELETE_ASSET",
        `Deleted Asset "${deleted.asset_name}" (${deleted.asset_type})`,
        "CLIENT_ASSET",
        id.toString(),
        ip as string
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete Asset Error:", error);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

export default router;
