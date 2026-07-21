"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FAQSection, { type FAQItem } from "@/components/home/FAQSection";
import {
  HomeEditorShell,
  EditorPanel,
  AdminConfirmDialog,
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

export default function AdminFAQPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingCopy, setSavingCopy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    label: string;
  } | null>(null);

  const [heading, setHeading] = useState("");
  const [intro, setIntro] = useState("");
  const [items, setItems] = useState<FAQItem[]>([]);

  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [copyRes, listRes] = await Promise.all([
        fetch(apiUrl("/api/home/section-copy/")),
        fetch(apiUrl("/api/home/faq/")),
      ]);
      if (!copyRes.ok || !listRes.ok) throw new Error("load");
      const copyRows = (await copyRes.json()) as Array<{ section?: string; heading?: string; intro?: string }>;
      const copy = Array.isArray(copyRows)
        ? copyRows.find((row) => row.section === "faq")
        : undefined;
      const list = (await listRes.json()) as FAQItem[];
      setHeading(typeof copy?.heading === "string" ? copy.heading : "");
      setIntro(typeof copy?.intro === "string" ? copy.intro : "");
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError("Could not load FAQ content.");
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
      const res = await fetch(apiUrl("/api/home/section-copy/faq/"), {
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
      setMessage("Section heading & intro saved.");
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
    const question = newQ.trim();
    const answer = newA.trim();
    if (!question || !answer) {
      setError("Question and answer are required.");
      return;
    }
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/home/faq/"), {
        method: "POST",
        headers: authHeadersJson(),
        body: JSON.stringify({ question, answer }),
      });
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (!res.ok) {
        setError(parseApiError(await res.json().catch(() => ({}))));
        return;
      }
      setNewQ("");
      setNewA("");
      await load();
      setMessage("FAQ entry added.");
    } catch {
      setError("Network error.");
    }
  }

  async function patchItem(id: number, body: Partial<FAQItem>) {
    setError(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/home/faq/${id}/`), {
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

  function requestDelete(item: FAQItem) {
    setDeleteConfirm({ id: item.id, label: item.question });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    setDeletingId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`/api/home/faq/${id}/`), {
        method: "DELETE",
        headers: authHeadersBearer(),
      });
      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (!res.ok) {
        setError(parseApiError(await res.json().catch(() => ({}))) || "Delete failed.");
        return;
      }
      setDeleteConfirm(null);
      await load();
      setMessage("Removed.");
    } catch {
      setError("Network error.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <HomeEditorShell title="FAQ" subtitle="Loading…">
        <p className="text-slate-400">Loading…</p>
      </HomeEditorShell>
    );
  }

  return (
    <HomeEditorShell
      title="FAQ section"
      subtitle="Heading, intro, and Q&amp;A pairs—stored in Django and shown on the public home page."
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
            <label htmlFor="faq-h" className={fieldLabel}>
              Heading
            </label>
            <input id="faq-h" value={heading} onChange={(e) => setHeading(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="faq-i" className={fieldLabel}>
              Intro
            </label>
            <textarea
              id="faq-i"
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

      <EditorPanel title="Questions & answers">
        <div className="space-y-5">
          {items.map((it) => (
            <FaqRow key={it.id} item={it} onSave={(b) => patchItem(it.id, b)} onDelete={() => requestDelete(it)} />
          ))}
        </div>
        <form onSubmit={addItem} className="mt-8 border-t border-slate-700/70 pt-6">
          <p className="mb-4 text-sm font-medium text-slate-300">Add FAQ</p>
          <div className="space-y-4">
            <div>
              <label className={fieldLabel}>Question</label>
              <input value={newQ} onChange={(e) => setNewQ(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={fieldLabel}>Answer</label>
              <textarea value={newA} onChange={(e) => setNewA(e.target.value)} className={textareaClass} rows={4} />
            </div>
          </div>
          <button type="submit" className={`${btnSecondary} mt-4`}>
            Add FAQ
          </button>
        </form>
      </EditorPanel>

      <EditorPanel title="Preview">
        <div className="overflow-hidden rounded-xl border border-slate-600/80">
          <FAQSection data={items} heading={heading} intro={intro} />
          {items.length === 0 && !heading.trim() && !intro.trim() ? (
            <p className="bg-slate-50 p-8 text-center text-sm text-slate-500">Nothing to preview.</p>
          ) : null}
        </div>
      </EditorPanel>

      <AdminConfirmDialog
        open={deleteConfirm != null}
        title="Delete FAQ?"
        message={
          deleteConfirm ? (
            <>
              Delete <span className="font-semibold text-slate-900">{deleteConfirm.label}</span>{" "}
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
    </HomeEditorShell>
  );
}

function FaqRow({
  item,
  onSave,
  onDelete,
}: {
  item: FAQItem;
  onSave: (b: Partial<FAQItem>) => void;
  onDelete: () => void;
}) {
  const [question, setQuestion] = useState(item.question);
  const [answer, setAnswer] = useState(item.answer);

  useEffect(() => {
    setQuestion(item.question);
    setAnswer(item.answer);
  }, [item]);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
      <div className="space-y-3">
        <div>
          <label className={fieldLabel}>Question</label>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={fieldLabel}>Answer</label>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className={textareaClass} rows={4} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            onSave({
              question: question.trim(),
              answer: answer.trim(),
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
