"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/courses/`;
const CAT_API = `${process.env.NEXT_PUBLIC_API_URL}/api/categories/`;
const COUNSELLING_API = `${process.env.NEXT_PUBLIC_API_URL}/api/courses/counselling/`;

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

type CounsellingLead = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  message: string;
  course: number | null;
  course_title?: string;
  course_slug?: string;
  created_at: string;
};

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")

}

function CoursesAdminPageInner() {
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leads, setLeads] = useState<CounsellingLead[]>([]);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    duration: "",
    price: "",
    rating: 0,
    category: 0,
  });

  const [editingId, setEditingId] = useState<number | null>(null);

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

  const loadCategories = useCallback(async () => {
    const res = await fetch(CAT_API);
    if (!res.ok) return;
    const data = (await res.json()) as Category[];
    setCategories(Array.isArray(data) ? data : []);
    setForm((f) => ({
      ...f,
      category:
        f.category ||
        (selectedCategoryId != null && data.some((d) => d.id === selectedCategoryId)
          ? selectedCategoryId
          : data[0]?.id ?? 0),
    }));
  }, [selectedCategoryId]);

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

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(COUNSELLING_API);
      if (!res.ok) return;
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch {
      setLeads([]);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    void fetchCourses();
    void fetchLeads();
  }, [loadCategories, fetchCourses, fetchLeads]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    const slug = (form.slug || slugify(form.title)).trim();
    if (!slug) {
      setSaveError("Slug is required (generated from title if empty).");
      return;
    }
    if (!form.title.trim()) {
      setSaveError("Title is required.");
      return;
    }
    if (!form.description.trim()) {
      setSaveError("Description is required.");
      return;
    }
    if (!String(form.duration ?? "").trim()) {
      setSaveError("Duration is required.");
      return;
    }
    if (!String(form.price ?? "").trim()) {
      setSaveError("Price is required.");
      return;
    }
    if (!Number(form.category)) {
      setSaveError("Category is required. Add a category first.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug,
      description: form.description,
      duration: form.duration,
      price: form.price,
      rating: Number(form.rating),
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

      setForm({
        title: "",
        slug: "",
        description: "",
        duration: "",
        price: "",
        rating: 0,
        category: defaultCategoryId,
      });
      setEditingId(null);
      await fetchCourses();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this course?")) return;
    setSaveError(null);
    try {
      const res = await fetch(`${API}${id}/`, { method: "DELETE" });
      if (!res.ok) {
        setSaveError(`Delete failed (${res.status})`);
        return;
      }
      if (editingId === id) {
        setEditingId(null);
        setForm({
          title: "",
          slug: "",
          description: "",
          duration: "",
          price: "",
          rating: 0,
          category: defaultCategoryId,
        });
      }
      await fetchCourses();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleEdit = (course: Course) => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSaveError(null);
    setForm({
      title: "",
      slug: "",
      description: "",
      duration: "",
      price: "",
      rating: 0,
      category: defaultCategoryId,
    });
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">Courses management</h1>
        {selectedCategoryId != null ? (
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Filtering by category id: <span className="font-mono">{selectedCategoryId}</span>
          </p>
        ) : null}
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Full data is shown in the table. Slug must be unique. Use Edit / Delete on each row.
        </p>
        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-10 space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md shadow-[#0a2540]/[0.04]"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {editingId ? `Edit course #${editingId}` : "Add course"}
        </h2>
        {saveError ? (
          <pre className="max-h-40 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 whitespace-pre-wrap">
            {saveError}
          </pre>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Title *</label>
            <input
              name="title"
              placeholder="Title"
              value={form.title}
              onChange={handleChange}
              className={input}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Slug *</label>
            <input
              name="slug"
              placeholder="url-slug"
              value={form.slug}
              onChange={handleChange}
              className={input}
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            className={`${input} min-h-[100px] resize-y`}
            rows={4}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Duration</label>
            <input
              name="duration"
              placeholder="e.g. 6 Months"
              value={form.duration}
              onChange={handleChange}
              className={input}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Price</label>
            <input
              name="price"
              placeholder="e.g. ₹45,000"
              value={form.price}
              onChange={handleChange}
              className={input}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Rating</label>
            <input
              name="rating"
              type="number"
              step="0.1"
              min={0}
              max={5}
              value={form.rating}
              onChange={handleChange}
              className={input}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Category *</label>
            <select
              name="category"
              value={form.category || ""}
              onChange={handleChange}
              className={input}
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
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-[var(--admin-accent)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--admin-accent-hover)]"
          >
            {editingId ? "Update course" : "Add course"}
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
        <p className="text-sm text-[var(--admin-muted)]">Loading courses…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-white shadow-md shadow-[#0a2540]/[0.04]">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-soft)] text-left">
                <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">ID</th>
                <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Title</th>
                <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Slug</th>
                <th className="min-w-[280px] p-3 font-bold text-[var(--admin-navy)]">Description (full)</th>
                <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Duration</th>
                <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Price</th>
                <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Rating</th>
                <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Category</th>
                <th className="whitespace-nowrap p-3 font-bold text-[var(--admin-navy)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedCourses.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                  <td className="p-3 font-mono text-xs text-slate-500">{c.id}</td>
                  <td className="p-3 font-semibold text-slate-900">{c.title}</td>
                  <td className="p-3 font-mono text-xs text-slate-600">{c.slug}</td>
                  <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{c.description}</td>
                  <td className="p-3 text-slate-600">{c.duration}</td>
                  <td className="p-3 font-semibold text-rose-600">{c.price}</td>
                  <td className="p-3 text-slate-600">{c.rating}</td>
                  <td className="p-3 text-slate-600">
                    {c.category_name ?? c.category}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-[var(--admin-navy)] transition hover:bg-amber-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayedCourses.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--admin-muted)]">
              {selectedCategoryId != null ? "No courses in this category yet." : "No courses yet."}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md shadow-[#0a2540]/[0.04]">
        <h2 className="text-lg font-bold text-[var(--admin-navy)]">Free counselling submissions</h2>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Users who submitted from course page CTA form.
        </p>

        {leads.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">No submissions yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-soft)] text-left">
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Name</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Email</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Phone</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Course</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Message</th>
                  <th className="p-3 font-bold text-[var(--admin-navy)]">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                    <td className="p-3 font-semibold text-slate-900">{lead.full_name}</td>
                    <td className="p-3 text-slate-700">{lead.email}</td>
                    <td className="p-3 text-slate-700">{lead.phone}</td>
                    <td className="p-3 text-slate-700">{lead.course_title ?? "-"}</td>
                    <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{lead.message || "-"}</td>
                    <td className="p-3 text-slate-600">
                      {new Date(lead.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoursesAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading…</div>}>
      <CoursesAdminPageInner />
    </Suspense>
  );
}
