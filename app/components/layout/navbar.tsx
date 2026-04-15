"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredTokens, getAccessTokenClaims, getStoredAdminIdentifier } from "@/lib/auth";

type AdminProfile = {
  displayName: string;
  email: string;
};

export default function Navbar() {
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<AdminProfile>({
    displayName: "Admin",
    email: "",
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const claims = getAccessTokenClaims();
    const storedIdentifier = (getStoredAdminIdentifier() ?? "").trim();
    const fallbackEmail = storedIdentifier.includes("@") ? storedIdentifier : "";
    if (!claims) {
      if (fallbackEmail) {
        setProfile({
          displayName: fallbackEmail.split("@")[0] || "Admin",
          email: fallbackEmail,
        });
      }
      return;
    }
    const username =
      typeof claims.username === "string"
        ? claims.username
        : typeof claims.user_name === "string"
          ? claims.user_name
          : typeof claims.name === "string"
            ? claims.name
            : "";
    const email =
      typeof claims.email === "string" && claims.email.trim()
        ? claims.email.trim()
        : fallbackEmail;
    setProfile({
      displayName: username || (email ? email.split("@")[0] : "Admin"),
      email,
    });
  }, []);

  const initials = useMemo(() => {
    const cleaned = profile.displayName.trim();
    if (!cleaned) return "A";
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }, [profile.displayName]);

  const handleLogout = () => {
    clearStoredTokens();
    router.replace("/admin");
  };

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (profileMenuRef.current.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--admin-border)] bg-white/95 px-6 shadow-sm backdrop-blur-sm">
      {/* <div className="hidden text-sm font-semibold text-[var(--admin-navy)] md:block">
        Control center
      </div> */}

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-soft)] px-3 py-2 transition hover:border-[var(--admin-accent)]/40"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-accent)] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="hidden text-left leading-tight md:block">
              <div className="text-sm font-semibold text-[var(--admin-navy)]">{profile.displayName}</div>
              {profile.email ? (
                <div className="text-xs text-[var(--admin-muted)]">{profile.email}</div>
              ) : null}
            </div>
          </button>

          {menuOpen ? (
            <div
              className="absolute right-0 top-full mt-2 min-w-[220px] rounded-xl border border-[var(--admin-border)] bg-white p-2 shadow-lg"
              role="menu"
            >
              {/* <div className="rounded-lg px-3 py-2">
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">Signed in as</div>
                <div className="mt-1 text-sm font-semibold text-[var(--admin-navy)]">{profile.displayName}</div>
                <div className="truncate text-xs text-[var(--admin-muted)]">{profile.email || "No email available"}</div>
              </div> */}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 w-full rounded-lg bg-rose-600 px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-rose-700"
                role="menuitem"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
        {/* <div className="hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-soft)] px-4 py-2 text-sm text-[var(--admin-muted)] md:block md:min-w-[200px]">
          <span className="text-slate-400">Search…</span>
        </div> */}
        {/* <button
          type="button"
          className="rounded-xl border border-[var(--admin-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--admin-navy)] shadow-sm transition hover:border-[var(--admin-accent)]/40 hover:bg-[var(--admin-bg-soft)]"
        >
          Profile
        </button> */}
      </div>
    </header>
  );
}
