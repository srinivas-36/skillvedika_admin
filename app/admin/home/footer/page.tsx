"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { authHeadersJson, authHeadersMultipart, getAccessToken } from "@/lib/auth";

type FooterLink = { label: string; href: string };

type FooterForm = {
  id?: number;
  logo: string | null;
  tagline: string;
  contact_email: string;
  copyright_text: string;
  explore_heading: string;
  support_heading: string;
  legal_heading: string;
  contact_heading: string;
  explore_links: FooterLink[];
  support_links: FooterLink[];
  legal_links: FooterLink[];
};

const emptyForm: FooterForm = {
  logo: null,
  tagline: "High-quality training institute helping learners succeed.",
  contact_email: "support@skillvedika.com",
  copyright_text:
    "© 2026 skillvedika.com. All Rights Reserved. Skillvedika is owned and operated by TutorKhoj Private Limited.",
  explore_heading: "Explore",
  support_heading: "Support",
  legal_heading: "Legal",
  contact_heading: "Contact",
  explore_links: [
    { label: "All courses", href: "/courses" },
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
  ],
  support_links: [
    { label: "Job support", href: "/on-job-support" },
    { label: "Instructor", href: "/instructor" },
    { label: "Contact", href: "/contact" },
    { label: "Corporate Training", href: "/corporate-training" },
    { label: "Career Services", href: "/career-services" },
  ],
  legal_links: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Disclaimer", href: "/disclaimer" },
    { label: "Editorial Policy", href: "/editorial-policy" },
  ],
};

function parseLinks(value: unknown): FooterLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const href =
        typeof row.href === "string"
          ? row.href.trim()
          : typeof row.url === "string"
            ? row.url.trim()
            : typeof row.link === "string"
              ? row.link.trim()
              : "";
      if (!label || !href) return null;
      return { label, href };
    })
    .filter((item): item is FooterLink => item != null);
}

function formFromApi(json: Record<string, unknown>): FooterForm {
  if (!json || typeof json !== "object" || Object.keys(json).length === 0) {
    return { ...emptyForm };
  }
  return {
    id: typeof json.id === "number" ? json.id : undefined,
    logo: typeof json.logo === "string" ? json.logo : null,
    tagline: typeof json.tagline === "string" ? json.tagline : emptyForm.tagline,
    contact_email:
      typeof json.contact_email === "string" ? json.contact_email : emptyForm.contact_email,
    copyright_text:
      typeof json.copyright_text === "string" ? json.copyright_text : emptyForm.copyright_text,
    explore_heading:
      typeof json.explore_heading === "string" ? json.explore_heading : emptyForm.explore_heading,
    support_heading:
      typeof json.support_heading === "string" ? json.support_heading : emptyForm.support_heading,
    legal_heading:
      typeof json.legal_heading === "string" ? json.legal_heading : emptyForm.legal_heading,
    contact_heading:
      typeof json.contact_heading === "string" ? json.contact_heading : emptyForm.contact_heading,
    explore_links: parseLinks(json.explore_links).length
      ? parseLinks(json.explore_links)
      : [...emptyForm.explore_links],
    support_links: parseLinks(json.support_links).length
      ? parseLinks(json.support_links)
      : [...emptyForm.support_links],
    legal_links: parseLinks(json.legal_links).length
      ? parseLinks(json.legal_links)
      : [...emptyForm.legal_links],
  };
}

