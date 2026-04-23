"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { authHeadersBearer } from "@/lib/auth";

const accents = [
  "from-indigo-500 to-violet-500",
  "from-cyan-500 to-sky-500",
  "from-violet-500 to-fuchsia-500",
  "from-teal-500 to-emerald-500",
] as const;

type Props = {
  coursesCount: number;
  categoriesCount: number;
  blogsCount: number;
};

export default function DashboardTopStats({ coursesCount, categoriesCount, blogsCount }: Props) {
  const [leadsCount, setLeadsCount] = useState<number>(0);
  const [loadingLeads, setLoadingLeads] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadLeadCount() {
      try {
        const [instructorRes, studentRes] = await Promise.all([
          fetch(apiUrl("/api/instructor/applications/"), {
            cache: "no-store",
            headers: authHeadersBearer(),
          }),
          fetch(apiUrl("/api/courses/counselling/"), {
            cache: "no-store",
            headers: authHeadersBearer(),
          }),
        ]);

        const [instructorJson, studentJson] = await Promise.all([
          instructorRes.json().catch(() => []),
          studentRes.json().catch(() => []),
        ]);

        if (!active) return;
        const instructors = instructorRes.ok && Array.isArray(instructorJson) ? instructorJson.length : 0;
        const students = studentRes.ok && Array.isArray(studentJson) ? studentJson.length : 0;
        setLeadsCount(instructors + students);
      } catch {
        if (!active) return;
        setLeadsCount(0);
      } finally {
        if (active) setLoadingLeads(false);
      }
    }

    void loadLeadCount();
    return () => {
      active = false;
    };
  }, []);

  const stats = [
    { label: "Total courses", value: String(coursesCount), accent: accents[0] },
    { label: "Categories", value: String(categoriesCount), accent: accents[1] },
    { label: "Blog posts", value: String(blogsCount), accent: accents[2] },
    { label: "Leads", value: loadingLeads ? "..." : String(leadsCount), accent: accents[3] },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.5)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_36px_-22px_rgba(15,23,42,0.55)]"
        >
          <div
            className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${s.accent}`}
            aria-hidden="true"
          />
          <div
            className={`pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full bg-gradient-to-br ${s.accent} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-20`}
            aria-hidden="true"
          />
          <p className="text-sm font-semibold text-slate-500">{s.label}</p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-[var(--admin-navy)]">
            {s.value}
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-1.5 w-2/3 rounded-full bg-gradient-to-r ${s.accent}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
