"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { authHeadersBearer, authHeadersJson, getAccessToken } from "@/lib/auth";
import { parseApiError } from "@/lib/cms-errors";
import { HomeEditorShell, EditorPanel, btnDanger, btnPrimary, fieldLabel, inputClass, textareaClass } from "@/components/admin/HomeEditorShell";

type Hero = {
  id?: number;
  title: string;
  subtitle: string;
  button_primary_text: string;
  button_secondary_text: string;
  background_color: string;
  text_color: string;
  seo_meta_title: string;
  seo_meta_description: string;
  seo_meta_keywords: string;
};

type Feature = {
  id?: number;
  title: string;
  description: string;
  icon: string;
};

type Cta = {
  id?: number;
  title: string;
  subtitle: string;
  button_text: string;
  background_color: string;
  text_color: string;
};

type FormSection = {
  id?: number;
  title: string;
  subtitle: string;
  submit_button_text: string;
};

const emptyHero: Hero = {
  title: "",
  subtitle: "",
  button_primary_text: "Apply Now",
  button_secondary_text: "Learn More",
  background_color: "#EAF0F8",
  text_color: "#0C1A35",
  seo_meta_title: "",
  seo_meta_description: "",
  seo_meta_keywords: "",
};

const emptyFeature = (): Feature => ({ title: "", description: "", icon: "" });
const emptyCta: Cta = {
  title: "",
  subtitle: "",
  button_text: "Apply Now",
  background_color: "#EAF0F8",
  text_color: "#1E3A68",
};
const emptyFormSection: FormSection = {
  title: "",
  subtitle: "",
  submit_button_text: "Submit Application",
};

