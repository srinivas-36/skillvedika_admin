"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { ACCESS_TOKEN_KEY, ADMIN_IDENTIFIER_KEY, REFRESH_TOKEN_KEY } from "@/lib/auth";

export default function AdminLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier.trim(), username: identifier.trim(), password }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        access?: string;
        refresh?: string;
        detail?: string | string[];
        non_field_errors?: string[];
      };

      if (!res.ok) {
        const d = data.detail;
        const detailStr =
          typeof d === "string" ? d : Array.isArray(d) && d[0] != null ? String(d[0]) : "";
        const msg = detailStr || data.non_field_errors?.[0] || "Invalid email or password.";
        setError(msg);
        setLoading(false);
        return;
      }

      if (!data.access || !data.refresh) {
        setError("Unexpected response from server.");
        setLoading(false);
        return;
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
      localStorage.setItem(ADMIN_IDENTIFIER_KEY, identifier.trim());
      router.replace("/admin/dashboard");
    } catch {
      setError(
        "Could not connect to the API. Start Django (port 8000) and ensure admin-frontend BACKEND_URL in next.config matches it.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(160deg, #e8f2fc 0%, #f0f7ff 40%, #ddeefc 100%)",
      }}
    >
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl border border-[var(--admin-border)] bg-white p-8 shadow-xl shadow-[#0a2540]/10"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--admin-accent)] text-lg font-bold text-white shadow-lg shadow-blue-900/25">
            SV
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--admin-navy)]">
            Admin sign in
          </h1>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            Use your staff account email and password.
          </p>
        </div>

        {error ? (
          <p
            className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <label htmlFor="admin-identifier" className="mb-1 block text-sm font-semibold text-slate-700">
          Email or Username
        </label>
        <input
          id="admin-identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          placeholder="admin@example.com or admin"
          required
        />

        <label htmlFor="admin-password" className="mb-1 block text-sm font-semibold text-slate-700">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[var(--admin-accent)]/20"
          placeholder="••••••••"
          required
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-[var(--admin-accent)] py-3 text-sm font-bold text-white shadow-md shadow-blue-900/20 transition hover:bg-[var(--admin-accent-hover)] disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