function LinksEditor({
  title,
  links,
  onChange,
}: {
  title: string;
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[var(--admin-navy)]">{title}</h3>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => onChange([...links, { label: "", href: "" }])}
        >
          Add link
        </button>
      </div>
      {links.length === 0 ? (
        <p className="text-xs text-[var(--admin-muted)]">No links yet.</p>
      ) : null}
      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={`${title}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={link.label}
              onChange={(e) => {
                const next = [...links];
                next[index] = { ...next[index], label: e.target.value };
                onChange(next);
              }}
              placeholder="Label"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            />
            <input
              value={link.href}
              onChange={(e) => {
                const next = [...links];
                next[index] = { ...next[index], href: e.target.value };
                onChange(next);
              }}
              placeholder="/path or https://..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
            />
            <button
              type="button"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              onClick={() => onChange(links.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminFooterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FooterForm>({ ...emptyForm });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/home/footer/"), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load footer");
      const data = (await res.json()) as Record<string, unknown>;
      setForm(formFromApi(data));
      setRemoveLogo(false);
      setLogoFile(null);
    } catch {
      setForm({ ...emptyForm });
      setError("Could not load footer.");
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const isUpdate = form.id != null;
      const url = apiUrl("/api/home/footer/");
      const method = isUpdate ? "PATCH" : "POST";

      const payload = {
        tagline: form.tagline.trim(),
        contact_email: form.contact_email.trim(),
        copyright_text: form.copyright_text.trim(),
        explore_heading: form.explore_heading.trim() || "Explore",
        support_heading: form.support_heading.trim() || "Support",
        legal_heading: form.legal_heading.trim() || "Legal",
        contact_heading: form.contact_heading.trim() || "Contact",
        explore_links: form.explore_links.filter((l) => l.label.trim() && l.href.trim()),
        support_links: form.support_links.filter((l) => l.label.trim() && l.href.trim()),
        legal_links: form.legal_links.filter((l) => l.label.trim() && l.href.trim()),
      };

      let res: Response;
      if (logoFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (typeof value === "string") {
            fd.append(key, value);
          } else {
            fd.append(key, JSON.stringify(value));
          }
        });
        fd.append("logo", logoFile);
        res = await fetch(url, {
          method,
          headers: authHeadersMultipart(),
          body: fd,
        });
      } else {
        const jsonPayload: Record<string, unknown> = { ...payload };
        if (removeLogo) {
          jsonPayload.logo = null;
        }
        res = await fetch(url, {
          method,
          headers: authHeadersJson(),
          body: JSON.stringify(jsonPayload),
        });
      }

      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (res.status === 409 && !isUpdate) {
        await load();
        setError("Footer already exists. Refreshed current row.");
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          const parts = Object.entries(parsed).map(([k, v]) => {
            const msg = Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : JSON.stringify(v);
            return `${k}: ${msg}`;
          });
          setError(parts.join(" | ") || "Could not save footer.");
        } catch {
          setError(text || "Could not save footer.");
        }
        return;
      }

      const saved = (await res.json()) as Record<string, unknown>;
      setForm(formFromApi(saved));
      setLogoFile(null);
      setRemoveLogo(false);
      setMessage("Footer saved successfully.");
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading footer...</p>;
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">Footer</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Manage footer logo, tagline, contact email, copyright, and link columns. Changes appear
          on the public site footer.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleSave}
        className="space-y-5 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md shadow-[#0a2540]/[0.04]"
      >
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Footer logo</label>
          <p className="mb-2 text-xs text-[var(--admin-muted)]">
            Optional. If empty, the site branding logo is used on the public footer.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setLogoFile(e.target.files?.[0] ?? null);
              setRemoveLogo(false);
            }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:font-semibold file:text-white"
          />
          {form.logo && !removeLogo ? (
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logo}
                alt="Footer logo"
                className="h-12 w-auto rounded border border-slate-200 bg-white p-1"
              />
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                onClick={() => {
                  setRemoveLogo(true);
                  setLogoFile(null);
                  setForm((f) => ({ ...f, logo: null }));
                }}
              >
                Remove logo
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Tagline</label>
          <textarea
            className={`${field} min-h-[80px]`}
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Contact email</label>
            <input
              type="email"
              className={field}
              value={form.contact_email}
              onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Contact heading
            </label>
            <input
              className={field}
              value={form.contact_heading}
              onChange={(e) => setForm((f) => ({ ...f, contact_heading: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Copyright text</label>
          <input
            className={field}
            value={form.copyright_text}
            onChange={(e) => setForm((f) => ({ ...f, copyright_text: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Explore heading
            </label>
            <input
              className={field}
              value={form.explore_heading}
              onChange={(e) => setForm((f) => ({ ...f, explore_heading: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Support heading
            </label>
            <input
              className={field}
              value={form.support_heading}
              onChange={(e) => setForm((f) => ({ ...f, support_heading: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Legal heading</label>
            <input
              className={field}
              value={form.legal_heading}
              onChange={(e) => setForm((f) => ({ ...f, legal_heading: e.target.value }))}
            />
          </div>
        </div>

        <LinksEditor
          title="Explore links"
          links={form.explore_links}
          onChange={(explore_links) => setForm((f) => ({ ...f, explore_links }))}
        />
        <LinksEditor
          title="Support links"
          links={form.support_links}
          onChange={(support_links) => setForm((f) => ({ ...f, support_links }))}
        />
        <LinksEditor
          title="Legal links"
          links={form.legal_links}
          onChange={(legal_links) => setForm((f) => ({ ...f, legal_links }))}
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--admin-accent-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save footer"}
        </button>
      </form>
    </div>
  );
}
