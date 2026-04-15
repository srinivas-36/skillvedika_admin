"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  {
    label: "Home",
    subItems: [
      { href: "/admin/home/hero", label: "Hero Section" },
      { href: "/admin/home/branding", label: "Logo & Branding" },
      { href: "/admin/home/featured", label: "Featured Section" },
      { href: "/admin/home/jobprogram", label: "Job Program Section" },
      { href: "/admin/home/whychoose", label: "Why Choose Section" },
      { href: "/admin/home/support", label: "Support Section" },
      { href: "/admin/home/faq", label: "FAQ Section" },
      { href: "/admin/home/seo", label: "SEO Section" },
    ],
  },
  
  { label: "Courses" },
  { label: "Categories" },
  { href: "/admin/coursespagecontent", label: "Courses Page Content" },
  { href: "/admin/categorypagecontent", label: "Category Page Content" },
  { href: "/admin/course-details", label: "Course Details" }, 
  { href: "/admin/settings", label: "Settings" },
  
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/instructor", label: "Instructor" },
  { href: "/admin/applications", label: "Applications" },
  {
    label: "Pages",
    subItems: [
      { href: "/admin/pages/career-service", label: "Career Service Page" },
      { href: "/admin/pages/on-job-support", label: "On Job Support Page" },
      { href: "/admin/pages/corporate-training", label: "Corporate Training Page" },
      { href: "/admin/pages/about", label: "About Page" },
      { href: "/admin/pages/contact", label: "Contact Page" },
      { href: "/admin/pages/terms-conditions", label: "Terms & Conditions Page" },
      { href: "/admin/pages/privacy-policy", label: "Privacy Policy Page" },
      { href: "/admin/pages/disclaimer", label: "Disclaimer Page" },
      { href: "/admin/pages/editorial-policy", label: "Editorial Policy Page" },
    ],
  
  }
  
    
  
];

const linkBase =
  "block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150";
const linkIdle = "text-slate-400 hover:bg-[var(--admin-sidebar-hover)] hover:text-white";
const linkActive = "bg-[var(--admin-accent)] text-white shadow-md shadow-blue-950/40";
const MEDIA_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon?: string | null;
};

