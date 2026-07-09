"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AdminIconActions,
  AdminModal,
  btnPrimary,
  btnSecondary,
  fieldLabel,
  inputClass,
} from "@/components/admin/HomeEditorShell";

const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const API = `${base}/api/categories/`;

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon?: string | null;
};

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  icon: "",
};

function matchesSearch(query: string, ...values: (string | number | null | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => String(v ?? "").toLowerCase().includes(q));
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 100);
}

function CategoriesAdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const editParam = searchParams.get("edit");
  const selectedEditId =
    editParam && !Number.isNaN(Number(editParam)) ? Number(editParam) : null;
  const [ignoreEditQuery, setIgnoreEditQuery] = useState(false);

  useEffect(() => {
    setIgnoreEditQuery(false);
  }, [selectedEditId]);

  const clearEditQuery = () => {
    if (selectedEditId == null) return;
    setIgnoreEditQuery(true);
    router.replace("/admin/categories/");
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedEditId == null) return;
    if (ignoreEditQuery) return;
    if (formModalOpen) return;

    const cat = rows.find((c) => c.id === selectedEditId);
    if (!cat) return;

    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon ?? "",
    });
    setFormModalOpen(true);
  }, [selectedEditId, rows, formModalOpen, ignoreEditQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "name" && editingId == null) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  function closeFormModal() {
    setFormModalOpen(false);
    setEditingId(null);
    setSaveError(null);
    setForm({ ...emptyForm });
    if (selectedEditId != null) {
      clearEditQuery();
    }
  }

  function startAdd() {
    setEditingId(null);
    setSaveError(null);
    setForm({ ...emptyForm });
    setFormModalOpen(true);
  }

  function handleEdit(c: Category) {
    setSaveError(null);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon ?? "",
    });
    setEditingId(c.id);
    setFormModalOpen(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    const slug = (form.slug || slugify(form.name)).trim();
    if (!slug || !form.name.trim()) {
      setSaveError("Name and slug are required.");
      setSaving(false);
      return;
    }
    const payload = {
      name: form.name.trim(),
      slug,
      description: form.description,
      icon: form.icon.trim() || "",
    };
    try {
      const url = editingId ? `${API}${editingId}/` : API;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      if (!res.ok) {
        try {
          setSaveError(JSON.stringify(JSON.parse(raw), null, 2));
        } catch {
          setSaveError(raw || `Save failed (${res.status})`);
        }
        return;
      }

      const wasEditingFromQuery = selectedEditId != null;
      closeFormModal();
      if (wasEditingFromQuery) {
        clearEditQuery();
      }
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(
        "Delete this category permanently? Courses linked to it may block deletion. This cannot be undone.",
      )
    ) {
      return;
    }
    setSaveError(null);
    try {
      const res = await fetch(`${API}${id}/`, { method: "DELETE" });
      if (!res.ok) {
        setSaveError(`Delete failed (${res.status}). Remove or reassign courses first.`);
        return;
      }
      if (editingId === id) {
        closeFormModal();
      }
      if (selectedEditId === id) {
        clearEditQuery();
      }
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const filteredRows = rows.filter((c) =>
    matchesSearch(searchQuery, c.id, c.name, c.slug, c.description, c.icon),
  );

  const editingCategoryName =
    selectedEditId != null ? rows.find((c) => c.id === selectedEditId)?.name : null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">Categories</h1>
        {editingCategoryName ? (
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Selected from sidebar:{" "}
            <span className="font-semibold text-slate-800">{editingCategoryName}</span>
          </p>
        ) : null}
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Used by course records and public /courses routes. Use edit/delete icons on each row.
        </p>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
        {saveError && !formModalOpen ? (
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 whitespace-pre-wrap">
            {saveError}
          </pre>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories by name, slug, description..."
              className={`${inputClass} max-w-md`}
            />
            <button type="button" className={btnPrimary} onClick={startAdd}>
              Add category
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-white shadow-md">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-soft)] text-left">
                  <th className="p-3 font-bold text-[var(--admin-navy)]">ID</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Name</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Slug</th>
                  <th className="min-w-[240px] p-3 font-bold text-[var(--admin-navy)]">Description</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Icon</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                    <td className="p-3 font-mono text-xs">{c.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="p-3 font-mono text-xs text-slate-600">{c.slug}</td>
                    <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{c.description}</td>
                    <td className="p-3 text-slate-600">{c.icon || "—"}</td>
                    <td className="p-3">
                      <AdminIconActions
                        onEdit={() => handleEdit(c)}
                        onDelete={() => void handleDelete(c.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--admin-muted)]">
                {searchQuery ? "No categories match your search." : "No categories yet."}
              </p>
            ) : null}
          </div>
        </>
      )}

      <AdminModal
        open={formModalOpen}
        title={editingId ? `Edit category #${editingId}` : "Add category"}
        onClose={closeFormModal}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={btnSecondary} onClick={closeFormModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="category-modal-form"
              className={btnPrimary}
              disabled={saving}
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Add category"}
            </button>
          </div>
        }
      >
        <form id="category-modal-form" onSubmit={handleSubmit} className="space-y-4">
          {saveError ? (
            <pre className="max-h-40 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 whitespace-pre-wrap">
              {saveError}
            </pre>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>Name *</label>
              <input name="name" value={form.name} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className={fieldLabel}>Slug *</label>
              <input name="slug" value={form.slug} onChange={handleChange} className={inputClass} required />
            </div>
          </div>
          <div>
            <label className={fieldLabel}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className={`${inputClass} min-h-[88px] resize-y`}
              rows={3}
            />
          </div>
          <div>
            <label className={fieldLabel}>Icon (optional key)</label>
            <input
              name="icon"
              value={form.icon}
              onChange={handleChange}
              className={inputClass}
              placeholder="e.g. code"
            />
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

export default function CategoriesAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <CategoriesAdminPageInner />
    </Suspense>
  );
}
