"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import { Extension } from "@tiptap/core";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

interface TipTapEditorProps {
  content?: string;
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const CLOUD_NAME = "dhy0krkef";
const UPLOAD_PRESET = "preptara";
const FONT_FAMILY = "Poppins";
const DEFAULT_FONT_SIZE = "16px";

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      listStyleType: {
        default: "disc",
        parseHTML: (element: HTMLElement) => element.style.listStyleType || "disc",
        renderHTML: (attributes: { listStyleType?: string }) => ({
          style: `list-style-type: ${attributes.listStyleType || "disc"};`,
        }),
      },
    };
  },
});

const StyledOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      listStyleType: {
        default: "decimal",
        parseHTML: (element: HTMLElement) => element.style.listStyleType || "decimal",
        renderHTML: (attributes: { listStyleType?: string }) => ({
          style: `list-style-type: ${attributes.listStyleType || "decimal"};`,
        }),
      },
    };
  },
});

export default function TipTapEditor({
  content = "",
  value = "",
  onChange = () => {},
  placeholder = "Start typing...",
  className = "",
}: TipTapEditorProps) {
  const htmlFromProps = value ?? content;
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showBulletMenu, setShowBulletMenu] = useState(false);
  const [showOrderedMenu, setShowOrderedMenu] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState(DEFAULT_FONT_SIZE);
  const [currentHeading, setCurrentHeading] = useState("paragraph");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);

  const syncToolbarState = (currentEditor: { getAttributes: (name: string) => Record<string, unknown>; isActive: (name: string, attrs?: Record<string, unknown>) => boolean; } | null) => {
    if (!currentEditor) return;
    const size = (currentEditor.getAttributes("textStyle").fontSize as string) || DEFAULT_FONT_SIZE;
    setCurrentFontSize(size);
    if (currentEditor.isActive("heading", { level: 1 })) setCurrentHeading("h1");
    else if (currentEditor.isActive("heading", { level: 2 })) setCurrentHeading("h2");
    else if (currentEditor.isActive("heading", { level: 3 })) setCurrentHeading("h3");
    else setCurrentHeading("paragraph");
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
      }),
      Subscript,
      Superscript,
      Highlight.configure({ multicolor: true }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      FontFamily,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Color,
      TextStyle,
      StyledBulletList,
      StyledOrderedList,
      Placeholder.configure({ placeholder }),
      FontSize,
    ],
    content: htmlFromProps || "",
    // editorProps: {
    //   attributes: {
    //     class:
    //       "min-h-[260px] p-4 prose prose-slate max-w-none focus:outline-none",
    //     style: `font-family: ${FONT_FAMILY}, sans-serif;`,
    //   },
    // },

    editorProps: {
      attributes: {
        class:
          "min-h-[260px] prose prose-slate max-w-none focus:outline-none",
        style: `
          font-family: ${FONT_FAMILY}, sans-serif;
          padding: 24px 40px;
        `,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      syncToolbarState(currentEditor);
      onChange(currentEditor.getHTML());
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      syncToolbarState(currentEditor);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== (htmlFromProps || "")) {
      editor.commands.setContent(htmlFromProps || "");
    }
    editor.commands.setFontFamily(FONT_FAMILY);
    if (!editor.getAttributes("textStyle").fontSize) {
      editor.chain().setMark("textStyle", { fontSize: DEFAULT_FONT_SIZE }).run();
    }
    syncToolbarState(editor);
  }, [editor, htmlFromProps]);

  async function uploadImageToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Image upload failed");
    }

    const json = (await res.json()) as { secure_url?: string };
    if (!json.secure_url) {
      throw new Error("Image URL missing from upload response");
    }
    return json.secure_url;
  }

  async function handleImageFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    if (!file.type.startsWith("image/")) return;

    setUploadingImage(true);
    try {
      const imageUrl = await uploadImageToCloudinary(file);
      editor.chain().focus().setImage({ src: imageUrl }).run();
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  if (!editor) {
    return <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-500">Loading editor...</div>;
  }

  const toolbarIconButton = (active = false) =>
    `inline-flex h-8 w-8 items-center justify-center rounded border text-slate-700 transition ${
      active
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-300 bg-white hover:bg-slate-100"
    }`;
  const menuItemClass =
    "block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100";

  const bulletStyles = [
    { label: "Disc", value: "disc" },
    { label: "Circle", value: "circle" },
    { label: "Square", value: "square" },
    { label: "Checkmark", value: '"✓ "' },
    { label: "Arrow", value: '"→ "' },
    { label: "Dash", value: '"— "' },
    { label: "Star", value: '"★ "' },
  ];

  const orderedStyles = [
    { label: "1,2,3 Decimal", value: "decimal" },
    { label: "a,b,c Lower Alpha", value: "lower-alpha" },
    { label: "A,B,C Upper Alpha", value: "upper-alpha" },
    { label: "i,ii,iii Lower Roman", value: "lower-roman" },
    { label: "I,II,III Upper Roman", value: "upper-roman" },
  ];

  const applyBulletStyle = (style: string) => {
    editor
      .chain()
      .focus()
      .toggleBulletList()
      .updateAttributes("bulletList", { listStyleType: style })
      .run();
    setShowBulletMenu(false);
  };

  const applyOrderedStyle = (style: string) => {
    editor
      .chain()
      .focus()
      .toggleOrderedList()
      .updateAttributes("orderedList", { listStyleType: style })
      .run();
    setShowOrderedMenu(false);
  };

  return (
    <div className={`rounded-md border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[#f8f8f8] p-2">
        <select
          className="h-8 rounded border border-slate-300 bg-white px-2 text-sm"
          value={FONT_FAMILY}
          onChange={() => editor.chain().focus().setFontFamily(FONT_FAMILY).run()}
        >
          <option value={FONT_FAMILY}>Poppins</option>
        </select>

        <select
          className="h-8 rounded border border-slate-300 bg-white px-2 text-sm"
          value={currentFontSize}
          onChange={(e) => editor.chain().focus().setMark("textStyle", { fontSize: e.target.value }).run()}
        >
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="28px">28</option>
          <option value="32px">32</option>
        </select>

        <select
          className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          value={currentHeading}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "paragraph") {
              editor.chain().focus().setParagraph().run();
              return;
            }
            editor.chain().focus().setHeading({ level: Number(val.slice(1)) as 1 | 2 | 3 }).run();
          }}
        >
          <option value="paragraph">Normal</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={toolbarIconButton(editor.isActive("bold"))}
          aria-label="Bold"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={toolbarIconButton(editor.isActive("italic"))}
          aria-label="Italic"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={toolbarIconButton(editor.isActive("underline"))}
          aria-label="Underline"
        >
          <UnderlineIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={toolbarIconButton(editor.isActive("strike"))}
          aria-label="Strikethrough"
        >
          <Strikethrough size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={toolbarIconButton(editor.isActive("subscript"))}
          aria-label="Subscript"
        >
          <SubscriptIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={toolbarIconButton(editor.isActive("superscript"))}
          aria-label="Superscript"
        >
          <SuperscriptIcon size={15} />
        </button>

        <span className="mx-1 h-6 w-px bg-slate-300" />

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={toolbarIconButton(editor.isActive({ textAlign: "left" }))}
          aria-label="Align left"
        >
          <AlignLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={toolbarIconButton(editor.isActive({ textAlign: "center" }))}
          aria-label="Align center"
        >
          <AlignCenter size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={toolbarIconButton(editor.isActive({ textAlign: "right" }))}
          aria-label="Align right"
        >
          <AlignRight size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={toolbarIconButton(editor.isActive({ textAlign: "justify" }))}
          aria-label="Align justify"
        >
          <AlignJustify size={15} />
        </button>

        <span className="mx-1 h-6 w-px bg-slate-300" />

        <div className="relative inline-flex rounded border border-slate-300 bg-white">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`inline-flex h-8 w-9 items-center justify-center transition ${
              editor.isActive("bulletList") ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
            aria-label="Bullet list"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowBulletMenu((v) => !v);
              setShowOrderedMenu(false);
            }}
            className="inline-flex h-8 w-7 items-center justify-center border-l border-slate-300 text-slate-700 hover:bg-slate-100"
            aria-label="Bullet list options"
          >
            <ChevronDown size={14} />
          </button>
          {showBulletMenu ? (
            <div className="absolute left-0 top-10 z-50 min-w-[190px] rounded-md border border-slate-200 bg-white shadow-xl">
              {bulletStyles.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={menuItemClass}
                  onClick={() => applyBulletStyle(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="relative inline-flex rounded border border-slate-300 bg-white">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`inline-flex h-8 w-9 items-center justify-center transition ${
              editor.isActive("orderedList") ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
            aria-label="Ordered list"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowOrderedMenu((v) => !v);
              setShowBulletMenu(false);
            }}
            className="inline-flex h-8 w-7 items-center justify-center border-l border-slate-300 text-slate-700 hover:bg-slate-100"
            aria-label="Ordered list options"
          >
            <ChevronDown size={14} />
          </button>
          {showOrderedMenu ? (
            <div className="absolute left-0 top-10 z-50 min-w-[190px] rounded-md border border-slate-200 bg-white shadow-xl">
              {orderedStyles.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={menuItemClass}
                  onClick={() => applyOrderedStyle(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={toolbarIconButton(editor.isActive("highlight"))}
          aria-label="Highlight"
        >
          <Highlighter size={15} />
        </button>
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          className={toolbarIconButton(false)}
          aria-label="Text color"
        >
          A
        </button>
        <input
          ref={colorInputRef}
          type="color"
          className="h-0 w-0 opacity-0"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />

        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          className={toolbarIconButton(false)}
          aria-label="Insert image"
        >
          <ImageIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => {
            const current = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("Enter URL", current || "https://");
            if (url === null) return;
            if (!url.trim()) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
          }}
          className={toolbarIconButton(editor.isActive("link"))}
          aria-label="Insert link"
        >
          <Link2 size={15} />
        </button>
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          className={toolbarIconButton(false)}
          aria-label="Insert table"
        >
          <Table2 size={15} />
        </button>

        <span className="mx-1 h-6 w-px bg-slate-300" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className={toolbarIconButton(false)}
          aria-label="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className={toolbarIconButton(false)}
          aria-label="Redo"
        >
          <Redo2 size={15} />
        </button>

        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFileSelect} className="hidden" />
      </div>
      <EditorContent editor={editor} className="[&_.ProseMirror]:min-h-[300px]" />
    </div>
  );
}
