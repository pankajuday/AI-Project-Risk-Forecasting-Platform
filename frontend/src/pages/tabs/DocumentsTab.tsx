import { useState, useEffect, useRef } from 'react';
import { UploadCloud, File, Trash2, RefreshCw, X, Eye } from 'lucide-react';
import { documentsApi } from '@/api';
import type { DocumentRecord } from '@/types';
import Viewer from '../../components/DocumentViewer/Viewer';

export default function DocumentsTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
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
    for (let i = 0; i < files.length; i++) {
      try {
        await documentsApi.upload(projectId, files[i]);
      } catch (err) {
        console.error('Upload failed for', files[i].name, err);
      }
    }
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
      className="anim-fade-in relative min-h-[300px] transition-all"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-500 bg-[var(--bg-elevated)]/90 backdrop-blur-sm transition-all">
          <UploadCloud size={48} className="mb-3 animate-bounce text-indigo-500" />
          <p className="text-base font-semibold text-[var(--text-primary)]">
            Drop your files here to upload
          </p>
        </div>
      )}

      <div className="mb-5 flex justify-between">
        <h3 className="text-lg font-bold">Project Documents</h3>
        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <RefreshCw size={15} className="anim-spin" /> : <UploadCloud size={15} />}
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleUpload}
          accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx"
        />
      </div>

      {loading ? (
        <div className="skeleton h-[100px]" />
      ) : docs.length === 0 ? (
        <div 
          className={`card border-dashed px-5 py-[60px] text-center transition-colors ${
            isDragging ? 'border-indigo-500 bg-indigo-500/5' : ''
          }`}
        >
          <UploadCloud size={32} color="var(--text-muted)" className="mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">No documents uploaded yet.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Drag & drop files here, or click Upload File above
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {docs.map(doc => {
            const docId = doc.id || (doc as any)._id;
            return (
              <div key={docId} className="card flex items-center px-5 py-3">
                <File size={20} color="var(--accent)" className="mr-4" />
                <div className="flex-1">
                  <div className="text-[15px] font-semibold">{doc.filename}</div>
                  <div className="mt-1 flex gap-3 text-xs text-[var(--text-muted)]">
                    <span>{formatBytes(doc.file_size)}</span>
                    <span>·</span>
                    <DocStatusBadge status={doc.processing_status} />
                    {doc.processing_status === 'completed' && (
                      <>
                        <span>·</span>
                        <span>{doc.chunk_count} chunks</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost px-2.5 py-1.5"
                    onClick={() => setSelectedDoc(doc.filename)}
                    title="Preview Document"
                  >
                    <Eye />
                  </button>
                  <button
                    className="btn btn-ghost px-2.5 py-1.5"
                    onClick={() => handleDelete(docId)}
                    title="Delete Document"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedDoc && (
        <div
          className="anim-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(2, 4, 14, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
          }}
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="card"
            style={{
              width: 'min(900px, 94vw)',
              height: 'min(75vh, 660px)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              border: '1px solid var(--border-glow)',
              position: 'relative',
              margin: '0 auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <File size={18} color="var(--accent-glow)" />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedDoc}
                </span>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => setSelectedDoc(null)}
              >
                <X />
              </button>
            </div>

            {/* Viewer Content */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <Viewer projectId={projectId} filename={selectedDoc} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'muted' },
    processing: { label: 'Ingesting...', color: 'indigo' },
    completed: { label: 'Indexed', color: 'green' },
    failed: { label: 'Failed', color: 'red' },
  };
  const config = map[status] || { label: status, color: 'muted' };
  return <span className={`badge badge-${config.color}`}>{config.label}</span>;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}