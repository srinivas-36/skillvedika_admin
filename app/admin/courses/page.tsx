"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AdminIconActions,
  AdminModal,
  btnPrimary,
  btnSecondary,
  fieldLabel,
  inputClass,
} from "@/components/admin/HomeEditorShell";

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/courses/`;
const CAT_API = `${process.env.NEXT_PUBLIC_API_URL}/api/categories/`;

type Course = {
  id: number;
  title: string;
  slug: string;
  description: string;
  duration: string;
  price: string;
  rating: number;
  category: number;
  category_name?: string;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
};

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  duration: "",
  price: "",
  rating: 0,
  category: 0,
};

function matchesSearch(query: string, ...values: (string | number | null | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => String(v ?? "").toLowerCase().includes(q));
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function CoursesAdminPageContent() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const categoryParam = searchParams.get("category");
  const selectedCategoryId =
    categoryParam && !Number.isNaN(Number(categoryParam))
      ? Number(categoryParam)
      : null;

  const defaultCategoryId =
    selectedCategoryId && categories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : categories[0]?.id ?? 0;

  const displayedCourses =
    selectedCategoryId != null
      ? courses.filter((c) => c.category === selectedCategoryId)
      : courses;

  const filteredCourses = displayedCourses.filter((c) =>
    matchesSearch(
      searchQuery,
      c.id,
      c.title,
      c.slug,
      c.description,
      c.duration,
      c.price,
      c.rating,
      c.category_name,
      c.category,
    ),
  );

  const loadCategories = useCallback(async () => {
    const res = await fetch(CAT_API);
    if (!res.ok) return;
    const data = (await res.json()) as Category[];
    setCategories(Array.isArray(data) ? data : []);
  }, []);

  const fetchCourses = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    void fetchCourses();
  }, [loadCategories, fetchCourses]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: name === "rating" || name === "category" ? Number(value) : value,
      };
      if (name === "title" && editingId == null) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  function closeFormModal() {
    setFormModalOpen(false);
    setEditingId(null);
    setSaveError(null);
    setForm({ ...emptyForm, category: defaultCategoryId });
  }

  function startAdd() {
    setEditingId(null);
    setSaveError(null);
    setForm({ ...emptyForm, category: defaultCategoryId });
    setFormModalOpen(true);
  }

  function handleEdit(course: Course) {
    setSaveError(null);
    setForm({
      title: course.title,
      slug: course.slug,
      description: course.description,
      duration: course.duration,
      price: course.price,
      rating: course.rating,
      category: course.category,
    });
    setEditingId(course.id);
    setFormModalOpen(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);

    const slug = (form.slug || slugify(form.title)).trim();
    if (!slug) {
      setSaveError("Slug is required (generated from title if empty).");
      setSaving(false);
      return;
    }
    const payload = {
      title: form.title.trim(),
      slug,
      description: form.description,
      duration: form.duration.trim(),
      price: form.price.trim(),
      rating: form.rating ? Number(form.rating) : 0,
      category: Number(form.category),
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
          const j = JSON.parse(raw) as Record<string, unknown>;
          setSaveError(JSON.stringify(j, null, 2));
        } catch {
          setSaveError(raw || `Save failed (${res.status})`);
        }
        return;
      }

      closeFormModal();
      await fetchCourses();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this course permanently? This cannot be undone.")) return;
    setSaveError(null);
    try {
      const res = await fetch(`${API}${id}/`, { method: "DELETE" });
      if (!res.ok) {
        setSaveError(`Delete failed (${res.status})`);
        return;
      }
      if (editingId === id) {
        closeFormModal();
      }
      await fetchCourses();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const selectedCategoryName =
    selectedCategoryId != null
      ? categories.find((c) => c.id === selectedCategoryId)?.name
      : null;

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">Courses management</h1>
        {selectedCategoryId != null ? (
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Showing courses in:{" "}
            <span className="font-semibold text-slate-800">
              {selectedCategoryName ?? `Category #${selectedCategoryId}`}
            </span>
          </p>
        ) : null}
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          All courses are listed below. Use the edit icon to update or delete icon to remove permanently.
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
        <p className="text-sm text-[var(--admin-muted)]">Loading courses…</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses by title, slug, category, duration, price..."
              className={`${inputClass} max-w-md`}
            />
            <button type="button" className={btnPrimary} onClick={startAdd}>
              Add course
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-white shadow-md shadow-[#0a2540]/[0.04]">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-soft)] text-left">
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">ID</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Title</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Slug</th>
                  <th className="min-w-[280px] p-3 font-bold text-[var(--admin-navy)]">Description</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Duration</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Price</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Rating</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Category</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                    <td className="p-3 font-mono text-xs text-slate-500">{c.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{c.title}</td>
                    <td className="p-3 font-mono text-xs text-slate-600">{c.slug}</td>
                    <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{c.description}</td>
                    <td className="p-3 text-slate-600">{c.duration || "—"}</td>
                    <td className="p-3 text-slate-600">{c.price || "—"}</td>
                    <td className="p-3 text-slate-600">{c.rating}</td>
                    <td className="p-3 text-slate-600">{c.category_name ?? c.category}</td>
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
            {filteredCourses.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--admin-muted)]">
                {searchQuery
                  ? "No courses match your search."
                  : selectedCategoryId != null
                    ? "No courses in this category yet."
                    : "No courses yet."}
              </p>
            ) : null}
          </div>
        </>
      )}

      <AdminModal
        open={formModalOpen}
        title={editingId ? `Edit course #${editingId}` : "Add course"}
        onClose={closeFormModal}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={btnSecondary} onClick={closeFormModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="course-modal-form"
              className={btnPrimary}
              disabled={saving}
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Add course"}
            </button>
          </div>
        }
      >
        <form id="course-modal-form" onSubmit={handleSubmit} className="space-y-4">
          {saveError ? (
            <pre className="max-h-40 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 whitespace-pre-wrap">
              {saveError}
            </pre>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>Title *</label>
              <input
                name="title"
                placeholder="Title"
                value={form.title}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Slug *</label>
              <input
                name="slug"
                placeholder="url-slug"
                value={form.slug}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div>
            <label className={fieldLabel}>Description</label>
            <textarea
              name="description"
              placeholder="Description"
              value={form.description}
              onChange={handleChange}
              className={`${inputClass} min-h-[100px] resize-y`}
              rows={4}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={fieldLabel}>Duration</label>
              <input
                name="duration"
                placeholder="e.g. 6 Months"
                value={form.duration}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabel}>Price</label>
              <input
                name="price"
                placeholder="e.g. ₹25,000"
                value={form.price}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabel}>Rating</label>
              <input
                name="rating"
                type="number"
                step="0.1"
                min={0}
                max={5}
                value={form.rating}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabel}>Category *</label>
              <select
                name="category"
                value={form.category || ""}
                onChange={handleChange}
                className={inputClass}
                required
              >
                {categories.length === 0 ? (
                  <option value="">Add a category first</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (id {c.id})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

export default function CoursesAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px]">
          <p className="text-sm text-[var(--admin-muted)]">Loading courses…</p>
        </div>
      }
    >
      <CoursesAdminPageContent />
    </Suspense>
  );
}
