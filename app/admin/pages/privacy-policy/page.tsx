import MultiSectionCmsEditor from "@/components/admin/MultiSectionCmsEditor";

export default function AdminPrivacyPolicyPage() {
  return (
    <MultiSectionCmsEditor
      title="Privacy Policy Page"
      subtitle="Manage Privacy Policy content shown on /privacy."
      sections={[
        {
          key: "privacy",
          title: "Privacy Policy Content",
          endpoint: "/api/legal/privacy/",
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

