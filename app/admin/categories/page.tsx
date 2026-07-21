"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AdminConfirmDialog,
  AdminIconActions,
  AdminModal,
  AdminPagination,
  btnPrimary,
  btnSecondary,
  fieldLabel,
  inputClass,
} from "@/components/admin/HomeEditorShell";
import { parseApiErrorText } from "@/lib/cms-errors";
import { parseListResponse } from "@/lib/api";

const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const API = `${base}/api/categories/`;
const PAGE_SIZE = 10;

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon?: string | null;
  is_active?: boolean;
};

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  icon: "",
};

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<{
    id: number;
    name: string;
    nextActive: boolean;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const editParam = searchParams.get("edit");
  const selectedEditId =
    editParam && !Number.isNaN(Number(editParam)) ? Number(editParam) : null;
  const [ignoreEditQuery, setIgnoreEditQuery] = useState(false);

  useEffect(() => {
    setIgnoreEditQuery(false);
  }, [selectedEditId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const clearEditQuery = () => {
    if (selectedEditId == null) return;
    setIgnoreEditQuery(true);
    router.replace("/admin/categories/");
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams({
        include_inactive: "1",
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (debouncedSearch.trim()) qs.set("search", debouncedSearch.trim());
      const res = await fetch(`${API}?${qs.toString()}`);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      const parsed = parseListResponse<Category>(data);
      setRows(parsed.results);
      setTotalCount(parsed.count);
      setTotalPages(Math.max(1, parsed.total_pages));
      if (parsed.page !== page && parsed.total_pages > 0) {
        setPage(parsed.page);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedEditId == null) return;
    if (ignoreEditQuery) return;
    if (formModalOpen) return;

    const openEdit = async () => {
      const cat = rows.find((c) => c.id === selectedEditId);
      if (cat) {
        setEditingId(cat.id);
        setForm({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon ?? "",
        });
        setFormModalOpen(true);
        return;
      }
      try {
        const res = await fetch(`${API}${selectedEditId}/?include_inactive=1`);
        if (!res.ok) return;
        const data = (await res.json()) as Category;
        setEditingId(data.id);
        setForm({
          name: data.name,
          slug: data.slug,
          description: data.description,
          icon: data.icon ?? "",
        });
        setFormModalOpen(true);
      } catch {
        /* ignore */
      }
    };
    void openEdit();
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
      description: form.description.trim(),
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
        setSaveError(parseApiErrorText(raw, res.status));
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

  const handleDelete = (category: Category) => {
    setDeleteConfirm({ id: category.id, name: category.name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeletingId(id);
    setSaveError(null);
    try {
      const res = await fetch(`${API}${id}/`, { method: "DELETE" });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        setSaveError(
          parseApiErrorText(raw, res.status) ||
            "Delete failed. Remove or reassign courses linked to this category first.",
        );
        return;
      }
      if (editingId === id) {
        closeFormModal();
      }
      if (selectedEditId === id) {
        clearEditQuery();
      }
      setDeleteConfirm(null);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = (category: Category) => {
    const nextActive = !(category.is_active !== false);
    setToggleConfirm({
      id: category.id,
      name: category.name,
      nextActive,
    });
  };

  const confirmToggleActive = async () => {
    if (!toggleConfirm) return;
    const { id, nextActive } = toggleConfirm;
    const action = nextActive ? "enable" : "disable";
    setTogglingId(id);
    setSaveError(null);
    try {
      const res = await fetch(`${API}${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (!res.ok) {
        setSaveError(`Could not ${action} category (${res.status})`);
        return;
      }
      setToggleConfirm(null);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : `Could not ${action} category`);
    } finally {
      setTogglingId(null);
    }
  };

  const editingCategoryName =
    selectedEditId != null
      ? rows.find((c) => c.id === selectedEditId)?.name
      : null;

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
          Used by course records and public /courses routes. Use edit, disable (hide from site), or delete on each row.
        </p>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
        {saveError && !formModalOpen ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {saveError}
          </p>
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
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Status</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-t border-slate-100 align-top hover:bg-slate-50/80 ${
                      c.is_active === false ? "bg-slate-50/60 opacity-80" : ""
                    }`}
                  >
                    <td className="p-3 font-mono text-xs">{c.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="p-3 font-mono text-xs text-slate-600">{c.slug}</td>
                    <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{c.description}</td>
                    <td className="p-3 text-slate-600">{c.icon || "—"}</td>
                    <td className="p-3">
                      {c.is_active === false ? (
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                          Disabled
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <AdminIconActions
                        onEdit={() => handleEdit(c)}
                        onToggleActive={() => void handleToggleActive(c)}
                        isActive={c.is_active !== false}
                        onDelete={() => handleDelete(c)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--admin-muted)]">
                {searchQuery ? "No categories match your search." : "No categories yet."}
              </p>
            ) : null}
          </div>
          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            disabled={loading}
            onPageChange={setPage}
          />
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
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {saveError}
            </p>
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
            <label className={fieldLabel}>Description (optional)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className={`${inputClass} min-h-[88px] resize-y`}
              rows={3}
              placeholder="Optional short description"
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

      <AdminConfirmDialog
        open={toggleConfirm != null}
        title={toggleConfirm?.nextActive ? "Enable category?" : "Disable category?"}
        message={
          toggleConfirm ? (
            toggleConfirm.nextActive ? (
              <>
                Enable <span className="font-semibold text-slate-900">{toggleConfirm.name}</span> so it
                shows on the public site?
              </>
            ) : (
              <>
                Disable <span className="font-semibold text-slate-900">{toggleConfirm.name}</span> so it
                and its courses are hidden from the public site?
              </>
            )
          ) : null
        }
        confirmLabel={toggleConfirm?.nextActive ? "Confirm enable" : "Confirm disable"}
        loading={togglingId != null}
        onCancel={() => setToggleConfirm(null)}
        onConfirm={() => void confirmToggleActive()}
      />

      <AdminConfirmDialog
        open={deleteConfirm != null}
        title="Delete category?"
        message={
          deleteConfirm ? (
            <>
              Delete <span className="font-semibold text-slate-900">{deleteConfirm.name}</span>{" "}
              permanently? Courses linked to it may block deletion. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        danger
        loading={deletingId != null}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => void confirmDelete()}
      />
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
