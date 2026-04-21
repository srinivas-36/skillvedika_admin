import MultiSectionCmsEditor from "@/components/admin/MultiSectionCmsEditor";

export default function AdminContactPage() {
  return (
    <MultiSectionCmsEditor
      title="Contact Page"
      subtitle="Manage all Contact page sections dynamically."
      sections={[
        {
          key: "seo",
          title: "SEO Section",
          endpoint: "/api/contact/meta-tags/",
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
          endpoint: "/api/contact/hero/",
          mode: "singleton",
          fields: [
            { key: "title", label: "Title", required: true },
            { key: "subtitle", label: "Subtitle", type: "textarea", required: true },
            { key: "button_text", label: "Button Text", required: true },
            { key: "background_color", label: "Background Color (Hex)", placeholder: "#EAF2FC" },
            {
              key: "image",
              label: "Hero Image",
              type: "file"
            }

          ],
        },
        {
          key: "contact-info",
          title: "Contact Info Cards",
          endpoint: "/api/contact/info/",
          mode: "list",
          fields: [
            { key: "type", label: "Type (email/phone/address)", required: true },
            { key: "label", label: "Label", required: true },
            { key: "value", label: "Value", required: true },
            { key: "link", label: "Link (mailto/tel/url)" },
            {
              key: "map_embed_url",
              label: "Google Map URL (only for address card)",
              type: "textarea",
              placeholder: "https://www.google.com/maps/embed?... or share URL",
            },
          ],
        },
        {
          key: "demo",
          title: "Demo Section",
          endpoint: "/api/contact/demo/",
          mode: "singleton",
          fields: [
            { key: "title", label: "Title", required: true },
            { key: "subtitle", label: "Subtitle", type: "textarea" },
            { key: "points", label: "Points", type: "string_list" },
          ],
        },
        {
          key: "form",
          title: "Form Section",
          endpoint: "/api/contact/form/",
          mode: "singleton",
          fields: [
            { key: "title", label: "Form Title", required: true },
            { key: "subtitle", label: "Form Subtitle", type: "textarea" },
            { key: "button_text", label: "Button Text", required: true },
          ],
        },
      ]}
    />
  );
}
