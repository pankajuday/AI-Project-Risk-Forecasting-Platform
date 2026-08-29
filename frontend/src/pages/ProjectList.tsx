import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, FolderOpen, Zap, FileText, Trash2, ChevronRight, Activity } from 'lucide-react';
import { projectsApi } from '@/api';
import type { Project } from '@/types';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="anim-fade-up mx-auto max-w-240">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-[26px] font-extrabold">My Projects</h1>
          <p className="text-sm text-(--text-muted)">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
          <Plus size={15} />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-45" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState onNew={() => navigate('/projects/new')} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {projects.map(p => {
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
      ? 'text-(--text-muted)'
      : health >= 70
        ? 'text-(--success)'
        : health >= 40
          ? 'text-(--warning)'
          : 'text-(--danger)';

  const statusBadge = statusMeta(p.status);

  return (
    <div className="card relative cursor-pointer p-5" onClick={onClick}>
      {/* Top row */}
      <div className="mb-3.5 flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-[10px] border border-indigo-500/25 bg-linear-to-br from-(--accent-soft) to-violet-500/15">
          <FolderOpen size={18} color="#a5b4fc" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`badge badge-${statusBadge.color}`}>{statusBadge.label}</span>
          <button
            className="btn btn-ghost px-2 py-1 text-xs"
            onClick={onDelete}
            title="Delete project"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Name & desc */}
      <h3 className="mb-1 text-[15px] font-bold">{p.name}</h3>
      {p.description && (
        <p className="mb-3.5 text-[13px] leading-normal text-(--text-muted)">
          {p.description.slice(0, 80)}
          {p.description.length > 80 ? '...' : ''}
        </p>
      )}

      {/* Stats row */}
      <div className="mt-auto flex gap-4 border-t border-(--border) pt-2.5 text-xs text-(--text-muted)">
        <span className="flex items-center gap-1.5">
          <FileText size={12} /> {p.total_files} docs
        </span>
        {health != null && (
          <span className={`flex items-center gap-1.5 font-semibold ${healthColor}`}>
            <Activity size={12} /> {health}/100
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          Open <ChevronRight size={12} />
        </span>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-[20px] border border-dashed border-(--border) bg-(--bg-surface) px-5 py-20 text-center">
      <div className="mx-auto mb-5 flex size-18 items-center justify-center rounded-[20px] border border-indigo-500/30 bg-(--accent-soft)">
        <Zap size={32} color="#a5b4fc" />
      </div>
      <h2 className="mb-2 text-xl font-bold">No projects yet</h2>
      <p className="mb-6 text-sm text-(--text-muted)">
        Create your first project to start analyzing risks and generating insights.
      </p>
      <button className="btn btn-primary" onClick={onNew}>
        <Plus size={15} /> Create First Project
      </button>
    </div>
  );
}

function statusMeta(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    created: { label: 'New', color: 'muted' },
    uploading: { label: 'Uploading', color: 'indigo' },
    indexing: { label: 'Indexing', color: 'indigo' },
    analysis_pending: { label: 'Pending', color: 'yellow' },
    analysis_running: { label: 'Analyzing', color: 'indigo' },
    analysis_ready: { label: 'Ready', color: 'green' },
    completed: { label: 'Complete', color: 'green' },
    failed: { label: 'Failed', color: 'red' },
    archived: { label: 'Archived', color: 'muted' },
  };
  return map[status] ?? { label: status, color: 'muted' };
}
