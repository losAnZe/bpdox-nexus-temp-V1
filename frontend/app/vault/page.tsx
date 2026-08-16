"use client";

import React, { useEffect, useState, useMemo } from 'react';
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  KeyRound, Plus, Search, Loader2, Eye, EyeOff, Copy, Check, ExternalLink, 
  Pencil, Trash, Shield, Server, Globe, Database, Cpu, Terminal, Lock, X, 
  Upload, FileText, Download, Paperclip
} from "lucide-react";
import { useToast } from "@/components/ui/toast-context";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Hosting & cPanel",
  "Domain Registrar",
  "CMS Admin",
  "FTP / SSH Access",
  "Cloudflare & DNS",
  "Database",
  "Custom"
];

interface Client {
  id: number;
  company_name: string;
}

interface VaultFile {
  id: string;
  originalName: string;
  diskFileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface Credential {
  id: number;
  client_id: number;
  client: Client;
  title: string;
  category: string;
  url?: string;
  username: string;
  password?: string;
  port?: string;
  notes?: string;
  ssh_key?: string;
  has_ssh_key?: boolean;
  attached_files?: VaultFile[];
  is_confidential?: boolean;
  created_at: string;
  updated_at: string;
}

export default function VaultPage() {
  const { toast } = useToast();
  const { isSudo, hasPermission } = usePermissions();
  const canViewConfidential = isSudo || hasPermission('vault', 'view_confidential');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");

  // State for Revealed Passwords & SSH Keys
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: number]: string }>({});
  const [revealingId, setRevealingId] = useState<number | null>(null);
  const [revealedSshKeys, setRevealedSshKeys] = useState<{ [key: number]: string }>({});
  const [revealingSshId, setRevealingSshId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dialog State
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCred, setSelectedCred] = useState<Credential | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    client_id: "",
    title: "",
    category: CATEGORIES[0],
    url: "",
    username: "",
    password: "",
    port: "",
    notes: "",
    ssh_key: "",
    is_confidential: false
  });

  const canView = hasPermission('vault', 'view');
  const canCreate = hasPermission('vault', 'create');
  const canEdit = hasPermission('vault', 'edit');
  const canDelete = hasPermission('vault', 'delete');

  const fetchData = async () => {
    try {
      const [credRes, clientRes] = await Promise.all([
        api.get('/vault'),
        api.get('/clients/names').catch(() => ({ data: [] }))
      ]);
      setCredentials(credRes.data);
      setClients(clientRes.data);
    } catch (e: any) {
      console.error("Failed to load vault data", e);
      toast(e.response?.data?.error || "Failed to load vault data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [canView]);

  // Filtered List
  const filteredCredentials = useMemo(() => {
    return credentials.filter(c => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.url && c.url.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.client.company_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = categoryFilter === 'ALL' || c.category === categoryFilter;
      const matchesClient = clientFilter === 'ALL' || c.client_id.toString() === clientFilter;

      return matchesSearch && matchesCat && matchesClient;
    });
  }, [credentials, searchTerm, categoryFilter, clientFilter]);

  // Reveal Decrypted Password
  const togglePasswordReveal = async (id: number) => {
    if (revealedPasswords[id]) {
      setRevealedPasswords(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return;
    }

    setRevealingId(id);
    try {
      const res = await api.post(`/vault/${id}/reveal`);
      setRevealedPasswords(prev => ({ ...prev, [id]: res.data.password }));
      toast("Password revealed & action logged in audit trail.", "info");
    } catch (err: any) {
      toast(err.response?.data?.error || "Failed to reveal password", "error");
    } finally {
      setRevealingId(null);
    }
  };

  // Reveal Decrypted SSH Key
  const toggleSshKeyReveal = async (id: number) => {
    if (revealedSshKeys[id]) {
      setRevealedSshKeys(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      return;
    }

    setRevealingSshId(id);
    try {
      const res = await api.post(`/vault/${id}/reveal-ssh`);
      setRevealedSshKeys(prev => ({ ...prev, [id]: res.data.ssh_key }));
      toast("SSH Key revealed & action logged in audit trail.", "info");
    } catch (err: any) {
      toast(err.response?.data?.error || "Failed to reveal SSH key", "error");
    } finally {
      setRevealingSshId(null);
    }
  };

  // Copy helper
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast(`${label} copied to clipboard!`, "success");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      toast("Failed to copy to clipboard", "error");
    }
  };

  // Upload file handler
  const handleFileUpload = async (credId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingId(credId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/vault/${credId}/upload-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast("Encrypted file uploaded successfully!", "success");
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.error || "Failed to upload file", "error");
    } finally {
      setUploadingId(null);
      e.target.value = '';
    }
  };

  // Download decrypted file
  const handleFileDownload = async (credId: number, fileId: string, originalName: string) => {
    try {
      const res = await api.get(`/vault/${credId}/download-file/${fileId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast("File decrypted & downloaded", "success");
    } catch (err: any) {
      toast("Failed to download file", "error");
    }
  };

  // Delete attached file
  const handleFileDelete = async (credId: number, fileId: string, originalName: string) => {
    if (!confirm(`Delete encrypted file '${originalName}'?`)) return;
    try {
      await api.delete(`/vault/${credId}/delete-file/${fileId}`);
      toast("File deleted from vault", "success");
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.error || "Failed to delete file", "error");
    }
  };

  // Open Create Form
  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedCred(null);
    setFormData({
      client_id: clients[0]?.id?.toString() || "",
      title: "",
      category: CATEGORIES[0],
      url: "",
      username: "",
      password: "",
      port: "",
      notes: "",
      ssh_key: "",
      is_confidential: false
    });
    setFormOpen(true);
  };

  // Open Edit Form
  const openEditModal = (cred: Credential) => {
    setIsEditing(true);
    setSelectedCred(cred);
    setFormData({
      client_id: cred.client_id.toString(),
      title: cred.title,
      category: cred.category,
      url: cred.url || "",
      username: cred.username,
      password: "••••••••",
      port: cred.port || "",
      notes: cred.notes || "",
      ssh_key: cred.has_ssh_key ? "••••••••" : "",
      is_confidential: cred.is_confidential || false
    });
    setFormOpen(true);
  };

  // Handle Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.title || !formData.username || !formData.password) {
      return toast("Client, Title, Username, and Password are required.", "warning");
    }

    const payload = {
      ...formData,
      is_confidential: canViewConfidential
        ? formData.is_confidential
        : (isEditing && selectedCred ? Boolean(selectedCred.is_confidential) : false)
    };

    setSubmitting(true);
    try {
      if (isEditing && selectedCred) {
        await api.put(`/vault/${selectedCred.id}`, payload);
        toast("Credential updated successfully", "success");
      } else {
        await api.post('/vault', payload);
        toast("Credential created successfully", "success");
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.error || "Failed to save credential", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Credential
  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete credential '${title}'?`)) return;

    try {
      await api.delete(`/vault/${id}`);
      toast("Credential deleted successfully", "success");
      fetchData();
    } catch (err: any) {
      toast(err.response?.data?.error || "Failed to delete credential", "error");
    }
  };

  // Get Icon by Category
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Hosting & cPanel": return <Server className="w-4 h-4 text-blue-500" />;
      case "Domain Registrar": return <Globe className="w-4 h-4 text-emerald-500" />;
      case "CMS Admin": return <Lock className="w-4 h-4 text-amber-500" />;
      case "FTP / SSH Access": return <Terminal className="w-4 h-4 text-purple-500" />;
      case "Cloudflare & DNS": return <Cpu className="w-4 h-4 text-orange-500" />;
      case "Database": return <Database className="w-4 h-4 text-cyan-500" />;
      default: return <KeyRound className="w-4 h-4 text-slate-500" />;
    }
  };

  if (!canView) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="p-4 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-full w-fit mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm text-muted-foreground">You do not have permission to access the Client Credential Vault. Please contact your system administrator.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Client Credential Vault</h1>
            <p className="text-xs md:text-sm text-muted-foreground">AES-256 encrypted vault for client logins, SSH keys & encrypted file attachments.</p>
          </div>
        </div>

        {canCreate && (
          <Button onClick={openCreateModal} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" /> Add Credential
          </Button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col xl:flex-row gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Title, Client, Username, or URL..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>

          {(searchTerm || categoryFilter !== 'ALL' || clientFilter !== 'ALL') && (
            <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(''); setCategoryFilter('ALL'); setClientFilter('ALL'); }}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* CREDENTIAL CARDS GRID */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex justify-center items-center">
          <Loader2 className="animate-spin mr-2 h-5 w-5 text-primary" /> Loading encrypted credentials...
        </div>
      ) : filteredCredentials.length === 0 ? (
        <Card className="shadow-sm border-none bg-card p-12 text-center">
          <div className="p-4 bg-muted/60 rounded-full w-fit mx-auto mb-3 text-muted-foreground">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold">No Credentials Found</h3>
          <p className="text-xs text-muted-foreground mt-1">No credentials match your filter criteria or none have been added yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCredentials.map(cred => {
            const isRevealed = Boolean(revealedPasswords[cred.id]);
            const plainPassword = revealedPasswords[cred.id] || "••••••••";

            const isSshRevealed = Boolean(revealedSshKeys[cred.id]);
            const plainSshKey = revealedSshKeys[cred.id] || "••••••••••••••••••••••••••••••••";
            const files = cred.attached_files || [];

            return (
              <Card key={cred.id} className="shadow-sm border border-border/60 bg-card hover:border-primary/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-muted/60 rounded-lg shrink-0">
                        {getCategoryIcon(cred.category)}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold truncate max-w-[200px]">{cred.title}</CardTitle>
                        <CardDescription className="text-xs font-medium text-primary">{cred.client.company_name}</CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {cred.is_confidential && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                          <Lock className="w-2.5 h-2.5" /> Confidential
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border">
                        {cred.category}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-xs flex-1">
                  
                  {/* URL */}
                  {cred.url && (
                    <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                      <span className="text-muted-foreground">URL:</span>
                      <a 
                        href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="font-mono text-primary flex items-center gap-1 hover:underline truncate max-w-[200px]"
                      >
                        {cred.url} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* USERNAME */}
                  <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                    <span className="text-muted-foreground">Username:</span>
                    <div className="flex items-center gap-1 font-mono font-semibold">
                      <span>{cred.username}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => copyToClipboard(cred.username, "Username")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div className="flex items-center justify-between p-2 rounded bg-muted/40 border border-primary/20">
                    <span className="text-muted-foreground">Password:</span>
                    <div className="flex items-center gap-1 font-mono font-semibold">
                      <span className={isRevealed ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500"}>
                        {plainPassword}
                      </span>

                      {/* Reveal Toggle */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-primary"
                        disabled={revealingId === cred.id}
                        onClick={() => togglePasswordReveal(cred.id)}
                        title={isRevealed ? "Hide Password" : "Reveal Password"}
                      >
                        {revealingId === cred.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isRevealed ? (
                          <EyeOff className="w-3 h-3 text-amber-500" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>

                      {/* Copy Button */}
                      {isRevealed && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                          onClick={() => copyToClipboard(plainPassword, "Password")}
                          title="Copy Password"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* SSH KEY BOX */}
                  {(cred.has_ssh_key || cred.ssh_key) && (
                    <div className="p-2.5 rounded bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                          <Terminal className="w-3.5 h-3.5" /> Encrypted SSH Key
                        </span>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                            disabled={revealingSshId === cred.id}
                            onClick={() => toggleSshKeyReveal(cred.id)}
                            title={isSshRevealed ? "Hide SSH Key" : "Reveal SSH Key"}
                          >
                            {revealingSshId === cred.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isSshRevealed ? (
                              <EyeOff className="w-3 h-3 text-amber-500" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </Button>

                          {isSshRevealed && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              onClick={() => copyToClipboard(plainSshKey, "SSH Private Key")}
                              title="Copy SSH Key"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {isSshRevealed ? (
                        <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[10px] overflow-x-auto font-mono max-h-32 leading-relaxed">
                          {plainSshKey}
                        </pre>
                      ) : (
                        <div className="text-[10px] font-mono text-muted-foreground truncate">
                          ••••••••••••••••••••••••••••••••
                        </div>
                      )}
                    </div>
                  )}

                  {/* PORT */}
                  {cred.port && (
                    <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                      <span className="text-muted-foreground">Port:</span>
                      <span className="font-mono font-semibold">{cred.port}</span>
                    </div>
                  )}

                  {/* ENCRYPTED ATTACHED FILES */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> Attached Files ({files.length})
                      </span>

                      {canEdit && (
                        <label className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                          {uploadingId === cred.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          <span>Upload File</span>
                          <input 
                            type="file" 
                            className="hidden" 
                            disabled={uploadingId === cred.id}
                            onChange={(e) => handleFileUpload(cred.id, e)} 
                          />
                        </label>
                      )}
                    </div>

                    {files.length > 0 && (
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-1.5 rounded bg-muted/30 border border-border/50 text-[11px]">
                            <div className="flex items-center gap-1.5 truncate max-w-[170px]" title={file.originalName}>
                              <FileText className="w-3 h-3 text-primary shrink-0" />
                              <span className="truncate font-medium">{file.originalName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-muted-foreground mr-1">
                                ({(file.fileSize / 1024).toFixed(0)} KB)
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 text-muted-foreground hover:text-primary"
                                onClick={() => handleFileDownload(cred.id, file.id, file.originalName)}
                                title="Download Decrypted File"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              {canEdit && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-5 w-5 text-rose-400 hover:text-rose-600"
                                  onClick={() => handleFileDelete(cred.id, file.id, file.originalName)}
                                  title="Delete Encrypted File"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* NOTES */}
                  {cred.notes && (
                    <div className="p-2 bg-muted/30 rounded text-[11px] text-muted-foreground italic border border-border/40">
                      {cred.notes}
                    </div>
                  )}

                </CardContent>

                {/* CARD FOOTER ACTIONS */}
                <div className="p-3 border-t border-border/50 bg-muted/20 flex justify-between items-center text-xs">
                  <span className="text-[10px] text-muted-foreground">
                    Updated: {new Date(cred.updated_at).toLocaleDateString('en-IN')}
                  </span>

                  <div className="flex gap-1">
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:text-primary" onClick={() => openEditModal(cred)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => handleDelete(cred.id, cred.title)}>
                        <Trash className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Credential" : "Add Vault Credential"}</DialogTitle>
            <DialogDescription>Store encrypted login credentials, SSH keys & files for a client.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 mt-2">
            
            {/* Client Selector */}
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={formData.client_id} onValueChange={val => setFormData(p => ({ ...p, client_id: val }))}>
                <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Category & Title */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={val => setFormData(p => ({ ...p, category: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Credential Title *</Label>
                <Input 
                  placeholder="e.g. WordPress Admin" 
                  value={formData.title} 
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                />
              </div>
            </div>

            {/* URL & Port */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Access URL / Host</Label>
                <Input 
                  placeholder="e.g. domain.com/wp-admin" 
                  value={formData.url} 
                  onChange={e => setFormData(p => ({ ...p, url: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input 
                  placeholder="e.g. 22 / 21" 
                  value={formData.port} 
                  onChange={e => setFormData(p => ({ ...p, port: e.target.value }))}
                />
              </div>
            </div>

            {/* Username & Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username / Email *</Label>
                <Input 
                  placeholder="Username" 
                  value={formData.username} 
                  onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Password *</Label>
                <Input 
                  type="password"
                  placeholder={isEditing ? "Leave blank to keep unchanged" : "Password"} 
                  value={formData.password} 
                  onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                />
              </div>
            </div>

            {/* SSH Key Textarea */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-purple-500" /> SSH Private Key (Encrypted AES-256)
              </Label>
              <Textarea 
                placeholder={isEditing && selectedCred?.has_ssh_key ? "Leave blank to keep current key, or paste new key..." : "Paste -----BEGIN OPENSSH PRIVATE KEY----- or RSA key here..."} 
                value={formData.ssh_key} 
                onChange={e => setFormData(p => ({ ...p, ssh_key: e.target.value }))}
                rows={3}
                className="font-mono text-xs"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes (Optional)</Label>
              <Textarea 
                placeholder="Access instructions, 2FA recovery codes or security notes..." 
                value={formData.notes} 
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {/* Confidential Toggle */}
            {canViewConfidential && (
              <div
                onClick={() => setFormData(p => ({ ...p, is_confidential: !p.is_confidential }))}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none",
                  formData.is_confidential
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600"
                    : "border-border bg-muted/30 hover:border-muted-foreground/30"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                  formData.is_confidential ? "bg-amber-500 border-amber-500" : "border-muted-foreground"
                )}>
                  {formData.is_confidential && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <Lock className={cn("w-4 h-4 flex-shrink-0", formData.is_confidential ? "text-amber-600" : "text-muted-foreground")} />
                <div className="flex-1">
                  <p className={cn("text-sm font-semibold", formData.is_confidential ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>
                    Mark as Confidential
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Only Sudo Admin and users with special permission can view this credential.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEditing ? "Save Changes" : "Save Credential"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
