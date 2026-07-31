"use client";

import { useEffect, useState } from "react";

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/settings_app/`;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";

type TopBarLink = { label: string; url: string };

export default function SettingsPage() {
  const [settingId, setSettingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    google_analytics_id: "",
    google_ads_tag_id: "",
    whatsapp_number: "",
    whatsapp_message: "",
    top_bar_enabled: true,
    top_bar_phone: "",
    top_bar_email: "",
    top_bar_links: [] as TopBarLink[],
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>("");

  const loadSettings = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      const links = Array.isArray(row.top_bar_links)
        ? row.top_bar_links
            .map((item: Record<string, unknown>) => ({
              label: String(item?.label ?? item?.text ?? "").trim(),
              url: String(item?.url ?? item?.link ?? "").trim(),
            }))
            .filter((item: TopBarLink) => item.label || item.url)
        : [];

      setSettingId(row.id);
      setForm({
        google_analytics_id: row.google_analytics_id ?? "",
        google_ads_tag_id: row.google_ads_tag_id ?? "",
        whatsapp_number: row.whatsapp_number ?? "",
        whatsapp_message: row.whatsapp_message ?? "",
        top_bar_enabled: row.top_bar_enabled !== false,
        top_bar_phone: row.top_bar_phone ?? "",
        top_bar_email: row.top_bar_email ?? "",
        top_bar_links: links.length > 0 ? links : [],
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
        google_ads_tag_id: form.google_ads_tag_id.trim().toUpperCase(),
        whatsapp_number: form.whatsapp_number.trim().replace(/\D/g, ""),
        whatsapp_message: form.whatsapp_message.trim(),
        top_bar_enabled: form.top_bar_enabled,
        top_bar_phone: form.top_bar_phone.trim(),
        top_bar_email: form.top_bar_email.trim(),
        top_bar_links: form.top_bar_links
          .map((link) => ({
            label: link.label.trim(),
            url: link.url.trim(),
          }))
          .filter((link) => link.label && link.url),
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

  const updateLink = (index: number, key: keyof TopBarLink, value: string) => {
    setForm((prev) => {
      const next = [...prev.top_bar_links];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, top_bar_links: next };
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-2xl font-bold text-[var(--admin-navy)]">Site settings</h1>
      <p className="mb-6 text-sm text-[var(--admin-muted)]">
        Manage Google Analytics, Google Ads, the WhatsApp button, and the black top bar above the navbar.
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
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Google Ads tag ID</label>
            <input
              className={inputClass}
              placeholder="AW-123456789"
              value={form.google_ads_tag_id}
              onChange={(e) => setForm({ ...form, google_ads_tag_id: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter the tag ID only (for example, AW-123456789), not the full script.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Top bar (above navbar)</h2>
          <p className="text-sm text-slate-600">
            Black strip shown above the main menu. Leave links/phone/email empty and disable to hide it.
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.top_bar_enabled}
              onChange={(e) => setForm({ ...form, top_bar_enabled: e.target.checked })}
            />
            Show top bar on the public site
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
              <input
                className={inputClass}
                placeholder="+91 8179191999"
                value={form.top_bar_phone}
                onChange={(e) => setForm({ ...form, top_bar_phone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
              <input
                className={inputClass}
                type="email"
                placeholder="support@skillvedika.com"
                value={form.top_bar_email}
                onChange={(e) => setForm({ ...form, top_bar_email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-slate-600">Left links</label>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    top_bar_links: [...prev.top_bar_links, { label: "", url: "" }],
                  }))
                }
              >
                Add link
              </button>
            </div>
            {form.top_bar_links.length === 0 ? (
              <p className="text-xs text-slate-500">No links yet. Example: Blogs → /blog</p>
            ) : (
              form.top_bar_links.map((link, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    className={inputClass}
                    placeholder="Label (e.g. Blogs)"
                    value={link.label}
                    onChange={(e) => updateLink(index, "label", e.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="URL (e.g. /blog)"
                    value={link.url}
                    onChange={(e) => updateLink(index, "url", e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        top_bar_links: prev.top_bar_links.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
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
