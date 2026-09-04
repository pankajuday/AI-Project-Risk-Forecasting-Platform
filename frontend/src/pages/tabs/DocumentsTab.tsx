import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, Trash2, RefreshCw, X, Eye, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { documentsApi } from '@/api';
import type { DocumentRecord } from '@/types';
import Viewer from '../../components/DocumentViewer/Viewer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/** Shape of a per-file validation failure returned by the backend (HTTP 422). */
interface UploadError {
  filename: string;
  message: string;
}

/** Extract a user-friendly message from an Axios error response. */
function extractUploadErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (
      err as { response?: { data?: { detail?: { message?: string; code?: string } | string } } }
    ).response;
    const detail = res?.data?.detail;
    if (detail && typeof detail === 'object' && detail.message) {
      return detail.message;
    }
    if (typeof detail === 'string') return detail;
  }
  return 'Upload failed. Please try again.';
}

export default function DocumentsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = () => {
    documentsApi
      .list(projectId)
      .then(res => setDocs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
    const interval = setInterval(() => {
      setDocs(current => {
        const needsUpdate = current.some(
          d => d.processing_status === 'pending' || d.processing_status === 'processing',
        );
        if (needsUpdate) {
          fetchDocs();
        }
        return current;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Core file upload process shared by file picker and drag-and-drop
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadErrors([]); // clear previous errors
    const newErrors: UploadError[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        await documentsApi.upload(projectId, files[i]);
      } catch (err) {
        console.error('Upload failed for', files[i].name, err);
        newErrors.push({
          filename: files[i].name,
          message: extractUploadErrorMessage(err),
        });
      }
    }

    setUploadErrors(newErrors);
    setUploading(false);
    fetchDocs();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentsApi.delete(projectId, id);
      setDocs(docs.filter(d => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="relative min-h-[300px] space-y-6 transition-all"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/90 backdrop-blur-sm transition-all duration-200">
          <div className="p-4 rounded-full bg-primary/10 mb-3 animate-bounce">
            <UploadCloud className="size-8 text-primary" />
          </div>
          <p className="text-base font-semibold text-foreground">
            Drop your files here to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF, DOCX, TXT, CSV, XLSX, PPTX
          </p>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Project Documents</h2>
            {!loading && docs.length > 0 && (
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                {docs.length} {docs.length === 1 ? 'file' : 'files'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Upload specifications, architecture diagrams, and project files for AI risk analysis and RAG retrieval.
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 gap-2 cursor-pointer"
        >
          {uploading ? <RefreshCw className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          {uploading ? 'Uploading...' : 'Upload Document'}
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleUpload}
          accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx"
        />
      </div>

      {/* Per-file validation error banners */}
      {uploadErrors.length > 0 && (
        <div className="space-y-2">
          {uploadErrors.map((e, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-destructive">{e.filename}: </span>
                <span className="text-muted-foreground">{e.message}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setUploadErrors(prev => prev.filter((_, i) => i !== idx))}
                aria-label="Dismiss error"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Document List / Empty / Loading State */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : docs.length === 0 ? (
        <Card className={`border-dashed py-12 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'bg-card/50'
        }`}>
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 rounded-full bg-muted/60 mb-4">
              <UploadCloud className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground">No documents uploaded yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Drag and drop project files here, or click the button below to upload documents for RAG context extraction.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="size-4" />
              Select Files
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => {
            const docId = doc.id || (doc as any)._id;
            return (
              <Card
                key={docId}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-all duration-200 hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="p-2.5 rounded-lg bg-muted/60 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-foreground">
                      {doc.filename}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatBytes(doc.file_size)}</span>
                      <span>•</span>
                      <DocStatusBadge status={doc.processing_status} />
                      {doc.processing_status === 'completed' && (
                        <>
                          <span>•</span>
                          <span className="text-muted-foreground">{doc.chunk_count} chunks</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border justify-end">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedDoc(doc.filename)}
                    title="Preview Document"
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Eye className="size-4" />
                    <span className="sr-only">Preview</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(docId)}
                    title="Delete Document"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Modal - Preserved Original Component */}
      {selectedDoc && (
        <div
          className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="card w-full max-w-4xl max-h-[85vh] h-[660px] flex flex-col p-0 overflow-hidden shadow-2xl border border-indigo-500/30 relative mx-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--border) bg-(--bg-elevated) shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={18} className="text-indigo-400 shrink-0" />
                <span className="font-bold text-sm text-(--text-primary) truncate">
                  {selectedDoc}
                </span>
              </div>
              <button
                className="btn btn-ghost px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                onClick={() => setSelectedDoc(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 min-h-0 relative">
              <Viewer projectId={projectId} filename={selectedDoc} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1 text-[11px] px-2 py-0.5 font-normal">
          <CheckCircle2 className="size-3 text-emerald-400" />
          Indexed
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 gap-1 text-[11px] px-2 py-0.5 font-normal">
          <RefreshCw className="size-3 animate-spin text-amber-400" />
          Ingesting...
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1 text-[11px] px-2 py-0.5 font-normal">
          <AlertTriangle className="size-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0.5 font-normal text-muted-foreground">
          <Clock className="size-3" />
          Pending
        </Badge>
      );
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

