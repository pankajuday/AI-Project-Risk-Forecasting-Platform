import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import ExcelViewer from '@/components/DocumentViewer/ExcelViewer';
import { MdFormatter } from '@/components/MdFormatter';
import { documentsApi } from '@/api';
import {
  Loader2,
  AlertCircle,
  FileText,
  Download,
  Copy,
  Check,
  Presentation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ViewerProps {
  projectId: string;
  filename: string;
}

// File types that need in-browser binary parsing
const BINARY_PARSE_EXTS = ['docx', 'doc'];
// File types where we decode the bytes to text
const TEXT_EXTS = ['txt', 'log', 'json', 'yaml', 'yml'];

export default function Viewer({ projectId, filename }: ViewerProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);

  // Presigned URL — used for PDF, image, PPTX direct browser embed
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  // Download URL (forced attachment)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Binary buffer — only for DOCX rendering via docx-preview
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [docxRendering, setDocxRendering] = useState<boolean>(false);

  // Text content — for txt / log / json / yaml / md
  const [textContent, setTextContent] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const ext = filename ? filename.split('.').pop()?.toLowerCase() || '' : '';

  
  // 1. Load file data whenever filename or projectId changes
  
  useEffect(() => {
    if (!filename || !projectId) return;

    let isCancelled = false;

    // Reset all previous state
    setPresignedUrl(null);
    setDownloadUrl(null);
    setDocxBuffer(null);
    setTextContent(null);
    setDocError(null);
    setLoading(true);

    // Excel/CSV — ExcelViewer handles its own fetching
    if (ext === 'xlsx' || ext === 'xls') {
      setLoading(false);
      return;
    }

    async function loadDocument() {
      try {
        //  DOCX / DOC: need raw binary for docx-preview 
        if (BINARY_PARSE_EXTS.includes(ext)) {
          const resp = await documentsApi.viewUrl(projectId, filename);
          if (isCancelled) return;
          const buffer =
            resp.data instanceof ArrayBuffer
              ? resp.data
              : new Uint8Array(resp.data).buffer;
          setDocxBuffer(buffer);
          setLoading(false);
          return;
        }

        //  Text types: fetch binary, decode to string 
        if (TEXT_EXTS.includes(ext) || ext === 'md' || ext === 'csv') {
          const resp = await documentsApi.viewUrl(projectId, filename);
          if (isCancelled) return;
          const buffer =
            resp.data instanceof ArrayBuffer
              ? resp.data
              : new Uint8Array(resp.data).buffer;
          const text = new TextDecoder('utf-8').decode(buffer);
          setTextContent(text);
          setLoading(false);
          return;
        }

        //  Everything else (PDF, images, PPTX, unknown):
        //     get presigned URL and point the browser element at it directly 
        const [viewUrl, dlUrl] = await Promise.all([
          documentsApi.getPresignedUrl(projectId, filename),
          documentsApi.getDownloadUrl(projectId, filename),
        ]);
        if (isCancelled) return;
        setPresignedUrl(viewUrl);
        setDownloadUrl(dlUrl);
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading document:', err);
        if (!isCancelled) {
          setDocError(err?.response?.data?.detail ?? 'Failed to load document content.');
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [filename, projectId, ext]);

  
  // 2. Render DOCX once DOM container and buffer are both ready
  
  useEffect(() => {
    if (!docxBuffer || !viewerRef.current) return;

    let isCancelled = false;
    setDocxRendering(true);

    async function renderDocx() {
      try {
        if (viewerRef.current) {
          viewerRef.current.innerHTML = '';
          await renderAsync(docxBuffer!, viewerRef.current, undefined, {
            className: 'docx',
            inWrapper: true,
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
      } catch (err) {
        console.error('DOCX render error:', err);
        if (!isCancelled) {
          setDocError(
            'Unable to preview this Word document inline. Please download the file to view.',
          );
        }
      } finally {
        if (!isCancelled) {
          setDocxRendering(false);
        }
      }
    }

    renderDocx();

    return () => {
      isCancelled = true;
    };
  }, [docxBuffer]);

  
  // Handlers
  
  const handleDownload = async () => {
    try {
      // Prefer the pre-fetched download URL; fall back to fetching one now
      let url = downloadUrl;
      if (!url) {
        url = await documentsApi.getDownloadUrl(projectId, filename);
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Failed to generate download link.');
    }
  };

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  
  // Guards
  
  if (!projectId || !filename) return null;

  // Excel spreadsheets — delegate entirely to ExcelViewer
  if (ext === 'xlsx' || ext === 'xls') {
    return <ExcelViewer projectId={projectId} filename={filename} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-background/50 text-muted-foreground flex h-full w-full items-center justify-center gap-2 text-xs">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading document preview...</span>
      </div>
    );
  }

  // Error state
  if (docError) {
    return (
      <div className="bg-background/50 flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-xs">
        <AlertCircle className="text-destructive h-6 w-6" />
        <p className="text-foreground font-semibold">Unable to preview file</p>
        <p className="text-muted-foreground max-w-sm">{docError}</p>
        <Button onClick={handleDownload} variant="outline" size="sm" className="mt-3 gap-2 text-xs">
          <Download size={13} />
          <span>Download File</span>
        </Button>
      </div>
    );
  }

  
  // Renderers
  

  // 1. Images — presigned URL set directly as src (no CORS issues)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    return (
      <div className="bg-background/80 flex h-full w-full items-center justify-center p-4">
        {presignedUrl ? (
          <img
            src={presignedUrl}
            alt={filename}
            className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
          />
        ) : null}
      </div>
    );
  }

  // 2. Markdown — rendered with MdFormatter
  if (ext === 'md') {
    return (
      <div className="bg-card text-foreground relative h-full w-full overflow-auto p-6 text-xs">
        <div className="sticky top-0 right-0 z-10 mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="h-7 gap-1.5 text-xs shadow-xs"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
          </Button>
        </div>
        <MdFormatter content={textContent || ''} />
      </div>
    );
  }

  // 3. Plain text / logs / JSON / YAML / CSV
  if (['txt', 'log', 'csv', 'json', 'yaml', 'yml'].includes(ext)) {
    return (
      <div className="bg-card text-foreground relative h-full w-full overflow-auto p-6 font-mono text-xs leading-relaxed">
        <div className="sticky top-0 right-0 z-10 mb-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="h-7 gap-1.5 font-sans text-xs shadow-xs"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </Button>
        </div>
        <pre className="m-0 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {textContent}
        </pre>
      </div>
    );
  }

  // 4. DOCX / DOC — rendered in-browser via docx-preview
  if (ext === 'docx' || ext === 'doc') {
    return (
      <div className="relative h-full w-full overflow-auto bg-[#525659]">
        {docxRendering && (
          <div className="bg-background/70 text-muted-foreground absolute inset-0 z-20 flex items-center justify-center gap-2 text-xs backdrop-blur-xs">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Rendering document pages...</span>
          </div>
        )}
        <div
          ref={viewerRef}
          className="docx-viewer-wrapper mx-auto max-w-4xl rounded-sm bg-white text-black shadow-lg"
        />
      </div>
    );
  }

  // 5. PowerPoint (.pptx) — no inline renderer; show download CTA
  if (ext === 'pptx') {
    return (
      <div className="bg-muted/20 flex h-full w-full flex-col items-center justify-center p-8 text-center">
        <div className="border-border bg-card mb-4 flex size-16 items-center justify-center rounded-2xl border shadow-sm">
          <Presentation className="size-8 text-amber-500" />
        </div>
        <h3 className="text-foreground text-sm font-semibold">{filename}</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-xs">
          PowerPoint presentation (.pptx). You can download the deck to view all slides with
          animations.
        </p>
        <Button onClick={handleDownload} className="mt-4 gap-2 text-xs shadow-xs">
          <Download size={14} />
          <span>Download Presentation</span>
        </Button>
      </div>
    );
  }

  // 6. PDF — embed via presigned URL directly in <iframe>
  if (ext === 'pdf') {
    return (
      <div className="bg-muted/20 h-full w-full overflow-hidden">
        {presignedUrl ? (
          <iframe
            title={filename}
            src={`${presignedUrl}#toolbar=1&navpanes=0`}
            className="h-full w-full border-none"
          />
        ) : null}
      </div>
    );
  }

  // 7. Generic fallback for any other binary type
  return (
    <div className="bg-muted/20 flex h-full w-full flex-col items-center justify-center p-8 text-center">
      <div className="border-border bg-card mb-4 flex size-16 items-center justify-center rounded-2xl border shadow-sm">
        <FileText className="text-primary size-8" />
      </div>
      <h3 className="text-foreground text-sm font-semibold">{filename}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-xs">
        Preview is not available for this file type ({ext.toUpperCase() || 'Binary'}). You can
        download the file to view it locally.
      </p>
      <Button onClick={handleDownload} className="mt-4 gap-2 text-xs shadow-xs">
        <Download size={14} />
        <span>Download File</span>
      </Button>
    </div>
  );
}
