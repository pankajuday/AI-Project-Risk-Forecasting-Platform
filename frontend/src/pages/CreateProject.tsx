import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronLeft, UploadCloud, FileText, X } from 'lucide-react';
import { projectsApi, documentsApi } from '@/api';

export default function CreateProject() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);
      e.dataTransfer.clearData();
    }
  };

  // Handle Manual File Selection via Browser Dialog
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      e.target.value = '';
    }
  };

  // Remove a selected file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Real API Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);

      // 1. Create the project standard payload
      const res = await projectsApi.create({ name, description });
      const newProjectId = res.data.id;

      // 2. Upload attached documents if any were dropped/selected
      if (files.length > 0) {
        await Promise.all(
          files.map(file => documentsApi.upload(newProjectId, file))
        );
      }

      // 3. Navigate to the project detail view
      navigate(`/projects/${newProjectId}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create project or upload documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="anim-fade-up mx-auto mt-10 max-w-xl">
      <button className="btn btn-ghost mb-6 px-3 py-1.5" onClick={() => navigate('/projects')}>
        <ChevronLeft size={16} /> Back to Projects
      </button>

      <div className="card">
        <h1 className="mb-2 text-2xl font-extrabold">Create New Project</h1>
        <p className="mb-6 text-[var(--text-muted)]">
          Start a new AI-powered risk analysis workspace.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="mb-2 block text-[13px] font-semibold text-[var(--text-secondary)]">
              Project Name *
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Q3 Migration Project"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-[13px] font-semibold text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              placeholder="Briefly describe the project goals..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="input resize-y"
            />
          </div>

          {/* Drag and Drop Zone */}
          <div className="mb-6">
            <label className="mb-2 block text-[13px] font-semibold text-[var(--text-secondary)]">
              Project Documents
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept=".pdf,.docx,.txt,.csv"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                isDragging
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-glow)]'
              }`}
            >
              <div className="mb-2 rounded-full bg-[var(--bg-overlay)] p-3 text-[var(--accent)]">
                <UploadCloud size={24} />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Click to upload <span className="font-normal text-[var(--text-muted)]">or drag & drop</span>
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                PDF, DOCX, TXT, CSV (Max 10MB per file)
              </p>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={16} className="text-[var(--accent)]" />
                      <span className="truncate font-medium text-[var(--text-primary)]">
                        {file.name}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] hover:text-[var(--danger)]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/projects')}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
              {loading ? (
                <>Creating...</>
              ) : (
                <>
                  <Plus size={16} /> Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}