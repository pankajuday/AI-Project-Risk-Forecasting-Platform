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
    <div className="w-full overflow-x-auto text-foreground">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={{
          // Headings
          h1({ children }) {
            return (
              <h1 className="text-2xl font-bold tracking-tight text-foreground mt-6 mb-3 pb-2 border-b border-border">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-semibold tracking-tight text-foreground mt-5 mb-2.5 pb-1 border-b border-border/40">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-sm font-semibold text-foreground mt-3 mb-1.5">
                {children}
              </h4>
            );
          },

          // Paragraphs & Text
          p({ children }) {
            return <p className="text-sm leading-relaxed text-foreground/90 my-2.5">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-foreground/90">{children}</em>;
          },

          // Lists
          ul({ children }) {
            return <ul className="my-3 space-y-1.5 list-disc list-outside pl-5 text-sm text-foreground/90">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-3 space-y-1.5 list-decimal list-outside pl-5 text-sm text-foreground/90">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-sm leading-relaxed text-foreground/90">{children}</li>;
          },

          // Blockquote
          blockquote({ children }) {
            return (
              <blockquote className="my-4 border-l-4 border-primary/50 bg-muted/30 px-4 py-2 italic text-muted-foreground rounded-r-md text-sm">
                {children}
              </blockquote>
            );
          },

          // Horizontal Rule
          hr() {
            return <hr className="my-6 border-border" />;
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
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground/90 border border-border/50"
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
                className="font-medium text-primary underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                {children}
              </a>
            );
          },

          // Table
          table({ children }) {
            return (
              <div className="my-4 w-full overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full min-w-125 border-collapse text-xs">{children}</table>
              </div>
            );
          },

          thead({ children }) {
            return <thead className="bg-muted/60 border-b border-border">{children}</thead>;
          },

          tbody({ children }) {
            return <tbody className="divide-y divide-border/50">{children}</tbody>;
          },

          tr({ children }) {
            return <tr className="hover:bg-muted/20 transition-colors">{children}</tr>;
          },

          th({ children }) {
            return (
              <th className="px-3.5 py-2.5 text-left font-semibold text-foreground">
                {children}
              </th>
            );
          },

          td({ children }) {
            return (
              <td className="px-3.5 py-2.5 align-top text-muted-foreground">
                {children}
              </td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MdFormatter;

