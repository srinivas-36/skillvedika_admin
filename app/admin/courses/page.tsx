"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/courses/`;
const CAT_API = `${process.env.NEXT_PUBLIC_API_URL}/api/categories/`;
const PAGE_SIZE = 10;

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
  is_active?: boolean;
  is_trending?: boolean;
  image?: string | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active?: boolean;
};

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  duration: "",
  price: "",
  rating: 0,
  category: 0,
  is_trending: false,
  image: null as string | null,
};

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<{
    id: number;
    title: string;
    nextActive: boolean;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const categoryParam = searchParams.get("category");
  const selectedCategoryId =
    categoryParam && !Number.isNaN(Number(categoryParam))
      ? Number(categoryParam)
      : null;

  const defaultCategoryId =
    selectedCategoryId && categories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : categories[0]?.id ?? 0;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategoryId]);

  const loadCategories = useCallback(async () => {
    const res = await fetch(`${CAT_API}?include_inactive=1`);
    if (!res.ok) return;
    const data = (await res.json()) as Category[];
    setCategories(Array.isArray(data) ? data : []);
  }, []);

  const fetchCourses = useCallback(async () => {
    setError(null);
    try {
      const qs = new URLSearchParams({
        include_inactive: "1",
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (debouncedSearch.trim()) qs.set("search", debouncedSearch.trim());
      if (selectedCategoryId != null) qs.set("category", String(selectedCategoryId));

      const res = await fetch(`${API}?${qs.toString()}`);
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      const parsed = parseListResponse<Course>(data);
      setCourses(parsed.results);
      setTotalCount(parsed.count);
      setTotalPages(Math.max(1, parsed.total_pages));
      if (parsed.page !== page && parsed.total_pages > 0) {
        setPage(parsed.page);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedCategoryId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setLoading(true);
    void fetchCourses();
  }, [fetchCourses]);

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
    setImageFile(null);
    setRemoveImage(false);
    setForm({ ...emptyForm, category: defaultCategoryId });
  }

  function startAdd() {
    setEditingId(null);
    setSaveError(null);
    setImageFile(null);
    setRemoveImage(false);
    setForm({ ...emptyForm, category: defaultCategoryId });
    setFormModalOpen(true);
  }

  function handleEdit(course: Course) {
    setSaveError(null);
    setImageFile(null);
    setRemoveImage(false);
    setForm({
      title: course.title,
      slug: course.slug,
      description: course.description,
      duration: course.duration,
      price: course.price,
      rating: course.rating,
      category: course.category,
      is_trending: Boolean(course.is_trending),
      image: course.image ?? null,
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

    try {
      const url = editingId ? `${API}${editingId}/` : API;
      const method = editingId ? "PUT" : "POST";

      let res: Response;
      if (imageFile) {
        const fd = new FormData();
        fd.append("title", form.title.trim());
        fd.append("slug", slug);
        fd.append("description", form.description);
        fd.append("duration", form.duration.trim());
        fd.append("price", form.price.trim());
        fd.append("rating", String(form.rating ? Number(form.rating) : 0));
        fd.append("category", String(Number(form.category)));
        fd.append("is_trending", form.is_trending ? "true" : "false");
        fd.append("image", imageFile);
        res = await fetch(url, { method, body: fd });
      } else {
        const payload: Record<string, unknown> = {
          title: form.title.trim(),
          slug,
          description: form.description,
          duration: form.duration.trim(),
          price: form.price.trim(),
          rating: form.rating ? Number(form.rating) : 0,
          category: Number(form.category),
          is_trending: Boolean(form.is_trending),
        };
        if (removeImage) {
          payload.image = null;
        }
        res = await fetch(url, {
          method: removeImage && editingId ? "PATCH" : method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const raw = await res.text();
      if (!res.ok) {
        setSaveError(parseApiErrorText(raw, res.status));
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

  const handleDelete = (course: Course) => {
    setDeleteConfirm({ id: course.id, title: course.title });
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
        setSaveError(parseApiErrorText(raw, res.status));
        return;
      }
      if (editingId === id) {
        closeFormModal();
      }
      setDeleteConfirm(null);
      await fetchCourses();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = (course: Course) => {
    const nextActive = !(course.is_active !== false);
    setToggleConfirm({
      id: course.id,
      title: course.title,
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
        setSaveError(`Could not ${action} course (${res.status})`);
        return;
      }
      setToggleConfirm(null);
      await fetchCourses();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : `Could not ${action} course`);
    } finally {
      setTogglingId(null);
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
          All courses are listed below. Use edit to update, mark as trending for the home page Trending tab, disable to hide from the site, or delete to remove permanently.
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
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Trending</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Status</th>
                  <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-t border-slate-100 align-top hover:bg-slate-50/80 ${
                      c.is_active === false ? "bg-slate-50/60 opacity-80" : ""
                    }`}
                  >
                    <td className="p-3 font-mono text-xs text-slate-500">{c.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{c.title}</td>
                    <td className="p-3 font-mono text-xs text-slate-600">{c.slug}</td>
                    <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{c.description}</td>
                    <td className="p-3 text-slate-600">{c.duration || "—"}</td>
                    <td className="p-3 text-slate-600">{c.price || "—"}</td>
                    <td className="p-3 text-slate-600">{c.rating}</td>
                    <td className="p-3 text-slate-600">{c.category_name ?? c.category}</td>
                    <td className="p-3">
                      {c.is_trending ? (
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-700 ring-1 ring-sky-200">
                          Trending
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
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
            {courses.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--admin-muted)]">
                {searchQuery
                  ? "No courses match your search."
                  : selectedCategoryId != null
                    ? "No courses in this category yet."
                    : "No courses yet."}
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
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {saveError}
            </p>
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
          <label className="flex items-start gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-soft)] px-4 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.is_trending)}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, is_trending: e.target.checked }))
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2f5fa8] focus:ring-[#2f5fa8]"
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--admin-navy)]">
                Trending course
              </span>
              <span className="mt-0.5 block text-xs text-[var(--admin-muted)]">
                Show this course under the Trending tab on the home page.
              </span>
            </span>
          </label>
          <div>
            <label className={fieldLabel}>Course image</label>
            <p className="mb-2 text-xs text-[var(--admin-muted)]">
              Shown on the home page course cards. Upload JPG/PNG/WebP.
            </p>
            {form.image && !removeImage ? (
              <div className="mb-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.image}
                  alt="Course"
                  className="h-20 w-32 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => {
                    setRemoveImage(true);
                    setImageFile(null);
                    setForm((prev) => ({ ...prev, image: null }));
                  }}
                >
                  Remove image
                </button>
              </div>
            ) : null}
            <input
              type="file"
              accept="image/*"
              className={inputClass}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setImageFile(file);
                setRemoveImage(false);
                if (file) {
                  setForm((prev) => ({
                    ...prev,
                    image: URL.createObjectURL(file),
                  }));
                }
              }}
            />
          </div>
        </form>
      </AdminModal>

      <AdminConfirmDialog
        open={toggleConfirm != null}
        title={toggleConfirm?.nextActive ? "Enable course?" : "Disable course?"}
        message={
          toggleConfirm ? (
            toggleConfirm.nextActive ? (
              <>
                Enable <span className="font-semibold text-slate-900">{toggleConfirm.title}</span> so
                it shows on the public site?
              </>
            ) : (
              <>
                Disable <span className="font-semibold text-slate-900">{toggleConfirm.title}</span> so
                it is hidden from the public site?
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
        title="Delete course?"
        message={
          deleteConfirm ? (
            <>
              Delete <span className="font-semibold text-slate-900">{deleteConfirm.title}</span>{" "}
              permanently? This cannot be undone.
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
