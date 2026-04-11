"use client";

import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";
import type { ReactNode } from "react";
import { Suspense } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Suspense
        fallback={
          <aside className="fixed top-0 left-0 z-50 h-screen w-64 shrink-0 border-r border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar)]" />
        }
      >
        <Sidebar />
      </Suspense>
      <div className="ml-64 flex min-h-screen flex-1 flex-col">
        <Navbar />
        <main className="flex-1 overflow-auto bg-[var(--admin-bg)] p-6 text-slate-900 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
