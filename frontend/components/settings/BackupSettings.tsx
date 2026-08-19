"use client";

import React, { useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2, HelpCircle, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";

export function BackupSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const downloadBackup = async () => {
    try {
        const res = await api.get('/backup/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `backup-${new Date().toISOString().slice(0,10)}.iec`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast("Backup download started.", "success");
    } catch(e) { 
        toast("Failed to download backup.", "error"); 
    }
  };

  const restoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("This will OVERWRITE your current data. Are you sure?")) return;
    
    const fd = new FormData(); 
    fd.append('file', file);
    
    setLoading(true);
    try { 
        await api.post('/backup/import', fd, { headers: {'Content-Type': 'multipart/form-data'} }); 
        toast("System restored successfully! Refreshing...", "success"); 
        setTimeout(() => window.location.reload(), 1500);
    } 
    catch(e) { 
        toast("Restore failed. Invalid file or server error.", "error"); 
    } finally { 
        setLoading(false); 
    }
  };

  const importCsv = async (e: React.ChangeEvent<HTMLInputElement>, url: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fd = new FormData(); 
    fd.append('file', file);
    
    setImporting(true);
    try { 
        const res = await api.post(url, fd, { headers: {'Content-Type': 'multipart/form-data'} }); 
        toast(`Success! Imported ${res.data.imported} records.`, "success"); 
    } 
    catch(e) { 
        toast("Import failed. Check CSV format.", "error"); 
    } finally { 
        setImporting(false); 
        e.target.value = ''; 
    }
  };

  const downloadFullZipBackup = async () => {
    setLoading(true);
    try {
        const res = await api.get('/backup/export-zip', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `bpdoxs-full-system-backup-${new Date().toISOString().slice(0,10)}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast("Full System ZIP Package download started.", "success");
    } catch(e) { 
        toast("Failed to download ZIP backup package.", "error"); 
    } finally {
        setLoading(false);
    }
  };

  const restoreFullZipBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !confirm("CRITICAL WARNING: Restoring a Full System Package will overwrite database records, encryption keys, logos, signatures, and vault files. Continue?")) return;
    
    const fd = new FormData(); 
    fd.append('file', file);
    
    setLoading(true);
    try { 
        const res = await api.post('/backup/import-zip', fd, { headers: {'Content-Type': 'multipart/form-data'} }); 
        toast(`Full System Restored! Restored ${res.data.restoredFiles || 0} media & vault files. Refreshing...`, "success"); 
        setTimeout(() => window.location.reload(), 2000);
    } 
    catch(e: any) { 
        toast("Full ZIP Restore failed. Check file format or server logs.", "error"); 
    } finally { 
        setLoading(false); 
        e.target.value = '';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: ACTIONS */}
        <div className="xl:col-span-2 space-y-6">
            {/* CARD 1: FULL ZIP SYSTEM ARCHIVE (RECOMMENDED FOR DISASTER RECOVERY) */}
            <Card className="shadow-horizon border-2 border-emerald-500/30 bg-card">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Full System Archive (ZIP)
                        </CardTitle>
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                            Recommended
                        </span>
                    </div>
                    <CardDescription>
                        Complete 1-Click Package containing Database (.iec), Uploaded Logos/Signatures, and Encrypted Vault Attachments (Zero-Knowledge: Secret Keys kept separate).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">Export Full ZIP Package</h4>
                            <p className="text-xs text-muted-foreground">Download Data + All Media & Vault Files</p>
                        </div>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={downloadFullZipBackup} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2"/>} Download ZIP
                        </Button>
                    </div>

                    <div className="p-4 border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300">Restore Full ZIP Package</h4>
                            <p className="text-xs text-amber-700/80 dark:text-amber-400/80">Restores Data & Media/Vault Files simultaneously</p>
                        </div>
                        <div className="relative">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={restoreFullZipBackup} accept=".zip" />
                            <Button variant="outline" className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:hover:bg-amber-950" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />} Select ZIP File
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* CARD 2: STANDARD DATABASE BACKUP */}
            <Card className="shadow-horizon border-none bg-card">
                <CardHeader>
                    <CardTitle>Database Only (.iec)</CardTitle>
                    <CardDescription>Lightweight database snapshot (Tables, Rows & Settings)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg bg-background dark:bg-background flex justify-between items-center">
                        <div><h4 className="font-bold text-sm">Export Data Only</h4></div>
                        <Button variant="outline" onClick={downloadBackup}>
                            <Download className="w-4 h-4 mr-2"/> Download .iec
                        </Button>
                    </div>
                    <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/10 rounded-lg flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-sm text-red-700 dark:text-red-400">Restore Data Only</h4>
                            <p className="text-xs text-red-600/70 dark:text-red-400/70">Overwrites existing database</p>
                        </div>
                        <div className="relative">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={restoreBackup} accept=".iec" />
                            <Button className="bg-red-600 hover:bg-red-700 text-white shadow-sm" disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Select .iec File"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
