"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Settings2, Search } from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  backingProductId: string | null;
}

interface BranchOption {
  id: string;
  name: string;
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  branchId: "",
};

export default function ServicePage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetch(`/api/services?${params}`);
      const result = await res.json();
      if (result.success) {
        setServices(result.data);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await fetch("/api/branches?page=1&limit=100");
        const result = await res.json();
        if (result.success) {
          setBranches(result.data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })));
        }
      } catch (error) {
        console.error("Error fetching branches:", error);
      }
    };
    fetchBranches();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (s: ServiceItem) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description || "",
      price: String(parseFloat(s.price) || 0),
      branchId: s.branchId || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Nama service wajib diisi");
      return;
    }
    if (form.price === "" || Number(form.price) < 0) {
      alert("Harga service tidak valid");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        branchId: form.branchId || undefined,
      };
      const res = editingId
        ? await fetch(`/api/services/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || "Gagal menyimpan service");
        return;
      }
      setFormOpen(false);
      fetchServices();
    } catch {
      alert("Gagal menyimpan service");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (s: ServiceItem) => {
    try {
      await fetch(`/api/services/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      fetchServices();
    } catch {
      alert("Gagal mengubah status service");
    }
  };

  const handleDelete = async (s: ServiceItem) => {
    if (!confirm(`Hapus service "${s.name}"?`)) return;
    try {
      const res = await fetch(`/api/services/${s.id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || "Gagal menghapus service");
        return;
      }
      fetchServices();
    } catch {
      alert("Gagal menghapus service");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Service
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola biaya service yang tersedia di bengkel — otomatis muncul di POS
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Service
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Memuat...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Belum ada service. Klik &quot;Tambah Service&quot; untuk memulai.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Nama Service</th>
                    <th className="pb-2 pr-4 font-medium">Biaya</th>
                    <th className="pb-2 pr-4 font-medium">Branch</th>
                    <th className="pb-2 pr-4 font-medium">Deskripsi</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{s.name}</td>
                      <td className="py-3 pr-4">
                        Rp {parseFloat(s.price).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-4">{s.branchName || "-"}</td>
                      <td className="py-3 pr-4 max-w-xs truncate">{s.description || "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={s.isActive ? "default" : "secondary"}>
                          {s.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={s.isActive}
                            onCheckedChange={() => handleToggleActive(s)}
                            aria-label="Toggle aktif"
                          />
                          <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(s)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Tambah Service"}</DialogTitle>
            <DialogDescription>
              Service yang aktif akan tampil sebagai pilihan jasa di POS.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Service</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Ganti Oli Mesin, Tune Up, Servis Rem"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Biaya (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="cth: 75000"
              />
            </div>
            {branches.length > 0 && (
              <div className="space-y-1.5">
                <Label>Branch (opsional)</Label>
                <Select
                  value={form.branchId || "none"}
                  onValueChange={(v) => setForm({ ...form, branchId: v === "none" ? "" : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Semua Branch</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Deskripsi (opsional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Catatan tambahan"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
