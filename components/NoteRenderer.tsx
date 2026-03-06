"use client";

interface NoteRendererProps {
  content: string;
  className?: string;
}

function stripHtmlTags(str: string): string {
  // Remove complete tags, then remove any leftover < or > to neutralize malformed/incomplete tags
  return str
    .replace(/<[^>]+>/g, "")   // remove complete tags
    .replace(/<[^>]*$/g, "")   // remove incomplete tag at end of string
    .replace(/</g, "&lt;")     // escape any remaining < (e.g., inside attributes with > in value)
    .replace(/>/g, "&gt;");    // escape any remaining >
}

function markdownToHtml(raw: string): string {
  // Strip any HTML tags first to prevent XSS
  const safe = stripHtmlTags(raw);

  const lines = safe.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("- ")) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      const itemContent = inlineMarkdown(line.slice(2));
      result.push(`<li>${itemContent}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (line.trim() === "") {
        result.push("<br/>");
      } else {
        result.push(`<p>${inlineMarkdown(line)}</p>`);
      }
    }
  }

  if (inList) {
    result.push("</ul>");
  }

  return result.join("");
}

function inlineMarkdown(text: string): string {
  // Bold: **text**
  let out = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text* (not preceded/followed by *)
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  return out;
}

export default function NoteRenderer({ content, className }: NoteRendererProps) {
  if (!content) return null;

  const html = markdownToHtml(content);

  return (
    <div
      className={[
        "prose prose-sm prose-stone max-w-none",
        "prose-p:my-0.5 prose-ul:my-1 prose-li:my-0",
        "text-stone-600 text-sm sm:text-base leading-relaxed",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5",
        "[&_strong]:font-semibold [&_strong]:text-stone-800",
        "[&_em]:italic [&_em]:text-stone-600",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
