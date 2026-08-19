#!/usr/bin/env bash
# ==============================================================================
# BPDoxS Nexus — Automated Offsite Daily System Backup Script
# ==============================================================================
# This script packages Database (.iec), Secret Keys (.env), Uploaded Media, 
# and Encrypted Vault files into a single ZIP archive, then keeps 5 days of
# rolling backups.
#
# CRON USAGE (Runs daily at 2:00 AM):
# 0 2 * * * /var/www/html/BPDoxS-Nexus/backend/scripts/bpdoxs-auto-backup.sh >> /var/log/bpdoxs-backup.log 2>&1
# ==============================================================================

set -e

# Configuration
APP_DIR="/var/www/html/BPDoxS-Nexus"
BACKUP_DEST_DIR="/var/backups/bpdoxs-nexus"
DATE_STR=$(date +%Y-%m-%d_%H%M%S)
BACKUP_NAME="bpdoxs_full_backup_${DATE_STR}.zip"
TEMP_DIR="/tmp/bpdoxs_backup_${DATE_STR}"

echo "=========================================================================="
echo "Starting BPDoxS Nexus Full Backup: ${DATE_STR}"
echo "=========================================================================="

# Create target directories
mkdir -p "${BACKUP_DEST_DIR}"
mkdir -p "${TEMP_DIR}"

# 1. Export Database .iec Backup using Node CLI script
echo "[1/4] Exporting database snapshot..."
cd "${APP_DIR}/backend"
node -e "
const { BackupService } = require('./dist/services/BackupService');
BackupService.exportData().then(data => {
  require('fs').writeFileSync('${TEMP_DIR}/bpdoxs-database.iec', data, 'utf-8');
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
"

# 2. Copy Uploads & Vault Files directories (Zero-Knowledge: Secret keys kept separate)
echo "[2/3] Packaging uploaded media and vault files..."
if [ -d "${APP_DIR}/frontend/public/uploads" ]; then
    mkdir -p "${TEMP_DIR}/uploads"
    cp -r "${APP_DIR}/frontend/public/uploads/." "${TEMP_DIR}/uploads/"
fi

if [ -d "${APP_DIR}/vault-files" ]; then
    mkdir -p "${TEMP_DIR}/vault-files"
    cp -r "${APP_DIR}/vault-files/." "${TEMP_DIR}/vault-files/"
fi

# 4. Create ZIP archive
echo "[4/4] Creating compressed ZIP archive..."
cd "${TEMP_DIR}"
zip -r "${BACKUP_DEST_DIR}/${BACKUP_NAME}" . > /dev/null

# Clean up temp folder
rm -rf "${TEMP_DIR}"

# Keep 5 rolling daily backups, delete backups older than 5 days
find "${BACKUP_DEST_DIR}" -type f -name "bpdoxs_full_backup_*.zip" -mtime +5 -delete

echo "✅ Backup Completed Successfully!"
echo "Saved archive: ${BACKUP_DEST_DIR}/${BACKUP_NAME}"
echo "=========================================================================="
