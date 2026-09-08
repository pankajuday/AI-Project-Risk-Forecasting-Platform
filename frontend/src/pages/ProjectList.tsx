import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  FolderOpen,
  Zap,
  FileText,
  Trash2,
  ChevronRight,
  Activity,
  Search,
} from 'lucide-react';
import { projectsApi } from '@/api';
import type { Project } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    projectsApi
      .list()
      .then(r => setProjects(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its data?')) return;
    await projectsApi.delete(id);
    setProjects(p => p.filter(x => x.id !== id));
  };

  const filtered = projects.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="anim-fade-up mx-auto max-w-6xl space-y-6">
      {/* Header Section */}
      <div className="border-border flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {projects.length} project{projects.length !== 1 ? 's' : ''} — manage, upload, and
            analyze your project intelligence.
          </p>
        </div>
        <Button onClick={() => navigate('/projects/new')} className="shrink-0 gap-2">
          <Plus size={16} />
          <span>New Project</span>
        </Button>
      </div>

      {/* Search Input Bar */}
      {!loading && projects.length > 0 && (
        <div className="relative max-w-md">
          <Search
            size={15}
            className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          />
          <Input
            placeholder="Search projects by title or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      )}

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="space-y-3 p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState onNew={() => navigate('/projects/new')} />
      ) : filtered.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">No projects match "{search}"</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => {
            const pId = p.id || (p as any)._id;
            return (
              <ProjectCard
                key={pId}
                project={p}
                onClick={() => navigate(`/projects/${pId}`)}
                onDelete={e => handleDelete(e, pId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project: p,
  onClick,
  onDelete,
}: {
  project: Project;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const health = p.current_health_score;
  const healthColor =
    health == null
      ? 'text-muted-foreground'
      : health >= 70
        ? 'text-emerald-500 font-semibold'
        : health >= 40
          ? 'text-amber-500 font-semibold'
          : 'text-red-500 font-semibold';

  const statusBadge = statusMeta(p.status);

  return (
    <Card
      onClick={onClick}
      className="group hover:border-foreground/40 relative flex cursor-pointer flex-col justify-between transition-all hover:shadow-md"
    >
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between">
          <div className="border-border bg-muted text-foreground flex size-9 items-center justify-center rounded-lg border">
            <FolderOpen size={18} />
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={onDelete}
              title="Delete project"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>

        <div>
          <CardTitle className="text-foreground group-hover:text-primary truncate text-base font-bold">
            {p.name}
          </CardTitle>
          {p.description && (
            <CardDescription className="mt-1 line-clamp-2 text-xs">{p.description}</CardDescription>
          )}
        </div>
      </CardHeader>

      <CardFooter className="border-border text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <FileText size={13} />
            <span>{p.total_files} docs</span>
          </span>

          {health != null && (
            <span className={`flex items-center gap-1 ${healthColor}`}>
              <Activity size={13} />
              <span>{health}% score</span>
            </span>
          )}
        </div>

        <span className="text-foreground flex items-center gap-0.5 font-medium opacity-0 transition-opacity group-hover:opacity-100">
          <span>Open</span>
          <ChevronRight size={13} />
        </span>
      </CardFooter>
    </Card>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
      <div className="border-border bg-muted text-foreground mb-4 flex size-14 items-center justify-center rounded-full border">
        <Zap size={24} />
      </div>
      <h2 className="text-foreground mb-1 text-lg font-bold">No projects found</h2>
      <p className="text-muted-foreground mb-6 max-w-sm text-xs">
        Create your first project to start uploading documents, running AI analysis, and forecasting
        risks.
      </p>
      <Button onClick={onNew} className="gap-2">
        <Plus size={15} />
        <span>Create First Project</span>
      </Button>
    </Card>
  );
}

function statusMeta(status: string): {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
} {
  const map: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
    created: { label: 'New', variant: 'outline' },
    uploading: { label: 'Uploading', variant: 'secondary' },
    indexing: { label: 'Indexing', variant: 'secondary' },
    analysis_pending: { label: 'Pending', variant: 'outline' },
    analysis_running: { label: 'Analyzing', variant: 'secondary' },
    analysis_ready: { label: 'Ready', variant: 'default' },
    completed: { label: 'Complete', variant: 'default' },
    failed: { label: 'Failed', variant: 'destructive' },
    archived: { label: 'Archived', variant: 'outline' },
  };
  return map[status] ?? { label: status, variant: 'outline' };
}
