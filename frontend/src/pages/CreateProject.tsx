import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronLeft, UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { projectsApi, documentsApi } from '@/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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
        await Promise.all(files.map(file => documentsApi.upload(newProjectId, file)));
      }

      // 3. Navigate to the project detail view
      navigate(`/projects/${newProjectId}`);
    } catch (error) {
      console.error(error);
      toast('Failed to create project or upload documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="anim-fade-up mx-auto max-w-xl space-y-4 py-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground gap-1 text-xs"
        onClick={() => navigate('/projects')}
      >
        <ChevronLeft size={16} />
        <span>Back to Projects</span>
      </Button>

      {/* Main Card Form */}
      <Card className="border-border shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-foreground text-xl font-bold">Create New Project</CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Start a new AI-powered risk analysis workspace and attach project documents.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {/* Project Name Field */}
            <div className="space-y-1.5">
              <label className="text-foreground text-xs font-semibold">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Q3 Migration Project"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                className="text-xs"
              />
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <label className="text-foreground text-xs font-semibold">Description</label>
              <textarea
                placeholder="Briefly describe the project goals and scope..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border bg-transparent px-3 py-2 text-xs shadow-xs transition-colors focus-visible:ring-1 focus-visible:outline-none"
              />
            </div>

            {/* Drag and Drop Upload Zone */}
            <div className="space-y-2">
              <label className="text-foreground text-xs font-semibold">Project Documents</label>

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
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? 'border-foreground bg-muted'
                    : 'border-border bg-muted/30 hover:border-foreground/40 hover:bg-muted/60'
                }`}
              >
                <div className="border-border bg-background text-foreground mb-2 rounded-full border p-2.5 shadow-xs">
                  <UploadCloud size={20} />
                </div>
                <p className="text-foreground text-xs font-semibold">
                  Click to upload{' '}
                  <span className="text-muted-foreground font-normal">or drag & drop</span>
                </p>
                <p className="text-muted-foreground mt-1 text-[11px]">
                  PDF, DOCX, TXT, CSV (Max 10MB per file)
                </p>
              </div>

              {/* Uploaded Files List */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="border-border bg-muted/40 flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-2 truncate">
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-foreground truncate font-medium">{file.name}</span>
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={e => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="text-muted-foreground hover:text-destructive h-6 w-6 shrink-0"
                      >
                        <X size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="border-border flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/projects')}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim()}
              className="gap-1.5 text-xs"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Create Project</span>
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
