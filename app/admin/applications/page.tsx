"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { authHeadersBearer, getAccessToken } from "@/lib/auth";

type InstructorApplication = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  years_of_experience: string;
  skills: string;
  message: string;
  status?: "pending" | "approved" | "rejected";
  created_at: string;
};

type StudentApplication = {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  phone: string;
  years_of_experience?: string;
  skills?: string;
  message: string;
  agreed_to_terms?: boolean;
  status?: "pending" | "approved" | "rejected";
  course: number | null;
  course_title?: string;
  created_at: string;
};

type TabKey = "instructors" | "students";

function requestedCourse(app: StudentApplication): string {
  if (app.course_title && app.course_title.trim()) return app.course_title.trim();
  const msg = (app.message ?? "").trim();
  const fromMessage = msg.match(/Interested course:\s*(.+)$/i)?.[1]?.trim();
  return fromMessage || "-";
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("instructors");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instructorApps, setInstructorApps] = useState<InstructorApplication[]>([]);
  const [studentApps, setStudentApps] = useState<StudentApplication[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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

      if (instructorRes.status === 401 || studentRes.status === 401) {
        router.replace("/admin");
        return;
      }

      const [instructorJson, studentJson] = await Promise.all([
        instructorRes.json().catch(() => []),
        studentRes.json().catch(() => []),
      ]);

      if (!instructorRes.ok || !studentRes.ok) {
        setError("Could not load leads.");
        setInstructorApps([]);
        setStudentApps([]);
        return;
      }

      setInstructorApps(Array.isArray(instructorJson) ? instructorJson : []);
      setStudentApps(Array.isArray(studentJson) ? studentJson : []);
    } catch {
      setError("Could not load leads.");
      setInstructorApps([]);
      setStudentApps([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    void load();
  }, [load, router]);

  const tabButtonClass = useMemo(
    () =>
      "rounded-xl px-4 py-2.5 text-sm font-semibold transition border",
    [],
  );

  async function updateInstructorStatus(id: number, status: "approved" | "rejected") {
    setActionLoading(`inst-${id}-${status}`);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/instructor/applications/${id}/`), {
        method: "PATCH",
        headers: {
          ...authHeadersBearer(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError("Could not update instructor application status.");
        return;
      }
      await load();
    } catch {
      setError("Could not update instructor application status.");
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteInstructor(id: number) {
    setActionLoading(`inst-${id}-delete`);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/instructor/applications/${id}/`), {
        method: "DELETE",
        headers: authHeadersBearer(),
      });
      if (!res.ok) {
        setError("Could not delete instructor application.");
        return;
      }
      await load();
    } catch {
      setError("Could not delete instructor application.");
    } finally {
      setActionLoading(null);
    }
  }

  async function updateStudentStatus(id: number, status: "approved" | "rejected") {
    setActionLoading(`stud-${id}-${status}`);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/courses/counselling/${id}/`), {
        method: "PATCH",
        headers: {
          ...authHeadersBearer(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError("Could not update student application status.");
        return;
      }
      await load();
    } catch {
      setError("Could not update student application status.");
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteStudent(id: number) {
    setActionLoading(`stud-${id}-delete`);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/courses/counselling/${id}/`), {
        method: "DELETE",
        headers: authHeadersBearer(),
      });
      if (!res.ok) {
        setError("Could not delete student application.");
        return;
      }
      await load();
    } catch {
      setError("Could not delete student application.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--admin-navy)]">Leads</h1>
        <p className="mt-1 text-sm text-[var(--admin-muted)]">
          View all submitted instructor and student counselling forms.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("instructors")}
          className={`${tabButtonClass} ${
            activeTab === "instructors"
              ? "bg-[var(--admin-accent)] text-white border-[var(--admin-accent)]"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Instructor Leads ({instructorApps.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`${tabButtonClass} ${
            activeTab === "students"
              ? "bg-[var(--admin-accent)] text-white border-[var(--admin-accent)]"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Student Leads ({studentApps.length})
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--admin-muted)]">Loading leads...</p>
      ) : null}

      {!loading && activeTab === "instructors" ? (
        <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-white shadow-md shadow-[#0a2540]/[0.04]">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-soft)] text-left">
                <th className="p-3 font-bold text-[var(--admin-navy)]">Name</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Email</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Phone</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Experience</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Skills</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Message</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Status</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Submitted At</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instructorApps.map((app) => (
                <tr key={app.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">
                    {app.first_name} {app.last_name}
                  </td>
                  <td className="p-3 text-slate-700">{app.email}</td>
                  <td className="p-3 text-slate-700">{app.phone}</td>
                  <td className="p-3 text-slate-700">{app.years_of_experience}</td>
                  <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{app.skills}</td>
                  <td className="p-3 text-slate-700 whitespace-pre-wrap break-words">{app.message || "-"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      app.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : app.status === "rejected"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {app.status || "pending"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{new Date(app.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateInstructorStatus(app.id, "approved")}
                        disabled={actionLoading != null}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateInstructorStatus(app.id, "rejected")}
                        disabled={actionLoading != null}
                        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteInstructor(app.id)}
                        disabled={actionLoading != null}
                        className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {instructorApps.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--admin-muted)]">
              No instructor leads submitted yet.
            </p>
          ) : null}
        </div>
      ) : null}

      {!loading && activeTab === "students" ? (
        <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border)] bg-white shadow-md shadow-[#0a2540]/[0.04]">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-bg-soft)] text-left">
                <th className="p-3 font-bold text-[var(--admin-navy)]">Name</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Email</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Phone</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Course</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Terms</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Status</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Submitted At</th>
                <th className="p-3 font-bold text-[var(--admin-navy)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentApps.map((app) => (
                <tr key={app.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                  <td className="p-3 font-semibold text-slate-900">
                    {`${app.first_name ?? ""} ${app.last_name ?? ""}`.trim() || app.full_name || "-"}
                  </td>
                  <td className="p-3 text-slate-700">{app.email}</td>
                  <td className="p-3 text-slate-700">{app.phone}</td>
                  <td className="p-3 text-slate-700">{requestedCourse(app)}</td>
                  <td className="p-3 text-slate-700">{app.agreed_to_terms ? "Yes" : "No"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      app.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : app.status === "rejected"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {app.status || "pending"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{new Date(app.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateStudentStatus(app.id, "approved")}
                        disabled={actionLoading != null}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStudentStatus(app.id, "rejected")}
                        disabled={actionLoading != null}
                        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStudent(app.id)}
                        disabled={actionLoading != null}
                        className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {studentApps.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--admin-muted)]">
              No student leads submitted yet.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
