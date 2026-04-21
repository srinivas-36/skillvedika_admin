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
    <div className="rounded-2xl border border-[var(--admin-border)] bg-gradient-to-br from-white to-indigo-50/40 p-6 shadow-sm shadow-indigo-900/5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Leads overview</h3>
      {loading ? (
        <p className="mt-4 text-sm text-[var(--admin-muted)]">Loading lead counts...</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {applicationStats.map((item) => {
            const widthPercent = Math.max(10, Math.round((item.value / maxValue) * 100));
            return (
              <li key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-indigo-100/70">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
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
