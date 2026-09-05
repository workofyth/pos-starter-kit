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
import { Plus, Pencil, Trash2, Wrench, Search } from "lucide-react";

interface Mechanic {
  id: string;
  name: string;
  phone: string | null;
  serviceType: string;
  servicePrice: string;
  description: string | null;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
}

interface BranchOption {
  id: string;
  name: string;
}

const emptyForm = {
  name: "",
  phone: "",
  serviceType: "",
  servicePrice: "",
  description: "",
  branchId: "",
};

export default function MekanikPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMechanics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetch(`/api/mechanics?${params}`);
      const result = await res.json();
      if (result.success) {
        setMechanics(result.data);
      }
    } catch (error) {
      console.error("Error fetching mechanics:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchMechanics();
  }, [fetchMechanics]);

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

  const openEdit = (m: Mechanic) => {
    setEditingId(m.id);
    setForm({
      name: m.name,
      phone: m.phone || "",
      serviceType: m.serviceType,
      servicePrice: String(parseFloat(m.servicePrice) || 0),
      description: m.description || "",
      branchId: m.branchId || "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.serviceType.trim()) {
      alert("Nama mekanik dan jenis jasa wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone || undefined,
        serviceType: form.serviceType,
        servicePrice: Number(form.servicePrice) || 0,
        description: form.description || undefined,
        branchId: form.branchId || undefined,
      };
      const res = editingId
        ? await fetch(`/api/mechanics/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/mechanics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || "Gagal menyimpan mekanik");
        return;
      }
      setFormOpen(false);
      fetchMechanics();
    } catch {
      alert("Gagal menyimpan mekanik");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: Mechanic) => {
    try {
      await fetch(`/api/mechanics/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      fetchMechanics();
    } catch {
      alert("Gagal mengubah status mekanik");
    }
  };

  const handleDelete = async (m: Mechanic) => {
    if (!confirm(`Hapus mekanik "${m.name}" (${m.serviceType})?`)) return;
    try {
      const res = await fetch(`/api/mechanics/${m.id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok || !result.success) {
        alert(result.message || "Gagal menghapus mekanik");
        return;
      }
      fetchMechanics();
    } catch {
      alert("Gagal menghapus mekanik");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            Mekanik
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola mekanik dan harga jasa servis untuk POS Bengkel
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Mekanik
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama mekanik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Memuat...</p>
          ) : mechanics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Belum ada mekanik. Klik &quot;Tambah Mekanik&quot; untuk memulai.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Nama</th>
                    <th className="pb-2 pr-4 font-medium">Jenis Jasa</th>
                    <th className="pb-2 pr-4 font-medium">Harga Jasa</th>
                    <th className="pb-2 pr-4 font-medium">Branch</th>
                    <th className="pb-2 pr-4 font-medium">Telepon</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {mechanics.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{m.name}</td>
                      <td className="py-3 pr-4">{m.serviceType}</td>
                      <td className="py-3 pr-4">
                        Rp {parseFloat(m.servicePrice).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-4">{m.branchName || "-"}</td>
                      <td className="py-3 pr-4">{m.phone || "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={m.isActive ? "default" : "secondary"}>
                          {m.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={m.isActive}
                            onCheckedChange={() => handleToggleActive(m)}
                            aria-label="Toggle aktif"
                          />
                          <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(m)}>
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
            <DialogTitle>{editingId ? "Edit Mekanik" : "Tambah Mekanik"}</DialogTitle>
            <DialogDescription>
              Mekanik dan harga jasa akan muncul sebagai pilihan jasa di POS.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Mekanik</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="cth: Budi Santoso"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Jasa</Label>
              <Input
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
                placeholder="cth: Servis Rutin, Tune Up, Ganti Oli"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Harga Jasa (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={form.servicePrice}
                onChange={(e) => setForm({ ...form, servicePrice: e.target.value })}
                placeholder="cth: 50000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telepon (opsional)</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="08123456789"
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
