"use client";

import React, { useEffect, useState, useMemo } from 'react';
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Plus, Search, Loader2, Eye, Pencil, Trash, FileDown, Calendar as CalendarIcon, 
  AlertTriangle, CheckCircle, Clock, ShieldAlert, FolderOpen, ArrowUpDown, X, Paperclip
} from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, addDays } from "date-fns";
import { useToast } from "@/components/ui/toast-context";
import { useRole } from "@/hooks/use-role";
import { usePermissions } from "@/hooks/use-permissions";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";

// List of supported asset types from SOW
const ASSET_TYPES = [
  "Domain", "Web Hosting", "VPS", "Dedicated Server", 
  "SSL Certificate", "Business Email", "AMC", 
  "Website Maintenance", "Cloud Subscription", "Custom Service"
];

// List of billing cycles
const BILLING_CYCLES = ["Monthly", "Quarterly", "Semi-Annually", "Yearly", "One-Time"];

// Statuses
const STATUS_OPTIONS = ["ACTIVE", "EXPIRING", "EXPIRED", "INACTIVE"];

interface Client {
  id: number;
  company_name: string;
  contact_person?: string;
  email?: string;
}

interface ClientAsset {
  id: number;
  client_id: number;
  client: Client;
  asset_type: string;
  asset_name: string;
  provider: string;
  plan: string;
  purchase_date: string;
  activation_date: string;
  expiry_date: string;
  renewal_cost: string;
  billing_cycle: string;
  status: string;
  alert_email?: string;
  notes?: string;
  attachments?: string[];
  reminders_sent?: number[];
  created_at: string;
}

