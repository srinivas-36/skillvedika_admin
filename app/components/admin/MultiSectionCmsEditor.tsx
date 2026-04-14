"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { authHeadersBearer, authHeadersJson, authHeadersMultipart, getAccessToken } from "@/lib/auth";
import { parseApiError } from "@/lib/cms-errors";
import { HomeEditorShell, EditorPanel, btnDanger, btnPrimary, fieldLabel, inputClass, textareaClass } from "@/components/admin/HomeEditorShell";
import TipTapEditor from "@/components/editor/TipTapEditor";

type FieldType = "text" | "textarea" | "richtext" | "url" | "number" | "json" | "file" | "string_list" | "feature_list" | "select";
type FieldDef = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
};
type SectionDef = {
  key: string;
  title: string;
  endpoint: string;
  mode: "singleton" | "list";
  fields: FieldDef[];
};

type Props = {
  title: string;
  subtitle: string;
  sections: SectionDef[];
};

type JsonRec = Record<string, unknown>;
type FormValue = string | File | null;
type FormState = Record<string, FormValue>;
type FeatureItem = { title: string; desc: string };
type ListSectionState = {
  items: JsonRec[];
  draft: FormState;
  editingId: number | null;
  editingForm: FormState;
};

function toStringValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v) || (v && typeof v === "object")) return JSON.stringify(v, null, 2);
  return "";
}

function emptyForm(fields: FieldDef[]): FormState {
  return fields.reduce<FormState>((acc, f) => {
    acc[f.key] = f.type === "file" ? null : "";
    return acc;
  }, {});
}

function formFromItem(fields: FieldDef[], item: JsonRec): FormState {
  const base = emptyForm(fields);
  for (const f of fields) {
    if (f.type === "file") {
      const direct = item?.[f.key];
      const viaUrl = item?.[`${f.key}_url`];
      base[f.key] =
        typeof viaUrl === "string"
          ? viaUrl
          : typeof direct === "string"
          ? direct
          : null;
      continue;
    }
    if (f.type === "string_list") {
      const arr = Array.isArray(item?.[f.key]) ? (item?.[f.key] as unknown[]) : [];
      base[f.key] = stringifyStringList(
        arr.map((x) => (typeof x === "string" ? x : "")).filter(Boolean)
      );
      continue;
    }
    if (f.type === "feature_list") {
      const arr = Array.isArray(item?.[f.key]) ? (item?.[f.key] as unknown[]) : [];
      base[f.key] = stringifyFeatureList(
        arr
          .map((x) => {
            if (!x || typeof x !== "object") return null;
            const o = x as { title?: unknown; desc?: unknown; text?: unknown };
            return {
              title: typeof o.title === "string" ? o.title : typeof o.text === "string" ? o.text : "",
              desc: typeof o.desc === "string" ? o.desc : "",
            };
          })
          .filter((x): x is FeatureItem => x != null)
      );
      continue;
    }
    base[f.key] = toStringValue(item?.[f.key]);
  }
  return base;
}

function parseStringList(raw: FormValue): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => (typeof x === "string" ? x : ""));
  } catch {
    return [];
  }
}

function stringifyStringList(list: string[]): string {
  return JSON.stringify(list, null, 2);
}

function parseFeatureList(raw: FormValue): FeatureItem[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const r = x as { title?: unknown; desc?: unknown; text?: unknown };
        return {
          title: typeof r.title === "string" ? r.title : typeof r.text === "string" ? r.text : "",
          desc: typeof r.desc === "string" ? r.desc : "",
        };
      })
      .filter((x): x is FeatureItem => x != null);
  } catch {
    return [];
  }
}

function stringifyFeatureList(list: FeatureItem[]): string {
  return JSON.stringify(
    list
      .map((x) => ({ title: x.title.trim(), desc: x.desc.trim() }))
      .filter((x) => x.title || x.desc),
    null,
    2
  );
}

