import { getBlogs, getCategories, getCourses, type CourseApi } from "@/lib/api";
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
    <div className="mx-auto max-w-6xl space-y-7">
      {apiDown ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Some API calls failed. Run Django on <code className="text-xs">127.0.0.1:8000</code> or set{" "}
          <code className="text-xs">NEXT_PUBLIC_API_BASE_URL</code>.
        </p>
      ) : null}

      <DashboardTopStats
        coursesCount={courses.length}
        categoriesCount={categories.length}
        blogsCount={blogs.length}
      />

      <ApplicationCountsPanel />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-gradient-to-br from-white to-indigo-50/30 p-6 shadow-sm shadow-indigo-900/5 lg:col-span-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Course distribution (top categories)
          </h3>
          {categoryDistribution.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--admin-muted)]">No category/course distribution data yet.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {categoryDistribution.map((item) => {
                const widthPercent = Math.max(8, Math.round((item.count / maxCategoryCount) * 100));
                return (
                  <li key={item.categoryId}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                      <span className="truncate pr-3 font-medium text-slate-700">{item.name}</span>
                      <span className="shrink-0 font-semibold">{item.count}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-indigo-100/70">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
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

        <div className="rounded-2xl border border-[var(--admin-border)] bg-gradient-to-br from-white to-cyan-50/40 p-6 shadow-sm shadow-cyan-900/5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Recent blog posts
          </h3>
          {recentBlogs.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--admin-muted)]">No blog posts in the API yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentBlogs.map((post) => (
                <li key={post.id} className="rounded-lg border border-indigo-100/70 bg-white/80 p-3">
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

      <div className="rounded-2xl border border-[var(--admin-border)] bg-gradient-to-br from-white to-violet-50/30 p-6 shadow-sm shadow-violet-900/5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Recent courses
        </h3>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--admin-muted)]">No courses in the API yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-indigo-100/70">
            {recent.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <div>
                  <p className="font-semibold text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {c.duration} · {c.price} · ★ {Number(c.rating).toFixed(1)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[11px] text-indigo-700 ring-1 ring-indigo-200">
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

