"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HomeEditorShell, EditorPanel, btnDanger, btnPrimary, btnSecondary, fieldLabel, inputClass, textareaClass } from "@/components/admin/HomeEditorShell";
import { apiUrl, getCategories, type CategoryApi } from "@/lib/api";
import TipTapEditor from "@/components/editor/TipTapEditor";

type FaqItem = { question: string; answer: string };
type CtaButton = { text: string; link: string };

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

export default function AdminCategoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category");
  const selectedCategoryFromQuery =
    categoryParam && !Number.isNaN(Number(categoryParam)) ? Number(categoryParam) : null;

  const [categories, setCategories] = useState<CategoryApi[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [form, setForm] = useState<CategoryPageForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Load categories list for selector.
  useEffect(() => {
    let cancelled = false;
    async function loadCats() {
      setCategoriesLoading(true);
      try {
        const data = await getCategories();
        if (cancelled) return;
        setCategories(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }
    void loadCats();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync selected category with query param / first available.
  useEffect(() => {
    if (sortedCategories.length === 0) {
      setSelectedCategoryId(null);
      return;
    }
    if (selectedCategoryFromQuery != null) {
      const exists = sortedCategories.some((c) => c.id === selectedCategoryFromQuery);
      if (exists) {
        setSelectedCategoryId(selectedCategoryFromQuery);
        return;
      }
    }
    setSelectedCategoryId((prev) => prev ?? sortedCategories[0]?.id ?? null);
  }, [sortedCategories, selectedCategoryFromQuery]);

  const loadContent = useCallback(async (categoryId: number) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`/api/categories/${categoryId}/page-content/`), { cache: "no-store" });
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

  const savePartial = useCallback(
    async (payload: Partial<CategoryPageForm>, okMessage: string) => {
      if (selectedCategoryId == null) {
        setError("Please select a category first.");
        return;
      }
      setError(null);
      setMessage(null);
      try {
        const res = await fetch(apiUrl(`/api/categories/${selectedCategoryId}/page-content/`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            why_points: payload.why_points ? payload.why_points.filter((x) => x.trim()) : undefined,
            cta_buttons: payload.cta_buttons
              ? payload.cta_buttons.filter((b) => b.text.trim() && b.link.trim())
              : undefined,
            faq_items: payload.faq_items
              ? payload.faq_items.filter((f) => f.question.trim() && f.answer.trim())
              : undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError("Save failed.");
          return;
        }
        setForm(fromApi(data as Record<string, unknown>));
        setMessage(okMessage);
      } catch {
        setError("Network error while saving.");
      }
    },
    [selectedCategoryId],
  );

  // Load content whenever selection changes.
  useEffect(() => {
    if (selectedCategoryId == null) {
      setForm(emptyForm);
      setLoading(false);
      return;
    }
    void loadContent(selectedCategoryId);
  }, [selectedCategoryId, loadContent]);

  function updateFaq(index: number, key: keyof FaqItem, value: string) {
    setForm((prev) => {
      const next = [...prev.faq_items];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, faq_items: next };
    });
  }

  function addFaq() {
    setForm((prev) => ({ ...prev, faq_items: [...prev.faq_items, { question: "", answer: "" }] }));
  }

  function removeFaq(index: number) {
    setForm((prev) => ({ ...prev, faq_items: prev.faq_items.filter((_, i) => i !== index) }));
  }

  function addWhyPoint() {
    setForm((prev) => ({ ...prev, why_points: [...prev.why_points, ""] }));
  }

  function updateWhyPoint(index: number, value: string) {
    setForm((prev) => {
      const next = [...prev.why_points];
      next[index] = value;
      return { ...prev, why_points: next };
    });
  }

  function removeWhyPoint(index: number) {
    setForm((prev) => ({ ...prev, why_points: prev.why_points.filter((_, i) => i !== index) }));
  }

  function addCtaButton() {
    setForm((prev) => ({ ...prev, cta_buttons: [...prev.cta_buttons, { text: "", link: "" }] }));
  }

  function updateCtaButton(index: number, key: keyof CtaButton, value: string) {
    setForm((prev) => {
      const next = [...prev.cta_buttons];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, cta_buttons: next };
    });
  }

  function removeCtaButton(index: number) {
    setForm((prev) => ({ ...prev, cta_buttons: prev.cta_buttons.filter((_, i) => i !== index) }));
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
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HomeEditorShell
      title="Category Page Content"
      subtitle="Manage remaining dynamic sections for category pages (/courses/[slug])."
    >
      {message ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <EditorPanel title="Select Category">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={fieldLabel}>Category</label>
            <select
              className={inputClass}
              value={selectedCategoryId ?? ""}
              onChange={(e) => {
                const next = e.target.value ? Number(e.target.value) : null;
                setSelectedCategoryId(next);
                if (next != null) router.replace(`/admin/categorypagecontent?category=${next}`);
              }}
              disabled={categoriesLoading || sortedCategories.length === 0}
            >
              {sortedCategories.length === 0 ? (
                <option value="">{categoriesLoading ? "Loading categories..." : "No categories found"}</option>
              ) : null}
              {sortedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-slate-600">
            <div className="font-semibold text-slate-700">Editing</div>
            <div className="mt-1">
              {selectedCategoryId == null
                ? "—"
                : sortedCategories.find((c) => c.id === selectedCategoryId)?.name ?? `Category #${selectedCategoryId}`}
            </div>
          </div>
        </div>
      </EditorPanel>

      <EditorPanel title="SEO">
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
              placeholder="Write a short description for search results (150-160 chars)."
            />
          </div>
          <div>
            <label className={fieldLabel}>SEO Keywords (comma-separated)</label>
            <textarea
              className={textareaClass}
              rows={2}
              value={form.seo_keywords}
              onChange={(e) => setForm((f) => ({ ...f, seo_keywords: e.target.value }))}
              placeholder="keyword1, keyword2, {{category}} training"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            className={btnSecondary}
            disabled={savingSection != null || saving}
            onClick={() => {
              setSavingSection("seo");
              void savePartial(
                {
                  seo_title: form.seo_title,
                  seo_description: form.seo_description,
                  seo_keywords: form.seo_keywords,
                },
                "SEO saved.",
              ).finally(() => setSavingSection(null));
            }}
          >
            {savingSection === "seo" ? "Saving..." : "Save SEO"}
          </button>
        </div>
      </EditorPanel>

      {loading ? <p className="text-sm text-slate-500">Loading content…</p> : null}

      <EditorPanel title="Hero">
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
        <div className="mt-4">
          <button
            type="button"
            className={btnSecondary}
            disabled={savingSection != null || saving}
            onClick={() => {
              setSavingSection("hero");
              void savePartial(
                {
                  hero_title: form.hero_title,
                  hero_subtitle: form.hero_subtitle,
                  hero_cta_text: form.hero_cta_text,
                  hero_cta_link: form.hero_cta_link,
                },
                "Hero section saved.",
              ).finally(() => setSavingSection(null));
            }}
          >
            {savingSection === "hero" ? "Saving..." : "Save Hero"}
          </button>
        </div>
      </EditorPanel>

      <EditorPanel title="Why Learn Section">
        <div className="grid gap-4">
          <div>
            <label className={fieldLabel}>Why Section Title</label>
            <input className={inputClass} value={form.why_title} onChange={(e) => setForm((f) => ({ ...f, why_title: e.target.value }))} />
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div className="text-sm font-semibold text-slate-700">Features / Points</div>
          {form.why_points.map((p, idx) => (
            <div key={`why-${idx}`} className="space-y-2">
              <TipTapEditor
                value={p}
                onChange={(value: string) => updateWhyPoint(idx, value)}
              />
              <button
                type="button"
                className={btnDanger}
                onClick={() => removeWhyPoint(idx)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className={btnSecondary} onClick={addWhyPoint}>
            Add Feature
          </button>
        </div>
        <div className="mt-4">
          <button
            type="button"
            className={btnSecondary}
            disabled={savingSection != null || saving}
            onClick={() => {
              setSavingSection("why");
              void savePartial(
                { why_title: form.why_title, why_points: form.why_points.filter((x) => x.trim()) },
                "Why Learn section saved.",
              ).finally(() => setSavingSection(null));
            }}
          >
            {savingSection === "why" ? "Saving..." : "Save Why Learn"}
          </button>
        </div>
      </EditorPanel>

      <EditorPanel title="CTA Section">
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
        <div className="mt-5 space-y-3">
          <div className="text-sm font-semibold text-slate-700">CTA Buttons</div>
          {form.cta_buttons.map((b, idx) => (
            <div key={`cta-btn-${idx}`} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabel}>Button Text</label>
                <input
                  className={inputClass}
                  value={b.text}
                  onChange={(e) => updateCtaButton(idx, "text", e.target.value)}
                  placeholder="e.g. Enroll now"
                />
              </div>
              <div>
                <label className={fieldLabel}>Button Link</label>
                <input
                  className={inputClass}
                  value={b.link}
                  onChange={(e) => updateCtaButton(idx, "link", e.target.value)}
                  placeholder="e.g. /courses#all-courses or https://..."
                />
              </div>
              <div className="sm:col-span-2">
                <button type="button" className={btnDanger} onClick={() => removeCtaButton(idx)}>
                  Remove Button
                </button>
              </div>
            </div>
          ))}
          <button type="button" className={btnSecondary} onClick={addCtaButton}>
            Add CTA Button
          </button>
        </div>
        <div className="mt-4">
          <button
            type="button"
            className={btnSecondary}
            disabled={savingSection != null || saving}
            onClick={() => {
              setSavingSection("cta");
              void savePartial(
                {
                  cta_title: form.cta_title,
                  cta_subtitle: form.cta_subtitle,
                  cta_buttons: form.cta_buttons.filter((x) => x.text.trim() && x.link.trim()),
                },
                "CTA section saved.",
              ).finally(() => setSavingSection(null));
            }}
          >
            {savingSection === "cta" ? "Saving..." : "Save CTA"}
          </button>
        </div>
      </EditorPanel>

      <EditorPanel title="FAQ">
        <div className="space-y-4">
          <div>
            <label className={fieldLabel}>FAQ Heading</label>
            <input className={inputClass} value={form.faq_heading} onChange={(e) => setForm((f) => ({ ...f, faq_heading: e.target.value }))} />
          </div>
          <div>
            <label className={fieldLabel}>FAQ Intro</label>
            <textarea className={textareaClass} rows={2} value={form.faq_intro} onChange={(e) => setForm((f) => ({ ...f, faq_intro: e.target.value }))} />
          </div>

          {form.faq_items.map((item, index) => (
            <div key={`faq-${index}`} className="rounded-xl border border-slate-200 p-4">
              <div className="space-y-3">
                <div>
                  <label className={fieldLabel}>Question</label>
                  <input className={inputClass} value={item.question} onChange={(e) => updateFaq(index, "question", e.target.value)} />
                </div>
                <div>
                  <label className={fieldLabel}>Answer</label>
                  <textarea className={textareaClass} rows={3} value={item.answer} onChange={(e) => updateFaq(index, "answer", e.target.value)} />
                </div>
                <button type="button" className={btnDanger} onClick={() => removeFaq(index)}>
                  Remove FAQ
                </button>
              </div>
            </div>
          ))}

          <button type="button" className={btnSecondary} onClick={addFaq}>
            Add FAQ Item
          </button>
        </div>
        <div className="mt-4">
          <button
            type="button"
            className={btnSecondary}
            disabled={savingSection != null || saving}
            onClick={() => {
              setSavingSection("faq");
              void savePartial(
                {
                  faq_heading: form.faq_heading,
                  faq_intro: form.faq_intro,
                  faq_items: form.faq_items,
                },
                "FAQ section saved.",
              ).finally(() => setSavingSection(null));
            }}
          >
            {savingSection === "faq" ? "Saving..." : "Save FAQ"}
          </button>
        </div>
      </EditorPanel>

      <button type="button" className={btnPrimary} disabled={saving} onClick={() => void save()}>
        {saving ? "Saving..." : "Save Category Page Content"}
      </button>
    </HomeEditorShell>
  );
}
