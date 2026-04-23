import { getBlogs, getCategories, getCourses, type CourseApi } from "@/lib/api";
import { BookOpen, LayoutGrid, Newspaper, Sparkles, TrendingUp } from "lucide-react";
import ApplicationCountsPanel from "./ApplicationCountsPanel";
import DashboardTopStats from "./DashboardTopStats";

export default async function AdminDashboardPage() {
  const results = await Promise.allSettled([getCourses(), getCategories(), getBlogs()]);

  const courses: CourseApi[] = results[0].status === "fulfilled" ? results[0].value : [];
  const categories = results[1].status === "fulfilled" ? results[1].value : [];
  const blogs = results[2].status === "fulfilled" ? results[2].value : [];

  const apiDown = results.some((r) => r.status === "rejected");
  const categoryNameById = new Map(categories.map((cat) => [cat.id, cat.name]));

  const courseCountByCategory = new Map<number, number>();
  for (const course of courses) {
    courseCountByCategory.set(course.category, (courseCountByCategory.get(course.category) ?? 0) + 1);
  }

  const categoryDistribution = [...courseCountByCategory.entries()]
    .map(([categoryId, count]) => ({
      categoryId,
      count,
      name: categoryNameById.get(categoryId) ?? `Category ${categoryId}`,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxCategoryCount = Math.max(...categoryDistribution.map((item) => item.count), 1);

  const recent = [...courses].slice(0, 5);
  const recentBlogs = [...blogs]
    .sort((a, b) => {
      const aTime = Date.parse(a.date);
      const bTime = Date.parse(b.date);
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
      return bTime - aTime;
    })
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {apiDown ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some API calls failed. Run Django on <code className="text-xs">127.0.0.1:8000</code> or set{" "}
          <code className="text-xs">NEXT_PUBLIC_API_BASE_URL</code>.
        </p>
      ) : null}

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#f8faff] via-white to-[#eef4ff] p-6 shadow-[0_20px_44px_-34px_rgba(30,64,175,0.4)] md:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-300/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard Overview
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Admin Analytics
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
              Quick access to your platform performance, lead pipeline, and latest content activity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
              Courses
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              <LayoutGrid className="h-3.5 w-3.5 text-cyan-600" />
              Categories
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-slate-200">
              <Newspaper className="h-3.5 w-3.5 text-violet-600" />
              Blogs
            </span>
          </div>
        </div>
      </section>

      <DashboardTopStats
        coursesCount={courses.length}
        categoriesCount={categories.length}
        blogsCount={blogs.length}
      />

      <ApplicationCountsPanel />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.55)] lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Course distribution (top categories)
          </h3>
          {categoryDistribution.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--admin-muted)]">No category/course distribution data yet.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {categoryDistribution.map((item) => {
                const widthPercent = Math.max(8, Math.round((item.count / maxCategoryCount) * 100));
                return (
                  <li key={item.categoryId} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                      <span className="truncate pr-3 font-semibold text-slate-700">{item.name}</span>
                      <span className="shrink-0 rounded-md bg-white px-2 py-0.5 font-bold text-slate-800 ring-1 ring-slate-200">
                        {item.count}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-200/80">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-[#4f46e5] via-[#3b82f6] to-[#06b6d4]"
                        style={{ width: `${widthPercent}%` }}
                        aria-label={`${item.name}: ${item.count} courses`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.55)]">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            Recent blog posts
          </h3>
          {recentBlogs.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--admin-muted)]">No blog posts in the API yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentBlogs.map((post) => (
                <li key={post.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/75 p-3.5">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{post.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {post.author} · {post.read_time}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.55)]">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
          Recent courses
        </h3>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">No courses in the API yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200/80">
            {recent.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div>
                  <p className="font-semibold text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.duration} · {c.price} · ★ {Number(c.rating).toFixed(1)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-slate-200">
                  {c.slug}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

