"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { isPlatformSuperAdmin } from "@/lib/platform-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Building2, Plus, ShieldAlert, UserPlus, Copy, KeyRound, Users } from "lucide-react";
import { STORE_TYPES, STORE_TYPE_LABELS } from "@/lib/store-types";

interface StoreListItem {
  id: string;
  name: string;
  address: string;
  whatsapp: string;
  storeType: string;
  branchMode?: string;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  branchCount: number;
  staffCount: number;
}

interface Branch {
  id: string;
  name: string;
  type: string;
}

interface StoreUser {
  userBranchId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  isMainAdmin: boolean;
  isActive: boolean;
  branchId: string;
  branchName: string;
  createdAt: string;
}

interface StoreDetail extends StoreListItem {
  branches: Branch[];
  users: StoreUser[];
}

interface NewCredentials {
  title: string;
  email: string;
  password: string;
}

const branchModes = [
  { value: "single", label: "Single Branch (satu lokasi)" },
  { value: "multi", label: "Multi Branch (multi cabang)" },
];

const roles = ["admin", "manager", "cashier", "staff"];

const emptyStoreForm = {
  storeName: "",
  address: "",
  whatsapp: "",
  storeType: "VAPE",
  branchMode: "multi",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
};

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "staff",
  branchId: "",
  isMainAdmin: false,
};

