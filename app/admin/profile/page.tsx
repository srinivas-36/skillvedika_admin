"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiUrl } from "@/lib/api";
import {
  ADMIN_IDENTIFIER_KEY,
  authHeadersBearer,
  authHeadersJson,
  getAccessToken,
} from "@/lib/auth";

type AdminProfileData = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20";

export default function AdminProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [meta, setMeta] = useState<{ is_staff: boolean; is_superuser: boolean }>({
    is_staff: false,
    is_superuser: false,
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }

    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl("/api/admin/profile/"), {
          cache: "no-store",
          headers: authHeadersBearer(),
        });
        if (res.status === 401) {
          router.replace("/admin");
          return;
        }
        const data = (await res.json().catch(() => null)) as AdminProfileData | null;
        if (!res.ok || !data) {
          throw new Error("Could not load admin profile.");
        }
        if (!active) return;
        setForm({
          username: data.username ?? "",
          email: data.email ?? "",
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        setMeta({
          is_staff: Boolean(data.is_staff),
          is_superuser: Boolean(data.is_superuser),
        });
      } catch {
        if (active) setError("Could not load admin profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.new_password && form.new_password !== form.confirm_password) {
      setError("New password and confirm password do not match.");
      return;
    }
    if (form.new_password && form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        username: form.username.trim(),
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      };
      if (form.new_password) {
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
      }

      const res = await fetch(apiUrl("/api/admin/profile/"), {
        method: "PATCH",
        headers: authHeadersJson(),
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as
        | AdminProfileData
        | { detail?: string; [key: string]: unknown };

      if (res.status === 401) {
        router.replace("/admin");
        return;
      }

      if (!res.ok) {
        const fieldErrors = Object.entries(data)
          .filter(([key]) => key !== "detail")
          .flatMap(([, value]) =>
            Array.isArray(value) ? value.map(String) : value != null ? [String(value)] : [],
          );
        const detail =
          typeof (data as { detail?: unknown }).detail === "string"
            ? (data as { detail: string }).detail
            : "";
        setError(fieldErrors[0] || detail || "Could not update profile.");
        return;
      }

      const profile = data as AdminProfileData;
      setForm((prev) => ({
        ...prev,
        username: profile.username ?? prev.username,
        email: profile.email ?? prev.email,
        first_name: profile.first_name ?? prev.first_name,
        last_name: profile.last_name ?? prev.last_name,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
      setMeta({
        is_staff: Boolean(profile.is_staff),
        is_superuser: Boolean(profile.is_superuser),
      });

      const identifier = (profile.email || profile.username || "").trim();
      if (identifier) {
        localStorage.setItem(ADMIN_IDENTIFIER_KEY, identifier);
      }

      setSuccess("Profile updated successfully.");
      window.dispatchEvent(new Event("admin-profile-updated"));
    } catch {
      setError("Could not update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-[var(--admin-muted)]">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">My Profile</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          View and update your admin account details.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Account details</h2>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
              {meta.is_staff ? (
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700 ring-1 ring-indigo-200">
                  Staff
                </span>
              ) : null}
              {meta.is_superuser ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">
                  Superuser
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">First name</label>
              <input
                className={inputClass}
                value={form.first_name}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Last name</label>
              <input
                className={inputClass}
                value={form.last_name}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Username</label>
            <input
              className={inputClass}
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="Username"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Email</label>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="admin@example.com"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--admin-border)] bg-white p-6 shadow-md">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Change password</h2>
          <p className="text-sm text-slate-600">Leave blank to keep your current password.</p>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Current password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                className={`${inputClass} pr-11`}
                value={form.current_password}
                onChange={(e) => setForm((prev) => ({ ...prev, current_password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">New password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className={`${inputClass} pr-11`}
                  value={form.new_password}
                  onChange={(e) => setForm((prev) => ({ ...prev, new_password: e.target.value }))}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`${inputClass} pr-11`}
                  value={form.confirm_password}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--admin-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
