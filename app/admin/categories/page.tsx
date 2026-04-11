"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

const API = `${base}/api/categories/`;
type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon?: string | null;
};
console.log("FETCH URL =>", API);
const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    // .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function CategoriesAdminPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const editParam = searchParams.get("edit");
  const selectedEditId =
    editParam && !Number.isNaN(Number(editParam)) ? Number(editParam) : null;
  const [ignoreEditQuery, setIgnoreEditQuery] = useState(false);

  useEffect(() => {
    // If the edit param changes (or gets cleared), allow the effect to run again.
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
    // If the sidebar links here with ?edit=ID, open that category for editing.
    if (selectedEditId == null) return;
    if (ignoreEditQuery) return;
    if (editingId != null) return;

    const cat = rows.find((c) => c.id === selectedEditId);
    if (!cat) return;

    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedEditId, rows, editingId, ignoreEditQuery]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const slug = (form.slug || slugify(form.name)).trim();
    if (!slug || !form.name.trim()) {
      setSaveError("Name and slug are required.");
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
      setForm({ name: "", slug: "", description: "", icon: "" });
      setEditingId(null);
      if (wasEditingFromQuery) {
        clearEditQuery();
      }
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category? Courses in it may be blocked by DB constraints.")) return;
    setSaveError(null);
    try {
      const res = await fetch(`${API}${id}/`, { method: "DELETE" });
      if (!res.ok) {
        setSaveError(`Delete failed (${res.status}). Remove or reassign courses first.`);
        return;
      }
      if (editingId === id) {
        setEditingId(null);
        setForm({ name: "", slug: "", description: "", icon: "" });
        if (selectedEditId === id) {
          clearEditQuery();
        }
      }
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleEdit = (c: Category) => {
    setSaveError(null);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon ?? "",
    });
    setEditingId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    clearEditQuery();
    setEditingId(null);
    setSaveError(null);
    setForm({ name: "", slug: "", description: "", icon: "" });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">Categories</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Used by course records and public /courses routes. All fields are shown in the table.
        </p>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-10 space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {editingId ? `Edit category #${editingId}` : "Add category"}
        </h2>
        {saveError ? (
          <pre className="max-h-40 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 whitespace-pre-wrap">
            {saveError}
          </pre>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className={input} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Slug *</label>
            <input name="slug" value={form.slug} onChange={handleChange} className={input} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className={`${input} min-h-[88px] resize-y`}
            rows={3}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Icon (optional key)</label>
          <input name="icon" value={form.icon} onChange={handleChange} className={input} placeholder="e.g. code" />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[var(--admin-accent)] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[var(--admin-accent-hover)]"
          >
            {editingId ? "Update category" : "Add category"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading…</p>
      ) : (
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
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                  <td className="p-3 font-mono text-xs">{c.id}</td>
                  <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="p-3 font-mono text-xs text-slate-600">{c.slug}</td>
                  <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{c.description}</td>
                  <td className="p-3 text-slate-600">{c.icon || "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-[var(--admin-navy)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--admin-muted)]">No categories yet.</p>
          ) : null}
        </div>
      )}
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
