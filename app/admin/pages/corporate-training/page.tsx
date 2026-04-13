"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HomeEditorShell,
  EditorPanel,
  btnDanger,
  btnPrimary,
  fieldLabel,
  inputClass,
  textareaClass,
} from "@/components/admin/HomeEditorShell";
import { apiUrl } from "@/lib/api";
import TipTapEditor from "@/components/editor/TipTapEditor";
import {
  authHeadersBearer,
  authHeadersJson,
  authHeadersMultipart,
  getAccessToken,
} from "@/lib/auth";

type Hero = {
  id?: number;
  title: string;
  highlight: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  image?: string | null;
};
type Empower = {
  id?: number;
  title: string;
  description: string;
  image?: string | null;
};
type SimpleItem = { id?: number; title: string; description: string; icon?: string };
type Demo = { id?: number; title: string; points: string[]; button_text: string };
type Seo = { id?: number; meta_title: string; meta_description: string; meta_keywords: string };
type SectionContent = {
  id?: number;
  empower_title: string;
  empower_subtitle: string;
  portfolio_title: string;
  portfolio_subtitle: string;
  advantage_title: string;
  advantage_subtitle: string;
  process_title: string;
  process_subtitle: string;
  demo_title: string;
  demo_subtitle: string;
};

const emptyHero: Hero = {
  title: "",
  highlight: "",
  subtitle: "",
  button_text: "Get Started",
  button_link: "",
  image: null,
};
const emptyEmpower: Empower = { title: "", description: "", image: null };
const emptySimple: SimpleItem = { title: "", description: "" };
const emptyDemo: Demo = { title: "", points: [], button_text: "Submit your details" };
const emptySeo: Seo = { meta_title: "", meta_description: "", meta_keywords: "" };
const emptySectionContent: SectionContent = {
  empower_title: "",
  empower_subtitle: "",
  portfolio_title: "",
  portfolio_subtitle: "",
  advantage_title: "",
  advantage_subtitle: "",
  process_title: "",
  process_subtitle: "",
  demo_title: "",
  demo_subtitle: "",
};
const iconOptions = [
  { label: "No icon", value: "" },
  { label: "💻 Laptop", value: "💻" },
  { label: "🧑‍💻 Developer", value: "🧑‍💻" },
  { label: "⚡ Fast", value: "⚡" },
  { label: "📈 Growth", value: "📈" },
  { label: "🎯 Target", value: "🎯" },
  { label: "🛠 Tools", value: "🛠" },
  { label: "📊 Analytics", value: "📊" },
  { label: "🔧 Support", value: "🔧" },
];

