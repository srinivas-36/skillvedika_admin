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
          className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-gradient-to-br from-white via-indigo-50/35 to-cyan-50/45 shadow-sm shadow-indigo-900/5 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-900/10"
        >
          <div className={`h-1.5 bg-gradient-to-r ${s.accent}`} />
          <div className="p-5">
            <p className="text-sm font-semibold text-[var(--admin-muted)]">{s.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-[var(--admin-navy)]">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
