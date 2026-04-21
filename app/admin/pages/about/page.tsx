import MultiSectionCmsEditor from "@/components/admin/MultiSectionCmsEditor";

export default function AdminAboutPage() {
  return (
    <MultiSectionCmsEditor
      title="About Page"
      subtitle="Manage all About page sections dynamically."
      sections={[
        {
          key: "seo",
          title: "SEO Section",
          endpoint: "/api/about/meta-tags/",
          mode: "singleton",
          fields: [
            { key: "meta_title", label: "Meta Title", required: true },
            { key: "meta_description", label: "Meta Description", type: "textarea", required: true },
            { key: "meta_keywords", label: "Meta Keywords (comma-separated)", required: true },
          ],
        },
        {
          key: "hero",
          title: "Hero Section",
          endpoint: "/api/about/hero/",
          mode: "singleton",
          fields: [
            { key: "heading", label: "Heading", required: true },
            { key: "paragraph_one", label: "Paragraph One", type: "textarea" },
            { key: "paragraph_two", label: "Paragraph Two", type: "textarea" },
            { key: "hero_image", label: "Hero Image", type: "file" },
          ],
        },
        {
          key: "values-section",
          title: "Values Section",
          endpoint: "/api/about/values-section/",
          mode: "singleton",
          fields: [
            { key: "heading", label: "Heading", required: true },
            { key: "subtitle", label: "Subtitle", type: "textarea" },
          ],
        },
        {
          key: "values",
          title: "Value Items",
          endpoint: "/api/about/values/",
          mode: "list",
          fields: [
            { key: "title", label: "Title", required: true },
            { key: "description", label: "Description", type: "textarea", required: true },
            { key: "order", label: "Order", type: "number" },
          ],
        },
        {
          key: "cta",
          title: "CTA Section",
          endpoint: "/api/about/cta/",
          mode: "singleton",
          fields: [
            { key: "heading", label: "Heading", required: true },
            { key: "subtitle", label: "Subtitle", type: "textarea" },
            { key: "primary_button_text", label: "Primary Button Text" },
            { key: "primary_button_link", label: "Primary Button Link", type: "url" },
            { key: "secondary_button_text", label: "Secondary Button Text" },
            { key: "secondary_button_link", label: "Secondary Button Link", type: "url" },
          ],
        },
        {
          key: "demo",
          title: "Demo Section",
          endpoint: "/api/about/demo/",
          mode: "singleton",
          fields: [
            { key: "heading", label: "Heading", required: true },
            { key: "features", label: "Features", type: "string_list" },
            { key: "form_title", label: "Form Title" },
            { key: "form_subtitle", label: "Form Subtitle" },
            { key: "courses", label: "Courses", type: "string_list" },
            { key: "submit_button_text", label: "Submit Button Text" },
          ],
        },
      ]}
    />
  );
}
