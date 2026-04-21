"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HomeEditorShell, EditorPanel, btnDanger, btnPrimary, btnSecondary, fieldLabel, inputClass, textareaClass } from "@/components/admin/HomeEditorShell";
import TipTapEditor from "@/components/editor/TipTapEditor";
import { apiUrl } from "@/lib/api";
import { authHeadersBearer, authHeadersJson, authHeadersMultipart, getAccessToken } from "@/lib/auth";
import { parseApiError } from "@/lib/cms-errors";

type Paragraph = { content: string };
type Toc = { title: string };

type BlogPageMeta = {
  id?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
};

type Blog = {
  id: number;
  slug: string;
  category: string;
  title: string;
  author: string;
  date: string;
  read_time: string;
  excerpt: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  image_url?: string;
  image?: string;
  paragraphs?: Paragraph[];
  toc?: Toc[];
};

type BlogForm = Omit<Blog, "id" | "paragraphs" | "toc"> & {
  paragraphs_text: string;
  toc_text: string;
};

function resolveBlogImage(blog?: Partial<Blog> | null): string {
  if (!blog) return "";
  const imageUrl = String(blog.image_url ?? "").trim();
  if (imageUrl) return imageUrl;
  const imagePath = String(blog.image ?? "").trim();
  return imagePath || "";
}

function htmlParagraphBlocks(content: string): Paragraph[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // If this is plain text, keep old behavior with paragraph separation by empty line.
  if (!trimmed.includes("<")) {
    return trimmed
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ content: `<p>${text.replace(/\n/g, "<br/>")}</p>` }));
  }

  // Keep TipTap HTML as one block to preserve lists/structure exactly as pasted.
  return [{ content: trimmed }];
}

const emptyForm: BlogForm = {
  slug: "",
  category: "",
  title: "",
  author: "",
  date: "",
  read_time: "",
  excerpt: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  image_url: "",
  paragraphs_text: "",
  toc_text: "",
};

function formFromBlog(b?: Blog | null): BlogForm {
  if (!b) return { ...emptyForm };
  const paragraphHtml = (b.paragraphs ?? []).map((p) => p.content).join("\n\n");
  return {
    slug: b.slug ?? "",
    category: b.category ?? "",
    title: b.title ?? "",
    author: b.author ?? "",
    date: b.date ?? "",
    read_time: b.read_time ?? "",
    excerpt: b.excerpt ?? "",
    meta_title: b.meta_title ?? "",
    meta_description: b.meta_description ?? "",
    meta_keywords: b.meta_keywords ?? "",
    image_url: resolveBlogImage(b),
    paragraphs_text: paragraphHtml,
    toc_text: (b.toc ?? []).map((t) => t.title).join("\n"),
  };
}

function payloadFromForm(form: BlogForm) {
  const paragraphs = htmlParagraphBlocks(form.paragraphs_text);
  const toc = form.toc_text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((title) => ({ title }));
  return {
    slug: form.slug.trim(),
    category: form.category.trim(),
    title: form.title.trim(),
    author: form.author.trim(),
    date: form.date,
    read_time: form.read_time.trim(),
    excerpt: form.excerpt.trim(),
    meta_title: (form.meta_title ?? "").trim(),
    meta_description: (form.meta_description ?? "").trim(),
    meta_keywords: (form.meta_keywords ?? "").trim(),
    image_url: form.image_url?.trim() || "",
    paragraphs,
    toc,
  };
}



