const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  slug: "Slug",
  title: "Title",
  description: "Description",
  email: "Email",
  password: "Password",
  username: "Username",
  category: "Category",
  duration: "Duration",
  price: "Price",
  rating: "Rating",
  icon: "Icon",
  content: "Content",
  author: "Author",
  excerpt: "Excerpt",
  image: "Image",
  first_name: "First name",
  last_name: "Last name",
  current_password: "Current password",
  new_password: "New password",
};

function humanizeField(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanMessage(msg: string, fieldLabel?: string): string {
  let text = msg.trim();
  if (!text) return "Please check the form and try again.";
  // DRF: "This field may not be blank."
  if (/this field may not be blank/i.test(text)) {
    return fieldLabel ? `${fieldLabel} is required.` : "This field is required.";
  }
  if (/this field is required/i.test(text)) {
    return fieldLabel ? `${fieldLabel} is required.` : "This field is required.";
  }
  if (/ensure this field has no more than/i.test(text)) {
    return fieldLabel ? `${fieldLabel}: ${text}` : text;
  }
  return fieldLabel ? `${fieldLabel}: ${text}` : text;
}

/** Turn DRF / API error payloads into a short user-facing message (never raw JSON). */
export function parseApiError(body: unknown): string {
  if (body == null) return "Request failed. Please try again.";
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return "Request failed. Please try again.";
    try {
      return parseApiError(JSON.parse(trimmed));
    } catch {
      // Avoid dumping JSON blobs into the UI
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return "Something went wrong. Please check the form and try again.";
      }
      return trimmed;
    }
  }
  if (typeof body !== "object") return "Request failed. Please try again.";

  const o = body as {
    detail?: unknown;
    non_field_errors?: unknown;
    message?: unknown;
    error?: unknown;
    [k: string]: unknown;
  };

  const d = o.detail;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (Array.isArray(d) && d[0] != null) return String(d[0]);

  if (Array.isArray(o.non_field_errors) && o.non_field_errors[0] != null) {
    return String(o.non_field_errors[0]);
  }
  if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
  if (typeof o.error === "string" && o.error.trim()) return o.error.trim();

  const messages: string[] = [];
  for (const [key, val] of Object.entries(o)) {
    if (key === "detail" || key === "non_field_errors" || key === "message" || key === "error") {
      continue;
    }
    const label = humanizeField(key);
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item != null && String(item).trim()) {
          messages.push(cleanMessage(String(item), label));
        }
      }
    } else if (typeof val === "string" && val.trim()) {
      messages.push(cleanMessage(val, label));
    } else if (val && typeof val === "object") {
      // Nested: { field: { nested: ["msg"] } }
      const nested = parseApiError(val);
      if (nested && nested !== "Request failed. Please try again.") {
        messages.push(nested);
      }
    }
  }

  if (messages.length === 1) return messages[0];
  if (messages.length > 1) return messages.join(" ");
  return "Something went wrong. Please check the form and try again.";
}

/** Parse an HTTP response body text into a friendly error string. */
export function parseApiErrorText(raw: string, status?: number): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) {
    return status ? `Request failed (${status}). Please try again.` : "Request failed. Please try again.";
  }
  return parseApiError(trimmed);
}
