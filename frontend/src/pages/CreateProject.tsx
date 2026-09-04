import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronLeft, UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { projectsApi, documentsApi } from '@/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
        className="gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/projects')}
      >
        <ChevronLeft size={16} />
        <span>Back to Projects</span>
      </Button>

      {/* Main Card Form */}
      <Card className="border-border shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl font-bold text-foreground">Create New Project</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Start a new AI-powered risk analysis workspace and attach project documents.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {/* Project Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
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
              <label className="text-xs font-semibold text-foreground">Description</label>
              <textarea
                placeholder="Briefly describe the project goals and scope..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Drag and Drop Upload Zone */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Project Documents</label>

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
                <div className="mb-2 rounded-full border border-border bg-background p-2.5 text-foreground shadow-xs">
                  <UploadCloud size={20} />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Click to upload <span className="font-normal text-muted-foreground">or drag & drop</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  PDF, DOCX, TXT, CSV (Max 10MB per file)
                </p>
              </div>

              {/* Uploaded Files List */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <FileText size={14} className="text-muted-foreground shrink-0" />
                        <span className="truncate font-medium text-foreground">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
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
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-2 border-t border-border pt-4">
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
            <Button type="submit" size="sm" disabled={loading || !name.trim()} className="text-xs gap-1.5">
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
