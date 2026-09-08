import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import ExcelViewer from '@/components/DocumentViewer/ExcelViewer';
import { MdFormatter } from '@/components/MdFormatter';
import { documentsApi } from '@/api';
import { Loader2, AlertCircle, FileText, Download, Copy, Check, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ViewerProps {
  projectId: string;
  filename: string;
}

export default function Viewer({ projectId, filename }: ViewerProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [docxRendering, setDocxRendering] = useState<boolean>(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const ext = filename ? filename.split('.').pop()?.toLowerCase() || '' : '';

  // 1. Fetch file data
  useEffect(() => {
    if (!filename || !projectId) return;

    let activeUrl: string | null = null;
    let isCancelled = false;

    // Reset previous states
    setBlobUrl(null);
    setRawBlob(null);
    setDocxBuffer(null);
    setTextContent(null);
    setDocError(null);
    setLoading(true);

    // Excel files handle their own loading
    if (ext === 'xlsx' || ext === 'xls') {
      setLoading(false);
      return;
    }

    async function loadDocument() {
      try {
        const resp = await documentsApi.viewUrl(projectId, filename);
        if (isCancelled) return;

        let mimeType = 'application/octet-stream';
        if (ext === 'pdf') {
          mimeType = 'application/pdf';
        } else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
          mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        } else if (['txt', 'log', 'md', 'csv', 'json', 'yaml', 'yml'].includes(ext)) {
          mimeType = 'text/plain; charset=utf-8';
        } else if (ext === 'docx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (ext === 'doc') {
          mimeType = 'application/msword';
        } else if (ext === 'pptx') {
          mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        }

        const buffer =
          resp.data instanceof ArrayBuffer ? resp.data : new Uint8Array(resp.data).buffer;

        const blob = new Blob([buffer], { type: mimeType });
        setRawBlob(blob);

        // For Text & Markdown files, decode text
        if (['txt', 'log', 'md', 'json', 'yaml', 'yml'].includes(ext)) {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(buffer);
          setTextContent(text);
          setLoading(false);
          return;
        }

        // For DOCX files, store buffer for rendering
        if (ext === 'docx' || ext === 'doc') {
          setDocxBuffer(buffer);
          setLoading(false);
          return;
        }

        // For PDF, Images, and other binary types, create an authenticated Blob URL
        const url = URL.createObjectURL(blob);
        activeUrl = url;
        setBlobUrl(url);
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading document:', err);
        if (!isCancelled) {
          setDocError(err.response?.data?.detail || 'Failed to load document content.');
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [filename, projectId, ext]);

  // 2. Render DOCX once DOM container and buffer are ready
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

  const handleDownload = () => {
    if (rawBlob) {
      const url = URL.createObjectURL(rawBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

  if (!projectId || !filename) return null;

  // 1. Excel spreadsheets (.xlsx, .xls) and CSV
  if (ext === 'xlsx' || ext === 'xls') {
    return <ExcelViewer projectId={projectId} filename={filename} />;
  }

  // Loading state (for non-DOCX files)
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

  // 2. Images (.png, .jpg, .jpeg, .gif, .webp, .svg, .bmp)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    return (
      <div className="bg-background/80 flex h-full w-full items-center justify-center p-4">
        {blobUrl ? (
          <img
            src={blobUrl}
            alt={filename}
            className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
          />
        ) : null}
      </div>
    );
  }

  // 3. Markdown (.md)
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

  // 4. Plain text, logs, JSON, YAML (.txt, .log, .json, .yaml, .yml, .csv)
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

  // 5. DOCX & Word documents (.docx, .doc)
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

  // 6. PowerPoint presentations (.pptx)
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

  // 7. PDF preview
  if (ext === 'pdf') {
    return (
      <div className="bg-muted/20 h-full w-full overflow-hidden">
        {blobUrl ? (
          <iframe
            title={filename}
            src={`${blobUrl}#toolbar=1&navpanes=0`}
            className="h-full w-full border-none"
          />
        ) : null}
      </div>
    );
  }

  // 8. Generic Fallback for other file types
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
