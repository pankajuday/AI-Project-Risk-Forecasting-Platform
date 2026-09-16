import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ChevronLeft, Loader2 } from 'lucide-react';
import { projectsApi } from '@/api';
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

import { useAuth } from '@/context/AuthContext';

export default function CreateProject() {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Real API Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!isAuthenticated) {
      toast.error('Please sign in to create a project');
      openAuthModal('login');
      return;
    }

    try {
      setLoading(true);

      // 1. Create the project standard payload
      const res = await projectsApi.create({ name, description });
      const newProjectId = res.data.id || (res.data as any)._id;

      toast.success('Project created successfully!');
      // 2. Navigate to the project detail view
      navigate(`/projects/${newProjectId}`);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please sign in again.');
        openAuthModal('login');
      } else {
        const errorMsg =
          error.response?.data?.detail || 'Failed to create project or upload documents';
        toast.error(errorMsg);
      }
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
