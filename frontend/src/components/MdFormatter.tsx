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
    <div className="w-full overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={{
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
                    margin: '0.5rem 0',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              );
            }

            return (
              <code
                {...props}
                className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600 dark:bg-gray-800 dark:text-pink-400"
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
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {children}
              </a>
            );
          },

          // Table
          table({ children }) {
            return (
              <div className="my-4 w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-125 border-collapse text-sm">{children}</table>
              </div>
            );
          },

          thead({ children }) {
            return <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>;
          },

          tbody({ children }) {
            return <tbody>{children}</tbody>;
          },

          tr({ children }) {
            return <tr>{children}</tr>;
          },

          th({ children }) {
            return (
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold dark:border-gray-600">
                {children}
              </th>
            );
          },

          td({ children }) {
            return (
              <td className="border border-gray-200 px-4 py-3 align-top dark:border-gray-700">
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
