import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MdFormatterProps {
  content: string;
}

const REMARK_PLUGINS = [remarkGfm];

export const MdFormatter = memo(function MdFormatter({ content }: MdFormatterProps) {
  return (
    <div className="text-foreground w-full overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={{
          // Headings
          h1({ children }) {
            return (
              <h1 className="text-foreground border-border mt-6 mb-3 border-b pb-2 text-2xl font-bold tracking-tight">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-foreground border-border/40 mt-5 mb-2.5 border-b pb-1 text-xl font-semibold tracking-tight">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-foreground mt-4 mb-2 text-base font-semibold">{children}</h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-foreground mt-3 mb-1.5 text-sm font-semibold">{children}</h4>
            );
          },

          // Paragraphs & Text
          p({ children }) {
            return <p className="text-foreground/90 my-2.5 text-sm leading-relaxed">{children}</p>;
          },
          strong({ children }) {
            return <strong className="text-foreground font-semibold">{children}</strong>;
          },
          em({ children }) {
            return <em className="text-foreground/90 italic">{children}</em>;
          },

          // Lists
          ul({ children }) {
            return (
              <ul className="text-foreground/90 my-3 list-outside list-disc space-y-1.5 pl-5 text-sm">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="text-foreground/90 my-3 list-outside list-decimal space-y-1.5 pl-5 text-sm">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="text-foreground/90 text-sm leading-relaxed">{children}</li>;
          },

          // Blockquote
          blockquote({ children }) {
            return (
              <blockquote className="border-primary/50 bg-muted/30 text-muted-foreground my-4 rounded-r-md border-l-4 px-4 py-2 text-sm italic">
                {children}
              </blockquote>
            );
          },

          // Horizontal Rule
          hr() {
            return <hr className="border-border my-6" />;
          },

          // Code
          code({ children, className, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (match) {
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: '0.75rem 0',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              );
            }

            return (
              <code
                {...props}
                className="bg-muted text-foreground/90 border-border/50 rounded border px-1.5 py-0.5 font-mono text-xs font-medium"
              >
                {children}
              </code>
            );
          },

          // Links
          a({ children, href, ...props }) {
            return (
              <a
                {...props}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium underline underline-offset-4 transition-opacity hover:opacity-80"
              >
                {children}
              </a>
            );
          },

          // Table
          table({ children }) {
            return (
              <div className="border-border bg-card my-4 w-full overflow-x-auto rounded-lg border">
                <table className="w-full min-w-125 border-collapse text-xs">{children}</table>
              </div>
            );
          },

          thead({ children }) {
            return <thead className="bg-muted/60 border-border border-b">{children}</thead>;
          },

          tbody({ children }) {
            return <tbody className="divide-border/50 divide-y">{children}</tbody>;
          },

          tr({ children }) {
            return <tr className="hover:bg-muted/20 transition-colors">{children}</tr>;
          },

          th({ children }) {
            return (
              <th className="text-foreground px-3.5 py-2.5 text-left font-semibold">{children}</th>
            );
          },

          td({ children }) {
            return <td className="text-muted-foreground px-3.5 py-2.5 align-top">{children}</td>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MdFormatter;