export default function AdminCorporateTrainingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [hero, setHero] = useState<Hero>(emptyHero);
  const [empower, setEmpower] = useState<Empower>(emptyEmpower);
  const [portfolio, setPortfolio] = useState<SimpleItem[]>([]);
  const [advantage, setAdvantage] = useState<SimpleItem[]>([]);
  const [process, setProcess] = useState<SimpleItem[]>([]);
  const [demo, setDemo] = useState<Demo>(emptyDemo);
  const [seo, setSeo] = useState<Seo>(emptySeo);
  const [sectionContent, setSectionContent] = useState<SectionContent>(emptySectionContent);

  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [empowerImageFile, setEmpowerImageFile] = useState<File | null>(null);
  const [draftPortfolio, setDraftPortfolio] = useState<SimpleItem>(emptySimple);
  const [draftAdvantage, setDraftAdvantage] = useState<SimpleItem>(emptySimple);
  const [draftProcess, setDraftProcess] = useState<SimpleItem>(emptySimple);
  const [demoPointsText, setDemoPointsText] = useState("");
  const [editingPortfolioId, setEditingPortfolioId] = useState<number | null>(null);
  const [editingPortfolio, setEditingPortfolio] = useState<SimpleItem>(emptySimple);
  const [editingAdvantageId, setEditingAdvantageId] = useState<number | null>(null);
  const [editingAdvantage, setEditingAdvantage] = useState<SimpleItem>(emptySimple);
  const [editingProcessId, setEditingProcessId] = useState<number | null>(null);
  const [editingProcess, setEditingProcess] = useState<SimpleItem>(emptySimple);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [heroRes, empRes, portRes, advRes, procRes, demoRes, seoRes, sectionRes] = await Promise.all([
        fetch(apiUrl("/api/corporate-training/hero/"), { cache: "no-store" }),
        fetch(apiUrl("/api/corporate-training/empower/"), { cache: "no-store" }),
        fetch(apiUrl("/api/corporate-training/portfolio/"), { cache: "no-store" }),
        fetch(apiUrl("/api/corporate-training/advantage/"), { cache: "no-store" }),
        fetch(apiUrl("/api/corporate-training/process/"), { cache: "no-store" }),
        fetch(apiUrl("/api/corporate-training/demo/"), { cache: "no-store" }),
        fetch(apiUrl("/api/corporate-training/meta-tags/"), { cache: "no-store" }),
        fetch(apiUrl("/api/corporate-training/section-content/"), { cache: "no-store" }),
      ]);
      const [heroJson, empJson, portJson, advJson, procJson, demoJson, seoJson, sectionJson] = await Promise.all([
        heroRes.json().catch(() => []),
        empRes.json().catch(() => []),
        portRes.json().catch(() => []),
        advRes.json().catch(() => []),
        procRes.json().catch(() => []),
        demoRes.json().catch(() => []),
        seoRes.json().catch(() => ({})),
        sectionRes.json().catch(() => ({})),
      ]);
      console.log("🔥 HERO:", heroJson);
    console.log("🔥 EMPower:", empJson);
    console.log("🔥 PORTFOLIO:", portJson);
    console.log("🔥 ADVANTAGE:", advJson);
    console.log("🔥 PROCESS:", procJson);
    console.log("🔥 DEMO:", demoJson);
    console.log("🔥 SEO:", seoJson);
    console.log("🔥 SECTION:", sectionJson);
      const h = Array.isArray(heroJson) ? heroJson[0] : null;
      const e = Array.isArray(empJson) ? empJson[0] : null;
      const d = Array.isArray(demoJson) ? demoJson[0] : null;
      const s = Array.isArray(seoJson) ? seoJson[0] : seoJson;

      setHero({ ...emptyHero, ...(h ?? {}) });
      setEmpower({ ...emptyEmpower, ...(e ?? {}) });
      setPortfolio(Array.isArray(portJson) ? portJson : []);
      setAdvantage(Array.isArray(advJson) ? advJson : []);
      setProcess(Array.isArray(procJson) ? procJson : []);
      const demoResolved: Demo = {
        ...emptyDemo,
        ...(d ?? {}),
        points: Array.isArray(d?.points) ? d.points : [],
      };
      setDemo(demoResolved);
      setDemoPointsText(demoResolved.points.join("\n"));
      setSeo({ ...emptySeo, ...(s ?? {}) });
      setSectionContent({ ...emptySectionContent, ...(sectionJson ?? {}) });
    } catch {
      setError("Could not load corporate training data.");
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

  async function saveSingleton(
    endpoint: string,
    payload: Record<string, unknown>,
    id?: number,
    file?: File | null,
    fileKey = "image",
  ) {
    const url = apiUrl(id ? `${endpoint}${id}/` : endpoint);
    if (file) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v == null ? "" : String(v)));
      fd.append(fileKey, file);
      return fetch(url, {
        method: id ? "PATCH" : "POST",
        headers: authHeadersMultipart(),
        body: fd,
      });
    }
    return fetch(url, {
      method: id ? "PATCH" : "POST",
      headers: authHeadersJson(),
      body: JSON.stringify(payload),
    });
  }

  async function saveSectionContent(partial: Partial<SectionContent>) {
    // SectionContent API is singleton on base route (no /<id>/ endpoint),
    // so always use PUT on the collection URL.
    return fetch(apiUrl("/api/corporate-training/section-content/"), {
      method: "PUT",
      headers: authHeadersJson(),
      body: JSON.stringify({ ...sectionContent, ...partial }),
    });
  }

  async function runSectionSave(
    key: string,
    saver: () => Promise<Response>,
    successMessage: string,
  ) {
    setError(null);
    setMessage(null);
    setSavingSection(key);
    try {
      const res = await saver();
      if (!res.ok) {
        setError("Could not save section.");
        return;
      }
      await load();
      setMessage(successMessage);
    } catch {
      setError("Network error while saving section.");
    } finally {
      setSavingSection(null);
    }
  }

  async function addItem(
    endpoint: string,
    draft: SimpleItem,
    reset: () => void,
    includeIcon = false
  ) {
    if (!draft.title.trim() || !draft.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setError(null);
    try {
      const payload: Record<string, string> = {
        title: draft.title.trim(),
        description: draft.description.trim(),
      };
      if (includeIcon) {
        payload.icon = (draft.icon ?? "").trim();
      }

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: authHeadersJson(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("Could not add item.");
        return;
      }
      reset();
      await load();
      setMessage("Item added.");
    } catch {
      setError("Could not add item.");
    }
  }

  async function deleteItem(endpoint: string, id?: number) {
    if (!id) return;
    setError(null);
    try {
      const res = await fetch(apiUrl(`${endpoint}${id}/`), {
        method: "DELETE",
        headers: authHeadersBearer(),
      });
      if (!res.ok) {
        setError("Could not delete item.");
        return;
      }
      await load();
      setMessage("Item deleted.");
    } catch {
      setError("Could not delete item.");
    }
  }

  async function updateItem(
    endpoint: string,
    id: number,
    payload: Record<string, string>,
  ) {
    setError(null);
    try {
      const res = await fetch(apiUrl(`${endpoint}${id}/`), {
        method: "PATCH",
        headers: authHeadersJson(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("Could not update item.");
        return false;
      }
      await load();
      setMessage("Item updated.");
      return true;
    } catch {
      setError("Could not update item.");
      return false;
    }
  }

  if (loading) {
    return (
      <HomeEditorShell title="Corporate Training Page" subtitle="Loading...">
        <p className="text-sm text-slate-500">Loading...</p>
      </HomeEditorShell>
    );
  }

  return (
    <HomeEditorShell
      title="Corporate Training Page"
      subtitle="Manage hero, empower, portfolio, advantage, process and demo sections."
    >
      {message ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <EditorPanel title="SEO Section">
        <div className="grid gap-4">
          <div>
            <label className={fieldLabel}>Meta Title</label>
            <input className={inputClass} value={seo.meta_title} onChange={(e) => setSeo((p) => ({ ...p, meta_title: e.target.value }))} />
          </div>
          <div>
            <label className={fieldLabel}>Meta Description</label>
            <textarea
              className={textareaClass}
              rows={4}
              value={seo.meta_description}
              onChange={(e) => setSeo((p) => ({ ...p, meta_description: e.target.value }))}
            />
          </div>
          <div>
            <label className={fieldLabel}>Meta Keywords (comma-separated)</label>
            <input className={inputClass} value={seo.meta_keywords} onChange={(e) => setSeo((p) => ({ ...p, meta_keywords: e.target.value }))} />
          </div>
          <button
            type="button"
            className={btnPrimary}
            onClick={() =>
              runSectionSave(
                "seo",
                () => saveSingleton("/api/corporate-training/meta-tags/", seo, seo.id),
                "SEO section saved.",
              )
            }
          >
            {savingSection === "seo" ? "Saving..." : "Save SEO Section"}
          </button>
        </div>
      </EditorPanel>

      <EditorPanel title="Hero Section">
        <div className="grid gap-4">
          <div><label className={fieldLabel}>Title</label><input className={inputClass} value={hero.title} onChange={(e) => setHero((h) => ({ ...h, title: e.target.value }))} /></div>
          <div><label className={fieldLabel}>Highlight</label><input className={inputClass} value={hero.highlight} onChange={(e) => setHero((h) => ({ ...h, highlight: e.target.value }))} /></div>
          <div><label className={fieldLabel}>Subtitle</label><textarea className={textareaClass} rows={3} value={hero.subtitle} onChange={(e) => setHero((h) => ({ ...h, subtitle: e.target.value }))} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={fieldLabel}>Button Text</label><input className={inputClass} value={hero.button_text} onChange={(e) => setHero((h) => ({ ...h, button_text: e.target.value }))} /></div>
            <div><label className={fieldLabel}>Button Link</label><input className={inputClass} value={hero.button_link} onChange={(e) => setHero((h) => ({ ...h, button_link: e.target.value }))} /></div>
          </div>
          <div>
            <label className={fieldLabel}>Hero Image</label>
            <input type="file" accept="image/*" onChange={(e) => setHeroImageFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:text-white file:font-semibold" />
          </div>
          {hero.image && (
  <div className="mt-3">
    <p className={fieldLabel}>Current Image</p>
    <img
      src={hero.image}
      alt="Hero Preview"
      className="h-40 w-full rounded-xl object-cover border border-slate-200"
    />
  </div>
)}
          <button
            type="button"
            className={btnPrimary}
            onClick={() =>
              runSectionSave(
                "hero",
                async () => {
                  const res = await saveSingleton(
                    "/api/corporate-training/hero/",
                    {
                      title: hero.title,
                      highlight: hero.highlight,
                      subtitle: hero.subtitle,
                      button_text: hero.button_text,
                      button_link: hero.button_link,
                    },
                    hero.id,
                    heroImageFile,
                  );
                
                  if (!res.ok) return res;
                
                  const data = await res.json();
                  
                
                  // 🔥 IMPORTANT: update hero immediately (NOT rely on load)
                  setHero((prev) => ({
                    ...prev,
                    ...data,
                  }));
                
                  setHeroImageFile(null);
                
                  return res;
                }
                , "Hero section saved."
              )
            }
          >
            {savingSection === "hero" ? "Saving..." : "Save Hero Section"}
          </button>
        </div>
      </EditorPanel>

      <EditorPanel title="Empower Section">
        <div className="grid gap-4">
          <div><label className={fieldLabel}>Section Heading</label><input className={inputClass} value={sectionContent.empower_title} onChange={(e) => setSectionContent((x) => ({ ...x, empower_title: e.target.value }))} /></div>
          <div><label className={fieldLabel}>Section Subheading</label><textarea className={textareaClass} rows={3} value={sectionContent.empower_subtitle} onChange={(e) => setSectionContent((x) => ({ ...x, empower_subtitle: e.target.value }))} /></div>
          <div><label className={fieldLabel}>Title</label><input className={inputClass} value={empower.title} onChange={(e) => setEmpower((x) => ({ ...x, title: e.target.value }))} /></div>
          <div><label className={fieldLabel}>Description</label><TipTapEditor value={empower.description} onChange={(value: string) => setEmpower((x) => ({ ...x, description: value }))} /></div>
          <div>
            <label className={fieldLabel}>Empower Image</label>
            <input type="file" accept="image/*" onChange={(e) => setEmpowerImageFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:text-white file:font-semibold" />
          </div>
          <button
            type="button"
            className={btnPrimary}
            onClick={() =>
              runSectionSave(
                "empower",
                async () => {
                  const sectionRes = await saveSectionContent({
                    empower_title: sectionContent.empower_title,
                    empower_subtitle: sectionContent.empower_subtitle,
                  });
                  if (!sectionRes.ok) return sectionRes;
                  return saveSingleton(
                    "/api/corporate-training/empower/",
                    { title: empower.title, description: empower.description },
                    empower.id,
                    empowerImageFile,
                  );
                },
                "Empower section saved.",
              )
            }
          >
            {savingSection === "empower" ? "Saving..." : "Save Empower Section"}
          </button>
        </div>
      </EditorPanel>

      <EditorPanel title="Portfolio Items">
        <div className="space-y-3">
          <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <input className={inputClass} placeholder="Section heading" value={sectionContent.portfolio_title} onChange={(e) => setSectionContent((x) => ({ ...x, portfolio_title: e.target.value }))} />
            <textarea className={textareaClass} rows={2} placeholder="Section subheading" value={sectionContent.portfolio_subtitle} onChange={(e) => setSectionContent((x) => ({ ...x, portfolio_subtitle: e.target.value }))} />
            <button
              type="button"
              className={btnPrimary}
              onClick={() =>
                runSectionSave(
                  "portfolioHeading",
                  () =>
                    saveSectionContent({
                      portfolio_title: sectionContent.portfolio_title,
                      portfolio_subtitle: sectionContent.portfolio_subtitle,
                    }),
                  "Portfolio heading saved.",
                )
              }
            >
              {savingSection === "portfolioHeading" ? "Saving..." : "Save Portfolio Heading"}
            </button>
          </div>
          {portfolio.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3">
              {editingPortfolioId === item.id ? (
                <div className="grid gap-3">
                  <input className={inputClass} value={editingPortfolio.title} onChange={(e) => setEditingPortfolio((d) => ({ ...d, title: e.target.value }))} />
                  <textarea className={textareaClass} rows={2} value={editingPortfolio.description} onChange={(e) => setEditingPortfolio((d) => ({ ...d, description: e.target.value }))} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={async () => {
                        if (!item.id) return;
                        const ok = await updateItem("/api/corporate-training/portfolio/", item.id, {
                          title: editingPortfolio.title.trim(),
                          description: editingPortfolio.description.trim(),
                        });
                        if (ok) {
                          setEditingPortfolioId(null);
                          setEditingPortfolio(emptySimple);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button type="button" className={btnDanger} onClick={() => { setEditingPortfolioId(null); setEditingPortfolio(emptySimple); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{item.title}</p><p className="text-sm text-slate-600">{item.description}</p></div>
                  <div className="flex gap-2">
                    <button type="button" className={btnPrimary} onClick={() => { setEditingPortfolioId(item.id ?? null); setEditingPortfolio({ title: item.title, description: item.description, icon: item.icon }); }}>Edit</button>
                    <button type="button" className={btnDanger} onClick={() => deleteItem("/api/corporate-training/portfolio/", item.id)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <input className={inputClass} placeholder="Title" value={draftPortfolio.title} onChange={(e) => setDraftPortfolio((d) => ({ ...d, title: e.target.value }))} />
            <textarea className={textareaClass} rows={2} placeholder="Description" value={draftPortfolio.description} onChange={(e) => setDraftPortfolio((d) => ({ ...d, description: e.target.value }))} />
            <button type="button" className={btnPrimary} onClick={() => addItem("/api/corporate-training/portfolio/", draftPortfolio, () => setDraftPortfolio(emptySimple))}>Add Portfolio Item</button>
          </div>
        </div>
      </EditorPanel>

      <EditorPanel title="Advantage Items">
        <div className="space-y-3">
          <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <input className={inputClass} placeholder="Section heading" value={sectionContent.advantage_title} onChange={(e) => setSectionContent((x) => ({ ...x, advantage_title: e.target.value }))} />
            <textarea className={textareaClass} rows={2} placeholder="Section subheading" value={sectionContent.advantage_subtitle} onChange={(e) => setSectionContent((x) => ({ ...x, advantage_subtitle: e.target.value }))} />
            <button
              type="button"
              className={btnPrimary}
              onClick={() =>
                runSectionSave(
                  "advantageHeading",
                  () =>
                    saveSectionContent({
                      advantage_title: sectionContent.advantage_title,
                      advantage_subtitle: sectionContent.advantage_subtitle,
                    }),
                  "Advantage heading saved.",
                )
              }
            >
              {savingSection === "advantageHeading" ? "Saving..." : "Save Advantage Heading"}
            </button>
          </div>
          {advantage.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3">
              {editingAdvantageId === item.id ? (
                <div className="grid gap-3">
                  <select className={inputClass} value={editingAdvantage.icon ?? ""} onChange={(e) => setEditingAdvantage((d) => ({ ...d, icon: e.target.value }))}>
                    {iconOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input className={inputClass} value={editingAdvantage.title} onChange={(e) => setEditingAdvantage((d) => ({ ...d, title: e.target.value }))} />
                  <textarea className={textareaClass} rows={2} value={editingAdvantage.description} onChange={(e) => setEditingAdvantage((d) => ({ ...d, description: e.target.value }))} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={async () => {
                        if (!item.id) return;
                        const ok = await updateItem("/api/corporate-training/advantage/", item.id, {
                          title: editingAdvantage.title.trim(),
                          description: editingAdvantage.description.trim(),
                          icon: (editingAdvantage.icon ?? "").trim(),
                        });
                        if (ok) {
                          setEditingAdvantageId(null);
                          setEditingAdvantage(emptySimple);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button type="button" className={btnDanger} onClick={() => { setEditingAdvantageId(null); setEditingAdvantage(emptySimple); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.icon ? `${item.icon} ` : ""}{item.title}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={btnPrimary} onClick={() => { setEditingAdvantageId(item.id ?? null); setEditingAdvantage({ title: item.title, description: item.description, icon: item.icon }); }}>Edit</button>
                    <button type="button" className={btnDanger} onClick={() => deleteItem("/api/corporate-training/advantage/", item.id)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <div>
              <label className={fieldLabel}>Icon</label>
              <select
                className={inputClass}
                value={draftAdvantage.icon ?? ""}
                onChange={(e) => setDraftAdvantage((d) => ({ ...d, icon: e.target.value }))}
              >
                {iconOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <input className={inputClass} placeholder="Title" value={draftAdvantage.title} onChange={(e) => setDraftAdvantage((d) => ({ ...d, title: e.target.value }))} />
            <textarea className={textareaClass} rows={2} placeholder="Description" value={draftAdvantage.description} onChange={(e) => setDraftAdvantage((d) => ({ ...d, description: e.target.value }))} />
            <button
              type="button"
              className={btnPrimary}
              onClick={() =>
                addItem(
                  "/api/corporate-training/advantage/",
                  draftAdvantage,
                  () => setDraftAdvantage(emptySimple),
                  true
                )
              }
            >
              Add Advantage Item
            </button>
          </div>
        </div>
      </EditorPanel>
      <EditorPanel title="Process Steps">
        <div className="space-y-3">
          <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <input className={inputClass} placeholder="Section heading" value={sectionContent.process_title} onChange={(e) => setSectionContent((x) => ({ ...x, process_title: e.target.value }))} />
            <textarea className={textareaClass} rows={2} placeholder="Section subheading" value={sectionContent.process_subtitle} onChange={(e) => setSectionContent((x) => ({ ...x, process_subtitle: e.target.value }))} />
            <button
              type="button"
              className={btnPrimary}
              onClick={() =>
                runSectionSave(
                  "processHeading",
                  () =>
                    saveSectionContent({
                      process_title: sectionContent.process_title,
                      process_subtitle: sectionContent.process_subtitle,
                    }),
                  "Process heading saved.",
                )
              }
            >
              {savingSection === "processHeading" ? "Saving..." : "Save Process Heading"}
            </button>
          </div>
          {process.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3">
              {editingProcessId === item.id ? (
                <div className="grid gap-3">
                  <select className={inputClass} value={editingProcess.icon ?? ""} onChange={(e) => setEditingProcess((d) => ({ ...d, icon: e.target.value }))}>
                    {iconOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <input className={inputClass} value={editingProcess.title} onChange={(e) => setEditingProcess((d) => ({ ...d, title: e.target.value }))} />
                  <textarea className={textareaClass} rows={2} value={editingProcess.description} onChange={(e) => setEditingProcess((d) => ({ ...d, description: e.target.value }))} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      onClick={async () => {
                        if (!item.id) return;
                        const ok = await updateItem("/api/corporate-training/process/", item.id, {
                          title: editingProcess.title.trim(),
                          description: editingProcess.description.trim(),
                          icon: (editingProcess.icon ?? "").trim(),
                        });
                        if (ok) {
                          setEditingProcessId(null);
                          setEditingProcess(emptySimple);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button type="button" className={btnDanger} onClick={() => { setEditingProcessId(null); setEditingProcess(emptySimple); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.icon ? `${item.icon} ` : ""}{item.title}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={btnPrimary} onClick={() => { setEditingProcessId(item.id ?? null); setEditingProcess({ title: item.title, description: item.description, icon: item.icon }); }}>Edit</button>
                    <button type="button" className={btnDanger} onClick={() => deleteItem("/api/corporate-training/process/", item.id)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div className="grid gap-3 rounded-xl border border-dashed border-slate-300 p-4">
            <div>
              <label className={fieldLabel}>Icon</label>
              <select
                className={inputClass}
                value={draftProcess.icon ?? ""}
                onChange={(e) => setDraftProcess((d) => ({ ...d, icon: e.target.value }))}
              >
                {iconOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <input className={inputClass} placeholder="Step title" value={draftProcess.title} onChange={(e) => setDraftProcess((d) => ({ ...d, title: e.target.value }))} />
            <textarea className={textareaClass} rows={2} placeholder="Step description" value={draftProcess.description} onChange={(e) => setDraftProcess((d) => ({ ...d, description: e.target.value }))} />
            <button
              type="button"
              className={btnPrimary}
              onClick={() =>
                addItem(
                  "/api/corporate-training/process/",
                  draftProcess,
                  () => setDraftProcess(emptySimple),
                  true
                )
              }
            >
              Add Process Step
            </button>
          </div>
        </div>
      </EditorPanel>

      <EditorPanel title="Demo Section">
        <div className="grid gap-4">
          <div><label className={fieldLabel}>Section Heading</label><input className={inputClass} value={sectionContent.demo_title} onChange={(e) => setSectionContent((x) => ({ ...x, demo_title: e.target.value }))} /></div>
          <div><label className={fieldLabel}>Section Subheading</label><textarea className={textareaClass} rows={3} value={sectionContent.demo_subtitle} onChange={(e) => setSectionContent((x) => ({ ...x, demo_subtitle: e.target.value }))} /></div>
          <div><label className={fieldLabel}>Demo Heading</label><input className={inputClass} value={demo.title} onChange={(e) => setDemo((d) => ({ ...d, title: e.target.value }))} /></div>
          <div><label className={fieldLabel}>Features (one per line)</label><textarea className={textareaClass} rows={5} value={demoPointsText} onChange={(e) => setDemoPointsText(e.target.value)} /></div>
          <div><label className={fieldLabel}>Button Text</label><input className={inputClass} value={demo.button_text} onChange={(e) => setDemo((d) => ({ ...d, button_text: e.target.value }))} /></div>
          <button
            type="button"
            className={btnPrimary}
            onClick={() =>
              runSectionSave(
                "demo",
                async () => {
                  const sectionRes = await saveSectionContent({
                    demo_title: sectionContent.demo_title,
                    demo_subtitle: sectionContent.demo_subtitle,
                  });
                  if (!sectionRes.ok) return sectionRes;
                  return saveSingleton(
                    "/api/corporate-training/demo/",
                    {
                      title: demo.title,
                      button_text: demo.button_text,
                      points: demoPointsText
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    },
                    demo.id,
                  );
                },
                "Demo section saved.",
              )
            }
          >
            {savingSection === "demo" ? "Saving..." : "Save Demo Section"}
          </button>
        </div>
      </EditorPanel>
    </HomeEditorShell>
  );
}
