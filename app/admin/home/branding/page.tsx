"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { authHeadersJson, authHeadersMultipart, getAccessToken } from "@/lib/auth";

type BrandingForm = {
  id?: number;
  // brand_name: string;
  logo: string | null;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  youtube_url: string;
};

const emptyForm: BrandingForm = {
  // brand_name: "SkillVedika",
  logo: null,
  facebook_url: "",
  instagram_url: "",
  linkedin_url: "",
  youtube_url: "",
};

function formFromApi(json: Record<string, unknown>): BrandingForm {
  if (!json || typeof json !== "object") return { ...emptyForm };
  return {
    id: typeof json.id === "number" ? json.id : undefined,
    // brand_name: typeof json.brand_name === "string" ? json.brand_name : "SkillVedika",
    logo: typeof json.logo === "string" ? json.logo : null,
    facebook_url: typeof json.facebook_url === "string" ? json.facebook_url : "",
    instagram_url: typeof json.instagram_url === "string" ? json.instagram_url : "",
    linkedin_url: typeof json.linkedin_url === "string" ? json.linkedin_url : "",
    youtube_url: typeof json.youtube_url === "string" ? json.youtube_url : "",
  };
}

export default function AdminBrandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BrandingForm>({ ...emptyForm });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/home/branding/"), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load branding");
      const data = (await res.json()) as Record<string, unknown>;
      setForm(formFromApi(data));
    } catch {
      setForm({ ...emptyForm });
      setError("Could not load branding.");
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
      const url = apiUrl("/api/home/branding/");
      const method = isUpdate ? "PATCH" : "POST";
      let res: Response;

      if (logoFile) {
        const fd = new FormData();
        // fd.append("brand_name", form.brand_name.trim() || "SkillVedika");
        fd.append("logo", logoFile);
        fd.append("facebook_url", form.facebook_url.trim());
        fd.append("instagram_url", form.instagram_url.trim());
        fd.append("linkedin_url", form.linkedin_url.trim());
        fd.append("youtube_url", form.youtube_url.trim());
        res = await fetch(url, {
          method,
          headers: authHeadersMultipart(),
          body: fd,
        });
      } else {
        res = await fetch(url, {
          method,
          headers: authHeadersJson(),
          // body: JSON.stringify({ brand_name: form.brand_name.trim() || "SkillVedika" }),
          body: JSON.stringify({
            facebook_url: form.facebook_url.trim(),
            instagram_url: form.instagram_url.trim(),
            linkedin_url: form.linkedin_url.trim(),
            youtube_url: form.youtube_url.trim(),
          }),
        });
      }

      if (res.status === 401) {
        router.replace("/admin");
        return;
      }
      if (res.status === 409 && !isUpdate) {
        await load();
        setError("Branding already exists. Refreshed current row.");
        return;
      }
      if (!res.ok) {
        setError("Could not save branding.");
        return;
      }

      const saved = (await res.json()) as Record<string, unknown>;
      setForm(formFromApi(saved));
      setLogoFile(null);
      setMessage("Branding saved successfully.");
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading branding...</p>;
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">Logo & Branding</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          Manage website logo and brand name dynamically from admin.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md shadow-[#0a2540]/[0.04]"
      >
        {/* <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Brand Name</label>
          <input
            className={field}
            // value={form.brand_name}
            onChange={(e) => setForm((f) => ({ ...f, brand_name: e.target.value }))}
            placeholder="SkillVedika"
          />
        </div> */}

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Logo Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:text-white file:font-semibold"
          />
          {form.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo} alt="Current logo" className="mt-3 h-12 w-auto rounded bg-white p-1 border border-slate-200" />
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Facebook URL</label>
          <input
            className={field}
            value={form.facebook_url}
            onChange={(e) => setForm((f) => ({ ...f, facebook_url: e.target.value }))}
            placeholder="https://facebook.com/your-page"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Instagram URL</label>
          <input
            className={field}
            value={form.instagram_url}
            onChange={(e) => setForm((f) => ({ ...f, instagram_url: e.target.value }))}
            placeholder="https://instagram.com/your-page"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">LinkedIn URL</label>
          <input
            className={field}
            value={form.linkedin_url}
            onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
            placeholder="https://linkedin.com/company/your-company"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">YouTube URL</label>
          <input
            className={field}
            value={form.youtube_url}
            onChange={(e) => setForm((f) => ({ ...f, youtube_url: e.target.value }))}
            placeholder="https://youtube.com/@your-channel"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--admin-accent-hover)] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Branding"}
        </button>
      </form>
    </div>
  );
}
