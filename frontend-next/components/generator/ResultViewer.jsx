"use client";

import { Children, isValidElement, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ResultViewer({ markdown, title = "Dokumen AI" }) {
  const [activeTab, setActiveTab] = useState("preview");
  const [copiedBlock, setCopiedBlock] = useState("");
  const [copiedRaw, setCopiedRaw] = useState(false);

  const normalizedMarkdown = typeof markdown === "string" ? markdown.trim() : "";
  const headings = useMemo(() => extractHeadings(normalizedMarkdown), [normalizedMarkdown]);
  const headingsByOffset = useMemo(
    () => new Map(headings.map((heading) => [heading.offset, heading.id])),
    [headings],
  );

  async function handleCopyRaw() {
    if (!normalizedMarkdown) {
      return;
    }

    await navigator.clipboard.writeText(normalizedMarkdown);
    setCopiedRaw(true);
    window.setTimeout(() => setCopiedRaw(false), 1800);
  }

  async function handleCopyBlock(key, content) {
    if (!content) {
      return;
    }

    await navigator.clipboard.writeText(content);
    setCopiedBlock(key);
    window.setTimeout(() => {
      setCopiedBlock((current) => (current === key ? "" : current));
    }, 1800);
  }

  if (!normalizedMarkdown) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">
            Dokumen kosong
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">
            Markdown belum tersedia
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Hasil generate belum memiliki isi markdown yang dapat ditampilkan. Coba muat ulang detail hasil atau generate ulang dokumen ini.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">
              Workspace Dokumen
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentButton
              isActive={activeTab === "preview"}
              onClick={() => setActiveTab("preview")}
            >
              Preview
            </SegmentButton>
            <SegmentButton
              isActive={activeTab === "raw"}
              onClick={() => setActiveTab("raw")}
            >
              Raw Markdown
            </SegmentButton>
            {activeTab === "raw" ? (
              <button
                type="button"
                onClick={handleCopyRaw}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {copiedRaw ? "Markdown tersalin" : "Copy Raw"}
              </button>
            ) : null}
          </div>
        </div>

        {activeTab === "preview" ? (
          <div className="px-6 py-6 sm:px-8 lg:px-10 lg:py-8">
            {headings.length > 0 ? (
              <div className="mb-6 xl:hidden">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
                  <div className="mb-3 border-b border-slate-100 pb-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Navigasi Cepat
                    </span>
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      Outline Dokumen
                    </h3>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto pr-2 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
                    <nav className="grid gap-2">
                      {headings.map((heading, index) => (
                        <button
                          key={`${heading.id}-${index}`}
                          type="button"
                          onClick={() => {
                            const target = document.getElementById(heading.id);

                            if (target) {
                              target.scrollIntoView({ behavior: "smooth", block: "start" });
                              window.history.replaceState(null, "", `#${heading.id}`);
                            }
                          }}
                          className={`block truncate rounded-2xl px-3 py-2 text-left text-xs transition hover:bg-slate-50 hover:text-slate-950 ${
                            heading.level === 1
                              ? "font-semibold text-slate-800"
                              : heading.level === 2
                                ? "pl-4 text-slate-700"
                                : "pl-6 text-slate-500"
                          }`}
                          title={heading.text}
                        >
                          {heading.text}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            ) : null}
            <article className="document-prose mx-auto max-w-4xl">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children, node }) => {
                    const headingId = headingsByOffset.get(node?.position?.start?.offset);
                    return <Heading id={headingId} level={1}>{children}</Heading>;
                  },
                  h2: ({ children, node }) => {
                    const headingId = headingsByOffset.get(node?.position?.start?.offset);
                    return <Heading id={headingId} level={2}>{children}</Heading>;
                  },
                  h3: ({ children, node }) => {
                    const headingId = headingsByOffset.get(node?.position?.start?.offset);
                    return <Heading id={headingId} level={3}>{children}</Heading>;
                  },
                  h4: ({ children, node }) => {
                    const headingId = headingsByOffset.get(node?.position?.start?.offset);
                    return <Heading id={headingId} level={4}>{children}</Heading>;
                  },
                  p: ({ children }) => (
                    <p className="text-[15px] leading-8 text-slate-700 sm:text-base">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc space-y-2 pl-6 text-[15px] leading-8 text-slate-700 sm:text-base">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal space-y-2 pl-6 text-[15px] leading-8 text-slate-700 sm:text-base">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="rounded-r-2xl border-l-4 border-sky-300 bg-sky-50/70 px-5 py-4 italic text-slate-600">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-10 border-slate-200" />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full border-collapse bg-white text-sm">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-slate-50 text-slate-900">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border-b border-slate-200 px-4 py-3 align-top text-sm text-slate-700">
                      {children}
                    </td>
                  ),
                  pre: ({ children }) => {
                    const parsedBlock = parsePreBlock(children);

                    if (parsedBlock) {
                      const blockKey = `${parsedBlock.className || "code"}-${parsedBlock.code.slice(0, 40)}`;

                      return (
                        <CodeBlock
                          blockKey={blockKey}
                          className={parsedBlock.className}
                          copiedBlock={copiedBlock}
                          code={parsedBlock.code}
                          onCopy={handleCopyBlock}
                        />
                      );
                    }

                    return (
                      <pre className="my-6 overflow-x-auto rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-800">
                        {children}
                      </pre>
                    );
                  },
                  code: ({ children, ...props }) => (
                    <code
                      className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-900"
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                }}
              >
                {normalizedMarkdown}
              </ReactMarkdown>
            </article>
          </div>
        ) : (
          <div className="px-6 py-6 sm:px-8 lg:px-10 lg:py-8">
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-inner shadow-slate-900/20">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>Raw Markdown</span>
                <span>{normalizedMarkdown.length} chars</span>
              </div>
              <pre className="max-h-[70vh] overflow-auto px-4 py-5 text-sm leading-7 text-slate-100">
                <code>{normalizedMarkdown}</code>
              </pre>
            </div>
          </div>
        )}
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-28 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              Navigasi
            </p>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">
              Section Outline
            </h3>
          </div>
          {headings.length > 0 ? (
            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-2 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
              <nav className="grid gap-2">
                {headings.map((heading, index) => (
                  <a
                    key={`${heading.id}-${index}`}
                    href={`#${heading.id}`}
                    className={`block truncate rounded-2xl px-3 py-2 text-xs transition hover:bg-slate-50 hover:text-slate-950 ${
                      heading.level === 1
                        ? "font-semibold text-slate-800"
                        : heading.level === 2
                          ? "pl-4 text-slate-700"
                          : "pl-6 text-slate-500"
                    }`}
                    title={heading.text}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Outline akan muncul otomatis jika markdown memiliki heading yang terstruktur.
            </p>
          )}
        </div>
      </aside>
    </section>
  );
}

function SegmentButton({ children, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-slate-950 text-white shadow-sm shadow-slate-900/15"
          : "border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

function Heading({ children, id, level }) {
  const text = flattenChildren(children);
  const resolvedId = id || slugify(text);

  const className =
    level === 1
      ? "mt-10 scroll-mt-28 text-3xl font-semibold tracking-tight text-slate-950 first:mt-0"
      : level === 2
        ? "mt-12 scroll-mt-28 border-b border-slate-200 pb-3 text-2xl font-semibold tracking-tight text-slate-900"
        : level === 3
          ? "mt-10 scroll-mt-28 text-xl font-semibold text-slate-900"
          : "mt-8 scroll-mt-28 text-lg font-semibold text-slate-800";

  const Tag = `h${level}`;
  return <Tag id={resolvedId} className={className}>{children}</Tag>;
}

function CodeBlock({ blockKey, className, code, copiedBlock, onCopy }) {
  const language = (className || "").replace("language-", "") || "text";
  const isCopied = copiedBlock === blockKey;

  return (
    <div className="my-6 overflow-hidden rounded-[1.25rem] border border-slate-800 bg-slate-950 shadow-lg shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          {language}
        </span>
        <button
          type="button"
          onClick={() => void onCopy(blockKey, code)}
          className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          {isCopied ? "Tersalin" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-5 text-sm leading-7 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function parsePreBlock(children) {
  const codeChild = Children.toArray(children).find((child) => isValidElement(child));

  if (!isValidElement(codeChild)) {
    return null;
  }

  const className = typeof codeChild.props.className === "string"
    ? codeChild.props.className
    : "";
  const code = flattenChildren(codeChild.props.children).replace(/\n$/, "");

  if (!code) {
    return null;
  }

  return {
    className,
    code,
  };
}

function extractHeadings(markdown) {
  if (!markdown) {
    return [];
  }

  const slugCounts = new Map();
  let offset = 0;

  return markdown
    .split("\n")
    .map((line, index) => {
      const lineOffset = offset;
      offset += line.length + (index < markdown.split("\n").length - 1 ? 1 : 0);

      const trimmedLine = line.trim();

      if (!/^#{1,4}\s+/.test(trimmedLine)) {
        return null;
      }

      const [, hashes, text] = trimmedLine.match(/^(#{1,4})\s+(.*)$/) || [];
      const normalizedText = text?.trim() ?? "";
      const baseSlug = slugify(normalizedText) || `section-${index + 1}`;
      const nextCount = (slugCounts.get(baseSlug) || 0) + 1;
      slugCounts.set(baseSlug, nextCount);

      return {
        level: hashes?.length ?? 1,
        text: normalizedText,
        id: nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`,
        offset: lineOffset,
      };
    })
    .filter((item) => item?.text);
}

function flattenChildren(children) {
  if (typeof children === "string") {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map(flattenChildren).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    return flattenChildren(children.props.children);
  }

  return "";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
