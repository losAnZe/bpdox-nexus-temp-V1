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
  Pencil, Trash, Shield, Server, Globe, Database, Cpu, Terminal, Lock, X 
} from "lucide-react";
import { useToast } from "@/components/ui/toast-context";
import { usePermissions } from "@/hooks/use-permissions";

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
  created_at: string;
  updated_at: string;
}

export default function VaultPage() {
  const { toast } = useToast();
  const { isSudo, hasPermission } = usePermissions();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");

  // State for Revealed Passwords map { [credentialId]: "plainPassword" }
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: number]: string }>({});
  const [revealingId, setRevealingId] = useState<number | null>(null);
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
    notes: ""
  });

  const canView = hasPermission('vault', 'view');
  const canCreate = hasPermission('vault', 'create');
  const canEdit = hasPermission('vault', 'edit');
  const canDelete = hasPermission('vault', 'delete');

  const fetchData = async () => {
    try {
      const [credRes, clientRes] = await Promise.all([
        api.get('/vault'),
        api.get('/clients')
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
      // Hide password
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
      toast("Password revealed & action logged in activity audit trail.", "info");
    } catch (err: any) {
      toast(err.response?.data?.error || "Failed to reveal password", "error");
    } finally {
      setRevealingId(null);
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
      notes: ""
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
      notes: cred.notes || ""
    });
    setFormOpen(true);
  };

  // Handle Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.title || !formData.username || !formData.password) {
      return toast("Client, Title, Username, and Password are required.", "warning");
    }

    setSubmitting(true);
    try {
      if (isEditing && selectedCred) {
        await api.put(`/vault/${selectedCred.id}`, formData);
        toast("Credential updated successfully", "success");
      } else {
        await api.post('/vault', formData);
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
            <p className="text-xs md:text-sm text-muted-foreground">Encrypted password vault for client hosting, cPanel, CMS, SSH & logins.</p>
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
                    
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border shrink-0">
                      {cred.category}
                    </span>
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

                  {/* PORT */}
                  {cred.port && (
                    <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                      <span className="text-muted-foreground">Port:</span>
                      <span className="font-mono font-semibold">{cred.port}</span>
                    </div>
                  )}

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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Credential" : "Add Vault Credential"}</DialogTitle>
            <DialogDescription>Store encrypted login credentials for a client.</DialogDescription>
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

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes (Optional)</Label>
              <Textarea 
                placeholder="Access instructions, 2FA recovery codes or security notes..." 
                value={formData.notes} 
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

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
