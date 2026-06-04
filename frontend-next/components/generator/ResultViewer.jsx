"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useState } from "react";
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
  const getRenderContext = useMemo(
    () => createRenderContextResolver(headings),
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
                    const context = getRenderContext(node?.position?.start?.offset);
                    return <Heading id={headingId} level={3} context={context}>{children}</Heading>;
                  },
                  h4: ({ children, node }) => {
                    const headingId = headingsByOffset.get(node?.position?.start?.offset);
                    const context = getRenderContext(node?.position?.start?.offset);
                    return <Heading id={headingId} level={4} context={context}>{children}</Heading>;
                  },
                  p: ({ children, node }) => (
                    <Paragraph context={getRenderContext(node?.position?.start?.offset)}>{children}</Paragraph>
                  ),
                  ul: ({ children, node }) => (
                    <ul
                      className={
                        getRenderContext(node?.position?.start?.offset).isDataDictionary
                          ? "dictionary-list"
                          : "list-disc space-y-2 pl-6 text-[15px] leading-8 text-slate-700 sm:text-base"
                      }
                    >
                      {children}
                    </ul>
                  ),
                  ol: ({ children, node }) => (
                    <ol
                      className={
                        getRenderContext(node?.position?.start?.offset).isDataDictionary
                          ? "dictionary-list list-decimal"
                          : "list-decimal space-y-2 pl-6 text-[15px] leading-8 text-slate-700 sm:text-base"
                      }
                    >
                      {children}
                    </ol>
                  ),
                  li: ({ children, node }) => (
                    <ListItem context={getRenderContext(node?.position?.start?.offset)}>{children}</ListItem>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="rounded-r-2xl border-l-4 border-sky-300 bg-sky-50/70 px-5 py-4 italic text-slate-600">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-10 border-slate-200" />,
                  table: ({ children, node }) => {
                    const context = getRenderContext(node?.position?.start?.offset);
                    return (
                    <div
                      className={
                        context.isDataDictionary
                          ? "dictionary-table-shell"
                          : "overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
                      }
                    >
                      <table
                        className={
                          context.isDataDictionary
                            ? "dictionary-table min-w-full border-collapse text-[13px] sm:text-sm"
                            : "min-w-full border-collapse bg-white text-[13px] sm:text-sm"
                        }
                      >
                        {children}
                      </table>
                    </div>
                  )},
                  thead: ({ children }) => (
                    <thead className="bg-slate-950 text-slate-50">{children}</thead>
                  ),
                  th: ({ children, node }) => (
                    <th
                      className={
                        getRenderContext(node?.position?.start?.offset).isDataDictionary
                          ? "dictionary-table-heading"
                          : "border-b border-slate-800/80 px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.14em]"
                      }
                    >
                      {children}
                    </th>
                  ),
                  td: ({ children, node }) => {
                    const context = getRenderContext(node?.position?.start?.offset);
                    const text = flattenChildren(children).trim();

                    return (
                      <td
                        className={
                          context.isDataDictionary
                            ? "dictionary-table-cell"
                            : "border-b border-slate-200 px-4 py-3 align-top text-[13px] leading-6 text-slate-700 sm:text-sm"
                        }
                      >
                        {context.isDataDictionary ? renderDictionaryCell(text, children) : children}
                      </td>
                    );
                  },
                  pre: ({ children }) => {
                    const parsedBlock = parsePreBlock(children);

                    if (parsedBlock) {
                      const blockKey = `${parsedBlock.className || "code"}-${parsedBlock.code.slice(0, 40)}`;

                      if (isMermaidLikeLanguage(parsedBlock.className, parsedBlock.code)) {
                        return (
                          <MermaidBlock
                            blockKey={blockKey}
                            code={normalizeMermaidCode(parsedBlock.className, parsedBlock.code)}
                            copiedBlock={copiedBlock}
                            onCopy={handleCopyBlock}
                          />
                        );
                      }

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

function Heading({ children, id, level, context = {} }) {
  const text = flattenChildren(children);
  const resolvedId = id || slugify(text);
  const endpointMeta = level >= 3 ? parseEndpointHeading(text) : null;

  const className =
    level === 1
      ? "mt-10 scroll-mt-28 text-3xl font-semibold tracking-tight text-slate-950 first:mt-0"
      : level === 2
        ? "mt-12 scroll-mt-28 border-b border-slate-200 pb-3 text-2xl font-semibold tracking-tight text-slate-900"
        : level === 3
          ? context.isApiDesign
            ? "api-module-heading mt-10 scroll-mt-28"
            : "mt-10 scroll-mt-28 text-xl font-semibold text-slate-900"
          : context.isDataDictionary
            ? "dictionary-entity-heading mt-8 scroll-mt-28"
            : "mt-8 scroll-mt-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-800";

  const Tag = `h${level}`;

  if (endpointMeta) {
    return (
      <Tag id={resolvedId} className="mt-8 scroll-mt-28">
        <span className="api-endpoint-heading">
          <span className={`api-endpoint-method api-endpoint-method-${endpointMeta.method.toLowerCase()}`}>
            {endpointMeta.method}
          </span>
          <span className="api-endpoint-path">{endpointMeta.path}</span>
        </span>
      </Tag>
    );
  }

  return <Tag id={resolvedId} className={className}>{children}</Tag>;
}

function Paragraph({ children, context = {} }) {
  const meta = parseLabeledParagraph(children);

  if (meta) {
    if (!meta.value) {
      return (
        <div className={context.isDataDictionary ? "dictionary-group-label" : "api-group-label"}>
          {meta.label}
        </div>
      );
    }

    return (
      <div className={context.isDataDictionary ? "dictionary-meta-row" : "api-meta-row"}>
        <span className={context.isDataDictionary ? "dictionary-meta-label" : "api-meta-label"}>{meta.label}</span>
        <div className={context.isDataDictionary ? "dictionary-meta-value" : "api-meta-value"}>{meta.value}</div>
      </div>
    );
  }

  return <p className="text-[15px] leading-8 text-slate-700 sm:text-base">{children}</p>;
}

function ListItem({ children, context = {} }) {
  const text = flattenChildren(children).replace(/\s+/g, " ").trim();

  if (context.isApiDesign) {
    const endpoint = parseEndpointListItem(text);

    if (endpoint) {
      return (
        <div className="api-list-endpoint">
          <span className={`api-endpoint-method api-endpoint-method-${endpoint.method.toLowerCase()}`}>
            {endpoint.method}
          </span>
          <code className="api-list-endpoint-path">{endpoint.path}</code>
          {endpoint.description ? <span className="api-list-endpoint-description">{endpoint.description}</span> : null}
        </div>
      );
    }
  }

  return (
    <li className={context.isDataDictionary ? "dictionary-list-item" : "pl-1"}>
      {children}
    </li>
  );
}

function CodeBlock({ blockKey, className, code, copiedBlock, onCopy }) {
  const language = getCodeLanguageLabel(className);
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

function MermaidBlock({ blockKey, code, copiedBlock, onCopy }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const isCopied = copiedBlock === blockKey;
  const diagramLabel = getMermaidLabel(code);
  const diagramKind = getMermaidKind(code);
  const diagramId = useId().replace(/:/g, "");

  useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      try {
        setError("");
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "dark",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          fontSize: 12,
          themeVariables: {
            primaryColor: "#111827",
            primaryTextColor: "#f8fafc",
            primaryBorderColor: "#475569",
            lineColor: "#94a3b8",
            textColor: "#e2e8f0",
            tertiaryColor: "#0f172a",
            clusterBkg: "#111827",
            clusterBorder: "#475569",
            edgeLabelBackground: "#0f172a",
            mainBkg: "#111827",
            actorBkg: "#111827",
            actorBorder: "#64748b",
            actorTextColor: "#e2e8f0",
            signalColor: "#cbd5e1",
            labelBoxBkgColor: "#111827",
            labelBoxBorderColor: "#64748b",
            relationColor: "#94a3b8",
            entityBorder: "#64748b",
            entityBkg: "#111827",
            entityTextColor: "#f8fafc",
            attributeBackgroundColorOdd: "#0f172a",
            attributeBackgroundColorEven: "#111827",
            attributeTextColor: "#e2e8f0",
          },
          er: {
            useMaxWidth: true,
            diagramPadding: 14,
            layoutDirection: "TB",
            minEntityWidth: 92,
            minEntityHeight: 42,
            entityPadding: 8,
            fontSize: 11,
          },
          sequence: {
            useMaxWidth: true,
            diagramMarginX: 24,
            diagramMarginY: 16,
            boxMargin: 10,
            boxTextMargin: 8,
            noteMargin: 10,
            messageMargin: 28,
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis",
          },
        });

        const { svg: renderedSvg } = await mermaid.render(
          `mermaid-${slugify(blockKey)}-${diagramId}`,
          code,
        );

        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (renderError) {
        if (isMounted) {
          setError(renderError instanceof Error ? renderError.message : "Diagram gagal dirender.");
        }
      }
    }

    void renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [blockKey, code, diagramId]);

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  const diagramInnerClass = [
    "mermaid-diagram mx-auto flex items-center justify-center text-slate-100",
    diagramKind === "erd" ? "min-w-[520px] sm:min-w-[640px]" : "min-w-[560px] sm:min-w-[640px]",
  ].join(" ");

  return (
    <>
    <div className="my-6 overflow-hidden rounded-[1.5rem] border border-slate-800/80 bg-slate-950 shadow-lg shadow-slate-900/10">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {diagramLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Expand
          </button>
          <button
            type="button"
            onClick={() => void onCopy(blockKey, code)}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            {isCopied ? "Tersalin" : "Copy"}
          </button>
        </div>
      </div>
      {error ? (
        <div className="p-4">
          <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            Diagram gagal dirender. Menampilkan source Mermaid sebagai fallback.
          </div>
          <pre className="mt-4 overflow-x-auto rounded-[1.25rem] border border-slate-800 bg-slate-950 px-4 py-5 text-sm leading-7 text-slate-100">
            <code>{code}</code>
          </pre>
        </div>
      ) : svg ? (
        <div className="diagram-scroll overflow-auto bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.55),_rgba(2,6,23,0.94))] px-3 py-5 sm:px-4 sm:py-6">
          <div
            className={`${diagramInnerClass} min-h-[240px]`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      ) : (
        <div className="px-4 py-6 text-sm text-slate-400">Merender diagram...</div>
      )}
    </div>
    {isExpanded ? (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm"
        onClick={() => setIsExpanded(false)}
      >
        <div
          className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {diagramLabel}
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-100">
                Preview diagram penuh
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Close
            </button>
          </div>
          {error ? (
            <div className="p-5">
              <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                Diagram gagal dirender. Menampilkan source Mermaid sebagai fallback.
              </div>
              <pre className="mt-4 overflow-x-auto rounded-[1.25rem] border border-slate-800 bg-slate-950 px-4 py-5 text-sm leading-7 text-slate-100">
                <code>{code}</code>
              </pre>
            </div>
          ) : (
            <div className="diagram-scroll flex-1 overflow-auto bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.65),_rgba(2,6,23,0.96))] px-5 py-6">
              <div
                className={`${diagramInnerClass} min-h-full`}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>
          )}
        </div>
      </div>
    ) : null}
    </>
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

function getMermaidLabel(code) {
  if (/\bsequenceDiagram\b/i.test(code)) {
    return "Primary User Flow";
  }

  if (/\berDiagram\b/i.test(code)) {
    return "Entity Relationship Diagram";
  }

  if (/\bflowchart\b/i.test(code) || /\bgraph\b/i.test(code)) {
    return "Architecture Diagram";
  }

  return "Mermaid Diagram";
}

function getMermaidKind(code) {
  if (/\berDiagram\b/i.test(code)) {
    return "erd";
  }

  if (/\bsequenceDiagram\b/i.test(code)) {
    return "sequence";
  }

  if (/\bflowchart\b/i.test(code) || /\bgraph\b/i.test(code)) {
    return "flowchart";
  }

  return "generic";
}

function isMermaidLikeLanguage(className = "", code = "") {
  const normalized = normalizeCodeLanguage(className);

  if (
    normalized === "mermaid"
    || normalized === "erdiagram"
    || normalized === "sequencediagram"
    || normalized === "flowchart"
    || normalized === "graph"
  ) {
    return true;
  }

  const trimmed = String(code).trim();
  const firstLine = trimmed.split(/\r?\n/, 1)[0] || "";
  const normalizedFirstLine = normalizeMermaidKeyword(firstLine);

  return normalizedFirstLine === "erdiagram"
    || normalizedFirstLine === "sequencediagram"
    || normalizedFirstLine === "flowchart"
    || normalizedFirstLine === "graph";
}

function normalizeMermaidCode(className = "", code = "") {
  const trimmed = String(code).trim();
  const normalized = normalizeCodeLanguage(className);
  const lines = trimmed.split(/\r?\n/);
  const firstLine = lines[0] || "";
  const normalizedFirstLine = normalizeMermaidKeyword(firstLine);
  const remainder = lines.slice(1).join("\n").trim();

  if (normalizedFirstLine === "erdiagram") {
    return `erDiagram\n${remainder}`;
  }

  if (normalizedFirstLine === "sequencediagram") {
    return `sequenceDiagram\n${remainder}`;
  }

  if (normalizedFirstLine === "flowchart") {
    return `flowchart TD\n${remainder}`;
  }

  if (normalizedFirstLine === "graph") {
    return `graph TD\n${remainder}`;
  }

  if (normalized === "erdiagram" && !/^erDiagram\b/i.test(trimmed)) {
    return `erDiagram\n${trimmed}`;
  }

  if (normalized === "sequencediagram" && !/^sequenceDiagram\b/i.test(trimmed)) {
    return `sequenceDiagram\n${trimmed}`;
  }

  if (normalized === "flowchart" && !/^flowchart\b/i.test(trimmed)) {
    return `flowchart TD\n${trimmed}`;
  }

  if (normalized === "graph" && !/^graph\b/i.test(trimmed)) {
    return `graph TD\n${trimmed}`;
  }

  return trimmed;
}

function normalizeCodeLanguage(className = "") {
  return String(className)
    .replace(/^language-/i, "")
    .trim()
    .toLowerCase();
}

function normalizeMermaidKeyword(value = "") {
  return String(value).replace(/[^a-z]/gi, "").toLowerCase();
}

function getCodeLanguageLabel(className = "") {
  const normalized = normalizeCodeLanguage(className);
  return normalized ? normalized.toUpperCase() : "TEXT";
}

function parseEndpointHeading(value = "") {
  const match = String(value).trim().match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/i);

  if (!match) {
    return null;
  }

  return {
    method: match[1].toUpperCase(),
    path: match[2].trim(),
  };
}

function parseLabeledParagraph(children) {
  const text = flattenChildren(children).replace(/\s+/g, " ").trim();

  if (!text) {
    return null;
  }

  const match = text.match(/^(Entity Type|Purpose|Module \/ Domain Area|Primary Owner|Storage Type|Source of Truth|Description|Relationships|Indexes|Constraints \/ Rules|Retention Policy|Related APIs|Related Modules|Status Values|Audit Fields|Auth Required|Permission|Actor|Auth|Security|Base URL|API version|Authentication method|Authentication|Request format|Response format|Error format|Rate limit strategy|Rate Limit|Idempotency strategy|Idempotency Strategy|Pagination strategy|Pagination Strategy|Webhook strategy|Webhook Strategy|Path Params|Query Params|Request Body|Success Response|Error Responses|Business Rules|Related Data Model|Content-Type|Processing Flow|Headers|Status Codes)\s*:\s*(.*)$/i);

  if (!match) {
    return null;
  }

  return {
    label: match[1],
    value: match[2],
  };
}

function createRenderContextResolver(headings) {
  const orderedHeadings = [...headings].sort((left, right) => left.offset - right.offset);

  return function resolveRenderContext(offset) {
    if (typeof offset !== "number") {
      return {
        isDataDictionary: false,
        currentH2: "",
        currentH3: "",
        currentH4: "",
      };
    }

    let currentH2 = "";
    let currentH3 = "";
    let currentH4 = "";

    for (const heading of orderedHeadings) {
      if (heading.offset > offset) {
        break;
      }

      if (heading.level === 2) {
        currentH2 = heading.text;
        currentH3 = "";
        currentH4 = "";
        continue;
      }

      if (heading.level === 3) {
        currentH3 = heading.text;
        currentH4 = "";
        continue;
      }

      if (heading.level === 4) {
        currentH4 = heading.text;
      }
    }

    return {
      isDataDictionary: /data dictionary/i.test(currentH3),
      currentH2,
      currentH3,
      currentH4,
      isApiDesign: /api design/i.test(currentH2),
    };
  };
}

function renderDictionaryCell(text, children) {
  if (!text) {
    return children;
  }

  if (/^(yes|true|required)$/i.test(text)) {
    return <span className="dictionary-badge dictionary-badge-yes">{text}</span>;
  }

  if (/^(no|false|optional|null)$/i.test(text)) {
    return <span className="dictionary-badge dictionary-badge-no">{text}</span>;
  }

  if (/^(uuid|objectid|varchar.*|text|jsonb|json|boolean|timestamp|datetime|date|decimal.*|number|int|integer|float|array|object|string)$/i.test(text)) {
    return <span className="dictionary-type-pill">{text}</span>;
  }

  if (/^(pk|fk|primary key|foreign key|unique)$/i.test(text)) {
    return <span className="dictionary-badge dictionary-badge-key">{text}</span>;
  }

  return children;
}

function parseEndpointListItem(value = "") {
  const match = String(value).trim().match(/^(GET|POST|PUT|PATCH|DELETE)\s+(`?\/[^`\s]+`?)\s*:?\s*(.*)$/i);

  if (!match) {
    return null;
  }

  return {
    method: match[1].toUpperCase(),
    path: match[2].replace(/`/g, ""),
    description: match[3]?.trim() || "",
  };
}
