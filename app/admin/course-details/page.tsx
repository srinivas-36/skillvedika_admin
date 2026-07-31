"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HomeEditorShell,
  EditorPanel,
  AdminIconActions,
  AdminModal,
  AdminConfirmDialog,
  AdminPagination,
  btnPrimary,
  btnSecondary,
  fieldLabel,
  inputClass,
  textareaClass,
} from "@/components/admin/HomeEditorShell";
import { apiUrl, getCoursesPage } from "@/lib/api";
import { authHeadersBearer, authHeadersJson, getAccessToken } from "@/lib/auth";
import { parseApiError } from "@/lib/cms-errors";
import TipTapEditor from "@/components/editor/TipTapEditor";

type Course = { id: number; title: string; slug: string };
type AnyObj = Record<string, unknown>;
type InputType = "text" | "textarea" | "date" | "checkbox";
type Category = { id: number; name: string };
const COURSE_PAGE_SIZE = 10;

type SectionMeta = {
  about_heading?: string;
  skills_heading?: string;
  tools_heading?: string;
  curriculum_heading?: string;
  projects_heading?: string;
  salary_heading?: string;
  placement_support_heading?: string;
  corporate_training_heading?: string;
  trainers_heading?: string;
  batches_heading?: string;
  blogs_heading?: string;
  faqs_heading?: string;

  // Scrolling marquee (hero bottom)
  scrolling_enabled?: boolean;
  scrolling_location?: "course" | "home" | "both";
  scrolling_items?: string;
};
type SectionMetaKey = keyof SectionMeta;

const SECTIONS = [
  "about",
  "skills",
  "tools",
  "curriculum",
  "projects",
  "salary",
  "placement-support",
  "corporate-training",
  "faqs",
  "batches",
  "blogs",
  "trainers",
] as const;

type SectionName = (typeof SECTIONS)[number];

const SECTION_HEADING_META: Record<SectionName, { key: SectionMetaKey; label: string }> = {
  about: { key: "about_heading", label: "About Heading" },
  skills: { key: "skills_heading", label: "Skills Heading" },
  tools: { key: "tools_heading", label: "Tools Heading" },
  curriculum: { key: "curriculum_heading", label: "Curriculum Heading" },
  projects: { key: "projects_heading", label: "Projects Heading" },
  salary: { key: "salary_heading", label: "Salary Heading" },
  "placement-support": { key: "placement_support_heading", label: "Placement Support Heading" },
  "corporate-training": { key: "corporate_training_heading", label: "Corporate Training Heading" },
  faqs: { key: "faqs_heading", label: "FAQs Heading" },
  batches: { key: "batches_heading", label: "Batches Heading" },
  blogs: { key: "blogs_heading", label: "Blogs Heading" },
  trainers: { key: "trainers_heading", label: "Trainers Heading" },
};

const SECTION_DEFAULT_TITLE: Record<SectionName, string> = {
  about: "ABOUT",
  skills: "SKILLS",
  tools: "TOOLS",
  curriculum: "CURRICULUM",
  projects: "PROJECTS",
  salary: "SALARY",
  "placement-support": "PLACEMENT SUPPORT",
  "corporate-training": "CORPORATE TRAINING",
  faqs: "FAQS",
  batches: "BATCHES",
  blogs: "BLOGS",
  trainers: "TRAINERS",
};

type FieldDef = {
  key: string;
  label: string;
  type?: InputType;
  optional?: boolean;
};

const SECTION_FIELDS: Record<SectionName, FieldDef[]> = {
  about: [
    { key: "content", label: "Content", type: "textarea" },
  ],
  skills: [
    { key: "name", label: "Skill Name" },
    { key: "description", label: "Description", type: "textarea" },
  ],
  tools: [{ key: "name", label: "Tool Name" }],
  curriculum: [
    { key: "title", label: "Title" },
    { key: "content", label: "Content", type: "textarea" },
  ],
  projects: [
    { key: "title", label: "Title" },
    { key: "description", label: "Description", type: "textarea" },
  ],
  salary: [
    { key: "role", label: "Role" },
    { key: "range", label: "Salary Range" },
  ],
  "placement-support": [
    { key: "heading", label: "Item Heading (optional)", optional: true },
    { key: "content", label: "Content", type: "textarea" },
  ],
  "corporate-training": [
    { key: "heading", label: "Item Heading (optional)", optional: true },
    { key: "content", label: "Content", type: "textarea" },
  ],
  faqs: [
    { key: "question", label: "Question" },
    { key: "answer", label: "Answer", type: "textarea" },
  ],
  batches: [
    { key: "date", label: "Batch Date" },
    { key: "mode", label: "Mode (Online/Offline)" },
    { key: "seats", label: "Seats" },
    { key: "limited", label: "Limited Seats", type: "checkbox" },
  ],
  blogs: [
    { key: "title", label: "Blog Title" },
    { key: "date", label: "Date", type: "date" },
  ],
  trainers: [
    { key: "name", label: "Trainer Name" },
    { key: "company", label: "Company" },
    { key: "exp", label: "Experience" },
    { key: "skills", label: "Skills" },
  ],
};