export default function MultiSectionCmsEditor({ title, subtitle, sections }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [singletons, setSingletons] = useState<Record<string, { id: number | null; form: FormState }>>({});
  const [lists, setLists] = useState<Record<string, ListSectionState>>({});

  const singletonSections = useMemo(() => sections.filter((s) => s.mode === "singleton"), [sections]);
  const listSections = useMemo(() => sections.filter((s) => s.mode === "list"), [sections]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all(
        sections.map(async (section) => {
          const res = await fetch(apiUrl(section.endpoint), { cache: "no-store" });
          const json = await res.json().catch(() => (section.mode === "list" ? [] : {}));
          return { section, ok: res.ok, json };
        })
      );

      const nextSingletons: Record<string, { id: number | null; form: FormState }> = {};
      const nextLists: Record<string, ListSectionState> = {};

      for (const { section, json } of responses) {
        if (section.mode === "singleton") {
          const first = Array.isArray(json) ? (json[0] ?? null) : json;
          const id = first && typeof first.id === "number" ? first.id : null;
          const base = emptyForm(section.fields);
          for (const f of section.fields) {
            if (f.type === "file") {
              const direct = first?.[f.key];
              const viaUrl = first?.[`${f.key}_url`];
              base[f.key] =
                typeof viaUrl === "string"
                  ? viaUrl
                  : typeof direct === "string"
                  ? direct
                  : null;
              continue;
            }
            if (f.type === "string_list") {
              const arr = Array.isArray(first?.[f.key]) ? (first?.[f.key] as unknown[]) : [];
              base[f.key] = stringifyStringList(
                arr.map((x) => (typeof x === "string" ? x : "")).filter(Boolean)
              );
              continue;
            }
            if (f.type === "feature_list") {
              const arr = Array.isArray(first?.[f.key]) ? (first?.[f.key] as unknown[]) : [];
              base[f.key] = stringifyFeatureList(
                arr
                  .map((x) => {
                    if (!x || typeof x !== "object") return null;
                    const o = x as { title?: unknown; desc?: unknown; text?: unknown };
                    return {
                      title: typeof o.title === "string" ? o.title : typeof o.text === "string" ? o.text : "",
                      desc: typeof o.desc === "string" ? o.desc : "",
                    };
                  })
                  .filter((x): x is FeatureItem => x != null)
              );
              continue;
            }
            base[f.key] = toStringValue(first?.[f.key]);
          }
          nextSingletons[section.key] = { id, form: base };
        } else {
          nextLists[section.key] = {
            items: Array.isArray(json) ? (json as JsonRec[]) : [],
            draft: emptyForm(section.fields),
            editingId: null,
            editingForm: emptyForm(section.fields),
          };
        }
      }

      setSingletons(nextSingletons);
      setLists(nextLists);
    } catch {
      setError("Could not load CMS sections.");
    } finally {
      setLoading(false);
    }
  }, [sections]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/admin");
      return;
    }
    void load();
  }, [load, router]);

  function parsePayload(form: FormState, fields: FieldDef[]) {
    const jsonPayload: Record<string, unknown> = {};
    const fd = new FormData();
    let hasFile = false;

    for (const f of fields) {
      const raw = form[f.key];
      if (f.type === "file") {
        if (raw instanceof File) {
          hasFile = true;
          fd.append(f.key, raw);
        }
        continue;
      }
      const v = typeof raw === "string" ? raw.trim() : "";
      if (f.type === "string_list") {
        const parsed = parseStringList(raw).map((x) => x.trim()).filter(Boolean);
        if (f.required && parsed.length === 0) throw new Error(`${f.label} is required.`);
        jsonPayload[f.key] = parsed;
        fd.append(f.key, JSON.stringify(parsed));
        continue;
      }
      if (f.type === "feature_list") {
        const parsed = parseFeatureList(raw)
          .map((x) => ({ title: x.title.trim(), desc: x.desc.trim() }))
          .filter((x) => x.title || x.desc);
        if (f.required && parsed.length === 0) throw new Error(`${f.label} is required.`);
        jsonPayload[f.key] = parsed;
        fd.append(f.key, JSON.stringify(parsed));
        continue;
      }

      if (f.required && !v) throw new Error(`${f.label} is required.`);

      // For most Django string fields (CharField/TextField), empty should be "" (not null).
      // Sending null commonly triggers DRF "This field may not be null." (400).
      if (!v) {
        if (f.type === "number" || f.type === "json") {
          jsonPayload[f.key] = null;
        } else {
          jsonPayload[f.key] = "";
        }
        fd.append(f.key, "");
      } else if (f.type === "number") {
        jsonPayload[f.key] = Number(v);
        fd.append(f.key, v);
      } else if (f.type === "json") {
        const parsed = JSON.parse(v);
        jsonPayload[f.key] = parsed;
        fd.append(f.key, JSON.stringify(parsed));
      } else {
        jsonPayload[f.key] = v;
        fd.append(f.key, v);
      }
    }
    return { hasFile, jsonPayload, formData: fd };
  }

  async function saveSingleton(section: SectionDef) {
    const state = singletons[section.key];
    if (!state) return;
    setSavingKey(section.key);
    setError(null);
    setMessage(null);
    try {
      const { hasFile, jsonPayload, formData } = parsePayload(state.form, section.fields);
      const url = `${section.endpoint}${state.id ? `${state.id}/` : ""}`;
      const res = await fetch(apiUrl(url), {
        method: state.id ? "PUT" : "POST",
        headers: hasFile ? authHeadersMultipart() : authHeadersJson(),
        body: hasFile ? formData : JSON.stringify(jsonPayload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(parseApiError(errBody));
        return;
      }
      await load();
      setMessage(`${section.title} saved successfully.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingKey(null);
    }
  }

  async function addListItem(section: SectionDef) {
    const state = lists[section.key];
    if (!state) return;
    setSavingKey(`${section.key}-add`);
    setError(null);
    setMessage(null);
    try {
      const { hasFile, jsonPayload, formData } = parsePayload(state.draft, section.fields);
      const res = await fetch(apiUrl(section.endpoint), {
        method: "POST",
        headers: hasFile ? authHeadersMultipart() : authHeadersJson(),
        body: hasFile ? formData : JSON.stringify(jsonPayload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(parseApiError(errBody));
        return;
      }
      await load();
      setMessage(`${section.title} item added.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed.");
    } finally {
      setSavingKey(null);
    }
  }

  async function deleteListItem(section: SectionDef, id?: unknown) {
    if (typeof id !== "number") return;
    setSavingKey(`${section.key}-delete-${id}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`${section.endpoint}${id}/`), {
        method: "DELETE",
        headers: authHeadersBearer(),
      });
      if (!res.ok) {
        setError("Delete failed.");
        return;
      }
      await load();
      setMessage(`${section.title} item deleted.`);
    } finally {
      setSavingKey(null);
    }
  }

  function startEditListItem(section: SectionDef, item: JsonRec) {
    if (typeof item.id !== "number") return;
    setError(null);
    setMessage(null);
    setLists((prev) => ({
      ...prev,
      [section.key]: {
        ...prev[section.key],
        editingId: item.id as number,
        editingForm: formFromItem(section.fields, item),
      },
    }));
  }

  function cancelEditListItem(section: SectionDef) {
    setLists((prev) => ({
      ...prev,
      [section.key]: {
        ...prev[section.key],
        editingId: null,
        editingForm: emptyForm(section.fields),
      },
    }));
  }

  async function saveEditListItem(section: SectionDef) {
    const state = lists[section.key];
    if (!state || state.editingId == null) return;
    setSavingKey(`${section.key}-edit-${state.editingId}`);
    setError(null);
    setMessage(null);
    try {
      const { hasFile, jsonPayload, formData } = parsePayload(state.editingForm, section.fields);
      const res = await fetch(apiUrl(`${section.endpoint}${state.editingId}/`), {
        method: "PUT",
        headers: hasFile ? authHeadersMultipart() : authHeadersJson(),
        body: hasFile ? formData : JSON.stringify(jsonPayload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(parseApiError(errBody));
        return;
      }
      await load();
      setMessage(`${section.title} item updated.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <HomeEditorShell title={title} subtitle="Loading...">
        <p className="text-sm text-slate-500">Loading...</p>
      </HomeEditorShell>
    );
  }

  return (
    <HomeEditorShell title={title} subtitle={subtitle}>
      {message ? <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      {singletonSections.map((section) => {
        const state = singletons[section.key];
        if (!state) return null;
        return (
          <EditorPanel key={section.key} title={section.title}>
            <div className="space-y-4">
              {section.fields.map((f) => (
                <div key={f.key}>
                  <label className={fieldLabel}>{f.label}</label>
                  {f.type === "string_list" ? (
                    <div className="space-y-2">
                      {parseStringList(state.form[f.key]).map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            className={inputClass}
                            value={item}
                            onChange={(e) => {
                              const next = [...parseStringList(state.form[f.key])];
                              next[index] = e.target.value;
                              setSingletons((prev) => ({
                                ...prev,
                                [section.key]: {
                                  ...prev[section.key],
                                  form: { ...prev[section.key].form, [f.key]: stringifyStringList(next) },
                                },
                              }));
                            }}
                          />
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() => {
                              const next = parseStringList(state.form[f.key]).filter((_, i) => i !== index);
                              setSingletons((prev) => ({
                                ...prev,
                                [section.key]: {
                                  ...prev[section.key],
                                  form: { ...prev[section.key].form, [f.key]: stringifyStringList(next) },
                                },
                              }));
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => {
                          const next = [...parseStringList(state.form[f.key]), ""];
                          setSingletons((prev) => ({
                            ...prev,
                            [section.key]: {
                              ...prev[section.key],
                              form: { ...prev[section.key].form, [f.key]: stringifyStringList(next) },
                            },
                          }));
                        }}
                      >
                        Add point
                      </button>
                    </div>
                  ) : f.type === "feature_list" ? (
                    <div className="space-y-2">
                      {parseFeatureList(state.form[f.key]).map((item, index) => (
                        <div key={index} className="rounded-lg border border-slate-200 p-3 space-y-2">
                          <input
                            className={inputClass}
                            placeholder="Feature title"
                            value={item.title}
                            onChange={(e) => {
                              const next = [...parseFeatureList(state.form[f.key])];
                              next[index] = { ...next[index], title: e.target.value };
                              setSingletons((prev) => ({
                                ...prev,
                                [section.key]: {
                                  ...prev[section.key],
                                  form: { ...prev[section.key].form, [f.key]: stringifyFeatureList(next) },
                                },
                              }));
                            }}
                          />
                          <textarea
                            className={textareaClass}
                            rows={2}
                            placeholder="Feature description"
                            value={item.desc}
                            onChange={(e) => {
                              const next = [...parseFeatureList(state.form[f.key])];
                              next[index] = { ...next[index], desc: e.target.value };
                              setSingletons((prev) => ({
                                ...prev,
                                [section.key]: {
                                  ...prev[section.key],
                                  form: { ...prev[section.key].form, [f.key]: stringifyFeatureList(next) },
                                },
                              }));
                            }}
                          />
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() => {
                              const next = parseFeatureList(state.form[f.key]).filter((_, i) => i !== index);
                              setSingletons((prev) => ({
                                ...prev,
                                [section.key]: {
                                  ...prev[section.key],
                                  form: { ...prev[section.key].form, [f.key]: stringifyFeatureList(next) },
                                },
                              }));
                            }}
                          >
                            Remove feature
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => {
                          const next = [...parseFeatureList(state.form[f.key]), { title: "", desc: "" }];
                          setSingletons((prev) => ({
                            ...prev,
                            [section.key]: {
                              ...prev[section.key],
                              form: { ...prev[section.key].form, [f.key]: stringifyFeatureList(next) },
                            },
                          }));
                        }}
                      >
                        Add feature
                      </button>
                    </div>
                  ) : f.type === "richtext" ? (
                    <TipTapEditor
                      value={typeof state.form[f.key] === "string" ? (state.form[f.key] as string) : ""}
                      onChange={(html) =>
                        setSingletons((prev) => ({
                          ...prev,
                          [section.key]: {
                            ...prev[section.key],
                            form: { ...prev[section.key].form, [f.key]: html },
                          },
                        }))
                      }
                      placeholder={f.placeholder}
                    />
                  ) : f.type === "textarea" || f.type === "json" ? (
                    <textarea
                      className={textareaClass}
                      rows={f.type === "json" ? 6 : 4}
                      value={typeof state.form[f.key] === "string" ? (state.form[f.key] as string) : ""}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setSingletons((prev) => ({
                          ...prev,
                          [section.key]: {
                            ...prev[section.key],
                            form: { ...prev[section.key].form, [f.key]: e.target.value },
                          },
                        }))
                      }
                    />
                  ) : f.type === "file" ? (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:font-semibold file:text-white"
                        onChange={(e) =>
                          setSingletons((prev) => ({
                            ...prev,
                            [section.key]: {
                              ...prev[section.key],
                              form: { ...prev[section.key].form, [f.key]: e.target.files?.[0] ?? null },
                            },
                          }))
                        }
                      />
                      {typeof state.form[f.key] === "string" && (state.form[f.key] as string).trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={(state.form[f.key] as string).trim()}
                          alt={`${f.label} preview`}
                          className="h-24 w-auto rounded border border-slate-200 object-cover"
                        />
                      ) : null}
                    </div>
                  ) : f.type === "select" ? (
                    <select
                      className={inputClass}
                      value={typeof state.form[f.key] === "string" ? (state.form[f.key] as string) : ""}
                      onChange={(e) =>
                        setSingletons((prev) => ({
                          ...prev,
                          [section.key]: {
                            ...prev[section.key],
                            form: { ...prev[section.key].form, [f.key]: e.target.value },
                          },
                        }))
                      }
                    >
                      <option value="">Select</option>
                      {(f.options ?? []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                      className={inputClass}
                      value={typeof state.form[f.key] === "string" ? (state.form[f.key] as string) : ""}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setSingletons((prev) => ({
                          ...prev,
                          [section.key]: {
                            ...prev[section.key],
                            form: { ...prev[section.key].form, [f.key]: e.target.value },
                          },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
              <button type="button" className={btnPrimary} disabled={savingKey != null} onClick={() => saveSingleton(section)}>
                {savingKey === section.key ? "Saving..." : "Save section"}
              </button>
            </div>
          </EditorPanel>
        );
      })}

      {listSections.map((section) => {
        const state = lists[section.key];
        if (!state) return null;
        return (
          <EditorPanel key={section.key} title={section.title}>
            <div className="space-y-3">
              {state.items.map((item, idx) => (
                <div key={typeof item.id === "number" ? item.id : idx} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    {state.editingId === item.id ? (
                      <div className="min-w-0 flex-1 space-y-3">
                        {section.fields.map((f) => (
                          <div key={f.key}>
                            <label className={fieldLabel}>{f.label}</label>
                            {f.type === "richtext" ? (
                              <TipTapEditor
                                value={typeof state.editingForm[f.key] === "string" ? (state.editingForm[f.key] as string) : ""}
                                onChange={(html) =>
                                  setLists((prev) => ({
                                    ...prev,
                                    [section.key]: {
                                      ...prev[section.key],
                                      editingForm: { ...prev[section.key].editingForm, [f.key]: html },
                                    },
                                  }))
                                }
                                placeholder={f.placeholder}
                              />
                            ) : f.type === "textarea" || f.type === "json" ? (
                              <textarea
                                className={textareaClass}
                                rows={f.type === "json" ? 6 : 3}
                                value={typeof state.editingForm[f.key] === "string" ? (state.editingForm[f.key] as string) : ""}
                                placeholder={f.placeholder}
                                onChange={(e) =>
                                  setLists((prev) => ({
                                    ...prev,
                                    [section.key]: {
                                      ...prev[section.key],
                                      editingForm: { ...prev[section.key].editingForm, [f.key]: e.target.value },
                                    },
                                  }))
                                }
                              />
                            ) : f.type === "file" ? (
                              <div className="space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:font-semibold file:text-white"
                                  onChange={(e) =>
                                    setLists((prev) => ({
                                      ...prev,
                                      [section.key]: {
                                        ...prev[section.key],
                                        editingForm: {
                                          ...prev[section.key].editingForm,
                                          [f.key]: e.target.files?.[0] ?? null,
                                        },
                                      },
                                    }))
                                  }
                                />
                                {typeof state.editingForm[f.key] === "string" &&
                                (state.editingForm[f.key] as string).trim() ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={(state.editingForm[f.key] as string).trim()}
                                    alt={`${f.label} preview`}
                                    className="h-20 w-auto rounded border border-slate-200 object-cover"
                                  />
                                ) : null}
                              </div>
                            ) : f.type === "select" ? (
                              <select
                                className={inputClass}
                                value={typeof state.editingForm[f.key] === "string" ? (state.editingForm[f.key] as string) : ""}
                                onChange={(e) =>
                                  setLists((prev) => ({
                                    ...prev,
                                    [section.key]: {
                                      ...prev[section.key],
                                      editingForm: { ...prev[section.key].editingForm, [f.key]: e.target.value },
                                    },
                                  }))
                                }
                              >
                                <option value="">Select</option>
                                {(f.options ?? []).map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                                className={inputClass}
                                value={typeof state.editingForm[f.key] === "string" ? (state.editingForm[f.key] as string) : ""}
                                placeholder={f.placeholder}
                                onChange={(e) =>
                                  setLists((prev) => ({
                                    ...prev,
                                    [section.key]: {
                                      ...prev[section.key],
                                      editingForm: { ...prev[section.key].editingForm, [f.key]: e.target.value },
                                    },
                                  }))
                                }
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="min-w-0 text-sm text-slate-700">
                        {section.fields.map((f) => (
                          <p key={f.key} className="truncate">
                            <span className="font-semibold">{f.label}:</span> {toStringValue(item[f.key]) || "-"}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      {state.editingId === item.id ? (
                        <>
                          <button
                            type="button"
                            className={btnPrimary}
                            disabled={savingKey != null}
                            onClick={() => saveEditListItem(section)}
                          >
                            {savingKey === `${section.key}-edit-${item.id}` ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            className={btnDanger}
                            disabled={savingKey != null}
                            onClick={() => cancelEditListItem(section)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={btnPrimary}
                            disabled={savingKey != null}
                            onClick={() => startEditListItem(section, item)}
                          >
                            Edit
                          </button>
                          <button type="button" className={btnDanger} disabled={savingKey != null} onClick={() => deleteListItem(section, item.id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-700">Add New Item</p>
                <div className="space-y-3">
                  {section.fields.map((f) => (
                    <div key={f.key}>
                      <label className={fieldLabel}>{f.label}</label>
                      {f.type === "string_list" ? (
                        <div className="space-y-2">
                          {parseStringList(state.draft[f.key]).map((item, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                className={inputClass}
                                value={item}
                                onChange={(e) =>
                                  setLists((prev) => {
                                    const next = [...parseStringList(prev[section.key].draft[f.key])];
                                    next[index] = e.target.value;
                                    return {
                                      ...prev,
                                      [section.key]: {
                                        ...prev[section.key],
                                        draft: { ...prev[section.key].draft, [f.key]: stringifyStringList(next) },
                                      },
                                    };
                                  })
                                }
                              />
                              <button
                                type="button"
                                className={btnDanger}
                                onClick={() =>
                                  setLists((prev) => {
                                    const next = parseStringList(prev[section.key].draft[f.key]).filter((_, i) => i !== index);
                                    return {
                                      ...prev,
                                      [section.key]: {
                                        ...prev[section.key],
                                        draft: { ...prev[section.key].draft, [f.key]: stringifyStringList(next) },
                                      },
                                    };
                                  })
                                }
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className={btnPrimary}
                            onClick={() =>
                              setLists((prev) => {
                                const next = [...parseStringList(prev[section.key].draft[f.key]), ""];
                                return {
                                  ...prev,
                                  [section.key]: {
                                    ...prev[section.key],
                                    draft: { ...prev[section.key].draft, [f.key]: stringifyStringList(next) },
                                  },
                                };
                              })
                            }
                          >
                            Add point
                          </button>
                        </div>
                      ) : f.type === "feature_list" ? (
                        <div className="space-y-2">
                          {parseFeatureList(state.draft[f.key]).map((item, index) => (
                            <div key={index} className="rounded-lg border border-slate-200 p-3 space-y-2">
                              <input
                                className={inputClass}
                                placeholder="Feature title"
                                value={item.title}
                                onChange={(e) =>
                                  setLists((prev) => {
                                    const next = [...parseFeatureList(prev[section.key].draft[f.key])];
                                    next[index] = { ...next[index], title: e.target.value };
                                    return {
                                      ...prev,
                                      [section.key]: {
                                        ...prev[section.key],
                                        draft: { ...prev[section.key].draft, [f.key]: stringifyFeatureList(next) },
                                      },
                                    };
                                  })
                                }
                              />
                              <textarea
                                className={textareaClass}
                                rows={2}
                                placeholder="Feature description"
                                value={item.desc}
                                onChange={(e) =>
                                  setLists((prev) => {
                                    const next = [...parseFeatureList(prev[section.key].draft[f.key])];
                                    next[index] = { ...next[index], desc: e.target.value };
                                    return {
                                      ...prev,
                                      [section.key]: {
                                        ...prev[section.key],
                                        draft: { ...prev[section.key].draft, [f.key]: stringifyFeatureList(next) },
                                      },
                                    };
                                  })
                                }
                              />
                              <button
                                type="button"
                                className={btnDanger}
                                onClick={() =>
                                  setLists((prev) => {
                                    const next = parseFeatureList(prev[section.key].draft[f.key]).filter((_, i) => i !== index);
                                    return {
                                      ...prev,
                                      [section.key]: {
                                        ...prev[section.key],
                                        draft: { ...prev[section.key].draft, [f.key]: stringifyFeatureList(next) },
                                      },
                                    };
                                  })
                                }
                              >
                                Remove feature
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className={btnPrimary}
                            onClick={() =>
                              setLists((prev) => {
                                const next = [...parseFeatureList(prev[section.key].draft[f.key]), { title: "", desc: "" }];
                                return {
                                  ...prev,
                                  [section.key]: {
                                    ...prev[section.key],
                                    draft: { ...prev[section.key].draft, [f.key]: stringifyFeatureList(next) },
                                  },
                                };
                              })
                            }
                          >
                            Add feature
                          </button>
                        </div>
                      ) : f.type === "richtext" ? (
                        <TipTapEditor
                          value={typeof state.draft[f.key] === "string" ? (state.draft[f.key] as string) : ""}
                          onChange={(html) =>
                            setLists((prev) => ({
                              ...prev,
                              [section.key]: {
                                ...prev[section.key],
                                draft: { ...prev[section.key].draft, [f.key]: html },
                              },
                            }))
                          }
                          placeholder={f.placeholder}
                        />
                      ) : f.type === "textarea" || f.type === "json" ? (
                        <textarea
                          className={textareaClass}
                          rows={f.type === "json" ? 6 : 3}
                          value={typeof state.draft[f.key] === "string" ? (state.draft[f.key] as string) : ""}
                          placeholder={f.placeholder}
                          onChange={(e) =>
                            setLists((prev) => ({
                              ...prev,
                              [section.key]: {
                                ...prev[section.key],
                                draft: { ...prev[section.key].draft, [f.key]: e.target.value },
                              },
                            }))
                          }
                        />
                      ) : f.type === "file" ? (
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[var(--admin-accent)] file:px-3 file:py-2 file:font-semibold file:text-white"
                          onChange={(e) =>
                            setLists((prev) => ({
                              ...prev,
                              [section.key]: {
                                ...prev[section.key],
                                draft: { ...prev[section.key].draft, [f.key]: e.target.files?.[0] ?? null },
                              },
                            }))
                          }
                        />
                      ) : f.type === "select" ? (
                        <select
                          className={inputClass}
                          value={typeof state.draft[f.key] === "string" ? (state.draft[f.key] as string) : ""}
                          onChange={(e) =>
                            setLists((prev) => ({
                              ...prev,
                              [section.key]: {
                                ...prev[section.key],
                                draft: { ...prev[section.key].draft, [f.key]: e.target.value },
                              },
                            }))
                          }
                        >
                          <option value="">Select</option>
                          {(f.options ?? []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                          className={inputClass}
                          value={typeof state.draft[f.key] === "string" ? (state.draft[f.key] as string) : ""}
                          placeholder={f.placeholder}
                          onChange={(e) =>
                            setLists((prev) => ({
                              ...prev,
                              [section.key]: {
                                ...prev[section.key],
                                draft: { ...prev[section.key].draft, [f.key]: e.target.value },
                              },
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                  <button type="button" className={btnPrimary} disabled={savingKey != null} onClick={() => addListItem(section)}>
                    {savingKey === `${section.key}-add` ? "Adding..." : "Add item"}
                  </button>
                </div>
              </div>
            </div>
          </EditorPanel>
        );
      })}
    </HomeEditorShell>
  );
}

