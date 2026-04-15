import MultiSectionCmsEditor from "@/components/admin/MultiSectionCmsEditor";

export default function AdminEditorialPolicyPage() {
  return (
    <MultiSectionCmsEditor
      title="Editorial Policy Page"
      subtitle="Manage Editorial Policy content shown on /editorial-policy."
      sections={[
        {
          key: "editorial-policy",
          title: "Editorial Policy Content",
          endpoint: "/api/legal/editorial-policy/",
          mode: "singleton",
          fields: [
            { key: "title", label: "Page Title", required: true },
            { key: "content", label: "Page Content", type: "richtext", required: true },
            { key: "seo_meta_title", label: "SEO Meta Title" },
            { key: "seo_meta_description", label: "SEO Meta Description", type: "textarea" },
            { key: "seo_meta_keywords", label: "SEO Meta Keywords (comma-separated)" },
          ],
        },
      ]}
    />
  );
}
