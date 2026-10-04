import sanitizeHtml from "sanitize-html";

import { DESCRIPTION_HTML_MAX } from "@/lib/constants";
import { isAllowedClipUrl, isR2PublicUrl } from "@/lib/urls";

const RICH_TAG = /<\/?[a-z][\s\S]*>/i;

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
  "img",
  "video",
];

export function isRichDescription(value: string) {
  return RICH_TAG.test(value);
}

export function descriptionPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeStoredDescription(value: string) {
  if (!isRichDescription(value)) return value;
  return sanitizeGameDescription(value).html;
}

export function sanitizeGameDescription(raw: string): { html: string; error?: string } {
  const html = sanitizeHtml(raw.slice(0, DESCRIPTION_HTML_MAX * 2), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      video: ["src", "controls", "playsinline", "preload"],
    },
    allowedSchemes: ["https"],
    allowedSchemesByTag: {
      a: ["https"],
      img: ["https"],
      video: ["https"],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          href: attribs.href ?? "",
          rel: "noreferrer noopener",
          target: "_blank",
        },
      }),
      video: (_tagName, attribs) => ({
        tagName: "video",
        attribs: {
          src: attribs.src ?? "",
          controls: "controls",
          playsinline: "playsinline",
          preload: "metadata",
        },
      }),
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === "img") return !isR2PublicUrl(frame.attribs.src ?? "");
      if (frame.tag === "video") return !isAllowedClipUrl(frame.attribs.src ?? "");
      if (frame.tag === "a" && !frame.attribs.href) return "excludeTag";
      return false;
    },
  }).trim();

  if (html.length > DESCRIPTION_HTML_MAX) {
    return { html: "", error: "Description is too long" };
  }
  return { html };
}