type Course = {
  id: number;
  category: number;
  category_name?: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Home: true,
    Courses: false,
    Categories: false,
    CourseDetails: false,
    Blog: false,
    Instructor: false,
    Pages: false,
    
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [branding, setBranding] = useState<{ brand_name: string; logo: string | null }>({
    brand_name: "SkillVedika",
    logo: null,
  });

  const loadData = useCallback(async () => {
    try {
      const [catRes, courseRes] = await Promise.all([
        fetch("/api/categories/"),
        fetch("/api/courses/"),
      ]);

      const catJson = await catRes.json().catch(() => []);
      const courseJson = await courseRes.json().catch(() => []);

      setCategories(Array.isArray(catJson) ? catJson : []);
      setCourses(Array.isArray(courseJson) ? courseJson : []);
    } catch {
      setCategories([]);
      setCourses([]);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const res = await fetch(apiUrl("/api/home/branding/"), { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json().catch(() => ({}))) as {
          brand_name?: unknown;
          logo?: unknown;
        };
        setBranding({
          brand_name:
            typeof data.brand_name === "string" && data.brand_name.trim()
              ? data.brand_name.trim()
              : "SkillVedika",
          logo: typeof data.logo === "string" && data.logo.trim() ? data.logo : null,
        });
      } catch {
        setBranding((prev) => prev);
      }
    };
    void loadBranding();
  }, []);

  useEffect(() => {
    // Open parent menus based on current path.
    const initialOpenMenus: Record<string, boolean> = {};
    if (pathname.startsWith("/admin/home/")) initialOpenMenus.Home = true;
    if (pathname.startsWith("/admin/courses")) initialOpenMenus.Courses = true;
    if (pathname.startsWith("/admin/categories")) initialOpenMenus.Categories = true;
    if (pathname.startsWith("/admin/course-details")) initialOpenMenus.CourseDetails = true;
    if (pathname.startsWith("/admin/blog")) initialOpenMenus.Blog = true;
    if (pathname.startsWith("/admin/instructor")) initialOpenMenus.Instructor = true;
    if (pathname.startsWith("/admin/pages")) initialOpenMenus.Pages = true; 
    setOpenMenus((prev) => ({ ...initialOpenMenus, ...prev }));
  }, [pathname]);

  const courseCountsByCategory = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of courses) {
      m.set(c.category, (m.get(c.category) ?? 0) + 1);
    }
    return m;
  }, [courses]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const courseSubItems = useMemo(() => {
    return [
      { href: "/admin/courses", label: "All Courses" },
      ...sortedCategories.map((cat) => ({
        href: `/admin/courses?category=${cat.id}`,
        label: `${cat.name} (${courseCountsByCategory.get(cat.id) ?? 0})`,
      })),
    ];
  }, [sortedCategories, courseCountsByCategory]);

  const categorySubItems = useMemo(() => {
    return [
      { href: "/admin/categories", label: "All Categories" },
      ...sortedCategories.map((cat) => ({
        href: `/admin/categories?edit=${cat.id}`,
        label: cat.name,
      })),
    ];
  }, [sortedCategories]);

  const activeCourseCategoryId = searchParams.get("category");
  const activeCategoryEditId = searchParams.get("edit");

  const isActiveCourseSub = (href: string) => {
    if (!pathname.startsWith("/admin/courses")) return false;
    if (href === "/admin/courses") return !activeCourseCategoryId;
    const m = href.match(/category=(\d+)/);
    return m ? String(m[1]) === String(activeCourseCategoryId ?? "") : false;
  };

  const isActiveCategorySub = (href: string) => {
    if (!pathname.startsWith("/admin/categories")) return false;
    if (href === "/admin/categories") return !activeCategoryEditId;
    const m = href.match(/edit=(\d+)/);
    return m ? String(m[1]) === String(activeCategoryEditId ?? "") : false;
  };

  const toggleMenu = (label: string) =>
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));

  const logoSrc =
    typeof branding.logo === "string" && branding.logo.trim()
      ? branding.logo.startsWith("http")
        ? branding.logo
        : `${MEDIA_BASE}${branding.logo.startsWith("/") ? branding.logo : `/${branding.logo}`}`
      : null;

  const isActiveMenuButton = (label: string) => {
    if (label === "Courses") return pathname.startsWith("/admin/courses");
    if (label === "Categories") return pathname.startsWith("/admin/categories");
    if (label === "Home") return pathname.startsWith("/admin/home/");
    return false;
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-64 flex flex-col border-r border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar)] z-50"
    >
      <div className="border-b border-[var(--admin-sidebar-border)] px-4 py-6">
        <div className="flex items-center gap-3">
          {logoSrc ? (
            <img
              src={`${logoSrc}?v=${encodeURIComponent(branding.brand_name || "logo")}`}
              alt={`${branding.brand_name} logo`}
              className="h-12 w-auto max-w-[130px] rounded-md bg-white object-contain p-1 shadow-lg shadow-blue-950/20"
            />
          ) : (
            <div className="text-sm font-bold tracking-tight text-white">{branding.brand_name}</div>
          )}
          <div>
            {!logoSrc ? (
              <div className="text-sm font-bold tracking-tight text-white">{branding.brand_name}</div>
            ) : null}
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Admin
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map(({ href, label, subItems }) => {
          const resolvedSubItems =
            label === "Courses"
              ? courseSubItems
              : label === "Categories"
                ? categorySubItems
                : subItems;

          return (
            <div key={label}>
              {href ? (
                <Link
                  href={href}
                  className={`${linkBase} ${pathname === href ? linkActive : linkIdle}`}
                >
                  {label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleMenu(label)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition hover:bg-[var(--admin-sidebar-hover)] hover:text-white ${
                    isActiveMenuButton(label)
                      ? "bg-[var(--admin-accent)] text-white shadow-md shadow-blue-950/40"
                      : "text-slate-400"
                  }`}
                >
                  {label}
                  <span className="text-slate-500">{openMenus[label] ? "−" : "+"}</span>
                </button>
              )}

              {resolvedSubItems && openMenus[label] && (
                <div className="ml-2 mt-1 space-y-0.5 border-l border-[var(--admin-sidebar-border)] pl-2">
                  {resolvedSubItems.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`${linkBase} ${
                        label === "Courses"
                          ? isActiveCourseSub(sub.href)
                            ? linkActive
                            : linkIdle
                          : label === "Categories"
                            ? isActiveCategorySub(sub.href)
                              ? linkActive
                              : linkIdle
                            : pathname.startsWith(sub.href)
                              ? linkActive
                              : linkIdle
                      }`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
