import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { ActivityService } from './ActivityService';

const prisma = new PrismaClient();

export class ReminderService {
  
  static async checkExpiryAndSendReminders() {
    console.log("[ReminderService] Starting daily asset renewal checks...");
    try {
      const { transporter, adminEmail, systemName } = await ReminderService.getSmtpContext();
      if (!transporter) return;

      // Fetch all non-inactive assets with client relation
      const assets = await prisma.clientAsset.findMany({
        where: {
          status: { not: 'INACTIVE' }
        },
        include: {
          client: true
        }
      });

      const today = ReminderService.getTodayMidnight();

      for (const asset of assets) {
        await ReminderService.processAssetReminder(transporter, adminEmail, systemName, asset, today);
      }
      console.log("[ReminderService] Daily asset renewal checks completed.");
    } catch (error) {
      console.error("[ReminderService] Critical reminder cron failure:", error);
    }
  }

  /**
   * Process a single asset immediately (e.g. after POST/PUT asset route is called).
   */
  static async checkSingleAssetReminder(assetId: number) {
    try {
      const { transporter, adminEmail, systemName } = await ReminderService.getSmtpContext();
      if (!transporter) return;

      const asset = await prisma.clientAsset.findUnique({
        where: { id: assetId },
        include: { client: true }
      });

      if (!asset || asset.status === 'INACTIVE') return;

      const today = ReminderService.getTodayMidnight();
      await ReminderService.processAssetReminder(transporter, adminEmail, systemName, asset, today);
    } catch (error) {
      console.error(`[ReminderService] Error processing single asset reminder for ID ${assetId}:`, error);
    }
  }

