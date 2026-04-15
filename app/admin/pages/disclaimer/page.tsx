import MultiSectionCmsEditor from "@/components/admin/MultiSectionCmsEditor";

export default function AdminDisclaimerPage() {
  return (
    <MultiSectionCmsEditor
      title="Disclaimer Page"
      subtitle="Manage Disclaimer content shown on /disclaimer."
      sections={[
        {
          key: "disclaimer",
          title: "Disclaimer Content",
          endpoint: "/api/legal/disclaimer/",
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
