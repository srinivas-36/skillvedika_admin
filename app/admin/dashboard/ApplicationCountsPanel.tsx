"use client";

import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";
import { authHeadersBearer } from "@/lib/auth";

type ApplicationStatus = "pending" | "approved" | "rejected";
type InstructorApplication = {
  id: number;
  status?: ApplicationStatus;
};
type StudentApplication = {
  id: number;
  status?: ApplicationStatus;
};

export default function ApplicationCountsPanel() {
  const [instructorApps, setInstructorApps] = useState<InstructorApplication[]>([]);
  const [studentApps, setStudentApps] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
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
        setInstructorApps(instructorRes.ok && Array.isArray(instructorJson) ? instructorJson : []);
        setStudentApps(studentRes.ok && Array.isArray(studentJson) ? studentJson : []);
      } catch {
        if (!active) return;
        setInstructorApps([]);
        setStudentApps([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const applicationStats = useMemo(
    () => [
      { label: "Total leads", value: instructorApps.length + studentApps.length },
      { label: "Instructor forms", value: instructorApps.length },
      { label: "Student forms", value: studentApps.length },
      {
        label: "Pending",
        value: [...instructorApps, ...studentApps].filter((a) => (a.status ?? "pending") === "pending").length,
      },
      {
        label: "Approved",
        value: [...instructorApps, ...studentApps].filter((a) => a.status === "approved").length,
      },
    ],
    [instructorApps, studentApps],
  );

  const maxValue = Math.max(...applicationStats.map((item) => item.value), 1);

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.55)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">Leads overview</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
          Live stats
        </span>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-[var(--admin-muted)]">Loading lead counts...</p>
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {applicationStats.map((item) => {
            const widthPercent = Math.max(10, Math.round((item.value / maxValue) * 100));
            return (
              <li key={item.label} className="rounded-2xl border border-slate-200/75 bg-slate-50/70 px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">{item.label}</span>
                  <span className="rounded-md bg-white px-2 py-0.5 font-bold text-slate-800 ring-1 ring-slate-200">
                    {item.value}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200/80">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-[#4f46e5] via-[#3b82f6] to-[#06b6d4]"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
