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
        mode: ['avoid-all', 'css', 'legacy'],
        avoid: [
          'tr',
          'p',
          'li',
          'blockquote',
          'pre',
          'h1',
          'h2',
          'h3',
          'h4',
          '.pdf-table-row',
          'td',
          'tbody',
          'th',
          'table',
          'span',
          'lo',
          'strong',
        ],
      },
    };

    try {
      await html2pdf().set(options).from(element).save();
    } catch (error) {
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
