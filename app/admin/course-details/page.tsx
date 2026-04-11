"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HomeEditorShell,
  EditorPanel,
  btnDanger,
  btnPrimary,
  btnSecondary,
  fieldLabel,
  inputClass,
  textareaClass,
} from "@/components/admin/HomeEditorShell";
import { apiUrl } from "@/lib/api";
import { authHeadersBearer, authHeadersJson, getAccessToken } from "@/lib/auth";
import { parseApiError } from "@/lib/cms-errors";

type Course = { id: number; title: string; slug: string };
type AnyObj = Record<string, unknown>;
type InputType = "text" | "textarea" | "date" | "checkbox";
type Category = { id: number; name: string };

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
};

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

type FieldDef = {
  key: string;
  label: string;
  type?: InputType;
};

const SECTION_FIELDS: Record<SectionName, FieldDef[]> = {
  about: [
    { key: "heading", label: "Section Heading" },
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
    { key: "heading", label: "Section Heading" },
    { key: "content", label: "Content", type: "textarea" },
  ],
  "corporate-training": [
    { key: "heading", label: "Section Heading" },
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
  });

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
    scrollToEl(`course-details-${section}`);
  }

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }

    async function init() {
      setLoading(true);
      try {
        const [coursesRes, categoriesRes] = await Promise.all([
          fetch(apiUrl("/api/courses/"), { cache: "no-store" }),
          fetch(apiUrl("/api/categories/"), { cache: "no-store" }),
        ]);
        if (!coursesRes.ok) throw new Error("courses load failed");
        const coursesData = (await coursesRes.json()) as Course[];
        const list = Array.isArray(coursesData) ? coursesData : [];
        setCourses(list);
        if (list[0]?.slug) setSelectedSlug(list[0].slug);

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
    if (!String(courseForm.duration ?? "").trim()) {
      setError("Duration is required.");
      return;
    }
    if (!String(courseForm.price ?? "").trim()) {
      setError("Price is required.");
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
          duration: courseForm.duration,
          price: courseForm.price,
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
      const coursesRes = await fetch(apiUrl("/api/courses/"), { cache: "no-store" });
      const coursesData = (await coursesRes.json().catch(() => [])) as Course[];
      const list = Array.isArray(coursesData) ? coursesData : [];
      setCourses(list);
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

  async function saveSectionItem(section: SectionName, e: React.FormEvent) {
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

    const activeFields = SECTION_FIELDS[section];
    const payload = activeFields.reduce<AnyObj>((acc, f) => {
      acc[f.key] = formBySection[section][f.key];
      return acc;
    }, {});

    for (const field of activeFields) {
      if (field.type === "checkbox") continue;
      const value = String(payload[field.key] ?? "").trim();
      if (!value) {
        setError(`${field.label} is required.`);
        return;
      }
    }

    try {
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
      await loadCourseDetails(selectedSlug);
    } catch {
      setError("Could not save section item.");
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
    scrollToEl(`course-details-${section}`);
  }

  async function handleDelete(section: SectionName, itemId: number) {
    setError(null);
    setMessage(null);
    if (!selectedSlug) return;
    try {
      const res = await fetch(
        apiUrl(`/api/course-details/course/${selectedSlug}/${section}/${itemId}/`),
        {
          method: "DELETE",
          headers: authHeadersBearer(),
        }
      );
      if (!res.ok) {
        setError("Could not delete item.");
        return;
      }
      if (editingBySection[section] === itemId) {
        setEditingBySection((prev) => ({ ...prev, [section]: null }));
        setFormBySection((prev) => ({ ...prev, [section]: emptyFormFor(section) }));
      }
      setMessage("Item deleted.");
      await loadCourseDetails(selectedSlug);
    } catch {
      setError("Could not delete item.");
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
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className={fieldLabel}>Course</label>
            <select className={inputClass} value={selectedSlug} onChange={(e) => setSelectedSlug(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.title} ({c.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
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
        </div>
      </EditorPanel>

      {showAddCourse ? (
        <EditorPanel title="Add Course">
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
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Price</label>
              <input
                className={inputClass}
                value={courseForm.price}
                onChange={(e) => setCourseForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="e.g. ₹299"
                required
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
          <div className="mt-4 flex gap-2">
            <button type="button" className={btnPrimary} onClick={() => void createCourse()}>
              Create Course
            </button>
            <button type="button" className={btnSecondary} onClick={() => setShowAddCourse(false)}>
              Cancel
            </button>
          </div>
        </EditorPanel>
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

      <EditorPanel title="Section Headings">
        <form onSubmit={(e) => void saveSectionHeadings(e)} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={fieldLabel}>About heading</label>
              <input className={inputClass} value={metaForm.about_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, about_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Skills heading</label>
              <input className={inputClass} value={metaForm.skills_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, skills_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Tools heading</label>
              <input className={inputClass} value={metaForm.tools_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, tools_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Curriculum heading</label>
              <input className={inputClass} value={metaForm.curriculum_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, curriculum_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Projects heading</label>
              <input className={inputClass} value={metaForm.projects_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, projects_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Salary heading</label>
              <input className={inputClass} value={metaForm.salary_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, salary_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Placement support heading</label>
              <input className={inputClass} value={metaForm.placement_support_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, placement_support_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Corporate training heading</label>
              <input className={inputClass} value={metaForm.corporate_training_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, corporate_training_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Trainers heading</label>
              <input className={inputClass} value={metaForm.trainers_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, trainers_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Batches heading</label>
              <input className={inputClass} value={metaForm.batches_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, batches_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>Blogs heading</label>
              <input className={inputClass} value={metaForm.blogs_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, blogs_heading: e.target.value }))} />
            </div>
            <div>
              <label className={fieldLabel}>FAQs heading</label>
              <input className={inputClass} value={metaForm.faqs_heading ?? ""} onChange={(e) => setMetaForm((p) => ({ ...p, faqs_heading: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className={btnPrimary}>
            Save Section Headings
          </button>
        </form>
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

          {SECTIONS.map((section) => {
            const fields = SECTION_FIELDS[section];
            const items = sections[section] ?? [];
            const editingId = editingBySection[section];
            const form = formBySection[section];

            return (
              <EditorPanel
                key={section}
                title={section.toUpperCase()}
              >
                <div id={`course-details-${section}`} />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </p>
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => beginAddForSection(section)}
                  >
                    Add {section}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {items.length === 0 ? (
                    <p className="text-sm text-[var(--admin-muted)]">
                      No items yet.
                    </p>
                  ) : (
                    items.map((item) => (
                      <div
                        key={`${section}:${String(item.id)}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              ID: {String(item.id ?? "—")}
                            </div>
                            <div className="mt-2 space-y-1">
                              {fields.map((f) => (
                                <div key={f.key} className="grid gap-2 sm:grid-cols-[180px_1fr]">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {f.label}
                                  </span>
                                  <span className="whitespace-pre-wrap break-words text-slate-800">
                                    {f.type === "checkbox"
                                      ? Boolean(item[f.key])
                                        ? "Yes"
                                        : "No"
                                      : String(item[f.key] ?? "—")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => startEdit(section, item)}
                              className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-[var(--admin-navy)] transition hover:bg-amber-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(section, Number(item.id))}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
                  <form onSubmit={(e) => void saveSectionItem(section, e)} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {editingId ? `Edit item #${editingId}` : "Add new item"}
                      </p>
                      {editingId ? (
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => {
                            setEditingBySection((prev) => ({ ...prev, [section]: null }));
                            setFormBySection((prev) => ({
                              ...prev,
                              [section]: emptyFormFor(section),
                            }));
                          }}
                        >
                          Cancel edit
                        </button>
                      ) : null}
                    </div>

                    {fields.map((field) => (
                      <div key={field.key}>
                        <label className={fieldLabel}>{field.label}</label>
                        {field.type === "textarea" ? (
                          <textarea
                            className={textareaClass}
                            rows={3}
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
                    ))}

                    <button type="submit" className={btnPrimary}>
                      {editingId ? "Save Changes" : "Save"}
                    </button>
                  </form>
                </div>
              </EditorPanel>
            );
          })}
        </div>
      </EditorPanel>

      <EditorPanel title="Course data preview">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Course ID</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{String(courseDetails?.id ?? "-")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Title</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{String(courseDetails?.title ?? "-")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Slug</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{String(courseDetails?.slug ?? "-")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Duration</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{String(courseDetails?.duration ?? "-")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Price</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{String(courseDetails?.price ?? "-")}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rating</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{String(courseDetails?.rating ?? "-")}</p>
          </div>
          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</p>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{String(courseDetails?.description ?? "-")}</p>
          </div>
        </div>
      </EditorPanel>
    </HomeEditorShell>
  );
}
