import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const prisma = new PrismaClient();

export class BackupService {
  
  static async exportData() {
    console.log("Starting Backup Export...");

    try {
        // 1. Fetch Data from ALL Tables
        // Using explicit queries to ensure type safety
        const clients = await prisma.client.findMany();
        const invoices = await prisma.invoice.findMany();
        const quotations = await prisma.quotation.findMany();
        const expenses = await prisma.expense.findMany();
        const bankAccounts = await prisma.bankAccount.findMany();
        const settings = await prisma.systemSetting.findMany();
        
        // Sequences
        const invoiceSequences = await prisma.invoiceSequence.findMany();
        const quotationSequences = await prisma.quotationSequence.findMany();

        // Users (Careful with this, but needed for full restore)
        const users = await prisma.user.findMany();

        // Client Assets & Credentials
        const clientAssets = await prisma.clientAsset.findMany();
        const clientCredentials = await prisma.clientCredential.findMany();

        const backupData = {
          version: "2.2", // Bumped version for client credentials
          timestamp: new Date().toISOString(),
          data: {
            clients,
            invoices,
            quotations,
            expenses,
            bankAccounts,
            settings,
            invoiceSequences,
            quotationSequences,
            users,
            clientAssets,
            clientCredentials
          }
        };

        // Simple obfuscation (Base64) to prevent accidental edits in text editors.
        // For true security, this file should be stored safely by the user.
        const jsonString = JSON.stringify(backupData);
        const encrypted = Buffer.from(jsonString).toString('base64');

        return encrypted;

    } catch (error) {
        console.error("CRITICAL BACKUP ERROR:", error);
        throw new Error("Backup generation failed");
    }
  }

  static async importData(encryptedData: string) {
    console.log("Starting Backup Restore...");
    
    // 1. Decrypt
    const jsonString = Buffer.from(encryptedData, 'base64').toString('utf-8');
    let parsed;
    
    try {
        parsed = JSON.parse(jsonString);
    } catch (e) {
        throw new Error("Invalid file format. Could not parse backup.");
    }

    if (!parsed.data) throw new Error("Invalid .iec file structure");

    // 2. Transactional Restore (All or Nothing)
    await prisma.$transaction(async (tx) => {
      
      // A. Settings
      if (parsed.data.settings) {
        for (const s of parsed.data.settings) {
          await tx.systemSetting.upsert({
            where: { key: s.key },
            update: { value: s.value, json_value: s.json_value },
            create: { key: s.key, value: s.value, json_value: s.json_value, is_locked: s.is_locked }
          });
        }
      }

      // B. Users (Restore Admin)
      if (parsed.data.users) {
        for (const u of parsed.data.users) {
          await tx.user.upsert({
            where: { email: u.email },
            update: { password_hash: u.password_hash, two_factor_enabled: u.two_factor_enabled, two_factor_secret: u.two_factor_secret },
            create: { ...u, id: undefined } // Let DB handle ID auto-increment or keep consistent if needed
          });
        }
      }

      // C. Core Data (Clients, Banks)
      if (parsed.data.clients) {
        for (const c of parsed.data.clients) {
          await tx.client.upsert({
            where: { id: c.id },
            update: { ...c },
            create: { ...c }
          });
        }
      }

      if (parsed.data.bankAccounts) {
        for (const b of parsed.data.bankAccounts) {
          await tx.bankAccount.upsert({
            where: { id: b.id },
            update: { ...b },
            create: { ...b }
          });
        }
      }

      // D. Transactional Data (Invoices, Quotes, Expenses)
      if (parsed.data.expenses) {
        for (const e of parsed.data.expenses) {
          await tx.expense.upsert({
            where: { id: e.id },
            update: { ...e },
            create: { ...e }
          });
        }
      }

      // Invoices (Unique constraint is invoice_number)
      if (parsed.data.invoices) {
        for (const inv of parsed.data.invoices) {
          await tx.invoice.upsert({
            where: { invoice_number: inv.invoice_number },
            update: { ...inv },
            create: { ...inv }
          });
        }
      }

      // Quotations (Unique constraint is quotation_number)
      if (parsed.data.quotations) {
        for (const q of parsed.data.quotations) {
          await tx.quotation.upsert({
            where: { quotation_number: q.quotation_number },
            update: { ...q },
            create: { ...q }
          });
        }
      }
      
      // E. Sequences
      if (parsed.data.invoiceSequences) {
        for (const seq of parsed.data.invoiceSequences) {
          await tx.invoiceSequence.upsert({
            where: { fiscal_year: seq.fiscal_year },
            update: { last_count: seq.last_count },
            create: { fiscal_year: seq.fiscal_year, last_count: seq.last_count }
          });
        }
      }

      if (parsed.data.quotationSequences) {
        for (const seq of parsed.data.quotationSequences) {
          await tx.quotationSequence.upsert({
            where: { fiscal_year: seq.fiscal_year },
            update: { last_count: seq.last_count },
            create: { fiscal_year: seq.fiscal_year, last_count: seq.last_count }
          });
        }
      }

      // F. Client Assets (Backward compatible)
      if (parsed.data.clientAssets) {
        for (const a of parsed.data.clientAssets) {
          await tx.clientAsset.upsert({
            where: { id: a.id },
            update: {
              client_id: a.client_id,
              asset_type: a.asset_type,
              asset_name: a.asset_name,
              provider: a.provider,
              plan: a.plan,
              purchase_date: new Date(a.purchase_date),
              activation_date: new Date(a.activation_date),
              expiry_date: new Date(a.expiry_date),
              renewal_cost: new Prisma.Decimal(a.renewal_cost),
              billing_cycle: a.billing_cycle,
              status: a.status,
              notes: a.notes,
              attachments: a.attachments,
              reminders_sent: a.reminders_sent
            },
            create: {
              id: a.id,
              client_id: a.client_id,
              asset_type: a.asset_type,
              asset_name: a.asset_name,
              provider: a.provider,
              plan: a.plan,
              purchase_date: new Date(a.purchase_date),
              activation_date: new Date(a.activation_date),
              expiry_date: new Date(a.expiry_date),
              renewal_cost: new Prisma.Decimal(a.renewal_cost),
              billing_cycle: a.billing_cycle,
              status: a.status,
              notes: a.notes,
              attachments: a.attachments,
              reminders_sent: a.reminders_sent
            }
          });
        }
      }

      // G. Client Credentials
      if (parsed.data.clientCredentials) {
        for (const cred of parsed.data.clientCredentials) {
          await tx.clientCredential.upsert({
            where: { id: cred.id },
            update: {
              client_id: cred.client_id,
              title: cred.title,
              category: cred.category,
              url: cred.url,
              username: cred.username,
              password: cred.password,
              port: cred.port,
              notes: cred.notes
            },
            create: {
              id: cred.id,
              client_id: cred.client_id,
              title: cred.title,
              category: cred.category,
              url: cred.url,
              username: cred.username,
              password: cred.password,
              port: cred.port,
              notes: cred.notes
            }
          });
        }
      }
    });

    return true;
  }