export default function AdminInstructorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [hero, setHero] = useState<Hero>(emptyHero);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featureDraft, setFeatureDraft] = useState<Feature>(emptyFeature());
  const [cta, setCta] = useState<Cta>(emptyCta);
  const [formSection, setFormSection] = useState<FormSection>(emptyFormSection);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [heroRes, featuresRes, ctaRes, formRes] = await Promise.all([
        fetch(apiUrl("/api/instructor/hero/"), { cache: "no-store" }),
        fetch(apiUrl("/api/instructor/features/"), { cache: "no-store" }),
        fetch(apiUrl("/api/instructor/cta/"), { cache: "no-store" }),
        fetch(apiUrl("/api/instructor/form/"), { cache: "no-store" }),
      ]);
      const [heroJson, featuresJson, ctaJson, formJson] = await Promise.all([
        heroRes.json().catch(() => []),
        featuresRes.json().catch(() => []),
        ctaRes.json().catch(() => []),
        formRes.json().catch(() => []),
      ]);
      const firstHero = Array.isArray(heroJson) ? heroJson[0] : null;
      const firstCta = Array.isArray(ctaJson) ? ctaJson[0] : null;
      const firstForm = Array.isArray(formJson) ? formJson[0] : null;
      setHero({
        ...emptyHero,
        ...(firstHero ?? {}),
      });
      setFeatures(Array.isArray(featuresJson) ? featuresJson : []);
      setCta({
        ...emptyCta,
        ...(firstCta ?? {}),
      });
      setFormSection({
        ...emptyFormSection,
        ...(firstForm ?? {}),
      });
    } catch {
      setError("Could not load instructor CMS data.");
      setHero(emptyHero);
      setFeatures([]);
      setCta(emptyCta);
      setFormSection(emptyFormSection);
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

  async function saveSingleton(endpoint: string, payload: Record<string, unknown>, id?: number) {
    const url = id ? `${endpoint}${id}/` : endpoint;
    return fetch(apiUrl(url), {
      method: id ? "PUT" : "POST",
      headers: authHeadersJson(),
      body: JSON.stringify(payload),
    });
  }

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    if (!hero.title.trim()) {
      setError("Hero title is required.");
      return;
    }
    setSaving(true);
    try {
      const [heroRes, ctaRes, formRes] = await Promise.all([
        saveSingleton("/api/instructor/hero/", hero, hero.id),
        saveSingleton("/api/instructor/cta/", cta, cta.id),
        saveSingleton("/api/instructor/form/", formSection, formSection.id),
      ]);
      const saveResponses = [heroRes, ctaRes, formRes];
      const all401 = saveResponses.every((r) => r.status === 401);
      if (all401) {
        // Session is fully unauthorized; redirect to admin entry.
        router.replace("/admin");
        return;
      }
      const any401 = saveResponses.some((r) => r.status === 401);
      if (any401) {
        // Keep the user on the same page so they can see what saved.
        // Some instructor sections may require extra permissions.
        setError("Some sections were not saved (unauthorized). Please check permissions and try again.");
        await load();
        return;
      }
      if (!heroRes.ok || !ctaRes.ok || !formRes.ok) {
        const body = await heroRes.json().catch(async () => ctaRes.json().catch(async () => formRes.json().catch(() => ({}))));
        setError(parseApiError(body));
        return;
      }
      await load();
      setMessage("Instructor page content saved successfully.");
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function addFeature() {
    setError(null);
    setMessage(null);
    if (!featureDraft.title.trim() || !featureDraft.description.trim()) {
      setError("Feature title and description are required.");
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/instructor/features/"), {
        method: "POST",
        headers: authHeadersJson(),
        body: JSON.stringify({
          title: featureDraft.title.trim(),
          description: featureDraft.description.trim(),
          icon: featureDraft.icon.trim() || "⭐",
        }),
      });
      if (!res.ok) {
        setError(parseApiError(await res.json().catch(() => ({}))));
        return;
      }
      setFeatureDraft(emptyFeature());
      await load();
      setMessage("Feature added.");
    } catch {
      setError("Could not add feature.");
    }
  }

  async function deleteFeature(id?: number) {
    if (!id) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`/api/instructor/features/${id}/`), {
        method: "DELETE",
        headers: authHeadersBearer(),
      });
      if (!res.ok) {
        setError("Could not delete feature.");
        return;
      }
      await load();
      setMessage("Feature deleted.");
    } catch {
      setError("Could not delete feature.");
    }
  }

  if (loading) {
    return (
      <HomeEditorShell title="Instructor Page CMS" subtitle="Loading...">
        <p className="text-sm text-slate-500">Loading...</p>
      </HomeEditorShell>
    );
  }

  return (
    <HomeEditorShell title="Instructor Page CMS" subtitle="All sections below are dynamic and come from backend APIs.">
      {message ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <form onSubmit={handleSaveAll} className="space-y-6">
        <EditorPanel title="Hero Section">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Title *</label>
              <input className={inputClass} value={hero.title} onChange={(e) => setHero((h) => ({ ...h, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Subtitle</label>
              <textarea className={textareaClass} rows={3} value={hero.subtitle} onChange={(e) => setHero((h) => ({ ...h, subtitle: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Primary Button Text</label>
              <input className={inputClass} value={hero.button_primary_text} onChange={(e) => setHero((h) => ({ ...h, button_primary_text: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Secondary Button Text</label>
              <input className={inputClass} value={hero.button_secondary_text} onChange={(e) => setHero((h) => ({ ...h, button_secondary_text: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Background Color</label>
              <input className={inputClass} value={hero.background_color} onChange={(e) => setHero((h) => ({ ...h, background_color: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Text Color</label>
              <input className={inputClass} value={hero.text_color} onChange={(e) => setHero((h) => ({ ...h, text_color: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>SEO Meta Title</label>
              <input className={inputClass} value={hero.seo_meta_title} onChange={(e) => setHero((h) => ({ ...h, seo_meta_title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>SEO Meta Description</label>
              <textarea className={textareaClass} rows={3} value={hero.seo_meta_description} onChange={(e) => setHero((h) => ({ ...h, seo_meta_description: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>SEO Meta Keywords (comma-separated)</label>
              <input className={inputClass} value={hero.seo_meta_keywords} onChange={(e) => setHero((h) => ({ ...h, seo_meta_keywords: e.target.value }))} />
            </div>
          </div>
        </EditorPanel>

        <EditorPanel title="Feature Cards">
          <div className="space-y-3">
            {features.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3">
                <div>
                  <p className="font-semibold text-slate-900">{f.icon || "⭐"} {f.title}</p>
                  <p className="text-sm text-slate-600">{f.description}</p>
                </div>
                <button type="button" className={btnDanger} onClick={() => deleteFeature(f.id)}>
                  Delete
                </button>
              </div>
            ))}
            <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:grid-cols-3">
              <input className={inputClass} placeholder="Feature title" value={featureDraft.title} onChange={(e) => setFeatureDraft((d) => ({ ...d, title: e.target.value }))} />
              <input className={inputClass} placeholder="Icon (e.g. ⭐)" value={featureDraft.icon} onChange={(e) => setFeatureDraft((d) => ({ ...d, icon: e.target.value }))} />
              <button type="button" className={btnPrimary} onClick={addFeature}>Add Feature</button>
              <textarea className={`${textareaClass} sm:col-span-3`} rows={2} placeholder="Feature description" value={featureDraft.description} onChange={(e) => setFeatureDraft((d) => ({ ...d, description: e.target.value }))} />
            </div>
          </div>
        </EditorPanel>

        <EditorPanel title="CTA Section">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Title</label>
              <input className={inputClass} value={cta.title} onChange={(e) => setCta((c) => ({ ...c, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Subtitle</label>
              <textarea className={textareaClass} rows={3} value={cta.subtitle} onChange={(e) => setCta((c) => ({ ...c, subtitle: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Button Text</label>
              <input className={inputClass} value={cta.button_text} onChange={(e) => setCta((c) => ({ ...c, button_text: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Background Color</label>
              <input className={inputClass} value={cta.background_color} onChange={(e) => setCta((c) => ({ ...c, background_color: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Text Color</label>
              <input className={inputClass} value={cta.text_color} onChange={(e) => setCta((c) => ({ ...c, text_color: e.target.value }))} />
            </div>
          </div>
        </EditorPanel>

        <EditorPanel title="Form Section">
          <div className="grid gap-4">
            <div>
              <label className={fieldLabel}>Title</label>
              <input className={inputClass} value={formSection.title} onChange={(e) => setFormSection((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Subtitle</label>
              <textarea className={textareaClass} rows={3} value={formSection.subtitle} onChange={(e) => setFormSection((f) => ({ ...f, subtitle: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Submit Button Text</label>
              <input className={inputClass} value={formSection.submit_button_text} onChange={(e) => setFormSection((f) => ({ ...f, submit_button_text: e.target.value }))} />
            </div>
          </div>
        </EditorPanel>

        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? "Saving..." : "Save All Instructor Sections"}
        </button>
      </form>
    </HomeEditorShell>
  );
}