export default function ClientAssetsPage() {
  const { toast } = useToast();
  const { isAdmin } = useRole();
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('assets', 'create');
  const canEdit = hasPermission('assets', 'edit');
  const canDelete = hasPermission('assets', 'delete');

  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");

  // Dialog States
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ClientAsset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Form Fields State
  const [formData, setFormData] = useState({
    client_id: "",
    asset_type: ASSET_TYPES[0],
    asset_name: "",
    provider: "",
    plan: "",
    purchase_date: format(new Date(), "yyyy-MM-dd"),
    activation_date: format(new Date(), "yyyy-MM-dd"),
    expiry_date: format(addDays(new Date(), 365), "yyyy-MM-dd"),
    renewal_cost: "",
    billing_cycle: "Yearly",
    status: "ACTIVE",
    alert_email: "",
    notes: "",
    attachments: [] as string[]
  });

  // Sort State
  const [sortField, setSortField] = useState<keyof ClientAsset>("expiry_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Load Initial Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [assetsRes, clientsRes] = await Promise.all([
        api.get("/assets"),
        api.get("/clients")
      ]);
      setAssets(assetsRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      console.error("Failed to load assets data:", err);
      toast("Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter and Sort Data
  const processedAssets = useMemo(() => {
    let result = [...assets];

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.asset_name.toLowerCase().includes(lower) ||
        item.provider.toLowerCase().includes(lower) ||
        item.client.company_name.toLowerCase().includes(lower)
      );
    }

    // Type Filter
    if (typeFilter !== "ALL") {
      result = result.filter(item => item.asset_type === typeFilter);
    }

    // Status Filter
    if (statusFilter !== "ALL") {
      result = result.filter(item => item.status === statusFilter);
    }

    // Client Filter
    if (clientFilter !== "ALL") {
      result = result.filter(item => item.client_id === Number(clientFilter));
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nested client name sort
      if (sortField === "client" as any) {
        aVal = a.client.company_name;
        bVal = b.client.company_name;
      }

      if (sortField === "renewal_cost") {
        aVal = Number(a.renewal_cost);
        bVal = Number(b.renewal_cost);
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [assets, searchTerm, typeFilter, statusFilter, clientFilter, sortField, sortOrder]);

  // Overview Metrics Calculations
  const metrics = useMemo(() => {
    const total = assets.length;
    const active = assets.filter(a => a.status === 'ACTIVE').length;
    const expired = assets.filter(a => a.status === 'EXPIRED').length;
    
    // Expiring in 30 days (status is EXPIRING or expiry date is within 30 days)
    const expiring = assets.filter(a => {
      if (a.status === 'EXPIRED') return false;
      const expiry = new Date(a.expiry_date).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    }).length;

    // Upcoming renewal costs (renewals in the next 30 days)
    const upcomingRenewalsVal = assets
      .filter(a => {
        if (a.status === 'EXPIRED' || a.status === 'INACTIVE') return false;
        const expiry = new Date(a.expiry_date).getTime();
        const now = new Date().getTime();
        const diff = expiry - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 30;
      })
      .reduce((sum, a) => sum + Number(a.renewal_cost), 0);

    return { total, active, expiring, expired, upcomingRenewalsVal };
  }, [assets]);

  // Chart Data: Renewals by Month
  const renewalsChartData = useMemo(() => {
    const monthsMap: Record<string, number> = {};
    const now = new Date();
    
    // Initialize next 6 months
    for (let i = 0; i < 6; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = format(futureDate, "MMM yyyy");
      monthsMap[key] = 0;
    }

    assets.forEach(asset => {
      if (asset.status === 'EXPIRED' || asset.status === 'INACTIVE') return;
      const expiry = new Date(asset.expiry_date);
      const key = format(expiry, "MMM yyyy");
      if (monthsMap[key] !== undefined) {
        monthsMap[key] += Number(asset.renewal_cost);
      }
    });

    return Object.entries(monthsMap).map(([month, cost]) => ({ month, cost }));
  }, [assets]);

  // Chart Data: Asset Type Distribution
  const typeChartData = useMemo(() => {
    const distribution: Record<string, number> = {};
    assets.forEach(asset => {
      distribution[asset.asset_type] = (distribution[asset.asset_type] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const COLORS = ['#3A6EF3', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];

  const getAutoStatus = (expiryDateStr: string, currentStatus: string) => {
    if (currentStatus === 'INACTIVE') return 'INACTIVE';
    if (!expiryDateStr) return 'ACTIVE';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    
    const diffMs = expiry.getTime() - today.getTime();
    const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
      return 'EXPIRED';
    } else if (daysRemaining <= 30) {
      return 'EXPIRING';
    } else {
      return 'ACTIVE';
    }
  };

  // Form Operations
  const openCreateForm = () => {
    setIsEditing(false);
    setFormData({
      client_id: clients[0]?.id.toString() || "",
      asset_type: ASSET_TYPES[0],
      asset_name: "",
      provider: "",
      plan: "",
      purchase_date: format(new Date(), "yyyy-MM-dd"),
      activation_date: format(new Date(), "yyyy-MM-dd"),
      expiry_date: format(addDays(new Date(), 365), "yyyy-MM-dd"),
      renewal_cost: "",
      billing_cycle: "Yearly",
      status: "ACTIVE",
      alert_email: "",
      notes: "",
      attachments: []
    });
    setFormOpen(true);
  };

  const openEditForm = (asset: ClientAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setSelectedAsset(asset);
    setFormData({
      client_id: asset.client_id.toString(),
      asset_type: asset.asset_type,
      asset_name: asset.asset_name,
      provider: asset.provider,
      plan: asset.plan,
      purchase_date: format(new Date(asset.purchase_date), "yyyy-MM-dd"),
      activation_date: format(new Date(asset.activation_date), "yyyy-MM-dd"),
      expiry_date: format(new Date(asset.expiry_date), "yyyy-MM-dd"),
      renewal_cost: asset.renewal_cost,
      billing_cycle: asset.billing_cycle,
      status: asset.status,
      alert_email: asset.alert_email || "",
      notes: asset.notes || "",
      attachments: asset.attachments || []
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.asset_name || !formData.renewal_cost) {
      return toast("Please fill in all required fields", "warning");
    }

    try {
      if (isEditing && selectedAsset) {
        await api.put(`/assets/${selectedAsset.id}`, formData);
        toast("Asset updated successfully", "success");
      } else {
        await api.post("/assets", formData);
        toast("Asset registered successfully", "success");
      }
      setFormOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast("Operation failed", "error");
    }
  };

  const handleDeleteAsset = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this asset record?")) return;

    try {
      await api.delete(`/assets/${id}`);
      toast("Asset deleted successfully", "success");
      loadData();
    } catch (err) {
      console.error(err);
      toast("Failed to delete record", "error");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploaderData = new FormData();
    uploaderData.append("file", file);

    try {
      setUploadingFile(true);
      const res = await api.post("/upload", uploaderData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, res.data.filePath]
      }));
      toast("Attachment uploaded successfully", "success");
    } catch (err: any) {
      console.error(err);
      toast(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleSort = (field: keyof ClientAsset) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const viewAssetDetails = (asset: ClientAsset) => {
    setSelectedAsset(asset);
    setDetailOpen(true);
  };

  // Export Helpers
  const formatMoney = (val: any) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(val) || 0);
  };

  const handleExportCSV = () => {
    const headers = ["Client", "Asset Name", "Type", "Provider", "Plan", "Expiry Date", "Renewal Cost", "Billing Cycle", "Status"];
    const rows = processedAssets.map(a => [
      a.client.company_name,
      a.asset_name,
      a.asset_type,
      a.provider,
      a.plan,
      format(new Date(a.expiry_date), "dd MMM yyyy"),
      Number(a.renewal_cost).toFixed(2),
      a.billing_cycle,
      a.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Client_Assets_Export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const worksheetData = processedAssets.map(a => ({
        "Client Name": a.client.company_name,
        "Asset Name": a.asset_name,
        "Asset Type": a.asset_type,
        "Provider": a.provider,
        "Plan": a.plan,
        "Expiry Date": format(new Date(a.expiry_date), "yyyy-MM-dd"),
        "Renewal Cost (INR)": Number(a.renewal_cost),
        "Billing Cycle": a.billing_cycle,
        "Status": a.status,
        "Notes": a.notes || ""
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      
      // Auto-size columns
      const maxLens = Object.keys(worksheetData[0] || {}).map(key => {
        return Math.max(
          key.length,
          ...worksheetData.map(row => String((row as any)[key] || "").length)
        );
      });
      ws["!cols"] = maxLens.map(len => ({ wch: len + 3 }));

      XLSX.utils.book_append_sheet(wb, ws, "Assets");
      XLSX.writeFile(wb, `Client_Assets_${format(new Date(), "yyyyMMdd")}.xlsx`);
      toast("Excel file exported successfully", "success");
    } catch (err) {
      console.error(err);
      toast("Excel library not ready. Using CSV.", "info");
      handleExportCSV();
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("CLIENT RENEWABLE ASSETS REPORT", 14, 18);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 14, 24);
      doc.text(`Total Records: ${processedAssets.length}`, 14, 29);

      const tableData = processedAssets.map((a, i) => [
        i + 1,
        a.client.company_name,
        a.asset_name,
        a.asset_type,
        a.provider,
        format(new Date(a.expiry_date), "dd MMM yyyy"),
        formatMoney(a.renewal_cost),
        a.billing_cycle,
        a.status
      ]);

      autoTable(doc, {
        startY: 34,
        head: [["S.No", "Client", "Asset Name", "Type", "Provider", "Expiry Date", "Renewal Cost", "Billing", "Status"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [58, 110, 243] },
        styles: { fontSize: 8, font: "helvetica" }
      });

      doc.save(`Client_Assets_${format(new Date(), "yyyyMMdd")}.pdf`);
      toast("PDF file exported successfully", "success");
    } catch (err) {
      console.error(err);
      toast("PDF library not ready. Using CSV.", "info");
      handleExportCSV();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 w-full max-w-[100vw] overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Assets</h1>
          <p className="text-muted-foreground font-medium">Manage and monitor recurring services like Domains, Web Hosting, and VPS subscriptions.</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateForm} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" /> Add New Asset
          </Button>
        )}
      </div>

      {/* OVERVIEW METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        <MetricCard title="Total Assets" value={metrics.total} icon={<FolderOpen />} color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" />
        <MetricCard title="Active Services" value={metrics.active} icon={<CheckCircle />} color="text-green-600" bg="bg-green-50 dark:bg-green-900/20" />
        <MetricCard title="Expiring in 30 Days" value={metrics.expiring} icon={<Clock />} color="text-amber-500" bg="bg-amber-50 dark:bg-amber-900/20" />
        <MetricCard title="Expired Assets" value={metrics.expired} icon={<ShieldAlert />} color="text-rose-600" bg="bg-rose-50 dark:bg-rose-900/20" />
        <MetricCard title="30-Day Renewals" value={formatMoney(metrics.upcomingRenewalsVal)} icon={<AlertTriangle />} color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" isCurrency />
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border border-border/50 bg-card">
          <CardHeader>
            <CardTitle>Renewal Pipeline</CardTitle>
            <CardDescription>Sum of costs for assets expiring in the next 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={renewalsChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="cost" name="Renewal Cost" fill="#3A6EF3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border/50 bg-card">
          <CardHeader>
            <CardTitle>Asset Types</CardTitle>
            <CardDescription>Distribution of active assets by type</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex justify-center items-center">
            {assets.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col xl:flex-row gap-4 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search Asset, Client, Provider..." 
            className="pl-9 bg-background"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Filter */}
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Clients</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Export Dropdown */}
          <Select onValueChange={(val) => {
            if (val === 'csv') handleExportCSV();
            if (val === 'excel') handleExportExcel();
            if (val === 'pdf') handleExportPDF();
          }}>
            <SelectTrigger className="w-[120px] bg-background border-input"><FileDown className="w-4 h-4 mr-2" /> Export</SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">Export CSV</SelectItem>
              <SelectItem value="excel">Export Excel</SelectItem>
              <SelectItem value="pdf">Export PDF</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {(searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL' || clientFilter !== 'ALL') && (
            <Button variant="ghost" size="icon" onClick={() => {
              setSearchTerm(""); setTypeFilter("ALL"); setStatusFilter("ALL"); setClientFilter("ALL");
            }}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ASSETS TABLE */}
      <Card className="shadow-sm border-none bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-muted-foreground flex justify-center items-center">
              <Loader2 className="animate-spin mr-2 h-5 w-5 text-primary" /> Loading asset records...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('client' as any)}>
                    Client <ArrowUpDown className="inline-block w-3 h-3 ml-1" />
                  </TableHead>
                  <TableHead className="cursor-pointer font-bold" onClick={() => handleSort('asset_name')}>
                    Asset Name <ArrowUpDown className="inline-block w-3 h-3 ml-1" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('asset_type')}>
                    Type <ArrowUpDown className="inline-block w-3 h-3 ml-1" />
                  </TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('expiry_date')}>
                    Expiry Date <ArrowUpDown className="inline-block w-3 h-3 ml-1" />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('renewal_cost')}>
                    Renewal Cost <ArrowUpDown className="inline-block w-3 h-3 ml-1" />
                  </TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedAssets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground font-medium">
                      No assets found matching the criteria.
                    </TableCell>
                  </TableRow>
                )}
                {processedAssets.map((asset) => {
                  const daysLeft = Math.ceil((new Date(asset.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => viewAssetDetails(asset)}>
                      <TableCell className="font-semibold text-foreground">{asset.client.company_name}</TableCell>
                      <TableCell className="font-medium text-foreground">{asset.asset_name}</TableCell>
                      <TableCell>{asset.asset_type}</TableCell>
                      <TableCell className="text-muted-foreground">{asset.provider || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{format(new Date(asset.expiry_date), "dd MMM yyyy")}</span>
                          {asset.status === 'ACTIVE' && daysLeft > 0 && daysLeft <= 30 && (
                            <span className="text-[10px] text-amber-500 font-bold">Expires in {daysLeft} days</span>
                          )}
                          {asset.status === 'ACTIVE' && daysLeft <= 0 && (
                            <span className="text-[10px] text-rose-500 font-bold">Expired</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">{formatMoney(asset.renewal_cost)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{asset.billing_cycle}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide
                          ${asset.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800' : ''}
                          ${asset.status === 'EXPIRING' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800' : ''}
                          ${asset.status === 'EXPIRED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800' : ''}
                          ${asset.status === 'INACTIVE' ? 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800' : ''}
                        `}>
                          {asset.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary rounded-full" onClick={() => viewAssetDetails(asset)} title="View Details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary rounded-full" onClick={(e) => openEditForm(asset, e)} title="Edit Asset">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-full" onClick={(e) => handleDeleteAsset(asset.id, e)} title="Delete Asset">
                              <Trash className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE & EDIT DIALOG */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Asset Record" : "Add New Asset"}</DialogTitle>
            <DialogDescription>Store renewal information for client-related recurring services.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              
              {/* Client selection */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="client_id">Client *</Label>
                <Select value={formData.client_id} onValueChange={(val) => setFormData(prev => ({ ...prev, client_id: val }))}>
                  <SelectTrigger id="client_id" className="w-full">
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Asset Name */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="asset_name">Asset Name *</Label>
                <Input 
                  id="asset_name" 
                  value={formData.asset_name} 
                  onChange={e => setFormData(prev => ({ ...prev, asset_name: e.target.value }))}
                  placeholder="e.g. bpdoxs.com" 
                />
              </div>

              {/* Asset Type */}
              <div className="space-y-2">
                <Label htmlFor="asset_type">Asset Type *</Label>
                <Select value={formData.asset_type} onValueChange={(val) => setFormData(prev => ({ ...prev, asset_type: val }))}>
                  <SelectTrigger id="asset_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Provider */}
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input 
                  id="provider" 
                  value={formData.provider} 
                  onChange={e => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="e.g. GoDaddy, AWS" 
                />
              </div>

              {/* Plan */}
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Input 
                  id="plan" 
                  value={formData.plan} 
                  onChange={e => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                  placeholder="e.g. Premium Shared, 2GB VPS" 
                />
              </div>

              {/* Renewal Cost */}
              <div className="space-y-2">
                <Label htmlFor="renewal_cost">Renewal Cost (INR) *</Label>
                <Input 
                  id="renewal_cost" 
                  type="number"
                  step="0.01"
                  value={formData.renewal_cost} 
                  onChange={e => setFormData(prev => ({ ...prev, renewal_cost: e.target.value }))}
                  placeholder="0.00" 
                />
              </div>

              {/* Dates */}
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input 
                  id="purchase_date" 
                  type="date"
                  value={formData.purchase_date} 
                  onChange={e => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="activation_date">Activation Date</Label>
                <Input 
                  id="activation_date" 
                  type="date"
                  value={formData.activation_date} 
                  onChange={e => setFormData(prev => ({ ...prev, activation_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date *</Label>
                <Input 
                  id="expiry_date" 
                  type="date"
                  value={formData.expiry_date} 
                  onChange={e => {
                    const newExpiry = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      expiry_date: newExpiry,
                      status: getAutoStatus(newExpiry, prev.status)
                    }));
                  }}
                />
              </div>

              {/* Billing Cycle */}
              <div className="space-y-2">
                <Label htmlFor="billing_cycle">Billing Cycle</Label>
                <Select value={formData.billing_cycle} onValueChange={(val) => setFormData(prev => ({ ...prev, billing_cycle: val }))}>
                  <SelectTrigger id="billing_cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Alert Email */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="alert_email">Notification / Alert Email (Optional)</Label>
                <Input 
                  id="alert_email" 
                  type="email"
                  value={formData.alert_email} 
                  onChange={e => setFormData(prev => ({ ...prev, alert_email: e.target.value }))}
                  placeholder="e.g. alert@bpdoxs.com (Leave blank to use default SMTP email)" 
                />
                <p className="text-[11px] text-muted-foreground">Specify custom email address to receive expiry alerts for this asset.</p>
              </div>

              {/* Notes */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  value={formData.notes} 
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter login details, access credentials or other instructions." 
                />
              </div>

              {/* File Attachment Upload */}
              <div className="col-span-2 space-y-2">
                <Label>Document Attachments</Label>
                <div className="flex gap-2 items-center">
                  <Input id="file_attachment" type="file" onChange={handleFileChange} className="hidden" disabled={uploadingFile} />
                  <Label htmlFor="file_attachment" className="flex items-center gap-2 p-2 border border-border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 text-xs font-semibold">
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                    {uploadingFile ? "Uploading..." : "Attach Document (Max 5MB)"}
                  </Label>
                </div>
                
                {formData.attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex justify-between items-center text-xs p-1.5 bg-muted rounded border border-border">
                        <span className="truncate max-w-[320px] font-mono">{file.split('/').pop()}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAttachment(index)} className="h-5 w-5 rounded-full text-rose-500 hover:text-rose-600">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {isEditing ? "Save Changes" : "Register Asset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          {selectedAsset && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide
                    ${selectedAsset.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    ${selectedAsset.status === 'EXPIRING' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                    ${selectedAsset.status === 'EXPIRED' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                    ${selectedAsset.status === 'INACTIVE' ? 'bg-slate-50 text-slate-700 border-slate-200' : ''}
                  `}>
                    {selectedAsset.status}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">ID: {selectedAsset.id}</span>
                </div>
                <DialogTitle className="text-2xl font-bold mt-2">{selectedAsset.asset_name}</DialogTitle>
                <DialogDescription>Type: {selectedAsset.asset_type}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 my-2 text-sm border-t border-b border-border/50 py-4">
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground block">Client</span>
                    <span className="font-semibold">{selectedAsset.client.company_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Provider</span>
                    <span className="font-semibold">{selectedAsset.provider || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Plan</span>
                    <span>{selectedAsset.plan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Renewal Cost</span>
                    <span className="font-bold text-foreground">{formatMoney(selectedAsset.renewal_cost)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Billing Cycle</span>
                    <span>{selectedAsset.billing_cycle}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Expiry Date</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{format(new Date(selectedAsset.expiry_date), "dd MMM yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Purchase Date</span>
                    <span>{format(new Date(selectedAsset.purchase_date), "dd MMM yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Activation Date</span>
                    <span>{format(new Date(selectedAsset.activation_date), "dd MMM yyyy")}</span>
                  </div>
                  {selectedAsset.alert_email && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground block">Alert Email</span>
                      <span className="font-semibold text-primary">{selectedAsset.alert_email}</span>
                    </div>
                  )}
                </div>

                {selectedAsset.notes && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Notes</span>
                    <div className="p-3 bg-muted rounded-lg font-mono text-xs whitespace-pre-wrap leading-relaxed border border-border">
                      {selectedAsset.notes}
                    </div>
                  </div>
                )}

                {selectedAsset.attachments && selectedAsset.attachments.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1.5">Document Attachments</span>
                    <div className="space-y-1.5">
                      {selectedAsset.attachments.map((file, i) => (
                        <a 
                          key={i} 
                          href={file.startsWith('/uploads') ? api.defaults.baseURL?.replace('/api', '') + file : file} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="flex items-center gap-2 p-2 bg-muted hover:bg-muted/70 rounded border border-border text-xs text-primary font-semibold transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate font-mono">{file.split('/').pop()}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
                {isAdmin && (
                  <Button variant="destructive" size="sm" onClick={(e) => { setDetailOpen(false); handleDeleteAsset(selectedAsset.id, e); }}>
                    Delete Record
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>Close</Button>
                  <Button size="sm" className="bg-primary text-primary-foreground" onClick={(e) => { setDetailOpen(false); openEditForm(selectedAsset, e); }}>
                    Edit Record
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Reusable Metric Card Component
function MetricCard({ title, value, icon, color, bg, isCurrency = false }: any) {
  return (
    <Card className="shadow-sm border border-border/50 bg-card hover:scale-[1.01] transition-transform duration-200">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <h3 className="text-xl font-bold text-foreground mt-1 truncate">{value}</h3>
        </div>
        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${bg} ${color}`}>
          {React.isValidElement(icon) 
            ? React.cloneElement(icon as React.ReactElement<any>, { className: "h-5 w-5" }) 
            : icon}
        </div>
      </CardContent>
    </Card>
  );
}
