"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HomeEditorShell, EditorPanel, AdminIconActions, AdminModal, AdminConfirmDialog, AdminPagination, btnPrimary, btnSecondary, fieldLabel, inputClass, textareaClass } from "@/components/admin/HomeEditorShell";
import { apiUrl, getCategoriesPage, type CategoryApi } from "@/lib/api";
import TipTapEditor from "@/components/editor/TipTapEditor";

const PAGE_SIZE = 10;

type FaqItem = { question: string; answer: string };
type CtaButton = { text: string; link: string };

type RowModal =
  | { kind: "why"; index: number; isNew: boolean }
  | { kind: "cta"; index: number; isNew: boolean }
  | { kind: "faq"; index: number; isNew: boolean }
  | null;

type CategoryPageForm = {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_cta_link: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  why_title: string;
  why_points: string[];
  cta_title: string;
  cta_subtitle: string;
  cta_buttons: CtaButton[];
  faq_heading: string;
  faq_intro: string;
  faq_items: FaqItem[];
};

const emptyForm: CategoryPageForm = {
  hero_title: "",
  hero_subtitle: "",
  hero_cta_text: "",
  hero_cta_link: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  why_title: "",
  why_points: [],
  cta_title: "",
  cta_subtitle: "",
  cta_buttons: [],
  faq_heading: "",
  faq_intro: "",
  faq_items: [],
};

function fromApi(data: Record<string, unknown>): CategoryPageForm {
  const faqRaw = data.faq_items ?? data.faqItems;
  const faqItems = Array.isArray(faqRaw)
    ? faqRaw.map((x) => ({
        question: String((x as Record<string, unknown>)?.question ?? ""),
        answer: String((x as Record<string, unknown>)?.answer ?? ""),
      }))
    : [];

  const whyRaw = data.why_points ?? data.whyPoints;
  const whyPoints = Array.isArray(whyRaw)
    ? whyRaw.map((x) => String(x ?? "").trim()).filter(Boolean)
    : [];

  const ctaButtonsRaw = data.cta_buttons ?? data.ctaButtons;
  const ctaButtons = Array.isArray(ctaButtonsRaw)
    ? ctaButtonsRaw
        .map((x) => ({
          text: String((x as Record<string, unknown>)?.text ?? "").trim(),
          link: String((x as Record<string, unknown>)?.link ?? "").trim(),
        }))
        .filter((b) => b.text && b.link)
    : [];

  return {
    hero_title: String(data.hero_title ?? data.heroTitle ?? ""),
    hero_subtitle: String(data.hero_subtitle ?? data.heroSubtitle ?? ""),
    hero_cta_text: String(data.hero_cta_text ?? ""),
    hero_cta_link: String(data.hero_cta_link ?? ""),
    seo_title: String(data.seo_title ?? data.seoTitle ?? ""),
    seo_description: String(data.seo_description ?? data.seoDescription ?? ""),
    seo_keywords: String(data.seo_keywords ?? data.seoKeywords ?? ""),
    why_title: String(data.why_title ?? data.whyTitle ?? ""),
    cta_title: String(data.cta_title ?? data.ctaTitle ?? ""),
    cta_subtitle: String(data.cta_subtitle ?? data.ctaSubtitle ?? ""),
    faq_heading: String(data.faq_heading ?? data.faqHeading ?? ""),
    faq_intro: String(data.faq_intro ?? data.faqIntro ?? ""),
    faq_items: faqItems,
    why_points: whyPoints,
    cta_buttons: ctaButtons,
  };
}

function AdminCategoryPageContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category");
  const selectedCategoryFromQuery =
    categoryParam && !Number.isNaN(Number(categoryParam)) ? Number(categoryParam) : null;

  const [categories, setCategories] = useState<CategoryApi[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [form, setForm] = useState<CategoryPageForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState("");
  const [rowModal, setRowModal] = useState<RowModal>(null);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [whyDraft, setWhyDraft] = useState("");
  const [ctaDraft, setCtaDraft] = useState<CtaButton>({ text: "", link: "" });
  const [faqDraft, setFaqDraft] = useState<FaqItem>({ question: "", answer: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    kind: "faq" | "why" | "cta";
    index: number;
    label: string;
  } | null>(null);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load categories list for selector.
  useEffect(() => {
    let cancelled = false;
    async function loadCats() {
      try {
        const data = await getCategoriesPage({
          page,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        });
        if (cancelled) return;
        setCategories(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.max(1, data.total_pages));
        if (data.page !== page && data.total_pages > 0) setPage(data.page);
      } catch {
        if (!cancelled) {
          setCategories([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      }
    }
    void loadCats();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  // Sync selected category with query param / first available.
  useEffect(() => {
    if (selectedCategoryFromQuery != null) {
      setSelectedCategoryId(selectedCategoryFromQuery);
      return;
    }
    if (sortedCategories.length === 0) {
      return;
    }
    setSelectedCategoryId((prev) => prev ?? sortedCategories[0]?.id ?? null);
  }, [sortedCategories, selectedCategoryFromQuery]);

  useEffect(() => {
    if (selectedCategoryId == null) {
      setSelectedCategoryLabel("");
      return;
    }
    const current = categories.find((c) => c.id === selectedCategoryId);
    if (current) {
      setSelectedCategoryLabel(current.name);
      return;
    }
    let cancelled = false;
    void fetch(apiUrl(`/api/categories/${selectedCategoryId}/?include_inactive=1`), {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CategoryApi | null) => {
        if (!cancelled) setSelectedCategoryLabel(data?.name ?? "");
      })
      .catch(() => {
        if (!cancelled) setSelectedCategoryLabel("");
      });
    return () => {
      cancelled = true;
    };
  }, [categories, selectedCategoryId]);

  const loadContent = useCallback(async (categoryId: number) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`/api/categories/${categoryId}/page-content/?include_inactive=1`), { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setForm(emptyForm);
        return;
      }
      if (!res.ok) {
        setError("Could not load category page content.");
        return;
      }
      setForm(fromApi(data as Record<string, unknown>));
    } catch {
      setError("Network error while loading.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load content whenever selection changes.
  useEffect(() => {
    if (selectedCategoryId == null) {
      setForm(emptyForm);
      setLoading(false);
      return;
    }
    void loadContent(selectedCategoryId);
  }, [selectedCategoryId, loadContent]);

  function addFaq() {
    setFaqDraft({ question: "", answer: "" });
    setRowModal({ kind: "faq", index: form.faq_items.length, isNew: true });
  }

  function removeFaq(index: number) {
    const item = form.faq_items[index];
    setDeleteConfirm({
      kind: "faq",
      index,
      label: item?.question?.trim() || `FAQ #${index + 1}`,
    });
  }

  function addWhyPoint() {
    setWhyDraft("");
    setRowModal({ kind: "why", index: form.why_points.length, isNew: true });
  }

  function removeWhyPoint(index: number) {
    const point = form.why_points[index];
    setDeleteConfirm({
      kind: "why",
      index,
      label: String(point ?? "").trim().slice(0, 60) || `Feature point #${index + 1}`,
    });
  }

  function addCtaButton() {
    setCtaDraft({ text: "", link: "" });
    setRowModal({ kind: "cta", index: form.cta_buttons.length, isNew: true });
  }

  function removeCtaButton(index: number) {
    const btn = form.cta_buttons[index];
    setDeleteConfirm({
      kind: "cta",
      index,
      label: btn?.text?.trim() || `CTA button #${index + 1}`,
    });
  }

  function confirmLocalDelete() {
    if (!deleteConfirm) return;
    const { kind, index } = deleteConfirm;
    if (kind === "faq") {
      setForm((prev) => ({ ...prev, faq_items: prev.faq_items.filter((_, i) => i !== index) }));
      if (rowModal?.kind === "faq" && rowModal.index === index) setRowModal(null);
    } else if (kind === "why") {
      setForm((prev) => ({ ...prev, why_points: prev.why_points.filter((_, i) => i !== index) }));
      if (rowModal?.kind === "why" && rowModal.index === index) setRowModal(null);
    } else {
      setForm((prev) => ({ ...prev, cta_buttons: prev.cta_buttons.filter((_, i) => i !== index) }));
      if (rowModal?.kind === "cta" && rowModal.index === index) setRowModal(null);
    }
    setDeleteConfirm(null);
  }

  function openCategoryContent(categoryId: number) {
    setSelectedCategoryId(categoryId);
    router.replace(`/admin/categorypagecontent?category=${categoryId}`);
    setContentModalOpen(true);
  }

  function closeCategoryContentModal() {
    setContentModalOpen(false);
  }

  function openWhyEdit(index: number) {
    setWhyDraft(form.why_points[index] ?? "");
    setRowModal({ kind: "why", index, isNew: false });
  }

  function openCtaEdit(index: number) {
    const item = form.cta_buttons[index];
    setCtaDraft({ text: item?.text ?? "", link: item?.link ?? "" });
    setRowModal({ kind: "cta", index, isNew: false });
  }

  function openFaqEdit(index: number) {
    const item = form.faq_items[index];
    setFaqDraft({ question: item?.question ?? "", answer: item?.answer ?? "" });
    setRowModal({ kind: "faq", index, isNew: false });
  }

  function closeRowModal() {
    setRowModal(null);
  }

  function saveRowModal() {
    if (!rowModal) return;

    if (rowModal.kind === "why") {
      const value = whyDraft.trim();
      if (!value) {
        setError("Feature content is required.");
        return;
      }
      setForm((prev) => {
        const next = [...prev.why_points];
        if (rowModal.isNew) next.push(value);
        else next[rowModal.index] = value;
        return { ...prev, why_points: next };
      });
    }

    if (rowModal.kind === "cta") {
      const text = ctaDraft.text.trim();
      const link = ctaDraft.link.trim();
      if (!text || !link) {
        setError("CTA button text and link are required.");
        return;
      }
      setForm((prev) => {
        const next = [...prev.cta_buttons];
        const item = { text, link };
        if (rowModal.isNew) next.push(item);
        else next[rowModal.index] = item;
        return { ...prev, cta_buttons: next };
      });
    }

    if (rowModal.kind === "faq") {
      const question = faqDraft.question.trim();
      const answer = faqDraft.answer.trim();
      if (!question || !answer) {
        setError("FAQ question and answer are required.");
        return;
      }
      setForm((prev) => {
        const next = [...prev.faq_items];
        const item = { question, answer };
        if (rowModal.isNew) next.push(item);
        else next[rowModal.index] = item;
        return { ...prev, faq_items: next };
      });
    }

    setError(null);
    setRowModal(null);
  }

  async function save() {
    if (selectedCategoryId == null) {
      setError("Please select a category first.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`/api/categories/${selectedCategoryId}/page-content/`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero_title: form.hero_title,
          hero_subtitle: form.hero_subtitle,
          hero_cta_text: form.hero_cta_text,
          hero_cta_link: form.hero_cta_link,
          seo_title: form.seo_title,
          seo_description: form.seo_description,
          seo_keywords: form.seo_keywords,
          why_title: form.why_title,
          why_points: form.why_points.filter((x) => x.trim()),
          cta_title: form.cta_title,
          cta_subtitle: form.cta_subtitle,
          cta_buttons: form.cta_buttons.filter((b) => b.text.trim() && b.link.trim()),
          faq_heading: form.faq_heading,
          faq_intro: form.faq_intro,
          faq_items: form.faq_items.filter((f) => f.question.trim() && f.answer.trim()),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("Save failed.");
        return;
      }
      setForm(fromApi(data as Record<string, unknown>));
      setMessage("Category page content saved.");
      closeCategoryContentModal();
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  // Open content modal when arriving via ?category=ID
  useEffect(() => {
    if (selectedCategoryFromQuery == null) return;
    setContentModalOpen(true);
  }, [selectedCategoryFromQuery]);

  const selectedCategoryName =
    selectedCategoryId == null ? null : selectedCategoryLabel || `Category #${selectedCategoryId}`;

  const categoryContentFields = (
    <div className="space-y-8">
      {loading ? <p className="text-sm text-slate-500">Loading content…</p> : null}

      <section className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">SEO</h4>
        <div className="grid gap-4">
          <div>
            <label className={fieldLabel}>SEO Title</label>
            <input
              className={inputClass}
              value={form.seo_title}
              onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))}
              placeholder="e.g. Best {{category}} Courses | SkillVedika"
            />
          </div>
          <div>
            <label className={fieldLabel}>SEO Description</label>
            <textarea
              className={textareaClass}
              rows={3}
              value={form.seo_description}
              onChange={(e) => setForm((f) => ({ ...f, seo_description: e.target.value }))}
            />
          </div>
          <div>
            <label className={fieldLabel}>SEO Keywords (comma-separated)</label>
            <textarea
              className={textareaClass}
              rows={2}
              value={form.seo_keywords}
              onChange={(e) => setForm((f) => ({ ...f, seo_keywords: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">Hero</h4>
        <div className="grid gap-4">
          <div>
            <label className={fieldLabel}>Hero Label</label>
            <input className={inputClass} value={form.hero_title} onChange={(e) => setForm((f) => ({ ...f, hero_title: e.target.value }))} />
          </div>
          <div>
            <label className={fieldLabel}>Hero Subtitle</label>
            <textarea className={textareaClass} rows={3} value={form.hero_subtitle} onChange={(e) => setForm((f) => ({ ...f, hero_subtitle: e.target.value }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>Hero CTA Text</label>
              <input className={inputClass} value={form.hero_cta_text} onChange={(e) => setForm((f) => ({ ...f, hero_cta_text: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Hero CTA Link</label>
              <input className={inputClass} value={form.hero_cta_link} onChange={(e) => setForm((f) => ({ ...f, hero_cta_link: e.target.value }))} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">Why Learn</h4>
        <div>
          <label className={fieldLabel}>Why Section Title</label>
          <input className={inputClass} value={form.why_title} onChange={(e) => setForm((f) => ({ ...f, why_title: e.target.value }))} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="p-3 font-bold text-slate-700">#</th>
                <th className="p-3 font-bold text-slate-700">Preview</th>
                <th className="p-3 font-bold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {form.why_points.map((p, idx) => (
                <tr key={`why-${idx}`} className="border-t border-slate-100 align-top">
                  <td className="p-3 text-slate-500">{idx + 1}</td>
                  <td className="p-3 text-slate-700">{p.replace(/<[^>]+>/g, " ").trim().slice(0, 120) || "—"}</td>
                  <td className="p-3">
                    <AdminIconActions onEdit={() => openWhyEdit(idx)} onDelete={() => removeWhyPoint(idx)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={btnSecondary} onClick={addWhyPoint}>
          Add Feature
        </button>
      </section>

      <section className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">CTA</h4>
        <div className="grid gap-4">
          <div>
            <label className={fieldLabel}>CTA Title</label>
            <input className={inputClass} value={form.cta_title} onChange={(e) => setForm((f) => ({ ...f, cta_title: e.target.value }))} />
          </div>
          <div>
            <label className={fieldLabel}>CTA Subtitle</label>
            <textarea className={textareaClass} rows={3} value={form.cta_subtitle} onChange={(e) => setForm((f) => ({ ...f, cta_subtitle: e.target.value }))} />
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="p-3 font-bold text-slate-700">#</th>
                <th className="p-3 font-bold text-slate-700">Text</th>
                <th className="p-3 font-bold text-slate-700">Link</th>
                <th className="p-3 font-bold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {form.cta_buttons.map((b, idx) => (
                <tr key={`cta-btn-${idx}`} className="border-t border-slate-100 align-top">
                  <td className="p-3 text-slate-500">{idx + 1}</td>
                  <td className="p-3 text-slate-700">{b.text || "—"}</td>
                  <td className="p-3 text-slate-600 break-all">{b.link || "—"}</td>
                  <td className="p-3">
                    <AdminIconActions onEdit={() => openCtaEdit(idx)} onDelete={() => removeCtaButton(idx)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={btnSecondary} onClick={addCtaButton}>
          Add CTA Button
        </button>
      </section>

      <section className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">FAQ</h4>
        <div>
          <label className={fieldLabel}>FAQ Heading</label>
          <input className={inputClass} value={form.faq_heading} onChange={(e) => setForm((f) => ({ ...f, faq_heading: e.target.value }))} />
        </div>
        <div>
          <label className={fieldLabel}>FAQ Intro</label>
          <textarea className={textareaClass} rows={2} value={form.faq_intro} onChange={(e) => setForm((f) => ({ ...f, faq_intro: e.target.value }))} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="p-3 font-bold text-slate-700">#</th>
                <th className="p-3 font-bold text-slate-700">Question</th>
                <th className="p-3 font-bold text-slate-700">Answer</th>
                <th className="p-3 font-bold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {form.faq_items.map((item, index) => (
                <tr key={`faq-${index}`} className="border-t border-slate-100 align-top">
                  <td className="p-3 text-slate-500">{index + 1}</td>
                  <td className="p-3 text-slate-700">{item.question || "—"}</td>
                  <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{item.answer || "—"}</td>
                  <td className="p-3">
                    <AdminIconActions onEdit={() => openFaqEdit(index)} onDelete={() => removeFaq(index)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className={btnSecondary} onClick={addFaq}>
          Add FAQ Item
        </button>
      </section>
    </div>
  );

  return (
    <HomeEditorShell
      title="Category Page Content"
      subtitle="Manage remaining dynamic sections for category pages (/courses/[slug])."
    >
      {message ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <EditorPanel title="Categories">
        <div className="mb-4">
          <input
            type="search"
            className={inputClass}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, slug, description..."
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="p-3 font-bold text-slate-700">ID</th>
                <th className="p-3 font-bold text-slate-700">Name</th>
                <th className="p-3 font-bold text-slate-700">Slug</th>
                <th className="p-3 font-bold text-slate-700">Description</th>
                <th className="p-3 font-bold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCategories.map((c) => (
                <tr
                  key={c.id}
                  className={`border-t border-slate-100 align-top hover:bg-slate-50/80 ${selectedCategoryId === c.id ? "bg-amber-50/60" : ""}`}
                >
                  <td className="p-3 font-mono text-xs text-slate-500">{c.id}</td>
                  <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="p-3 font-mono text-xs text-slate-600">{c.slug}</td>
                  <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{c.description || "—"}</td>
                  <td className="p-3">
                    <AdminIconActions
                      hideDelete
                      editLabel="Edit category content"
                      onEdit={() => openCategoryContent(c.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedCategories.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No categories match your search.</p>
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
      </EditorPanel>

      <AdminModal
        open={contentModalOpen}
        size="xlarge"
        title={
          selectedCategoryName
            ? `Edit category page content — ${selectedCategoryName}`
            : "Edit category page content"
        }
        onClose={closeCategoryContentModal}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={btnSecondary} onClick={closeCategoryContentModal}>
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={saving || selectedCategoryId == null}
              onClick={() => void save()}
            >
              {saving ? "Saving..." : "Save category page content"}
            </button>
          </div>
        }
      >
        {categoryContentFields}
      </AdminModal>

      <AdminModal
        open={rowModal != null}
        size="large"
        title={
          rowModal == null
            ? ""
            : rowModal.isNew
              ? rowModal.kind === "why"
                ? "Add feature point"
                : rowModal.kind === "cta"
                  ? "Add CTA button"
                  : "Add FAQ item"
              : rowModal.kind === "why"
                ? `Edit feature point #${rowModal.index + 1}`
                : rowModal.kind === "cta"
                  ? `Edit CTA button #${rowModal.index + 1}`
                  : `Edit FAQ item #${rowModal.index + 1}`
        }
        onClose={closeRowModal}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={btnSecondary} onClick={closeRowModal}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} onClick={saveRowModal}>
              {rowModal?.isNew ? "Add" : "Save changes"}
            </button>
          </div>
        }
      >
        {rowModal?.kind === "why" ? (
          <div>
            <label className={fieldLabel}>Feature content</label>
            <TipTapEditor
              value={whyDraft}
              onChange={setWhyDraft}
              scrollContent
              contentMaxHeightClassName="max-h-[420px]"
            />
          </div>
        ) : null}

        {rowModal?.kind === "cta" ? (
          <div className="space-y-4">
            <div>
              <label className={fieldLabel}>Button text</label>
              <input
                className={inputClass}
                value={ctaDraft.text}
                onChange={(e) => setCtaDraft((d) => ({ ...d, text: e.target.value }))}
                placeholder="e.g. Enroll now"
              />
            </div>
            <div>
              <label className={fieldLabel}>Button link</label>
              <input
                className={inputClass}
                value={ctaDraft.link}
                onChange={(e) => setCtaDraft((d) => ({ ...d, link: e.target.value }))}
                placeholder="e.g. /courses"
              />
            </div>
          </div>
        ) : null}

        {rowModal?.kind === "faq" ? (
          <div className="space-y-4">
            <div>
              <label className={fieldLabel}>Question</label>
              <input
                className={inputClass}
                value={faqDraft.question}
                onChange={(e) => setFaqDraft((d) => ({ ...d, question: e.target.value }))}
              />
            </div>
            <div>
              <label className={fieldLabel}>Answer</label>
              <textarea
                className={textareaClass}
                rows={8}
                value={faqDraft.answer}
                onChange={(e) => setFaqDraft((d) => ({ ...d, answer: e.target.value }))}
              />
            </div>
          </div>
        ) : null}
      </AdminModal>

      <AdminConfirmDialog
        open={deleteConfirm != null}
        title={
          deleteConfirm?.kind === "faq"
            ? "Delete FAQ?"
            : deleteConfirm?.kind === "why"
              ? "Delete feature point?"
              : "Delete CTA button?"
        }
        message={
          deleteConfirm ? (
            <>
              Delete <span className="font-semibold text-slate-900">{deleteConfirm.label}</span>? This
              cannot be undone until you save (or discard) the page content.
            </>
          ) : null
        }
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmLocalDelete}
      />
    </HomeEditorShell>
  );
}

export default function AdminCategoryPageContent() {
  return (
    <Suspense
      fallback={
        <HomeEditorShell title="Category page content" subtitle="Loading…">
          <p className="text-sm text-slate-500">Loading…</p>
        </HomeEditorShell>
      }
    >
      <AdminCategoryPageContentInner />
    </Suspense>
  );
}
