"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WhyChooseSection, { type WhyChooseItem } from "@/components/home/WhyChooseSection";
import {
  HomeEditorShell,
  EditorPanel,
  fieldLabel,
  inputClass,
  textareaClass,
  btnPrimary,
  btnSecondary,
  btnDanger,
} from "@/components/admin/HomeEditorShell";
import { apiUrl } from "@/lib/api";
import { authHeadersBearer, authHeadersJson, getAccessToken } from "@/lib/auth";
import { parseApiError } from "@/lib/cms-errors";

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

export default function AdminWhyChoosePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingCopy, setSavingCopy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [heading, setHeading] = useState("");
  const [intro, setIntro] = useState("");
  const [items, setItems] = useState<WhyChooseItem[]>([]);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [copyRes, listRes] = await Promise.all([
        fetch(apiUrl("/api/home/section-copy/")),
        fetch(apiUrl("/api/home/why-choose/")),
      ]);
      if (!copyRes.ok || !listRes.ok) throw new Error("load");
      const copyRows = (await copyRes.json()) as Array<{ section?: string; heading?: string; intro?: string }>;
      const copy = Array.isArray(copyRows)
        ? copyRows.find((row) => row.section === "why_choose")
        : undefined;
      const list = (await listRes.json()) as WhyChooseItem[];
      setHeading(typeof copy?.heading === "string" ? copy.heading : "");
      setIntro(typeof copy?.intro === "string" ? copy.intro : "");
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError("Could not load why-choose content.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    load();
  }, [load, router]);

  async function saveCopy(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    setSavingCopy(true);
    try {
      const res = await fetch(apiUrl("/api/home/section-copy/why_choose/"), {
        method: "PATCH",
        headers: authHeadersJson(),
        body: JSON.stringify({ heading, intro }),
      });
      if (res.status === 401) {
        setError("You are not authorized to update this section.");
        return;
      }
      if (!res.ok) {
        setError(parseApiError(await res.json().catch(() => ({}))));
        return;
      }
      setMessage("Section text saved.");
    } catch {
      setError("Network error.");
    } finally {
      setSavingCopy(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const title = newTitle.trim();
    const description = newDesc.trim();
    if (!title || !description) {
      setError("Title and description are required.");
      return;
    }
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/home/why-choose/"), {
        method: "POST",
        headers: authHeadersJson(),
        body: JSON.stringify({
          title,
          description,
          icon: newIcon.trim(),
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
      setNewTitle("");
      setNewDesc("");
      setNewIcon("");
      await load();
      setMessage("Item added.");
    } catch {
      setError("Network error.");
    }
  }

  async function patchItem(id: number, body: Partial<WhyChooseItem>) {
    setError(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/home/why-choose/${id}/`), {
        method: "PATCH",
        headers: authHeadersJson(),
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (!res.ok) {
        setError(parseApiError(await res.json().catch(() => ({}))));
        return;
      }
      await load();
      setMessage("Updated.");
    } catch {
      setError("Network error.");
    }
  }

  async function deleteItem(id: number) {
    if (!confirm("Delete this item?")) return;
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/home/why-choose/${id}/`), {
        method: "DELETE",
        headers: authHeadersBearer(),
      });
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (!res.ok) {
        setError("Delete failed.");
        return;
      }
      await load();
      setMessage("Removed.");
    } catch {
      setError("Network error.");
    }
  }

  if (loading) {
    return (
      <HomeEditorShell title="Why choose" subtitle="Loading…">
        <p className="text-slate-400">Loading…</p>
      </HomeEditorShell>
    );
  }

  return (
    <HomeEditorShell
      title="Why choose us"
      subtitle="Section heading, optional intro, and cards—all stored in Django and shown on the public home page."
    >
      {message ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
      ) : null}

      <EditorPanel title="Section heading & intro">
        <form onSubmit={saveCopy} className="space-y-4">
          <div>
            <label htmlFor="why-h" className={fieldLabel}>
              Heading
            </label>
            <input id="why-h" value={heading} onChange={(e) => setHeading(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="why-i" className={fieldLabel}>
              Intro
            </label>
            <textarea
              id="why-i"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className={textareaClass}
              rows={3}
            />
          </div>
          <button type="submit" disabled={savingCopy} className={btnPrimary}>
            {savingCopy ? "Saving…" : "Save section text"}
          </button>
        </form>
      </EditorPanel>

      <EditorPanel title="Cards">
        <div className="space-y-5">
          {items.map((it) => (
            <WhyRow key={it.id} item={it} onSave={(b) => patchItem(it.id, b)} onDelete={() => deleteItem(it.id)} />
          ))}
        </div>
        <form onSubmit={addItem} className="mt-8 border-t border-slate-700/70 pt-6">
          <p className="mb-4 text-sm font-medium text-slate-300">Add card</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>Title</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={fieldLabel}>Icon</label>
              <select value={newIcon} onChange={(e) => setNewIcon(e.target.value)} className={inputClass}>
                {iconOptions.map((opt) => (
                  <option key={opt.value || "none"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Description</label>
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className={textareaClass} rows={2} />
            </div>
          </div>
          <button type="submit" className={`${btnSecondary} mt-4`}>
            Add card
          </button>
        </form>
      </EditorPanel>

      <EditorPanel title="Preview">
        <div className="overflow-hidden rounded-xl border border-slate-600/80 bg-white">
          <WhyChooseSection data={items} heading={heading} intro={intro} />
          {items.length === 0 && !heading.trim() && !intro.trim() ? (
            <p className="p-8 text-center text-sm text-slate-500">Nothing to preview.</p>
          ) : null}
        </div>
      </EditorPanel>
    </HomeEditorShell>
  );
}

function WhyRow({
  item,
  onSave,
  onDelete,
}: {
  item: WhyChooseItem;
  onSave: (b: Partial<WhyChooseItem>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [icon, setIcon] = useState(item.icon ?? "");

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description);
    setIcon(item.icon ?? "");
  }, [item]);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
      <div className="grid gap-3 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-1">
          <label className={fieldLabel}>Icon</label>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className={inputClass}>
            {iconOptions.map((opt) => (
              <option key={opt.value || "none"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={fieldLabel}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaClass}
            rows={2}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            onSave({
              title: title.trim(),
              description: description.trim(),
              icon: icon.trim(),
            })
          }
        >
          Update
        </button>
        <button type="button" className={btnDanger} onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
