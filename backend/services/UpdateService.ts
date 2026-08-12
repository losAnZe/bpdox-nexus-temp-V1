import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { PrismaClient } from '@prisma/client';
import AdmZip from 'adm-zip';
import { BackupService } from './BackupService';
import { ActivityService } from './ActivityService';

const prisma = new PrismaClient();

export interface UpdateManifest {
  version: string;
  name?: string;
  description?: string;
  minVersion?: string;
  requiresDbPush?: boolean;
  requiresBuild?: boolean;
  releaseDate?: string;
}

export class UpdateService {
  
  static async getCurrentVersion(): Promise<string> {
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'SYSTEM_VERSION' } });
      return (setting?.value as string) || '1.2.0';
    } catch (e) {
      return '1.2.0';
    }
  }

  static async getSystemDetails() {
    const version = await UpdateService.getCurrentVersion();
    const lastUpdateSetting = await prisma.systemSetting.findUnique({ where: { key: 'LAST_UPDATE_TIME' } });
    
    return {
      version,
      lastUpdated: lastUpdateSetting?.value || null,
      nodeVersion: process.version,
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'production'
    };
  }

  /**
   * Apply an update package from a ZIP buffer
   */
  static async applyUpdatePackage(
    zipBuffer: Buffer,
    userId: number,
    ip: string
  ): Promise<{ success: boolean; version: string; message: string; details?: any }> {
    const projectRoot = path.resolve(__dirname, '../../../');
    const backendRoot = path.resolve(__dirname, '../../');
    const backupDir = path.join(backendRoot, 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 1. Inspect ZIP Package
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (err: any) {
      throw new Error("Invalid update package. Could not parse ZIP file.");
    }

    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      throw new Error("Invalid update package. Missing 'manifest.json' file.");
    }

    let manifest: UpdateManifest;
    try {
      const manifestText = manifestEntry.getData().toString('utf8');
      manifest = JSON.parse(manifestText);
    } catch (err: any) {
      throw new Error("Failed to parse package 'manifest.json'. Ensure it is valid JSON.");
    }

    if (!manifest.version) {
      throw new Error("Update package manifest missing 'version' field.");
    }

    const currentVersion = await UpdateService.getCurrentVersion();

    // 2. Pre-Update Auto-Backup
    console.log(`[UpdateService] Creating pre-update safety backup before applying v${manifest.version}...`);
    try {
      const backupData = await BackupService.exportData();
      const backupFilename = `pre-update-backup-v${currentVersion}-${Date.now()}.json`;
      fs.writeFileSync(path.join(backupDir, backupFilename), backupData, 'utf8');
      console.log(`[UpdateService] Pre-update backup saved: ${backupFilename}`);
    } catch (err) {
      console.warn("[UpdateService] Pre-update backup warning:", err);
    }

    // 3. Extract Update Files
    console.log(`[UpdateService] Extracting update files for v${manifest.version}...`);
    try {
      // Extract everything except manifest.json directly into project root or target subfolders
      const zipEntries = zip.getEntries();
      for (const entry of zipEntries) {
        if (entry.entryName === 'manifest.json') continue;
        
        // Target path determination (handles root-relative zip paths)
        const targetPath = path.join(projectRoot, entry.entryName);

        if (entry.isDirectory) {
          fs.mkdirSync(targetPath, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, entry.getData());
        }
      }
    } catch (err: any) {
      throw new Error(`Failed to extract update files: ${err.message}`);
    }

    // 4. Database Schema Sync (if required)
    if (manifest.requiresDbPush !== false) {
      console.log("[UpdateService] Running database schema sync (prisma db push)...");
      try {
        await new Promise<void>((resolve, reject) => {
          exec('npx prisma db push --accept-data-loss', { cwd: backendRoot }, (err, stdout, stderr) => {
            if (err) {
              console.error("[UpdateService] DB Push Error:", stderr);
              resolve(); // Don't crash update if database is already in sync
            } else {
              console.log("[UpdateService] DB Push Success:", stdout);
              resolve();
            }
          });
        });
      } catch (err) {
        console.warn("[UpdateService] DB Sync warning:", err);
      }
    }

    // 5. Update Version in SystemSettings
    await prisma.systemSetting.upsert({
      where: { key: 'SYSTEM_VERSION' },
      update: { value: manifest.version },
      create: { key: 'SYSTEM_VERSION', value: manifest.version }
    });

    await prisma.systemSetting.upsert({
      where: { key: 'LAST_UPDATE_TIME' },
      update: { value: new Date().toISOString() },
      create: { key: 'LAST_UPDATE_TIME', value: new Date().toISOString() }
    });

    // 6. Log Activity
    await ActivityService.log(
      userId,
      "SYSTEM_UPDATE",
      `Upgraded system from v${currentVersion} to v${manifest.version} (${manifest.name || 'Update'})`,
      "SYSTEM",
      manifest.version,
      ip
    );

    // 7. Schedule Process Restart
    setTimeout(() => {
      console.log("[UpdateService] Triggering system process restart for new code to take effect...");
      process.exit(0);
    }, 1500);

    return {
      success: true,
      version: manifest.version,
      message: `System updated successfully to v${manifest.version}. Restarting server...`,
      details: manifest
    };
  }
}