  /**
   * Export Full System Backup Package (.zip) containing:
   * 1. Database .iec file
   * 2. Uploads directory (logos, signatures, asset PDFs)
   * 3. Encrypted vault-files directory
   * (Excludes .env secret keys for zero-knowledge security)
   */
  static async exportFullZip(): Promise<Buffer> {
    console.log("Generating Full System ZIP Backup Archive (Zero-Knowledge)...");
    const zip = new AdmZip();

    // 1. Export database .iec data
    const iecData = await this.exportData();
    const dateStr = new Date().toISOString().split('T')[0];
    zip.addFile(`bpdoxs-database-${dateStr}.iec`, Buffer.from(iecData, 'utf-8'));

    // 2. Include uploads directory
    const rootPath = process.cwd().endsWith('backend') ? '..' : '.';
    const uploadsDir = path.join(process.cwd(), rootPath, 'frontend/public/uploads');
    if (fs.existsSync(uploadsDir)) {
      zip.addLocalFolder(uploadsDir, 'uploads');
    }

    // 3. Include vault-files directory
    const vaultFilesDir = path.join(process.cwd(), rootPath, 'vault-files');
    if (fs.existsSync(vaultFilesDir)) {
      zip.addLocalFolder(vaultFilesDir, 'vault-files');
    }

    return zip.toBuffer();
  }

  /**
   * Import Full System Backup Package (.zip)
   */
  static async importFullZip(zipBuffer: Buffer): Promise<{ restoredData: boolean; restoredFiles: number }> {
    console.log("Restoring Full System ZIP Backup Package...");
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    let restoredData = false;
    let restoredFiles = 0;

    const rootPath = process.cwd().endsWith('backend') ? '..' : '.';
    const uploadsDir = path.join(process.cwd(), rootPath, 'frontend/public/uploads');
    const vaultFilesDir = path.join(process.cwd(), rootPath, 'vault-files');

    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    if (!fs.existsSync(vaultFilesDir)) fs.mkdirSync(vaultFilesDir, { recursive: true });

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const entryName = entry.entryName;

      // 1. Database .iec file
      if (entryName.endsWith('.iec')) {
        const iecContent = entry.getData().toString('utf-8');
        await this.importData(iecContent);
        restoredData = true;
      }
      // 2. Uploads directory files
      else if (entryName.startsWith('uploads/')) {
        const fileName = entryName.replace(/^uploads\//, '');
        if (fileName) {
          const destPath = path.join(uploadsDir, fileName);
          fs.writeFileSync(destPath, entry.getData());
          restoredFiles++;
        }
      }
      // 4. Vault files directory files
      else if (entryName.startsWith('vault-files/')) {
        const fileName = entryName.replace(/^vault-files\//, '');
        if (fileName) {
          const destPath = path.join(vaultFilesDir, fileName);
          fs.writeFileSync(destPath, entry.getData());
          restoredFiles++;
        }
      }
    }

    return { restoredData, restoredFiles };
  }
}