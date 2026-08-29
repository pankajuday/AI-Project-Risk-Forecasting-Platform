import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import ExcelViewer from './ExcelViewer';
import { documentsApi } from '../../api';

interface ViewerProps {
  projectId: string;
  filename: string;
}

export default function Viewer({ projectId, filename }: ViewerProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState<boolean>(false);
  const [docError, setDocError] = useState<string | null>(null);

  const documentUrl =
    filename && projectId ? documentsApi.getViewUrlString(projectId, filename) : null;

  const ext = filename ? filename.split('.').pop()?.toLowerCase() : '';

  useEffect(() => {
    if (!filename || !projectId) return;

    // Reset state
    setTextContent(null);
    setDocError(null);

    // Load text/markdown/csv/log files
    if (ext && ['txt', 'log', 'md', 'csv', 'json'].includes(ext)) {
      setLoadingText(true);
      documentsApi
        .viewUrl(projectId, filename)
        .then(resp => {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(resp.data);
          setTextContent(text);
        })
        .catch(err => {
          console.error('Error fetching text document:', err);
          setDocError('Failed to load document content.');
        })
        .finally(() => setLoadingText(false));
    }

    // Load DOCX files via docx-preview
    if (ext === 'docx' && viewerRef.current) {
      viewerRef.current.innerHTML = '';

      async function loadDocx() {
        try {
          const resp = await documentsApi.viewUrl(projectId, filename);
          const buffer =
            resp.data instanceof ArrayBuffer ? resp.data : new Uint8Array(resp.data).buffer;

          if (viewerRef.current) {
            await renderAsync(buffer, viewerRef.current, undefined, {
              className: 'docx',
              ignoreWidth: false,
              ignoreHeight: false,
              ignoreFonts: false,
              breakPages: true,
              renderHeaders: true,
              renderFooters: true,
              renderFootnotes: true,
              renderEndnotes: true,
            });
          }
        } catch (e) {
          console.error('DOCX rendering error:', e);
          setDocError('Failed to render DOCX preview.');
        }
      }

      loadDocx();
    }
  }, [filename, projectId, ext]);

  if (!projectId || !filename) return null;

  // 1. Excel documents (.xlsx, .xls)
  if (ext === 'xlsx' || ext === 'xls') {
    return <ExcelViewer projectId={projectId} filename={filename} />;
  }

  // 2. Images (.png, .jpg, .jpeg, .gif, .webp, .svg)
  if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#080810] p-4">
        <img
          src={documentUrl || ''}
          alt={filename}
          className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
        />
      </div>
    );
  }

  // 3. Plain text, markdown, CSV, JSON
  if (ext && ['txt', 'log', 'md', 'csv', 'json'].includes(ext)) {
    return (
      <div className="h-full w-full overflow-auto bg-[#080810] p-6 font-mono text-sm leading-relaxed text-[#f0f0ff]">
        {loadingText ? (
          <div className="flex h-48 items-center justify-center text-[#9898b8]">
            Loading document content...
          </div>
        ) : docError ? (
          <div className="p-4 text-red-400">{docError}</div>
        ) : (
          <pre className="m-0 font-mono text-sm leading-relaxed whitespace-pre-wrap text-[#f0f0ff]">
            {textContent}
          </pre>
        )}
      </div>
    );
  }

  // 4. DOCX documents
  if (ext === 'docx') {
    return (
      <div className="h-full w-full overflow-auto bg-white p-6 text-black">
        {docError ? (
          <div className="p-4 text-red-500">{docError}</div>
        ) : (
          <div ref={viewerRef} className="docx-container" />
        )}
      </div>
    );
  }

  // 5. Fallback for PDF and other browser-supported files via iframe
  return (
    <div className="h-full w-full overflow-hidden bg-[#080810]">
      <iframe title={filename} src={documentUrl || ''} className="h-full w-full border-none" />
    </div>
  );
}
