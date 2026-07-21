"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import JobProgramSection, { type JobProgramItem } from "@/components/home/JobProgramSection";
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

export default function AdminJobProgramPage() {
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
  const [items, setItems] = useState<JobProgramItem[]>([]);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [copyRes, listRes] = await Promise.all([
        fetch(apiUrl("/api/home/section-copy/job_program/"), { headers: authHeadersBearer() }),
        fetch(apiUrl("/api/home/job-program/")),
      ]);
      if (copyRes.status === 401 || listRes.status === 401) throw new Error("auth");
      if (!copyRes.ok || !listRes.ok) throw new Error("load");
      const copy = (await copyRes.json()) as { heading?: string; intro?: string };
      const list = (await listRes.json()) as JobProgramItem[];
      setHeading(typeof copy.heading === "string" ? copy.heading : "");
      setIntro(typeof copy.intro === "string" ? copy.intro : "");
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e instanceof Error && e.message === "auth") {
        router.replace("/admin");
        return;
      }
      setError("Could not load job program content.");
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
      const res = await fetch(apiUrl("/api/home/section-copy/job_program/"), {
        method: "PATCH",
        headers: authHeadersJson(),
        body: JSON.stringify({ heading, intro }),
      });
      if (res.status === 401) {
        router.replace("/admin");
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
    if (!title) {
      setError("Title is required.");
      return;
    }
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/home/job-program/"), {
        method: "POST",
        headers: authHeadersJson(),
        body: JSON.stringify({
          title,
          description: newDesc.trim(),
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
      await load();
      setMessage("Item added.");
    } catch {
      setError("Network error.");
    }
  }

  async function patchItem(id: number, body: Partial<JobProgramItem>) {
    setError(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/home/job-program/${id}/`), {
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

  function requestDelete(item: JobProgramItem) {
    setDeleteConfirm({ id: item.id, label: item.title });
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
      const res = await fetch(apiUrl(`/api/home/job-program/${id}/`), {
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
      <HomeEditorShell title="Job program" subtitle="Loading…">
        <p className="text-slate-400">Loading…</p>
      </HomeEditorShell>
    );
  }

  return (
    <HomeEditorShell
      title="Job assistance programme"
      subtitle="Heading, optional intro, and benefit cards—mirrored on the public home page."
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
            <label htmlFor="job-h" className={fieldLabel}>
              Heading
            </label>
            <input id="job-h" value={heading} onChange={(e) => setHeading(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="job-i" className={fieldLabel}>
              Intro
            </label>
            <textarea
              id="job-i"
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

      <EditorPanel title="Programme items">
        <div className="space-y-5">
          {items.map((it) => (
            <JobRow key={it.id} item={it} onSave={(b) => patchItem(it.id, b)} onDelete={() => requestDelete(it)} />
          ))}
        </div>
        <form onSubmit={addItem} className="mt-8 border-t border-slate-700/70 pt-6">
          <p className="mb-4 text-sm font-medium text-slate-300">Add item</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>Title</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Description</label>
              <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className={textareaClass} rows={2} />
            </div>
          </div>
          <button type="submit" className={`${btnSecondary} mt-4`}>
            Add item
          </button>
        </form>
      </EditorPanel>

      <EditorPanel title="Preview">
        <div className="overflow-hidden rounded-xl border border-slate-600/80 bg-white">
          <JobProgramSection data={items} heading={heading} intro={intro} />
          {items.length === 0 && !heading.trim() && !intro.trim() ? (
            <p className="p-8 text-center text-sm text-slate-500">Nothing to preview.</p>
          ) : null}
        </div>
      </EditorPanel>

      <AdminConfirmDialog
        open={deleteConfirm != null}
        title="Delete item?"
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

function JobRow({
  item,
  onSave,
  onDelete,
}: {
  item: JobProgramItem;
  onSave: (b: Partial<JobProgramItem>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description ?? "");
  }, [item]);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={fieldLabel}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
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
