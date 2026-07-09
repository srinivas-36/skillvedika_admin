"use client";

import { useEffect, useState } from "react";

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/settings_app/`;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";

export default function SettingsPage() {
  const [settingId, setSettingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    google_analytics_id: "",
    whatsapp_number: "",
    whatsapp_message: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>("");

  const loadSettings = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      setSettingId(data[0].id);
      setForm({
        google_analytics_id: data[0].google_analytics_id ?? "",
        whatsapp_number: data[0].whatsapp_number ?? "",
        whatsapp_message: data[0].whatsapp_message ?? "",
      });
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");

    try {
      const payload = {
        google_analytics_id: form.google_analytics_id.trim(),
        whatsapp_number: form.whatsapp_number.trim().replace(/\D/g, ""),
        whatsapp_message: form.whatsapp_message.trim(),
      };

      const res = settingId
        ? await fetch(`${API_URL}${settingId}/update/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`${API_URL}create/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) throw new Error("Failed");

      await loadSettings();
      setSuccessMsg("Settings saved successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold text-[var(--admin-navy)]">Site settings</h1>
      <p className="mb-6 text-sm text-[var(--admin-muted)]">
        Manage Google Analytics and the WhatsApp contact button shown on the public site.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Google Analytics</h2>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Google Analytics ID</label>
            <input
              className={inputClass}
              placeholder="G-XXXXXXXXXX"
              value={form.google_analytics_id}
              onChange={(e) => setForm({ ...form, google_analytics_id: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">WhatsApp</h2>
          <p className="text-sm text-slate-600">
            When visitors click the WhatsApp icon on the site, messages are sent to this number.
            Use country code + number without + or spaces (e.g. <code className="rounded bg-slate-100 px-1">919381193375</code>).
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">WhatsApp number</label>
            <input
              className={inputClass}
              placeholder="e.g. 919381193375"
              value={form.whatsapp_number}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Pre-filled message</label>
            <textarea
              className={`${inputClass} min-h-[88px] resize-y`}
              rows={3}
              placeholder="Hi I am interested in Skillvedika courses"
              value={form.whatsapp_message}
              onChange={(e) => setForm({ ...form, whatsapp_message: e.target.value })}
            />
          </div>
        </div>

        <button
          disabled={loading}
          className="rounded-xl bg-[var(--admin-accent)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--admin-accent-hover)] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save settings"}
        </button>
        {successMsg ? <p className="text-sm text-green-700">{successMsg}</p> : null}
      </form>
    </div>
  );
}
