"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type ReactNode,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import TipTapEditor from "@/components/editor/TipTapEditor";

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/courses/courses-page-content/`;

type PageContentForm = {
  hero_title: string;
  hero_subtitle: string;
  hero_cta_buttons: { text: string; link: string }[];
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  why_title: string;
  why_points_text: string;
  cta_title: string;
  cta_subtitle: string;
  cta_buttons: { text: string; link: string; variant?: string }[];
  faq_heading: string;
  faq_intro: string;
  faq_items: { question: string; answer: string }[];
};

const emptyForm: PageContentForm = {
  hero_title: "",
  hero_subtitle: "",
  hero_cta_buttons: [],
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  why_title: "",
  why_points_text: "",
  cta_title: "",
  cta_subtitle: "",
  cta_buttons: [],
  faq_heading: "",
  faq_intro: "",
  faq_items: [],
};

function normalizeButtons(raw: unknown): { text: string; link: string; variant?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b) => b && typeof b === "object")
    .map((b) => b as { text?: unknown; link?: unknown; variant?: unknown })
    .map((b) => ({
      text: String(b.text ?? "").trim(),
      link: String(b.link ?? "").trim(),
      variant: String(b.variant ?? "").trim() || undefined,
    }))
    .filter((b) => b.text && b.link);
}

function mapApiToForm(data: Record<string, unknown>): PageContentForm {
  const why = data.whyPoints ?? data.why_points;
  let whyText = "";
  if (Array.isArray(why)) {
    whyText = why.map(String).join("\n");
  } else if (typeof why === "string") {
    whyText = why;
  }

  const faqItemsRaw = data.faqItems ?? data.faq_items;
  const faqItems = Array.isArray(faqItemsRaw)
    ? faqItemsRaw.map((item) => ({
        question: String((item as Record<string, unknown>)?.question ?? ""),
        answer: String((item as Record<string, unknown>)?.answer ?? ""),
      }))
    : [];

  const heroButtonsRaw = data.heroCtaButtons ?? data.hero_cta_buttons ?? data.hero_cta_buttons;
  const ctaButtonsRaw = data.ctaButtons ?? data.cta_buttons;

  return {
    hero_title: String(data.heroTitle ?? data.hero_title ?? ""),
    hero_subtitle: String(data.heroSubtitle ?? data.hero_subtitle ?? ""),
    hero_cta_buttons: normalizeButtons(heroButtonsRaw).map((b) => ({ text: b.text, link: b.link })),
    meta_title: String(data.metaTitle ?? data.meta_title ?? ""),
    meta_description: String(data.metaDescription ?? data.meta_description ?? ""),
    meta_keywords: String(data.metaKeywords ?? data.meta_keywords ?? ""),
    why_title: String(data.whyTitle ?? data.why_title ?? ""),
    why_points_text: whyText,
    cta_title: String(data.ctaTitle ?? data.cta_title ?? ""),
    cta_subtitle: String(data.ctaSubtitle ?? data.cta_subtitle ?? ""),
    cta_buttons: normalizeButtons(ctaButtonsRaw),
    faq_heading: String(data.faqHeading ?? data.faq_heading ?? ""),
    faq_intro: String(data.faqIntro ?? data.faq_intro ?? ""),
    faq_items: faqItems,
  };
}

export default function CoursesPageContentAdmin() {
  const [form, setForm] = useState<PageContentForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<null | "seo" | "hero" | "why" | "cta" | "faq" | "all">(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setError(null);
      try {
        const res = await fetch(API);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 404) {
          setForm(emptyForm);
          setMessage("No record yet — fill the form and save to create one.");
          return;
        }
        if (!res.ok) {
          setError(typeof data === "object" && data && "error" in data ? String(data.error) : `HTTP ${res.status}`);
          setForm(emptyForm);
          return;
        }
        setForm(mapApiToForm(data as Record<string, unknown>));
        setMessage(null);
      } catch {
        if (!cancelled) setError("Could not reach API. Is Django running? Check admin rewrites (BACKEND_URL).");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function updateFaq(index: number, key: "question" | "answer", value: string) {
    setForm((prev) => {
      const next = [...prev.faq_items];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, faq_items: next };
    });
  }

  function addFaq() {
    setForm((prev) => ({
      ...prev,
      faq_items: [...prev.faq_items, { question: "", answer: "" }],
    }));
  }

  function removeFaq(index: number) {
    setForm((prev) => ({
      ...prev,
      faq_items: prev.faq_items.filter((_, i) => i !== index),
    }));
  }

  function updateHeroButton(index: number, key: "text" | "link", value: string) {
    setForm((prev) => {
      const next = [...prev.hero_cta_buttons];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, hero_cta_buttons: next };
    });
  }

  function addHeroButton() {
    setForm((prev) => ({
      ...prev,
      hero_cta_buttons: [...prev.hero_cta_buttons, { text: "", link: "" }],
    }));
  }

  function removeHeroButton(index: number) {
    setForm((prev) => ({
      ...prev,
      hero_cta_buttons: prev.hero_cta_buttons.filter((_, i) => i !== index),
    }));
  }

  function updateCtaButton(index: number, key: "text" | "link" | "variant", value: string) {
    setForm((prev) => {
      const next = [...prev.cta_buttons];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, cta_buttons: next };
    });
  }

  function addCtaButton() {
    setForm((prev) => ({
      ...prev,
      cta_buttons: [...prev.cta_buttons, { text: "", link: "", variant: "" }],
    }));
  }

  function removeCtaButton(index: number) {
    setForm((prev) => ({
      ...prev,
      cta_buttons: prev.cta_buttons.filter((_, i) => i !== index),
    }));
  }

  async function saveSection(section: "seo" | "hero" | "why" | "cta" | "faq" | "all") {
    setSaving(section);
    setMessage(null);
    setError(null);

    const faq_items = form.faq_items.filter((item) => item.question.trim() && item.answer.trim());
    const hero_cta_buttons = form.hero_cta_buttons.filter((b) => b.text.trim() && b.link.trim());
    const cta_buttons = form.cta_buttons
      .map((b) => ({
        text: b.text.trim(),
        link: b.link.trim(),
        variant: String(b.variant ?? "").trim() || undefined,
      }))
      .filter((b) => b.text && b.link);

    const body =
      section === "seo"
        ? {
            meta_title: form.meta_title,
            meta_description: form.meta_description,
            meta_keywords: form.meta_keywords,
          }
        : section === "hero"
          ? {
              hero_title: form.hero_title,
              hero_subtitle: form.hero_subtitle,
              hero_cta_buttons,
            }
          : section === "why"
            ? {
                why_title: form.why_title,
                why_points: form.why_points_text,
              }
            : section === "cta"
              ? {
                  cta_title: form.cta_title,
                  cta_subtitle: form.cta_subtitle,
                  cta_buttons,
                }
              : section === "faq"
                ? {
                    faq_heading: form.faq_heading,
                    faq_intro: form.faq_intro,
                    faq_items,
                  }
                : {
                    hero_title: form.hero_title,
                    hero_subtitle: form.hero_subtitle,
                    hero_cta_buttons,
                    meta_title: form.meta_title,
                    meta_description: form.meta_description,
                    meta_keywords: form.meta_keywords,
                    why_title: form.why_title,
                    why_points: form.why_points_text,
                    cta_title: form.cta_title,
                    cta_subtitle: form.cta_subtitle,
                    cta_buttons,
                    faq_heading: form.faq_heading,
                    faq_intro: form.faq_intro,
                    faq_items,
                  };

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(JSON.stringify(data, null, 2) || `Save failed (${res.status})`);
        setSaving(null);
        return;
      }
      setForm(mapApiToForm(data as Record<string, unknown>));
      setMessage(
        section === "all"
          ? "Saved successfully. Public courses page will use this data after refresh."
          : `Saved ${section.toUpperCase()} section successfully.`,
      );
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">Courses page content</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Single record for public <code className="rounded bg-slate-100 px-1 text-xs">/courses</code> and{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">/courses/[category-slug]</code> SEO, hero, why section,
          CTA, and FAQ. Why points: one per line.
        </p>
        {message ? (
          <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">{message}</p>
        ) : null}
        {error ? (
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 whitespace-pre-wrap">
            {error}
          </pre>
        ) : null}
      </div>

      <Section title="SEO">
        <Input
          name="meta_title"
          value={form.meta_title}
          onChange={handleChange}
          placeholder="Meta title (supports {category} token)"
        />
        <Textarea
          name="meta_description"
          value={form.meta_description}
          onChange={handleChange}
          placeholder="Meta description (supports {category} token)"
        />
        <Input
          name="meta_keywords"
          value={form.meta_keywords}
          onChange={handleChange}
          placeholder="keyword1, {category} course, keyword3"
        />
        <SaveRow>
          <SaveButton disabled={saving !== null} onClick={() => void saveSection("seo")}>
            {saving === "seo" ? "Saving…" : "Save SEO"}
          </SaveButton>
        </SaveRow>
      </Section>

      <Section title="Hero">
        <Input name="hero_title" value={form.hero_title} onChange={handleChange} placeholder="Hero title" />
        <Textarea name="hero_subtitle" value={form.hero_subtitle} onChange={handleChange} placeholder="Hero subtitle" />
        <div className="space-y-3">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Hero CTA buttons</label>
          {form.hero_cta_buttons.map((b, index) => (
            <div key={`hero-cta-${index}`} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <Input
                value={b.text}
                onChange={(e) => updateHeroButton(index, "text", e.target.value)}
                placeholder="Button text"
              />
              <Input
                value={b.link}
                onChange={(e) => updateHeroButton(index, "link", e.target.value)}
                placeholder="Button link (e.g. /courses#all-courses)"
              />
              <button
                type="button"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                onClick={() => removeHeroButton(index)}
              >
                Remove button
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={addHeroButton}
          >
            Add hero button
          </button>
        </div>
        <SaveRow>
          <SaveButton disabled={saving !== null} onClick={() => void saveSection("hero")}>
            {saving === "hero" ? "Saving…" : "Save Hero"}
          </SaveButton>
        </SaveRow>
      </Section>

      <Section title="Why learn / invest">
        <Input name="why_title" value={form.why_title} onChange={handleChange} placeholder="Section title" />
        <TipTapEditor value={form.why_points_text} onChange={(html) => setForm((f) => ({ ...f, why_points_text: html }))} placeholder="Why points" />
        <SaveRow>
          <SaveButton disabled={saving !== null} onClick={() => void saveSection("why")}>
            {saving === "why" ? "Saving…" : "Save Why section"}
          </SaveButton>
        </SaveRow>
      </Section>

      <Section title="CTA">
        <Input name="cta_title" value={form.cta_title} onChange={handleChange} placeholder="CTA title" />
        <Textarea name="cta_subtitle" value={form.cta_subtitle} onChange={handleChange} placeholder="CTA subtitle" />
        <div className="space-y-3">
          <label className="mb-1 block text-xs font-semibold text-slate-600">CTA buttons</label>
          {form.cta_buttons.map((b, index) => (
            <div key={`cta-btn-${index}`} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <Input
                value={b.text}
                onChange={(e) => updateCtaButton(index, "text", e.target.value)}
                placeholder="Button text"
              />
              <Input
                value={b.link}
                onChange={(e) => updateCtaButton(index, "link", e.target.value)}
                placeholder="Button link (e.g. /contact)"
              />
              <Input
                value={String(b.variant ?? "")}
                onChange={(e) => updateCtaButton(index, "variant", e.target.value)}
                placeholder='Variant (optional: "primary" | "secondary")'
              />
              <button
                type="button"
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700"
                onClick={() => removeCtaButton(index)}
              >
                Remove button
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={addCtaButton}
          >
            Add CTA button
          </button>
        </div>
        <SaveRow>
          <SaveButton disabled={saving !== null} onClick={() => void saveSection("cta")}>
            {saving === "cta" ? "Saving…" : "Save CTA"}
          </SaveButton>
        </SaveRow>
      </Section>

      <Section title="FAQ">
        <Input name="faq_heading" value={form.faq_heading} onChange={handleChange} placeholder="FAQ heading" />
        <Textarea name="faq_intro" value={form.faq_intro} onChange={handleChange} placeholder="Intro under heading" />
        <div className="space-y-3">
          {form.faq_items.map((item, index) => (
            <div key={`faq-${index}`} className="rounded-xl border border-slate-200 p-4">
              <div className="space-y-3">
                <Input
                  value={item.question}
                  onChange={(e) => updateFaq(index, "question", e.target.value)}
                  placeholder="Question"
                />
                <Textarea
                  value={item.answer}
                  onChange={(e) => updateFaq(index, "answer", e.target.value)}
                  placeholder="Answer"
                  rows={4}
                />
                <button type="button" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700" onClick={() => removeFaq(index)}>
                  Remove FAQ
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700" onClick={addFaq}>
            Add FAQ Item
          </button>
        </div>
        <SaveRow>
          <SaveButton disabled={saving !== null} onClick={() => void saveSection("faq")}>
            {saving === "faq" ? "Saving…" : "Save FAQ"}
          </SaveButton>
        </SaveRow>
      </Section>

      <button
        type="button"
        disabled={saving !== null}
        onClick={() => void saveSection("all")}
        className="rounded-xl bg-[var(--admin-accent)] px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--admin-accent-hover)] disabled:opacity-60"
      >
        {saving === "all" ? "Saving…" : "Save all changes"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md shadow-[#0a2540]/[0.04]">
      <h2 className="text-lg font-bold text-[var(--admin-navy)]">{title}</h2>
      {children}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={fieldClass} />;
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={fieldClass} />;
}

function SaveRow({ children }: { children: ReactNode }) {
  return <div className="pt-2 flex items-center justify-end">{children}</div>;
}

function SaveButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[var(--admin-accent-hover)] disabled:opacity-60"
    >
      {children}
    </button>
  );
}
