# BPDoxS Invoicing System: Testing & Installation Guide

This guide details how to run the sandboxed local version for testing (using SQLite) and how to deploy it on a production server (using MySQL) without losing any of your 3+ years of historical data.

---

## Part 1: Local Testing Sandbox (SQLite)

We configured a serverless **SQLite** sandbox locally so you can run and test all the updates immediately without installing or configuring a MySQL server.

### 1. Start the Backend Server
1. Open a terminal in `BPDoxS-Nexus-main/backend`.
2. Run the development command:
   ```bash
   npm run dev
   ```
   *The backend will boot up on port `5000` and create a database file called `dev.db` in `backend/prisma/`.*

### 2. Start the Frontend Server
1. Open another terminal in `BPDoxS-Nexus-main/frontend`.
2. Run the development server:
   ```bash
   npm run dev
   ```
   *The Next.js app will start and be available at `http://localhost:3000`.*

### 3. First-time Setup
1. Open your browser and navigate to: `http://localhost:3000/setup`
2. Enter your desired **Software Name** (e.g., *BPDox Billing*).
3. Create your master **SUDO_ADMIN** account (email and password).
4. Save and log in! You can now test CRUD operations, document uploads, client asset pipelines, and exports.

---

## Part 2: Production Server Deployment (MySQL)

Follow these steps to deploy the update to your live production or staging server.

### Step 1: Revert Prisma to MySQL
To run on MySQL, we must switch the database connector back from SQLite. 
1. In the `backend/prisma/` folder, find the backup file we created: `schema.mysql.prisma`.
2. Copy its contents or rename it to overwrite `schema.prisma`. 
   *(Alternatively, change the `datasource db` block in `schema.prisma` to `provider = "mysql"` and restore the `@db` decorators).*

### Step 2: Configure Environment Variables
Create or update the `.env` file in the `backend/` directory:
```env
PORT=5000
DATABASE_URL="mysql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:3306/YOUR_DB_NAME"
JWT_SECRET="generate_a_secure_random_string_here"
PUPPETEER_EXECUTABLE_PATH="/usr/bin/chromium-browser" # Path to Chrome on your server
```

### Step 3: Install & Sync Database
Run these commands on the server:
1. In the `backend/` directory:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```
   *This applies the new `ClientAsset` table to your MySQL database and seeds required country/state lists.*

2. In the `frontend/` directory:
   ```bash
   npm install
   ```

### Step 4: Build & Run in Production
We recommend using **PM2** to run both servers continuously in the background on your production server.

1. **Build the packages**:
   * Backend: Run `npm run build` in `backend/`.
   * Frontend: Run `npm run build` in `frontend/`.

2. **Start Backend**:
   ```bash
   cd backend
   pm2 start dist/index.js --name "bpdox-backend"
   ```

3. **Start Frontend**:
   ```bash
   cd frontend
   pm2 start "npm start" --name "bpdox-frontend"
   ```

---

## Part 3: Restoring 3 Years of Data

You can safely migrate all your historical invoices, clients, expenses, and ledger entries from your old backup to this new version:

1. Log in to the new system as a **SUDO_ADMIN**.
2. Go to **Settings** -> **System Backup & Restore**.
3. Under the **Restore Database** section, upload your encrypted `.iec` snapshot file.
4. Click **Restore**.
   *The upgraded `BackupService` will automatically detect older v2.0 backups, map the tables safely, and initialize the new client assets table with empty records. No data will be lost.*

---

## Part 4: Automated Expiry Reminders

*   The daily expiry checks run automatically via code interval loops defined in `backend/index.ts`. No separate server-side cron utility is required.
*   Make sure your server has outgoing email SMTP credentials configured in the system settings panel, and SMTP ports are open, so the system can successfully mail alerts to clients!
