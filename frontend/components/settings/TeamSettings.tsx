"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Loader2, ShieldAlert, UserPlus, Key, CheckSquare, Square, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";
import { useRole } from "@/hooks/use-role";

const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard Overview", actions: ["view"] },
  { key: "invoices", label: "Invoices", actions: ["view", "create", "edit", "delete", "email"] },
  { key: "quotations", label: "Quotations", actions: ["view", "create", "edit", "delete", "email"] },
  { key: "clients", label: "Clients", actions: ["view", "create", "edit", "delete"] },
  { key: "assets", label: "Client Assets", actions: ["view", "create", "edit", "delete"] },
  { key: "vault", label: "Credential Vault", actions: ["view", "create", "edit", "delete"] },
  { key: "expenses", label: "Expenses", actions: ["view", "create", "edit", "delete"] },
  { key: "reports", label: "Financial Ledger", actions: ["view"] },
  { key: "activity", label: "Activity Log", actions: ["view"] },
  { key: "settings", label: "System Settings", actions: ["view"] }
];

interface TeamSettingsProps {
  disabled?: boolean;
}

export function TeamSettings({ disabled }: TeamSettingsProps) {
  const { toast } = useToast();
  const { isSudo } = useRole();
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'USER' });
  const [loading, setLoading] = useState(false);

  // Permission Matrix Modal State
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPerms, setUserPerms] = useState<{ [key: string]: string[] }>({});
  const [savingPerms, setSavingPerms] = useState(false);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (e) {
      console.error("Failed to load users");
    }
  };

  const createUser = async () => {
    if (disabled) return;
    if (!newUser.email || !newUser.password) {
      return toast("Email and Password are required", "warning");
    }
    
    setLoading(true);
    try { 
      // Default basic view permission matrix for new staff users
      const defaultPermissions = {
        dashboard: ["view"],
        invoices: ["view"],
        quotations: ["view"],
        clients: ["view"],
        assets: ["view"],
        expenses: ["view"],
        reports: ["view"]
      };

      await api.post('/users', { ...newUser, permissions: defaultPermissions }); 
      setNewUser({ email: '', password: '', role: 'USER' }); 
      loadUsers(); 
      toast("User created successfully with default permissions!", "success");
    } 
    catch(e: any) { 
      toast(e.response?.data?.error || "Failed to create user", "error"); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  const deleteUser = async (id: number) => {
    if (disabled) return;
    if (!confirm("Are you sure you want to delete this user?")) return;

    try { 
      await api.delete(`/users/${id}`); 
      loadUsers();
      toast("User deleted successfully", "success");
    } catch(e: any) { 
      toast(e.response?.data?.error || "Delete failed", "error"); 
    }
  };

  // Open Permission Matrix Modal
  const openPermissionModal = (u: any) => {
    setSelectedUser(u);
    setUserPerms(u.permissions || {
      dashboard: ["view"],
      invoices: ["view"],
      quotations: ["view"],
      clients: ["view"],
      assets: ["view"],
      expenses: ["view"],
      reports: ["view"]
    });
    setPermModalOpen(true);
  };

  // Toggle Checkbox Permission Action
  const togglePermission = (moduleKey: string, action: string) => {
    setUserPerms(prev => {
      const currentActions = prev[moduleKey] || [];
      const updated = currentActions.includes(action)
        ? currentActions.filter(a => a !== action)
        : [...currentActions, action];

      return {
        ...prev,
        [moduleKey]: updated
      };
    });
  };

  // Save Permissions Matrix
  const savePermissions = async () => {
    if (!selectedUser) return;
    setSavingPerms(true);
    try {
      await api.put(`/users/${selectedUser.id}/permissions`, { permissions: userPerms });
      toast(`Permissions updated for ${selectedUser.email}`, "success");
      setPermModalOpen(false);
      loadUsers();
    } catch (e: any) {
      toast(e.response?.data?.error || "Failed to update permissions", "error");
    } finally {
      setSavingPerms(false);
    }
  };

  const canEdit = isSudo && !disabled; 

  return (
    <Card className="shadow-horizon border-none bg-card">
      <CardHeader>
        <CardTitle>Team & Identity Access Management (IAM)</CardTitle>
        <CardDescription>Manage staff credentials and configure granular module permission matrix.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* ADD USER FORM */}
        {canEdit ? (
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-end border-b border-border pb-6">
            <div className="space-y-2 flex-1 w-full">
              <Label>New User Email</Label>
              <Input 
                placeholder="staff@company.com" 
                value={newUser.email} 
                onChange={e => setNewUser({...newUser, email: e.target.value})} 
              />
            </div>
            <div className="space-y-2 flex-1 w-full">
              <Label>Password</Label>
              <Input 
                type="password" 
                placeholder="••••••" 
                value={newUser.password} 
                onChange={e => setNewUser({...newUser, password: e.target.value})} 
              />
            </div>
            <div className="space-y-2 w-full md:w-[150px]">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={val => setNewUser({...newUser, role: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User (Staff)</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createUser} disabled={loading} className="bg-primary text-primary-foreground">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><UserPlus className="w-4 h-4 mr-2"/> Add User</>}
            </Button>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Only the Owner (Sudo Admin) can create users and configure IAM permission matrices.</span>
          </div>
        )}

        {/* USER LIST TABLE */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions Matrix</TableHead>
                <TableHead>Security</TableHead>
                <TableHead className="text-right">Joined</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => {
                const isOwner = u.role === 'SUDO_ADMIN';
                const permCount = Object.values(u.permissions || {}).flatMap((a: any) => a).length;

                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={isOwner ? 'default' : (u.role === 'ADMIN' ? 'secondary' : 'outline')}>
                        {u.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isOwner ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Unrestricted Access
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium">{permCount} actions allowed</span>
                          {canEdit && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs gap-1"
                              onClick={() => openPermissionModal(u)}
                            >
                              <Key className="w-3 h-3" /> Edit Permissions
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.two_factor_enabled 
                        ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">2FA Active</Badge> 
                        : <span className="text-muted-foreground text-xs">Unsecured</span>
                      }
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        {!isOwner && (
                          <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)} className="hover:bg-red-50 hover:text-red-600 rounded-full">
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* PERMISSION MATRIX MODAL */}
        <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" /> IAM Permission Matrix for {selectedUser?.email}
              </DialogTitle>
              <DialogDescription>
                Check or uncheck individual module actions to configure exact access control for this user.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Module</TableHead>
                    <TableHead className="text-center">View</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Edit</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                    <TableHead className="text-center">Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_MODULES.map(m => {
                    const activeActions = userPerms[m.key] || [];

                    return (
                      <TableRow key={m.key}>
                        <TableCell className="font-semibold text-sm">{m.label}</TableCell>
                        {["view", "create", "edit", "delete", "email"].map(action => {
                          const isSupported = m.actions.includes(action);
                          const isChecked = activeActions.includes(action);

                          if (!isSupported) {
                            return <TableCell key={action} className="text-center text-muted-foreground/30">—</TableCell>;
                          }

                          return (
                            <TableCell key={action} className="text-center cursor-pointer hover:bg-muted/30" onClick={() => togglePermission(m.key, action)}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}} // Handled by TableCell onClick
                                className="w-4 h-4 text-primary rounded border-border focus:ring-primary cursor-pointer"
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPermModalOpen(false)}>Cancel</Button>
              <Button onClick={savePermissions} disabled={savingPerms} className="bg-primary text-primary-foreground">
                {savingPerms ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Permissions Matrix
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
}