function emptyFormFor(section: SectionName): Record<string, string | boolean> {
  const form: Record<string, string | boolean> = {};
  for (const field of SECTION_FIELDS[section]) {
    form[field.key] = field.type === "checkbox" ? false : "";
  }
  return form;
}

function emptyForms(): Record<SectionName, Record<string, string | boolean>> {
  return {
    about: emptyFormFor("about"),
    skills: emptyFormFor("skills"),
    tools: emptyFormFor("tools"),
    curriculum: emptyFormFor("curriculum"),
    projects: emptyFormFor("projects"),
    salary: emptyFormFor("salary"),
    "placement-support": emptyFormFor("placement-support"),
    "corporate-training": emptyFormFor("corporate-training"),
    faqs: emptyFormFor("faqs"),
    batches: emptyFormFor("batches"),
    blogs: emptyFormFor("blogs"),
    trainers: emptyFormFor("trainers"),
  };
}

export default function AdminCourseDetailsPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    section: SectionName;
    itemId: number;
    label: string;
  } | null>(null);
  const [seoForm, setSeoForm] = useState({
    seo_meta_title: "",
    seo_meta_description: "",
    seo_meta_keywords: "",
  });
  const [metaForm, setMetaForm] = useState<SectionMeta>({
    about_heading: "",
    skills_heading: "",
    tools_heading: "",
    curriculum_heading: "",
    projects_heading: "",
    salary_heading: "",
    placement_support_heading: "",
    corporate_training_heading: "",
    trainers_heading: "",
    batches_heading: "",
    blogs_heading: "",
    faqs_heading: "",
    scrolling_enabled: false,
    scrolling_location: "course",
    scrolling_items: "",
  });
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [courseDetails, setCourseDetails] = useState<AnyObj | null>(null);
  const [sections, setSections] = useState<Record<SectionName, AnyObj[]>>({
    about: [],
    skills: [],
    tools: [],
    curriculum: [],
    projects: [],
    salary: [],
    "placement-support": [],
    "corporate-training": [],
    faqs: [],
    batches: [],
    blogs: [],
    trainers: [],
  });

  const [editingBySection, setEditingBySection] = useState<Record<SectionName, number | null>>({
    about: null,
    skills: null,
    tools: null,
    curriculum: null,
    projects: null,
    salary: null,
    "placement-support": null,
    "corporate-training": null,
    faqs: null,
    batches: null,
    blogs: null,
    trainers: null,
  });
  const [formBySection, setFormBySection] = useState<Record<SectionName, Record<string, string | boolean>>>(emptyForms);

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    slug: "",
    description: "",
    duration: "",
    price: "",
    rating: 0,
    category: 0,
  });
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [debouncedCourseSearch, setDebouncedCourseSearch] = useState("");
  const [coursePage, setCoursePage] = useState(1);
  const [courseTotalCount, setCourseTotalCount] = useState(0);
  const [courseTotalPages, setCourseTotalPages] = useState(1);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [sectionSearchQuery, setSectionSearchQuery] = useState("");
  const [itemModalSection, setItemModalSection] = useState<SectionName | null>(null);
  const [savingSectionItem, setSavingSectionItem] = useState(false);
  const [savingScrolling, setSavingScrolling] = useState(false);
  const modalScrollYRef = useRef<number>(0);

  function matchesSearch(query: string, ...values: (string | number | boolean | null | undefined)[]) {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return values.some((v) => String(v ?? "").toLowerCase().includes(q));
  }

  function formatItemCell(value: unknown, fieldKey?: string): string {
    if (fieldKey === "content" && typeof value === "string") {
      return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value ?? "—");
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function scrollToEl(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCourseSearch(courseSearchQuery);
      setCoursePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [courseSearchQuery]);

  const loadCoursesList = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const data = await getCoursesPage({
        page: coursePage,
        pageSize: COURSE_PAGE_SIZE,
        search: debouncedCourseSearch,
      });
      setCourses(data.results);
      setCourseTotalCount(data.count);
      setCourseTotalPages(Math.max(1, data.total_pages));
      if (data.page !== coursePage && data.total_pages > 0) {
        setCoursePage(data.page);
      }
      setSelectedSlug((current) => current || data.results[0]?.slug || "");
      return data.results;
    } catch {
      setCourses([]);
      setCourseTotalCount(0);
      setCourseTotalPages(1);
      setError("Could not load courses.");
      return [];
    } finally {
      setLoadingCourses(false);
    }
  }, [coursePage, debouncedCourseSearch]);

  function beginAddItem() {
    setMessage(null);
    setError(null);
    // Ensure no section is in edit mode.
    setEditingBySection({
      about: null,
      skills: null,
      tools: null,
      curriculum: null,
      projects: null,
      salary: null,
      "placement-support": null,
      "corporate-training": null,
      faqs: null,
      batches: null,
      blogs: null,
      trainers: null,
    });
    scrollToEl("course-details-sections");
  }

  function beginAddForSection(section: SectionName) {
    setMessage(null);
    setError(null);
    setEditingBySection((prev) => ({ ...prev, [section]: null }));
    setFormBySection((prev) => ({ ...prev, [section]: emptyFormFor(section) }));
    setItemModalSection(section);
  }

  function closeItemModal() {
    if (itemModalSection) {
      setEditingBySection((prev) => ({ ...prev, [itemModalSection]: null }));
      setFormBySection((prev) => ({ ...prev, [itemModalSection]: emptyFormFor(itemModalSection) }));
    }
    setItemModalSection(null);
  }

  // Prevent background scroll and page "jump" when opening the fixed modal.
  useEffect(() => {
    if (!itemModalSection) return;
    modalScrollYRef.current = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
      window.scrollTo({ top: modalScrollYRef.current });
    };
  }, [itemModalSection]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }

    async function init() {
      setLoading(true);
      try {
        const categoriesRes = await fetch(apiUrl("/api/categories/?include_inactive=1"), {
          cache: "no-store",
        });
        if (categoriesRes.ok) {
          const categoriesData = (await categoriesRes.json()) as Category[];
          const cats = Array.isArray(categoriesData) ? categoriesData : [];
          setCategories(cats);
          setCourseForm((prev) => ({
            ...prev,
            category: prev.category || cats[0]?.id || 0,
          }));
        } else {
          setCategories([]);
        }
      } catch {
        setError("Could not load courses.");
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) return;
    void loadCoursesList();
  }, [loadCoursesList]);

  async function createCourse() {
    setError(null);
    setMessage(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    const title = courseForm.title.trim();
    const slug = (courseForm.slug || slugify(title)).trim();
    if (!title) {
      setError("Course title is required.");
      return;
    }
    if (!slug) {
      setError("Course slug is required.");
      return;
    }
    if (!String(courseForm.description ?? "").trim()) {
      setError("Description is required.");
      return;
    }
    if (!courseForm.category) {
      setError("Select a category first.");
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/courses/"), {
        method: "POST",
        headers: authHeadersJson(),
        body: JSON.stringify({
          title,
          slug,
          description: courseForm.description,
          duration: String(courseForm.duration ?? "").trim(),
          price: String(courseForm.price ?? "").trim(),
          rating: Number(courseForm.rating) || 0,
          category: Number(courseForm.category),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(parseApiError(data));
        return;
      }

      const created = data as { slug?: string; title?: string };
      const createdSlug = typeof created.slug === "string" ? created.slug : slug;
      setMessage("Course created. Now add SEO + sections for it.");
      setShowAddCourse(false);
      setCourseForm((prev) => ({
        ...prev,
        title: "",
        slug: "",
        description: "",
        duration: "",
        price: "",
        rating: 0,
      }));

      // refresh course list and select the new course
      await loadCoursesList();
      if (createdSlug) setSelectedSlug(createdSlug);
    } catch {
      setError("Could not create course.");
    }
  }

  async function loadCourseDetails(slug: string) {
    if (!slug) return;
    setError(null);
    setMessage(null);
    setLoadingDetails(true);
    try {
      const [courseRes, metaRes, ...sectionRes] = await Promise.all([
        fetch(apiUrl(`/api/course-details/course/${slug}/`), { cache: "no-store" }),
        fetch(apiUrl(`/api/course-details/course/${slug}/meta/`), { cache: "no-store" }),
        ...SECTIONS.map((s) => fetch(apiUrl(`/api/course-details/course/${slug}/${s}/`), { cache: "no-store" })),
      ]);

      if (!courseRes.ok) throw new Error("course details failed");
      const details = (await courseRes.json()) as AnyObj;
      setCourseDetails(details);
      setSeoForm({
        seo_meta_title: String(details.seo_meta_title ?? ""),
        seo_meta_description: String(details.seo_meta_description ?? ""),
        seo_meta_keywords: String(details.seo_meta_keywords ?? ""),
      });

      if (metaRes.ok) {
        const meta = (await metaRes.json().catch(() => ({}))) as SectionMeta;
        setMetaForm({
          about_heading: String(meta.about_heading ?? ""),
          skills_heading: String(meta.skills_heading ?? ""),
          tools_heading: String(meta.tools_heading ?? ""),
          curriculum_heading: String(meta.curriculum_heading ?? ""),
          projects_heading: String(meta.projects_heading ?? ""),
          salary_heading: String(meta.salary_heading ?? ""),
          placement_support_heading: String(meta.placement_support_heading ?? ""),
          corporate_training_heading: String(meta.corporate_training_heading ?? ""),
          trainers_heading: String(meta.trainers_heading ?? ""),
          batches_heading: String(meta.batches_heading ?? ""),
          blogs_heading: String(meta.blogs_heading ?? ""),
          faqs_heading: String(meta.faqs_heading ?? ""),
          scrolling_enabled: Boolean(meta.scrolling_enabled),
          scrolling_location: meta.scrolling_location ?? "course",
          scrolling_items: String(meta.scrolling_items ?? ""),
        });
      }

      const jsons = await Promise.all(sectionRes.map((r) => r.json().catch(() => [])));
      const next = {} as Record<SectionName, AnyObj[]>;
      SECTIONS.forEach((s, i) => {
        next[s] = Array.isArray(jsons[i]) ? (jsons[i] as AnyObj[]) : [];
      });
      setSections(next);
    } catch {
      setError("Could not load selected course details.");
      setCourseDetails(null);
      setSections({
        about: [],
        skills: [],
        tools: [],
        curriculum: [],
        projects: [],
        salary: [],
        "placement-support": [],
        "corporate-training": [],
        faqs: [],
        batches: [],
        blogs: [],
        trainers: [],
      });
      setSeoForm({
        seo_meta_title: "",
        seo_meta_description: "",
        seo_meta_keywords: "",
      });
      setMetaForm({
        about_heading: "",
        skills_heading: "",
        tools_heading: "",
        curriculum_heading: "",
        projects_heading: "",
        salary_heading: "",
        placement_support_heading: "",
        corporate_training_heading: "",
        trainers_heading: "",
        batches_heading: "",
        blogs_heading: "",
        faqs_heading: "",
        scrolling_enabled: false,
        scrolling_location: "course",
        scrolling_items: "",
      });
    } finally {
      setLoadingDetails(false);
    }
  }

  async function saveSectionHeadings(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    if (!selectedSlug) {
      setError("Select a course first.");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/course-details/course/${selectedSlug}/meta/`), {
        method: "PUT",
        headers: authHeadersJson(),
        body: JSON.stringify(metaForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(parseApiError(body));
        return;
      }
      setMessage("Section headings updated.");
      await loadCourseDetails(selectedSlug);
    } catch {
      setError("Could not update section headings.");
    }
  }

  async function saveScrollingBanner() {
    setError(null);
    setMessage(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    if (!selectedSlug) {
      setError("Select a course first.");
      return;
    }

    setSavingScrolling(true);
    try {
      const res = await fetch(apiUrl(`/api/course-details/course/${selectedSlug}/meta/`), {
        method: "PUT",
        headers: authHeadersJson(),
        body: JSON.stringify(metaForm),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(parseApiError(body));
        return;
      }

      setMessage("Scrolling banner saved.");
      await loadCourseDetails(selectedSlug);
    } catch {
      setError("Could not save scrolling banner.");
    } finally {
      setSavingScrolling(false);
    }
  }

  async function saveSingleSectionHeading(section: SectionName) {
    setError(null);
    setMessage(null);
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    if (!selectedSlug) {
      setError("Select a course first.");
      return;
    }
    const headingConfig = SECTION_HEADING_META[section];
    try {
      const res = await fetch(apiUrl(`/api/course-details/course/${selectedSlug}/meta/`), {
        method: "PUT",
        headers: authHeadersJson(),
        body: JSON.stringify(metaForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(parseApiError(body));
        return;
      }
      setMessage(`${headingConfig.label} saved successfully.`);
      await loadCourseDetails(selectedSlug);
    } catch {
      setError(`Could not update ${headingConfig.label.toLowerCase()}.`);
    }
  }

  async function saveSeo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    if (!selectedSlug) {
      setError("Select a course first.");
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/course-details/course/${selectedSlug}/`), {
        method: "PUT",
        headers: authHeadersJson(),
        body: JSON.stringify(seoForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(parseApiError(body));
        return;
      }
      setMessage("SEO details updated.");
      await loadCourseDetails(selectedSlug);
    } catch {
      setError("Could not update SEO details.");
    }
  }

  useEffect(() => {
    if (selectedSlug) {
      void loadCourseDetails(selectedSlug);
    }
  }, [selectedSlug]);

  async function saveSectionItem(section: SectionName, e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setMessage(null);

    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    if (!selectedSlug) {
      setError("Select a course first.");
      return;
    }

    const activeFields = SECTION_FIELDS[section];
    const payload = activeFields.reduce<AnyObj>((acc, f) => {
      acc[f.key] = formBySection[section][f.key];
      return acc;
    }, {});

    for (const field of activeFields) {
      if (field.type === "checkbox" || field.optional) continue;
      const value = String(payload[field.key] ?? "").trim();
      if (!value) {
        setError(`${field.label} is required.`);
        return;
      }
    }

    try {
      setSavingSectionItem(true);
      const editingId = editingBySection[section];
      const endpoint = editingId
        ? `/api/course-details/course/${selectedSlug}/${section}/${editingId}/`
        : `/api/course-details/course/${selectedSlug}/${section}/`;
      const res = await fetch(apiUrl(endpoint), {
        method: editingId ? "PUT" : "POST",
        headers: authHeadersJson(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(parseApiError(body));
        return;
      }
      setMessage(editingId ? `${section} item updated.` : `${section} item added.`);
      setEditingBySection((prev) => ({ ...prev, [section]: null }));
      setFormBySection((prev) => ({ ...prev, [section]: emptyFormFor(section) }));
      setItemModalSection(null);
      await loadCourseDetails(selectedSlug);
    } catch {
      setError("Could not save section item.");
    } finally {
      setSavingSectionItem(false);
    }
  }

  function startEdit(section: SectionName, item: AnyObj) {
    const next = emptyFormFor(section);
    for (const field of SECTION_FIELDS[section]) {
      if (field.type === "checkbox") {
        next[field.key] = Boolean(item[field.key]);
      } else {
        next[field.key] = String(item[field.key] ?? "");
      }
    }
    setFormBySection((prev) => ({ ...prev, [section]: next }));
    setEditingBySection((prev) => ({
      ...prev,
      [section]: typeof item.id === "number" ? item.id : null,
    }));
    setItemModalSection(section);
  }

  function handleDelete(section: SectionName, itemId: number, label?: string) {
    setDeleteConfirm({
      section,
      itemId,
      label: label?.trim() || `item #${itemId}`,
    });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    const { section, itemId } = deleteConfirm;
    setDeleting(true);
    setError(null);
    setMessage(null);
    if (!selectedSlug) {
      setDeleting(false);
      return;
    }
    try {
      const res = await fetch(
        apiUrl(`/api/course-details/course/${selectedSlug}/${section}/${itemId}/`),
        {
          method: "DELETE",
          headers: authHeadersBearer(),
        }
      );
      if (!res.ok) {
        setError(parseApiError(await res.json().catch(() => ({}))) || "Could not delete item.");
        return;
      }
      if (editingBySection[section] === itemId) {
        setEditingBySection((prev) => ({ ...prev, [section]: null }));
        setFormBySection((prev) => ({ ...prev, [section]: emptyFormFor(section) }));
        setItemModalSection((current) => (current === section ? null : current));
      }
      setDeleteConfirm(null);
      setMessage("Item deleted.");
      await loadCourseDetails(selectedSlug);
    } catch {
      setError("Could not delete item.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <HomeEditorShell title="Course Details CMS" subtitle="Loading...">
        <p className="text-sm text-slate-500">Loading...</p>
      </HomeEditorShell>
    );
  }

  return (
    <HomeEditorShell
      title="Course Details CMS"
      subtitle="Select a course to view dynamic details and add section items that will be shown on public course-detail pages."
    >
      {message ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      <EditorPanel title="Select course">
        <div id="course-details-course-select" />
        <div className="mb-4">
          <input
            type="search"
            className={inputClass}
            value={courseSearchQuery}
            onChange={(e) => setCourseSearchQuery(e.target.value)}
            placeholder="Search courses by title or slug..."
          />
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="p-3 font-bold text-slate-700">ID</th>
                <th className="p-3 font-bold text-slate-700">Title</th>
                <th className="p-3 font-bold text-slate-700">Slug</th>
                <th className="p-3 font-bold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-t border-slate-100 align-top hover:bg-slate-50/80 ${selectedSlug === c.slug ? "bg-amber-50/60" : ""}`}
                  >
                    <td className="p-3 font-mono text-xs text-slate-500">{c.id}</td>
                    <td className="p-3 font-semibold text-slate-900">{c.title}</td>
                    <td className="p-3 font-mono text-xs text-slate-600">{c.slug}</td>
                    <td className="p-3">
                      <AdminIconActions
                        hideDelete
                        editLabel="Edit course sections"
                        onEdit={() => {
                          setSelectedSlug(c.slug);
                          scrollToEl("course-details-sections");
                        }}
                      />
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={coursePage}
          totalPages={courseTotalPages}
          totalCount={courseTotalCount}
          pageSize={COURSE_PAGE_SIZE}
          disabled={loadingCourses}
          onPageChange={setCoursePage}
        />
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setShowAddCourse(true)}
          >
            Add New Course
          </button>
          <button type="button" className={btnPrimary} onClick={() => void loadCourseDetails(selectedSlug)} disabled={loadingDetails}>
            {loadingDetails ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </EditorPanel>

      {showAddCourse ? (
        <AdminModal
          open
          size="large"
          title="Add course"
          onClose={() => setShowAddCourse(false)}
          footer={
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className={btnSecondary} onClick={() => setShowAddCourse(false)}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={() => void createCourse()}>
                Create course
              </button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Title *</label>
              <input
                className={inputClass}
                value={courseForm.title}
                onChange={(e) =>
                  setCourseForm((p) => ({
                    ...p,
                    title: e.target.value,
                    slug: p.slug || slugify(e.target.value),
                  }))
                }
                placeholder="Course title"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Slug *</label>
              <input
                className={inputClass}
                value={courseForm.slug}
                onChange={(e) => setCourseForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="course-slug"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={fieldLabel}>Description</label>
              <textarea
                className={textareaClass}
                rows={4}
                value={courseForm.description}
                onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Duration</label>
              <input
                className={inputClass}
                value={courseForm.duration}
                onChange={(e) => setCourseForm((p) => ({ ...p, duration: e.target.value }))}
                placeholder="e.g. 4 weeks"
              />
            </div>
            <div>
              <label className={fieldLabel}>Price</label>
              <input
                className={inputClass}
                value={courseForm.price}
                onChange={(e) => setCourseForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="e.g. ₹299"
              />
            </div>
            <div>
              <label className={fieldLabel}>Rating</label>
              <input
                className={inputClass}
                type="number"
                step="0.1"
                min={0}
                max={5}
                value={courseForm.rating}
                onChange={(e) => setCourseForm((p) => ({ ...p, rating: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className={fieldLabel}>Category *</label>
              <select
                className={inputClass}
                value={courseForm.category || ""}
                onChange={(e) => setCourseForm((p) => ({ ...p, category: Number(e.target.value) }))}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (id {c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </AdminModal>
      ) : null}

      <EditorPanel title="SEO">
        <div id="course-details-seo" />
        <form onSubmit={(e) => void saveSeo(e)} className="space-y-3">
          <div>
            <label className={fieldLabel}>Meta Title</label>
            <input
              type="text"
              className={inputClass}
              value={seoForm.seo_meta_title}
              onChange={(e) =>
                setSeoForm((prev) => ({ ...prev, seo_meta_title: e.target.value }))
              }
              placeholder="Meta title for this course page"
            />
          </div>
          <div>
            <label className={fieldLabel}>Meta Description</label>
            <textarea
              className={textareaClass}
              rows={4}
              value={seoForm.seo_meta_description}
              onChange={(e) =>
                setSeoForm((prev) => ({ ...prev, seo_meta_description: e.target.value }))
              }
              placeholder="Meta description for this course page"
            />
          </div>
          <div>
            <label className={fieldLabel}>Meta Keywords</label>
            <input
              type="text"
              className={inputClass}
              value={seoForm.seo_meta_keywords}
              onChange={(e) =>
                setSeoForm((prev) => ({ ...prev, seo_meta_keywords: e.target.value }))
              }
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>
          <button type="submit" className={btnPrimary}>
            Save SEO
          </button>
        </form>
      </EditorPanel>

      <EditorPanel title="Scrolling Banner (Hero Bottom)">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={fieldLabel}>Enable scrolling</label>
            <select
              className={inputClass}
              value={metaForm.scrolling_enabled ? "yes" : "no"}
              onChange={(e) =>
                setMetaForm((prev) => ({
                  ...prev,
                  scrolling_enabled: e.target.value === "yes",
                }))
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div>
            <label className={fieldLabel}>Show on</label>
            <select
              className={inputClass}
              value={metaForm.scrolling_location ?? "course"}
              onChange={(e) =>
                setMetaForm((prev) => ({
                  ...prev,
                  scrolling_location: e.target.value as "course" | "home" | "both",
                }))
              }
            >
              <option value="course">Course details page</option>
              <option value="home">Home page</option>
              <option value="both">Both pages</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className={fieldLabel}>Scrolling items (one per line)</label>
          <textarea
            className={textareaClass}
            rows={4}
            value={String(metaForm.scrolling_items ?? "")}
            onChange={(e) =>
              setMetaForm((prev) => ({
                ...prev,
                scrolling_items: e.target.value,
              }))
            }
            placeholder={"Example:\nJavaScript\nReact\nNext.js"}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={btnPrimary}
            onClick={() => void saveScrollingBanner()}
            disabled={savingScrolling}
          >
            {savingScrolling ? "Saving..." : "Save scrolling"}
          </button>
        </div>
      </EditorPanel>

      <EditorPanel title="Course details table">
        <div id="course-details-sections" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Manage section items for the selected course. Each section has its own list + add/edit form.
            </p>
            <button type="button" className={btnPrimary} onClick={beginAddItem}>
              Jump to Sections
            </button>
          </div>
          <div>
            <input
              type="search"
              className={inputClass}
              value={sectionSearchQuery}
              onChange={(e) => setSectionSearchQuery(e.target.value)}
              placeholder="Search items across all sections..."
            />
          </div>

          {SECTIONS.map((section) => {
            const fields = SECTION_FIELDS[section];
            const items = (sections[section] ?? []).filter((item) =>
              matchesSearch(
                sectionSearchQuery,
                item.id as string | number | boolean | null | undefined,
                ...fields.map((f) => item[f.key] as string | number | boolean | null | undefined),
              ),
            );
            const headingConfig = SECTION_HEADING_META[section];
            return (
              <EditorPanel
                key={section}
                title={
                  String(metaForm[headingConfig.key] ?? "").trim() ||
                  SECTION_DEFAULT_TITLE[section]
                }
              >
                <div id={`course-details-${section}`} />

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveSingleSectionHeading(section);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div>
                      <label className={fieldLabel}>{headingConfig.label}</label>
                      <input
                        className={inputClass}
                        value={String(metaForm[headingConfig.key] ?? "")}
                        onChange={(e) =>
                          setMetaForm((prev) => ({ ...prev, [headingConfig.key]: e.target.value }))
                        }
                        placeholder={`Enter ${headingConfig.label.toLowerCase()}`}
                      />
                    </div>
                    <button type="submit" className={btnPrimary}>
                      Save Heading
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">
                    {(sections[section] ?? []).length} {(sections[section] ?? []).length === 1 ? "item" : "items"}
                    {sectionSearchQuery ? ` (${items.length} shown)` : ""}
                  </p>
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => beginAddForSection(section)}
                  >
                    Add {section}
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  {items.length === 0 ? (
                    <p className="p-4 text-sm text-[var(--admin-muted)]">
                      {sectionSearchQuery ? "No items match your search." : "No items yet."}
                    </p>
                  ) : (
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left">
                          <th className="p-3 font-bold text-slate-700">ID</th>
                          {fields.map((f) => (
                            <th key={f.key} className="p-3 font-bold text-slate-700">
                              {f.label}
                            </th>
                          ))}
                          <th className="p-3 font-bold text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={`${section}:${String(item.id)}`} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                            <td className="p-3 font-mono text-xs text-slate-500">{String(item.id ?? "—")}</td>
                            {fields.map((f) => (
                              <td key={f.key} className="p-3 text-slate-800 whitespace-pre-wrap break-words">
                                {formatItemCell(item[f.key], f.key)}
                              </td>
                            ))}
                            <td className="p-3">
                              <AdminIconActions
                                onEdit={() => startEdit(section, item)}
                                onDelete={() =>
                                  handleDelete(
                                    section,
                                    Number(item.id),
                                    String(item.name ?? item.title ?? item.question ?? item.role ?? ""),
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </EditorPanel>
            );
          })}
        </div>
      </EditorPanel>

      {itemModalSection ? (
        <AdminModal
          open
          size="xlarge"
          title={
            editingBySection[itemModalSection]
              ? `Edit ${itemModalSection} item #${editingBySection[itemModalSection]}`
              : `Add ${itemModalSection} item`
          }
          onClose={closeItemModal}
          footer={
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className={btnSecondary} onClick={closeItemModal}>
                Cancel
              </button>
              <button
                type="submit"
                form="course-details-item-modal-form"
                className={btnPrimary}
                disabled={savingSectionItem}
              >
                {savingSectionItem
                  ? "Saving..."
                  : editingBySection[itemModalSection]
                    ? "Save changes"
                    : "Add item"}
              </button>
            </div>
          }
        >
          <form
            id="course-details-item-modal-form"
            onSubmit={(e) => void saveSectionItem(itemModalSection, e)}
            className="space-y-4"
          >
            {SECTION_FIELDS[itemModalSection].map((field) => {
              const form = formBySection[itemModalSection];
              const section = itemModalSection;
              return (
                <div key={field.key}>
                  <label className={fieldLabel}>{field.label}</label>
                  {field.type === "textarea" ? (
                    section === "about" ||
                    section === "curriculum" ||
                    section === "placement-support" ||
                    section === "corporate-training" ? (
                      <TipTapEditor
                        value={String(form[field.key] ?? "")}
                        onChange={(val: string) =>
                          setFormBySection((prev) => ({
                            ...prev,
                            [section]: {
                              ...prev[section],
                              [field.key]: val,
                            },
                          }))
                        }
                        scrollContent
                        contentMaxHeightClassName="max-h-[460px]"
                      />
                    ) : (
                      <textarea
                        className={textareaClass}
                        rows={8}
                        value={String(form[field.key] ?? "")}
                        onChange={(e) =>
                          setFormBySection((prev) => ({
                            ...prev,
                            [section]: {
                              ...prev[section],
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                      />
                    )
                  ) : field.type === "checkbox" ? (
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(form[field.key])}
                        onChange={(e) =>
                          setFormBySection((prev) => ({
                            ...prev,
                            [section]: {
                              ...prev[section],
                              [field.key]: e.target.checked,
                            },
                          }))
                        }
                      />
                      Mark as limited
                    </label>
                  ) : (
                    <input
                      type={field.type === "date" ? "date" : "text"}
                      className={inputClass}
                      value={String(form[field.key] ?? "")}
                      onChange={(e) =>
                        setFormBySection((prev) => ({
                          ...prev,
                          [section]: {
                            ...prev[section],
                            [field.key]: e.target.value,
                          },
                        }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </form>
        </AdminModal>
      ) : null}

      <AdminConfirmDialog
        open={deleteConfirm != null}
        title="Delete item?"
        message={
          deleteConfirm ? (
            <>
              Delete <span className="font-semibold text-slate-900">{deleteConfirm.label}</span>{" "}
              permanently? This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => void confirmDelete()}
      />

      {/* Course preview panel removed intentionally. */}
    </HomeEditorShell>
  );
}