export default function AdminBlogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<BlogForm>({ ...emptyForm });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [pageMeta, setPageMeta] = useState<BlogPageMeta>({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [blogsRes, metaRes] = await Promise.all([
        fetch(apiUrl("/api/blog/"), { cache: "no-store" }),
        fetch(apiUrl("/api/blog/meta-tags/"), { cache: "no-store" }),
      ]);

      if (!blogsRes.ok) throw new Error("load blogs failed");
      const blogsData = (await blogsRes.json()) as Blog[];
      setBlogs(Array.isArray(blogsData) ? blogsData : []);

      const metaData = (await metaRes.json().catch(() => ({}))) as BlogPageMeta;
      setPageMeta({
        id: typeof metaData?.id === "number" ? metaData.id : undefined,
        meta_title: metaData?.meta_title ?? "",
        meta_description: metaData?.meta_description ?? "",
        meta_keywords: metaData?.meta_keywords ?? "",
      });
    } catch {
      setError("Could not load blogs.");
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    void load();
  }, [load, router]);

  const isEditing = useMemo(() => editingSlug != null, [editingSlug]);
  const categoryOptions = useMemo(() => {
    const defaults = [
      "Programming",
      "Web Development",
      "Data Science",
      "AI & ML",
      "Career Guidance",
      "Interview Preparation",
      "Soft Skills",
      "Technology",
    ];
    const fromBlogs = blogs.map((b) => b.category).filter(Boolean);
    return Array.from(new Set([...defaults, ...fromBlogs]));
  }, [blogs]);

  async function savePageMeta() {
    setError(null);
    setMessage(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    setSavingMeta(true);
    try {
      const res = await fetch(apiUrl("/api/blog/meta-tags/"), {
        method: "PUT",
        headers: authHeadersJson(),
        body: JSON.stringify({
          meta_title: (pageMeta.meta_title ?? "").trim(),
          meta_description: (pageMeta.meta_description ?? "").trim(),
          meta_keywords: (pageMeta.meta_keywords ?? "").trim(),
        }),
      });
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (!res.ok) {
        setError(parseApiError(await res.json().catch(() => ({}))));
        return;
      }
      setMessage("Blog page SEO saved.");
      await load();
    } catch {
      setError("Network error while saving blog SEO.");
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    if (
      !form.slug.trim() ||
      !form.category.trim() ||
      !form.title.trim() ||
      !form.author.trim() ||
      !form.date ||
      !form.read_time.trim() ||
      !form.excerpt.trim()
    ) {
      setError("Slug, category, title, author, date, read time and excerpt are required.");
      return;
    }
    if (form.slug.trim().length > 255) {
      setError("Slug must be 255 characters or less.");
      return;
    }
    if (!form.paragraphs_text.trim()) {
      setError("Blog content is required.");
      return;
    }
    setSaving(true);
    try {
      const url = apiUrl(isEditing ? `/api/blog/${editingSlug}/` : "/api/blog/");
      const method = isEditing ? "PUT" : "POST";
      const payload = payloadFromForm(form);
      let res: Response;

      if (imageFile) {
        const fd = new FormData();
        fd.append("slug", payload.slug);
        fd.append("category", payload.category);
        fd.append("title", payload.title);
        fd.append("author", payload.author);
        fd.append("date", payload.date);
        fd.append("read_time", payload.read_time);
        fd.append("excerpt", payload.excerpt);
        fd.append("meta_title", payload.meta_title);
        fd.append("meta_description", payload.meta_description);
        fd.append("meta_keywords", payload.meta_keywords);
        if (payload.image_url) fd.append("image_url", payload.image_url);
        fd.append("image", imageFile);
        fd.append("paragraphs", JSON.stringify(payload.paragraphs));
        fd.append("toc", JSON.stringify(payload.toc));
        res = await fetch(url, {
          method,
          headers: authHeadersMultipart(),
          body: fd,
        });
      } else {
        res = await fetch(url, {
          method,
          headers: authHeadersJson(),
          body: JSON.stringify(payload),
        });
      }
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (!res.ok) {
        setError(parseApiError(await res.json().catch(() => ({}))));
        return;
      }
      setMessage(isEditing ? "Blog updated." : "Blog created.");
      setEditingSlug(null);
      setForm({ ...emptyForm });
      setImageFile(null);
      setImagePreview("");
      await load();
    } catch {
      setError("Network error while saving blog.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(slug: string) {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`/api/blog/${slug}/`), {
        method: "DELETE",
        headers: authHeadersBearer(),
      });
      if (!res.ok) {
        setError("Could not delete blog.");
        return;
      }
      if (editingSlug === slug) {
        setEditingSlug(null);
        setForm({ ...emptyForm });
      }
      setMessage("Blog deleted.");
      await load();
    } catch {
      setError("Could not delete blog.");
    }
  }

  function startEdit(blog: Blog) {
    setEditingSlug(blog.slug);
    setForm(formFromBlog(blog));
    setImageFile(null);
    setImagePreview("");
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingSlug(null);
    setForm({ ...emptyForm });
    setImageFile(null);
    setImagePreview("");
    setMessage(null);
    setError(null);
  }

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  if (loading) {
    return (
      <HomeEditorShell title="Blog CMS" subtitle="Loading...">
        <p className="text-sm text-slate-500">Loading...</p>
      </HomeEditorShell>
    );
  }

  return (
    <HomeEditorShell title="Blog CMS" subtitle="Create, update and delete blog posts dynamically from admin.">
      {message ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <EditorPanel title="Blog Page SEO (for /blog)">
        <div className="space-y-4">
          <div>
            <label className={fieldLabel}>Meta Title</label>
            <input
              className={inputClass}
              value={pageMeta.meta_title ?? ""}
              onChange={(e) => setPageMeta((m) => ({ ...m, meta_title: e.target.value }))}
            />
          </div>
          <div>
            <label className={fieldLabel}>Meta Description</label>
            <textarea
              className={textareaClass}
              rows={3}
              value={pageMeta.meta_description ?? ""}
              onChange={(e) => setPageMeta((m) => ({ ...m, meta_description: e.target.value }))}
            />
          </div>
          <div>
            <label className={fieldLabel}>Meta Keywords (comma-separated)</label>
            <input
              className={inputClass}
              value={pageMeta.meta_keywords ?? ""}
              onChange={(e) => setPageMeta((m) => ({ ...m, meta_keywords: e.target.value }))}
            />
          </div>
          <button type="button" className={btnPrimary} disabled={savingMeta} onClick={savePageMeta}>
            {savingMeta ? "Saving..." : "Save SEO"}
          </button>
        </div>
      </EditorPanel>

      <EditorPanel title={isEditing ? "Edit blog post" : "Create blog post"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>Slug *</label>
              <input
                className={inputClass}
                maxLength={255}
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
              <p className="mt-1 text-xs text-slate-500">{form.slug.length}/255</p>
            </div>
            <div>
              <label className={fieldLabel}>Category</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">Select category</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Title *</label>
              <input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Author *</label>
              <input className={inputClass} value={form.author} onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Date *</label>
              <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Read Time</label>
              <input className={inputClass} placeholder="e.g. 5 min read" value={form.read_time} onChange={(e) => setForm((f) => ({ ...f, read_time: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={fieldLabel}>Excerpt</label>
            <textarea className={textareaClass} rows={3} value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={fieldLabel}>SEO Meta Title</label>
              <input
                className={inputClass}
                value={form.meta_title ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>SEO Meta Description</label>
              <textarea
                className={textareaClass}
                rows={3}
                value={form.meta_description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>SEO Meta Keywords (comma-separated)</label>
              <input
                className={inputClass}
                value={form.meta_keywords ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, meta_keywords: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={fieldLabel}>Blog Image Upload</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:text-white file:font-semibold"
            />
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Selected blog upload preview" className="mt-3 h-28 w-auto rounded border border-slate-200" />
            ) : form.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image_url} alt={form.title} className="mt-3 h-28 w-auto rounded border border-slate-200" />
            ) : null}
          </div>
          <div>
            <label className={fieldLabel}>Table of Contents (one line = one item)</label>
            <textarea className={textareaClass} rows={4} value={form.toc_text} onChange={(e) => setForm((f) => ({ ...f, toc_text: e.target.value }))} />
          </div>
          <div>
            <label className={fieldLabel}>Blog Content</label>
            <TipTapEditor
              value={form.paragraphs_text}
              onChange={(html) => setForm((f) => ({ ...f, paragraphs_text: html }))}
              placeholder="Write your blog content here..."
              scrollContent
              contentMaxHeightClassName="max-h-[460px]"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : isEditing ? "Update Blog" : "Create Blog"}
            </button>
            {isEditing ? (
              <button type="button" className={btnSecondary} onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </EditorPanel>

      <EditorPanel title="All blog posts">
        <div className="space-y-3">
          {blogs.length === 0 ? <p className="text-sm text-slate-500">No blog posts yet.</p> : null}
          {blogs.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                {resolveBlogImage(b) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveBlogImage(b)}
                    alt={b.title}
                    className="h-14 w-20 rounded border border-slate-200 object-cover"
                  />
                ) : null}
                <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{b.category || "Uncategorized"}</p>
                <p className="text-base font-bold text-slate-900">{b.title}</p>
                <p className="text-sm text-slate-600">/{b.slug} · {b.author} · {b.date}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className={btnSecondary} onClick={() => startEdit(b)}>
                  Edit
                </button>
                <button type="button" className={btnDanger} onClick={() => handleDelete(b.slug)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </EditorPanel>
    </HomeEditorShell>
  );
}
