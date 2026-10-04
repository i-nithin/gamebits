"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  CodeIcon,
  FilmIcon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  Redo2Icon,
  StrikethroughIcon,
  TextQuoteIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ACCEPTED_CLIP_TYPES, ACCEPTED_IMAGE_TYPES, DESCRIPTION_HTML_MAX } from "@/lib/constants";
import { uploadClip, uploadImage } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

const RICH_TAG = /<\/?[a-z][\s\S]*>/i;

const Clip = Node.create({
  name: "clip",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "video[src]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "true",
        playsinline: "true",
        preload: "metadata",
      }),
    ];
  },
});

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toEditorHtml(value: string) {
  if (!value) return "";
  if (RICH_TAG.test(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function ToolbarButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn("text-fog", pressed && "bg-slate text-paper-white")}
    >
      {children}
    </Button>
  );
}

export function DescriptionEditor({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
}) {
  const emitted = useRef<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const clipRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"image" | "clip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noreferrer noopener", target: "_blank" },
        },
      }),
      Image.configure({ allowBase64: false }),
      Clip,
      Placeholder.configure({ placeholder: "What should players know?" }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Description",
        class: "game-description min-h-40 px-3 py-2 outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      emitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (emitted.current === value) return;
    const next = toEditorHtml(value);
    if (editor.getHTML() === next) {
      emitted.current = value;
      return;
    }
    editor.commands.setContent(next, { emitUpdate: false });
    emitted.current = value;
  }, [editor, value]);

  async function addImage(file: File) {
    setError(null);
    setUploading("image");
    try {
      const src = await uploadImage(file, "media");
      editor?.chain().focus().setImage({ src, alt: "" }).run();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploading(null);
    }
  }

  async function addClip(file: File) {
    setError(null);
    setUploading("clip");
    try {
      const src = await uploadClip(file);
      editor?.chain().focus().insertContent({ type: "clip", attrs: { src } }).run();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload clip");
    } finally {
      setUploading(null);
    }
  }

  function applyLink() {
    if (!editor) return;
    const previous = String(editor.getAttributes("link").href ?? "");
    const next = window.prompt("Link URL", previous || "https://");
    if (next === null) return;
    const url = next.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^https:\/\//i.test(url)) {
      setError("Links must start with https://");
      return;
    }
    setError(null);
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-iron bg-graphite">
      <div className="flex flex-wrap gap-0.5 border-b border-iron p-1">
        <ToolbarButton
          label="Undo"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2Icon />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2Icon />
        </ToolbarButton>
        <ToolbarButton
          label="Heading"
          pressed={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2Icon />
        </ToolbarButton>
        <ToolbarButton
          label="Subheading"
          pressed={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3Icon />
        </ToolbarButton>
        <ToolbarButton
          label="Bold"
          pressed={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          pressed={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          pressed={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          pressed={editor?.isActive("strike")}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <StrikethroughIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          pressed={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          pressed={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          pressed={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <TextQuoteIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Code"
          pressed={editor?.isActive("code") || editor?.isActive("codeBlock")}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <CodeIcon />
        </ToolbarButton>
        <ToolbarButton label="Link" pressed={editor?.isActive("link")} onClick={applyLink}>
          <LinkIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Image"
          disabled={uploading !== null}
          onClick={() => imageRef.current?.click()}
        >
          <ImageIcon />
        </ToolbarButton>
        <ToolbarButton
          label="Video"
          disabled={uploading !== null}
          onClick={() => clipRef.current?.click()}
        >
          <FilmIcon />
        </ToolbarButton>
      </div>
      {editor ? <EditorContent editor={editor} /> : <div className="min-h-40" />}
      {uploading ? (
        <p className="px-3 pb-2 text-xs text-fog">
          {uploading === "clip" ? "Uploading clip…" : "Uploading image…"}
        </p>
      ) : null}
      {error ? <p className="px-3 pb-2 text-xs text-destructive">{error}</p> : null}
      <input
        ref={imageRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void addImage(file);
        }}
      />
      <input
        ref={clipRef}
        type="file"
        accept={ACCEPTED_CLIP_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void addClip(file);
        }}
      />
      <input type="hidden" name="description" value={value} maxLength={DESCRIPTION_HTML_MAX} />
    </div>
  );
}