export default function SuperAdminPage() {
  const { data: session } = useSession();
  const [access, setAccess] = useState<boolean | null>(null);

  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [storeForm, setStoreForm] = useState(emptyStoreForm);
  const [creatingStore, setCreatingStore] = useState(false);

  const [manageStoreId, setManageStoreId] = useState<string | null>(null);
  const [storeDetail, setStoreDetail] = useState<StoreDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [creatingUser, setCreatingUser] = useState(false);

  const [credentials, setCredentials] = useState<NewCredentials | null>(null);

  useEffect(() => {
    if (session?.user) {
      setAccess(isPlatformSuperAdmin(session.user.email));
    }
  }, [session]);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/stores");
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.message || "Failed to load stores");
        return;
      }
      setError(null);
      setStores(result.data);
    } catch {
      setError("Failed to load stores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access === true) fetchStores();
  }, [access, fetchStores]);

  const openManageStore = async (id: string) => {
    setManageStoreId(id);
    setLoadingDetail(true);
    setStoreDetail(null);
    try {
      const res = await fetch(`/api/superadmin/stores/${id}`);
      const result = await res.json();
      if (res.ok && result.success) {
        setStoreDetail(result.data);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateStore = async () => {
    setCreatingStore(true);
    try {
      const res = await fetch("/api/superadmin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeForm.storeName,
          address: storeForm.address,
          whatsapp: storeForm.whatsapp,
          storeType: storeForm.storeType,
          branchMode: storeForm.branchMode,
          owner: {
            name: storeForm.ownerName,
            email: storeForm.ownerEmail,
            password: storeForm.ownerPassword || undefined,
          },
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || "Gagal membuat toko");
        return;
      }
      setCreateOpen(false);
      setStoreForm(emptyStoreForm);
      setCredentials({
        title: `Toko "${storeForm.storeName}" berhasil dibuat`,
        email: result.data.owner.email,
        password: result.data.owner.temporaryPassword,
      });
      fetchStores();
    } catch {
      alert("Gagal membuat toko");
    } finally {
      setCreatingStore(false);
    }
  };

  const handleAddUser = async () => {
    if (!manageStoreId) return;
    setCreatingUser(true);
    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: manageStoreId,
          branchId: userForm.branchId,
          name: userForm.name,
          email: userForm.email,
          password: userForm.password || undefined,
          role: userForm.role,
          isMainAdmin: userForm.isMainAdmin,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || "Gagal membuat user");
        return;
      }
      setAddUserOpen(false);
      setUserForm(emptyUserForm);
      setCredentials({
        title: `User "${result.data.name}" berhasil dibuat`,
        email: result.data.email,
        password: result.data.temporaryPassword,
      });
      openManageStore(manageStoreId);
      fetchStores();
    } catch {
      alert("Gagal membuat user");
    } finally {
      setCreatingUser(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard?.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
  };

  if (access === null) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-primary"></div>
      </div>
    );
  }

  if (access === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-3">
        <ShieldAlert className="h-12 w-12 text-muted-foreground opacity-40" />
        <h2 className="text-lg font-bold">Access restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This page is only available to the platform superadmin account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Superadmin</h1>
          <p className="text-sm text-muted-foreground">Provision new stores and users across the platform</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Buat Toko Baru
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      <Card className="border-none shadow-soft bg-card">
        <CardHeader>
          <CardTitle>All Stores</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
          ) : stores.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Belum ada toko</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-center">Branches</TableHead>
                    <TableHead className="text-center">Staff</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {s.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline">{STORE_TYPE_LABELS[s.storeType as keyof typeof STORE_TYPE_LABELS] ?? s.storeType}</Badge>
                          <Badge variant="secondary" className="w-fit text-xs">
                            {s.branchMode === "single" ? "Single Branch" : "Multi Branch"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{s.ownerName || "-"}</div>
                        <div className="text-xs text-muted-foreground">{s.ownerEmail || "-"}</div>
                      </TableCell>
                      <TableCell className="text-center">{s.branchCount}</TableCell>
                      <TableCell className="text-center">{s.staffCount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openManageStore(s.id)}>
                          <Users className="h-4 w-4 mr-1" /> Kelola
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create store dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Toko Baru</DialogTitle>
            <DialogDescription>
              Membuat store, branch utama, dan akun owner (main admin) sekaligus.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nama Toko</Label>
                <Input
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                  placeholder="Toko Sejahtera"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe Toko</Label>
                <Select
                  value={storeForm.storeType}
                  onValueChange={(v) => setStoreForm({ ...storeForm, storeType: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STORE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{STORE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mode Branch</Label>
              <Select
                value={storeForm.branchMode}
                onValueChange={(v) => setStoreForm({ ...storeForm, branchMode: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {branchModes.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Single Branch: menu Branch, Branch Price, dan Margin Branch tidak diperlukan.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Alamat</Label>
              <Input
                value={storeForm.address}
                onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                placeholder="Jl. Contoh No. 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor WhatsApp</Label>
              <Input
                value={storeForm.whatsapp}
                onChange={(e) => setStoreForm({ ...storeForm, whatsapp: e.target.value })}
                placeholder="08123456789"
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-semibold mb-2">Akun Owner (Main Admin)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nama</Label>
                  <Input
                    value={storeForm.ownerName}
                    onChange={(e) => setStoreForm({ ...storeForm, ownerName: e.target.value })}
                    placeholder="Nama pemilik"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={storeForm.ownerEmail}
                    onChange={(e) => setStoreForm({ ...storeForm, ownerEmail: e.target.value })}
                    placeholder="owner@email.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5 mt-4">
                <Label>Password (opsional)</Label>
                <Input
                  type="text"
                  value={storeForm.ownerPassword}
                  onChange={(e) => setStoreForm({ ...storeForm, ownerPassword: e.target.value })}
                  placeholder="Kosongkan untuk generate otomatis"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateStore}
              disabled={creatingStore || !storeForm.storeName || !storeForm.address || !storeForm.whatsapp || !storeForm.ownerName || !storeForm.ownerEmail}
            >
              {creatingStore ? "Membuat..." : "Buat Toko"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage store dialog */}
      <Dialog open={!!manageStoreId} onOpenChange={(open) => !open && setManageStoreId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{storeDetail?.name || "Store"}</DialogTitle>
            <DialogDescription>{storeDetail?.address}</DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
          ) : storeDetail ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">Branches</p>
                <div className="flex flex-wrap gap-2">
                  {storeDetail.branches.map((b) => (
                    <Badge key={b.id} variant="outline">{b.name} ({b.type})</Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">Users</p>
                  <Button size="sm" onClick={() => setAddUserOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-1" /> Tambah User
                  </Button>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Branch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {storeDetail.users.map((u) => (
                        <TableRow key={u.userBranchId}>
                          <TableCell>{u.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{u.role}</Badge>
                            {u.isMainAdmin && <Badge className="ml-1">Main Admin</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">{u.branchName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">Store not found</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add user dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>Membuat akun baru untuk toko ini.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select value={userForm.branchId} onValueChange={(v) => setUserForm({ ...userForm, branchId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih branch" /></SelectTrigger>
                  <SelectContent>
                    {storeDetail?.branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Password (opsional)</Label>
              <Input
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Kosongkan untuk generate otomatis"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={userForm.isMainAdmin}
                onCheckedChange={(v) => setUserForm({ ...userForm, isMainAdmin: v === true })}
              />
              <Label className="font-normal">Jadikan main admin toko ini</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAddUser}
              disabled={creatingUser || !userForm.name || !userForm.email || !userForm.branchId}
            >
              {creatingUser ? "Membuat..." : "Buat User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials reveal dialog */}
      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> {credentials?.title}
            </DialogTitle>
            <DialogDescription>
              Simpan kredensial ini sekarang — password tidak akan ditampilkan lagi setelah dialog ini ditutup.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted p-4 space-y-2 font-mono text-sm">
            <div>Email: {credentials?.email}</div>
            <div>Password: {credentials?.password}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyCredentials}>
              <Copy className="h-4 w-4 mr-2" /> Salin
            </Button>
            <Button onClick={() => setCredentials(null)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