  private static async getSmtpContext() {
    const smtpSetting = await prisma.systemSetting.findUnique({ where: { key: 'SMTP_CONFIG' } });
    if (!smtpSetting?.json_value) {
      console.warn("[ReminderService] SMTP not configured. Skipping email reminders.");
      return { transporter: null, adminEmail: '', systemName: '' };
    }
    const smtp = smtpSetting.json_value as any;

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user, pass: smtp.password }
    });

    const adminEmail = smtp.fromEmail || smtp.user;
    const softwareNameSetting = await prisma.systemSetting.findUnique({ where: { key: 'SOFTWARE_NAME' } });
    const systemName = (softwareNameSetting?.value as string) || 'BPDoxS Nexus';

    return { transporter, adminEmail, systemName };
  }

  private static getTodayMidnight(): Date {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    return new Date(`${todayStr}T00:00:00.000Z`);
  }

  private static async processAssetReminder(
    transporter: nodemailer.Transporter,
    adminEmail: string,
    systemName: string,
    asset: any,
    today: Date
  ) {
    const expiryDate = new Date(asset.expiry_date);
    const expiryStr = expiryDate.toISOString().split('T')[0];
    const expiryMidnight = new Date(`${expiryStr}T00:00:00.000Z`);

    const diffMs = expiryMidnight.getTime() - today.getTime();
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const sentList = Array.isArray(asset.reminders_sent) ? (asset.reminders_sent as number[]) : [];
    const milestones = [30, 15, 7, 3, 1];

    let targetMilestone: number | null = null;
    let newStatus = asset.status;

    if (daysRemaining <= 0) {
      // Expired or expiring today
      targetMilestone = 0;
      newStatus = 'EXPIRED';
    } else if (milestones.includes(daysRemaining)) {
      targetMilestone = daysRemaining;
      newStatus = daysRemaining <= 30 ? 'EXPIRING' : 'ACTIVE';
    }

    if (targetMilestone !== null && !sentList.includes(targetMilestone)) {
      // 1. Send Client Email
      if (asset.client && asset.client.email) {
        try {
          const subject = `Renewal Reminder: ${asset.asset_type} - ${asset.asset_name}`;
          const daysText = daysRemaining <= 0 ? "Expires today or has expired!" : `Expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;
          
          const messageText = `Dear ${asset.client.contact_person || asset.client.company_name},

This is a reminder that the following client asset requires renewal:

- Asset: ${asset.asset_name}
- Type: ${asset.asset_type}
- Provider: ${asset.provider}
- Plan: ${asset.plan}
- Expiry Date: ${expiryDate.toLocaleDateString('en-IN')}
- Status: ${daysText}
- Renewal Cost: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(asset.renewal_cost))}
- Billing Cycle: ${asset.billing_cycle}

Please arrange for payment of the renewal fee to ensure uninterrupted service.

Best regards,
${systemName}`;

          await transporter.sendMail({
            from: adminEmail,
            to: asset.client.email,
            subject: subject,
            text: messageText
          });
          console.log(`[ReminderService] Sent client reminder for ${asset.asset_name} to ${asset.client.email} (${daysRemaining} days remaining)`);

          // Log in Activity log
          const sysUser = await prisma.user.findFirst({ select: { id: true } });
          await ActivityService.log(
            sysUser?.id || 1,
            "SEND_CLIENT_EMAIL",
            `Sent asset renewal reminder for "${asset.asset_name}" (${asset.asset_type}) to ${asset.client.company_name} (${asset.client.email})`,
            "CLIENT_ASSET",
            asset.id.toString(),
            "SYSTEM"
          );
        } catch (err) {
          console.error(`[ReminderService] Client email sending failed for asset ID ${asset.id}:`, err);
        }
      }

      // 2. Send Admin Alert Email
      try {
        await ReminderService.sendAdminExpiryAlert(
          transporter, adminEmail, systemName, asset, expiryDate, daysRemaining
        );
      } catch (err) {
        console.error(`[ReminderService] Admin alert email failed for asset ID ${asset.id}:`, err);
      }

      // 3. Create In-App Notification
      try {
        const users = await prisma.user.findMany({ select: { id: true } });
        for (const u of users) {
          await prisma.notification.create({
            data: {
              user_id: u.id,
              title: `Asset Expiry: ${asset.asset_name}`,
              message: `Asset "${asset.asset_name}" (${asset.asset_type}) for client ${asset.client.company_name} ${daysRemaining <= 0 ? 'has expired' : `is expiring in ${daysRemaining} days`}. Renewal cost: INR ${asset.renewal_cost}.`,
              type: daysRemaining <= 0 ? 'ERROR' : (daysRemaining <= 7 ? 'WARNING' : 'INFO'),
              link: `/assets`
            }
          });
        }
      } catch (err) {
        console.error("[ReminderService] Failed to create in-app notification:", err);
      }

      // 4. Update Asset record with new status and updated reminders_sent
      await prisma.clientAsset.update({
        where: { id: asset.id },
        data: {
          status: newStatus,
          reminders_sent: [...sentList, targetMilestone]
        }
      });
    } else if (newStatus !== asset.status) {
      // Just update status if expired/expiring but milestone was already sent
      await prisma.clientAsset.update({
        where: { id: asset.id },
        data: { status: newStatus }
      });
    }
  }

  /**
   * Send a styled HTML alert email to the admin when an asset expires or is about to expire.
   */
  private static async sendAdminExpiryAlert(
    transporter: nodemailer.Transporter,
    defaultAdminEmail: string,
    systemName: string,
    asset: any,
    expiryDate: Date,
    daysRemaining: number
  ) {
    const client = asset.client;
    const recipientEmail = asset.alert_email ? asset.alert_email.trim() : defaultAdminEmail;
    const isExpired = daysRemaining <= 0;
    const daysText = isExpired
      ? (daysRemaining === 0 ? '⚠️ Expires TODAY' : `🔴 Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) > 1 ? 's' : ''} ago`)
      : `⏰ Expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`;

    const urgencyColor = isExpired ? '#DC2626' : (daysRemaining <= 7 ? '#F59E0B' : '#3B82F6');
    const urgencyBg = isExpired ? '#FEF2F2' : (daysRemaining <= 7 ? '#FFFBEB' : '#EFF6FF');
    const urgencyLabel = isExpired ? 'EXPIRED' : (daysRemaining <= 7 ? 'URGENT' : 'REMINDER');
    const renewalCost = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(asset.renewal_cost));

    const subject = isExpired
      ? `🔴 EXPIRED: ${asset.asset_name} (${asset.asset_type}) — ${client.company_name}`
      : `⏰ Expiry Alert: ${asset.asset_name} — ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:${urgencyColor};padding:24px 32px;">
            <table width="100%"><tr>
              <td style="color:#fff;font-size:20px;font-weight:700;">${systemName}</td>
              <td align="right" style="color:#fff;font-size:13px;font-weight:600;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;">${urgencyLabel}</td>
            </tr></table>
          </td>
        </tr>

        <!-- Status Banner -->
        <tr>
          <td style="padding:24px 32px 0;">
            <div style="background:${urgencyBg};border-left:4px solid ${urgencyColor};padding:16px 20px;border-radius:0 8px 8px 0;">
              <div style="font-size:18px;font-weight:700;color:${urgencyColor};margin-bottom:4px;">${daysText}</div>
              <div style="font-size:13px;color:#6B7280;">Expiry Date: ${expiryDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </td>
        </tr>

        <!-- Asset Details -->
        <tr>
          <td style="padding:24px 32px 0;">
            <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">Asset Details</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
              <tr style="background:#F9FAFB;">
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;width:40%;">Asset Name</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;font-weight:600;border-bottom:1px solid #E5E7EB;">${asset.asset_name}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Type</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;border-bottom:1px solid #E5E7EB;">${asset.asset_type}</td>
              </tr>
              <tr style="background:#F9FAFB;">
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Provider</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;border-bottom:1px solid #E5E7EB;">${asset.provider}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Plan</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;border-bottom:1px solid #E5E7EB;">${asset.plan}</td>
              </tr>
              <tr style="background:#F9FAFB;">
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Billing Cycle</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;border-bottom:1px solid #E5E7EB;">${asset.billing_cycle}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;">Renewal Cost</td>
                <td style="padding:10px 16px;font-size:15px;color:${urgencyColor};font-weight:700;">${renewalCost}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Client Details -->
        <tr>
          <td style="padding:24px 32px 0;">
            <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">Client Details</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
              <tr style="background:#F9FAFB;">
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;width:40%;">Company</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;font-weight:600;border-bottom:1px solid #E5E7EB;">${client.company_name}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Contact Person</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;border-bottom:1px solid #E5E7EB;">${client.contact_person || '—'}</td>
              </tr>
              <tr style="background:#F9FAFB;">
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Email</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;border-bottom:1px solid #E5E7EB;">${client.email || '—'}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Phone</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;border-bottom:1px solid #E5E7EB;">${client.phone || '—'}</td>
              </tr>
              <tr style="background:#F9FAFB;">
                <td style="padding:10px 16px;font-size:13px;color:#6B7280;">GSTIN</td>
                <td style="padding:10px 16px;font-size:13px;color:#111;">${client.gstin || '—'}</td>
              </tr>
            </table>
          </td>
        </tr>

        ${asset.notes ? `
        <!-- Notes -->
        <tr>
          <td style="padding:24px 32px 0;">
            <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:8px;">Notes</div>
            <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px 16px;font-size:13px;color:#374151;">${asset.notes}</div>
          </td>
        </tr>
        ` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px 32px;">
            <div style="border-top:1px solid #E5E7EB;padding-top:16px;font-size:12px;color:#9CA3AF;text-align:center;">
              This is an automated alert from <strong>${systemName}</strong><br>
              Generated on ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: defaultAdminEmail,
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
      text: `${daysText}\n\nAsset: ${asset.asset_name}\nType: ${asset.asset_type}\nProvider: ${asset.provider}\nPlan: ${asset.plan}\nExpiry: ${expiryDate.toLocaleDateString('en-IN')}\nRenewal Cost: ${renewalCost}\n\nClient: ${client.company_name}\nContact: ${client.contact_person || '—'}\nEmail: ${client.email || '—'}\nPhone: ${client.phone || '—'}\nGSTIN: ${client.gstin || '—'}`
    });

    console.log(`[ReminderService] Admin alert sent to ${recipientEmail} for asset "${asset.asset_name}" (${daysText})`);

    // Log in Activity log
    const sysUser = await prisma.user.findFirst({ select: { id: true } });
    await ActivityService.log(
      sysUser?.id || 1,
      "SEND_ALERT_EMAIL",
      `Sent asset expiry alert for "${asset.asset_name}" (${asset.asset_type}) to ${recipientEmail}`,
      "CLIENT_ASSET",
      asset.id.toString(),
      "SYSTEM"
    );
  }
}
