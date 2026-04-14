import MultiSectionCmsEditor from "@/components/admin/MultiSectionCmsEditor";

export default function AdminTermsConditionsPage() {
  return (
    <MultiSectionCmsEditor
      title="Terms & Conditions Page"
      subtitle="Manage Terms & Conditions content shown on /terms."
      sections={[
        {
          key: "terms",
          title: "Terms & Conditions Content",
          endpoint: "/api/legal/terms/",
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

