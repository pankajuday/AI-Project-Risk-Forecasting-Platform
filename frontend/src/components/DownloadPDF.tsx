import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// @ts-ignore - html2pdf often lacks default TypeScript definitions
import html2pdf from 'html2pdf.js';
import '@/App.css';

interface DownloadPDFProps {
  markdown: string;
  filename?: string;
  className?: string;
  label?: string;
}

const DownloadPDF = ({
  markdown,
  filename = 'report.pdf',
  className = 'btn btn-primary',
  label = 'Download PDF',
}: DownloadPDFProps) => {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadPDF = async () => {
    if (!pdfRef.current || isGenerating) return;

    setIsGenerating(true);
    const element = pdfRef.current;

    const options = {
      margin: [10, 12, 10, 12] as [number, number, number, number],

      filename,

      image: {
        type: 'jpeg' as const,
        quality: 0.98,
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,

        scrollX: 0,
        scrollY: 0,

        width: 794,
        windowWidth: 794,

        // height: element.scrollHeight,
        // windowHeight: element.scrollHeight,
      },

      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const,
      },

      pagebreak: {
        // 'css' mode honours page-break-inside/break-inside properties we inject
        // via onclone. Using avoid-all on top causes conflicts and is unreliable.
        mode: ['css', 'legacy'],
      },
    };

    // Inject a <style> block into the hidden element to override any oklch values
    // that leak from global CSS variables, replacing them with safe hex equivalents.
    const patchStyleId = '__pdf_oklch_patch__';
    if (!document.getElementById(patchStyleId)) {
      const patchStyle = document.createElement('style');
      patchStyle.id = patchStyleId;
      // Override the most common CSS custom properties that use oklch with safe hex fallbacks
      patchStyle.textContent = `
        #${element.id ?? '__pdf_root__'}, #${element.id ?? '__pdf_root__'} * {
          --background: #ffffff !important;
          --foreground: #111827 !important;
          --card: #ffffff !important;
          --card-foreground: #111827 !important;
          --popover: #ffffff !important;
          --popover-foreground: #111827 !important;
          --primary: #2563eb !important;
          --primary-foreground: #ffffff !important;
          --secondary: #f3f4f6 !important;
          --secondary-foreground: #111827 !important;
          --muted: #f3f4f6 !important;
          --muted-foreground: #6b7280 !important;
          --accent: #eff6ff !important;
          --accent-foreground: #1e3a8a !important;
          --border: #d1d5db !important;
          --input: #d1d5db !important;
          --ring: #2563eb !important;
        }
      `;
      document.head.appendChild(patchStyle);
    }

    const optionsWithClone = {
      ...options,
      html2canvas: {
        ...options.html2canvas,
        onclone: (_clonedDoc: Document) => {
          // ── 1. Strip oklch rules ─────────────────────────────────────────────
          // html2canvas's CSS parser can't handle oklch() from Tailwind v4.
          // Delete any stylesheet rule that contains it before rendering.
          try {
            const sheets = Array.from(_clonedDoc.styleSheets);
            for (const sheet of sheets) {
              try {
                const rules = Array.from(sheet.cssRules ?? []);
                for (let i = rules.length - 1; i >= 0; i--) {
                  if (rules[i].cssText?.includes('oklch')) {
                    sheet.deleteRule(i);
                  }
                }
              } catch {
                // Cross-origin or locked sheets — skip silently.
              }
            }
          } catch {
            // Best-effort.
          }

          // ── 2. Inject page-break guards ──────────────────────────────────────
          // Apply break-inside:avoid to every element that should never be split
          // across a PDF page boundary. This is the most reliable approach:
          // it works at CSS level which html2pdf respects when slicing pages.
          try {
            const breakGuard = _clonedDoc.createElement('style');
            breakGuard.id = '__pdf_break_guard__';
            breakGuard.textContent = `
              /* Prevent any block-level content from being sliced mid-element */
              p, li, blockquote, pre, code,
              h1, h2, h3, h4, h5, h6,
              tr, td, th, thead, tbody, tfoot,
              figure, figcaption, img, dl, dt, dd {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              /* Keep headings glued to the content that follows them */
              h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }

              /* Tables: try to keep the whole table together where possible,
                 and never break inside a row */
              table {
                page-break-inside: auto !important;
                break-inside: auto !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              /* Block elements with potential overflow: ensure they are
                 visible and don't clip content within a page */
              pre, blockquote {
                overflow: visible !important;
                white-space: pre-wrap !important;
                word-break: break-word !important;
              }
            `;
            _clonedDoc.head.appendChild(breakGuard);
          } catch {
            // Best-effort — don't block PDF generation.
          }
        },
      },
    };

    try {
      await html2pdf().set(optionsWithClone).from(element).save();
      // Clean up the injected patch style
      document.getElementById(patchStyleId)?.remove();
    } catch (error) {
      document.getElementById(patchStyleId)?.remove();
      console.error('PDF generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* 
          DOWNLOAD BUTTON
       */}
      <button type="button" onClick={downloadPDF} disabled={isGenerating} className={className}>
        {isGenerating ? 'Generating...' : label}
      </button>

      {/* 
          HIDDEN PDF DOCUMENT
      */}
      {/* 
        This wrapper hides the content from the user but keeps it 
        accessible to html2canvas rendering engine. 
      */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '-10000px',
          width: '794px',
          overflow: 'visible',
          zIndex: -9999,
        }}
      >
        <div
          ref={pdfRef}
          className="pdf-document"
          style={{
            top: 0,
            left: 0,
            width: '794px',
            minHeight: '1123px',
            boxSizing: 'border-box',
            background: '#ffffff',
            color: '#1f2937',
            padding: '15px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            overflow: 'visible',
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              /* 
                 H1
              */
              h1({ children }) {
                return (
                  <h1
                    style={{
                      color: '#111827',
                      fontSize: '30px',
                      lineHeight: 1.2,
                      fontWeight: 700,
                      margin: '0 0 24px',
                      paddingBottom: '14px',
                      borderBottom: '3px solid #2563eb',
                    }}
                  >
                    {children}
                  </h1>
                );
              },

              /* 
                 H2
               */
              h2({ children }) {
                return (
                  <h2
                    style={{
                      color: '#1e3a8a',
                      fontSize: '22px',
                      lineHeight: 1.3,
                      fontWeight: 700,
                      margin: '28px 0 12px',
                      paddingBottom: '6px',
                      borderBottom: '1px solid #bfdbfe',
                      pageBreakAfter: 'avoid',
                    }}
                  >
                    {children}
                  </h2>
                );
              },

              /* 
                 H3
               */
              h3({ children }) {
                return (
                  <h3
                    style={{
                      color: '#1d4ed8',
                      fontSize: '17px',
                      lineHeight: 1.3,
                      fontWeight: 700,
                      margin: '20px 0 8px',
                      pageBreakAfter: 'avoid',
                    }}
                  >
                    {children}
                  </h3>
                );
              },

              /* 
                 H4
               */
              h4({ children }) {
                return (
                  <h4
                    style={{
                      color: '#374151',
                      fontSize: '15px',
                      fontWeight: 700,
                      margin: '16px 0 8px',
                    }}
                  >
                    {children}
                  </h4>
                );
              },

              /* 
                 PARAGRAPH
               */
              p({ children }) {
                return (
                  <p
                    style={{
                      color: '#374151',
                      fontSize: '13px',
                      lineHeight: 1.65,
                      margin: '8px 0',
                      display: 'block',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }}
                  >
                    {children}
                  </p>
                );
              },

              /* 
                 STRONG
               */
              strong({ children }) {
                return (
                  <strong
                    style={{
                      color: '#111827',
                      fontWeight: 700,
                    }}
                  >
                    {children}
                  </strong>
                );
              },

              /* 
                 LINKS
               */
              a({ children, href }) {
                return (
                  <a
                    href={href}
                    style={{
                      color: '#2563eb',
                      textDecoration: 'underline',
                    }}
                  >
                    {children}
                  </a>
                );
              },

              /* 
                 UNORDERED LIST
               */
              ul({ children }) {
                return (
                  <ul
                    style={{
                      margin: '8px 0',
                      paddingLeft: '25px',
                      color: '#374151',
                      fontSize: '13px',
                      lineHeight: 1.6,
                    }}
                  >
                    {children}
                  </ul>
                );
              },

              /* 
                 ORDERED LIST
               */
              ol({ children }) {
                return (
                  <ol
                    style={{
                      margin: '8px 0',
                      paddingLeft: '25px',
                      color: '#374151',
                      fontSize: '13px',
                      lineHeight: 1.6,
                    }}
                  >
                    {children}
                  </ol>
                );
              },

              /* 
                 LIST ITEM
               */
              li({ children }) {
                return (
                  <li
                    style={{
                      marginBottom: '4px',
                    }}
                  >
                    {children}
                  </li>
                );
              },

              /* 
                 INLINE CODE
               */
              code({ children, className }) {
                const isBlock = className?.includes('language-');

                if (isBlock) {
                  return (
                    <pre
                      style={{
                        background: '#111827',
                        color: '#e5e7eb',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        lineHeight: 1.5,
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: '14px 0',
                        pageBreakInside: 'avoid',
                      }}
                    >
                      <code>{children}</code>
                    </pre>
                  );
                }

                return (
                  <code
                    style={{
                      background: '#f3f4f6',
                      color: '#be185d',
                      border: '1px solid #e5e7eb',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '11px',
                    }}
                  >
                    {children}
                  </code>
                );
              },

              /* 
                 BLOCK CODE
               */
              pre({ children }) {
                return (
                  <div
                    style={{
                      background: '#111827',
                      color: '#e5e7eb',
                      padding: '16px',
                      borderRadius: '8px',
                      margin: '14px 0',
                      fontSize: '11px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    {children}
                  </div>
                );
              },

              /* 
                 BLOCKQUOTE
               */
              blockquote({ children }) {
                return (
                  <blockquote
                    style={{
                      margin: '16px 0',
                      padding: '10px 16px',
                      borderLeft: '4px solid #2563eb',
                      background: '#eff6ff',
                      color: '#374151',
                      fontSize: '13px',
                      lineHeight: 1.6,

                      // Add these 4 lines to ensure strict bounding boxes:
                      display: 'block',
                      width: '100%',
                      boxSizing: 'border-box',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid', // Modern standard property
                    }}
                  >
                    {children}
                  </blockquote>
                );
              },

              /* 
                 HORIZONTAL RULE
               */
              hr() {
                return (
                  <hr
                    style={{
                      border: 'none',
                      borderTop: '1px solid #d1d5db',
                      margin: '24px 0',
                    }}
                  />
                );
              },

              /* 
                 TABLE
               */
              table({ children }) {
                return (
                  <div
                    style={{
                      width: '100%',
                      margin: '18px 0',
                    }}
                  >
                    <table
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        borderCollapse: 'collapse',
                        tableLayout: 'fixed',
                        fontSize: '11px',
                      }}
                    >
                      {children}
                    </table>
                  </div>
                );
              },
              /* 
                 TABLE HEAD
               */
              thead({ children }) {
                return (
                  <thead
                    style={{
                      background: '#1d4ed8',
                      color: '#ffffff',
                    }}
                  >
                    {children}
                  </thead>
                );
              },

              /* 
                 TABLE BODY
               */
              tbody({ children }) {
                return <tbody>{children}</tbody>;
              },

              /* 
                 TABLE ROW
               */
              tr({ children }) {
                return (
                  <tr
                    style={{
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    {children}
                  </tr>
                );
              },
              /* 
                 TABLE HEADER
               */
              th({ children }) {
                return (
                  <th
                    style={{
                      padding: '9px 10px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: '#ffffff',
                      background: '#1d4ed8',
                      border: '1px solid #1e40af',
                    }}
                  >
                    {children}
                  </th>
                );
              },

              /* 
                 TABLE CELL
               */
              td({ children }) {
                return (
                  <td
                    style={{
                      padding: '8px 10px',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      verticalAlign: 'top',
                      background: '#ffffff',

                      wordBreak: 'normal',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {children}
                  </td>
                );
              },

              /* 
                 DEL
               */
              del({ children }) {
                return (
                  <del
                    style={{
                      color: '#6b7280',
                    }}
                  >
                    {children}
                  </del>
                );
              },
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </>
  );
};

export default DownloadPDF;
