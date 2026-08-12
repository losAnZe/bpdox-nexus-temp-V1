"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload, CheckCircle2, ShieldCheck, Server, Cpu, Clock, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";

interface SystemDetails {
  version: string;
  lastUpdated: string | null;
  nodeVersion: string;
  platform: string;
  uptimeSeconds: number;
  environment: string;
}

export function UpdateSettings() {
  const { toast } = useToast();
  const [details, setDetails] = useState<SystemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateStep, setUpdateStep] = useState<string>("");

  const fetchStatus = async () => {
    try {
      const res = await api.get('/update/status');
      setDetails(res.data);
    } catch (e) {
      console.error("Failed to fetch system update details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleUpdatePackageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      return toast("Please upload a valid .zip update package file.", "warning");
    }

    if (!confirm(`Are you sure you want to apply the update package '${file.name}'?\nAn automatic pre-update backup will be created before applying.`)) {
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUpdating(true);
    setUpdateStep("Uploading package to server...");

    try {
      setUpdateStep("Verifying package & creating pre-update backup...");
      const res = await api.post('/update/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUpdateStep("Applying code updates & syncing database schema...");
      
      toast(`Update Applied: ${res.data.message}`, "success");
      setUpdateStep("Restarting server services...");

      // Wait 3 seconds for server to complete restart, then refresh
      setTimeout(() => {
        window.location.reload();
      }, 3500);

    } catch (err: any) {
      console.error(err);
      toast(err.response?.data?.error || "Update failed. Please check the update package.", "error");
      setUpdating(false);
      setUpdateStep("");
      e.target.value = '';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* MAIN UPDATE CARD */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* HEADER CARD */}
        <Card className="shadow-horizon border-none bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="w-32 h-32 text-primary" />
          </div>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Software Version & System Updates</CardTitle>
                <CardDescription>Over-The-Air (OTA) system update and version management</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* CURRENT VERSION DISPLAY */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Installed Software Version</div>
                <div className="text-3xl font-extrabold text-foreground flex items-center gap-3">
                  v{details?.version || '1.2.0'}
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Stable Release
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Last System Update: {details?.lastUpdated ? new Date(details.lastUpdated).toLocaleString('en-IN') : 'Up to date'}
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading || updating} className="w-fit">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
              </Button>
            </div>

            {/* PACKAGE UPLOADER CARD */}
            <div className="p-6 border border-border/80 rounded-xl bg-background space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" /> Upload Update Package (.zip)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Upload a new version ZIP file containing feature updates, security patches, or layout upgrades. The system will automatically back up your database, extract code, sync database schemas, and restart cleanly.
                  </p>
                </div>
              </div>

              {updating ? (
                <div className="p-6 border border-primary/30 rounded-xl bg-primary/5 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                  <div className="font-bold text-sm text-foreground">{updateStep}</div>
                  <p className="text-xs text-muted-foreground">Please do not close this browser window. Server restart will trigger automatically upon completion.</p>
                </div>
              ) : (
                <div className="relative border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-6 text-center bg-muted/20">
                  <input 
                    type="file" 
                    accept=".zip" 
                    onChange={handleUpdatePackageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" 
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div className="font-semibold text-sm">Click or Drag Update ZIP Package Here</div>
                    <div className="text-xs text-muted-foreground">Accepts valid update packages (.zip up to 100MB)</div>
                  </div>
                </div>
              )}
            </div>

            {/* SAFETY NOTICE */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Automatic Pre-Update Safety Backup</strong>
                Every update automatically exports a complete JSON snapshot of all database tables (Clients, Invoices, Assets, Settings) to <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">backend/backups</code> prior to applying code changes.
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: ENVIRONMENT INFO */}
      <div className="space-y-6">
        <Card className="shadow-horizon border-none bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" /> System Environment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40">
              <span className="text-muted-foreground flex items-center gap-2"><Cpu className="w-3.5 h-3.5"/> Node.js</span>
              <span className="font-mono font-semibold">{details?.nodeVersion || process.version}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40">
              <span className="text-muted-foreground flex items-center gap-2"><Server className="w-3.5 h-3.5"/> Operating System</span>
              <span className="font-mono font-semibold text-right max-w-[150px] truncate">{details?.platform || 'Linux/Windows'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40">
              <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> Server Uptime</span>
              <span className="font-mono font-semibold">{details ? formatUptime(details.uptimeSeconds) : '-'}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded bg-muted/40">
              <span className="text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> Database Engine</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Prisma + SQLite/MySQL</span>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
