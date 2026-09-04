import { useState } from 'react';
import {
  Trash2,
  Save,
  AlertTriangle,
  Settings2,
  Info,
  Hash,
  FileStack,
  Layers,
  CalendarDays,
  RefreshCw,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { projectsApi } from '@/api';
import { useNavigate } from 'react-router';
import type { Project, ProjectStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ProjectSettingsTabProps {
  project: Project;
  onProjectUpdated: () => void;
}

const STATUS_STYLES: Record<
  ProjectStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  created: { label: 'Created', variant: 'secondary' },
  uploading: { label: 'Uploading', variant: 'secondary' },
  indexing: { label: 'Indexing', variant: 'secondary' },
  analysis_pending: { label: 'Analysis Pending', variant: 'outline' },
  analysis_running: { label: 'Analysis Running', variant: 'outline' },
  analysis_ready: { label: 'Analysis Ready', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
  archived: { label: 'Archived', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' },
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProjectSettingsTab({ project, onProjectUpdated }: ProjectSettingsTabProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const isDirty = name !== project.name || description !== (project.description ?? '');

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      onProjectUpdated();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await projectsApi.delete(project.id || (project as any)._id);
      navigate('/projects');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const projectId = project.id || (project as any)._id || '—';
  const statusMeta = STATUS_STYLES[project.status] ?? {
    label: project.status,
    variant: 'outline' as const,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      {/*  Page Header  */}
      <div className="flex items-start gap-3">
        <div className="bg-muted border-border shrink-0 rounded-lg border p-2.5">
          <Settings2 size={18} className="text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">Project Settings</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Manage configuration, metadata, and lifecycle of this project.
          </p>
        </div>
      </div>

      {/*  General Settings  */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Settings2 size={15} className="text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">General</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Update your project's display name and description.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-5 pt-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="proj-name" className="text-foreground text-xs font-medium">
              Project Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="proj-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="text-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="proj-desc" className="text-foreground text-xs font-medium">
              Description
            </label>
            <textarea
              id="proj-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the purpose and scope of this project..."
              rows={4}
              className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-muted-foreground text-[11px]">
              {description.length} / 500 characters
            </p>
          </div>

          {/* Save */}
          <div className="flex items-center justify-between pt-1">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                Changes saved successfully
              </span>
            )}
            {!saveSuccess && <span />}

            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !isDirty}
              size="sm"
              className="min-w-28 gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={13} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/*  Project Info  */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Project Information</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Read-only metadata about this project.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <InfoTile
              icon={<Hash size={14} className="text-muted-foreground" />}
              label="Project ID"
              value={projectId}
              mono
            />

            <InfoTile
              icon={<Activity size={14} className="text-muted-foreground" />}
              label="Status"
              value={
                <Badge variant={statusMeta.variant} className="px-2 py-0.5 text-[10px] capitalize">
                  {statusMeta.label}
                </Badge>
              }
            />

            <InfoTile
              icon={<FileStack size={14} className="text-muted-foreground" />}
              label="Total Documents"
              value={String(project.total_files)}
            />

            <InfoTile
              icon={<Layers size={14} className="text-muted-foreground" />}
              label="Total Chunks"
              value={String(project.total_chunks ?? 0)}
            />

            <InfoTile
              icon={<CalendarDays size={14} className="text-muted-foreground" />}
              label="Created At"
              value={formatDate(project.created_at)}
            />

            <InfoTile
              icon={<RefreshCw size={14} className="text-muted-foreground" />}
              label="Last Updated"
              value={formatDate(project.updated_at)}
            />
          </div>
        </CardContent>
      </Card>

      {/*  Danger Zone  */}
      <Card className="border-destructive/40 bg-destructive/3">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-destructive" />
            <CardTitle className="text-destructive text-sm font-semibold">Danger Zone</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Irreversible actions that permanently affect this project and all its data.
          </CardDescription>
        </CardHeader>
        <Separator className="bg-destructive/20" />
        <CardContent className="space-y-4 pt-5">
          <div className="border-destructive/25 bg-destructive/5 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-start">
            <div className="bg-destructive/10 shrink-0 rounded-md p-2">
              <AlertTriangle size={15} className="text-destructive" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-foreground text-sm font-medium">Delete this project</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  This will permanently remove the project, all uploaded documents, embeddings,
                  analysis reports, and generated content.{' '}
                  <strong className="text-foreground">This action cannot be undone.</strong>
                </p>
              </div>

              {/* Confirmation input */}
              <div className="space-y-1.5">
                <label htmlFor="delete-confirm" className="text-muted-foreground text-xs">
                  Type{' '}
                  <code className="text-foreground bg-muted rounded px-1 py-0.5 text-[11px]">
                    {project.name}
                  </code>{' '}
                  <span className="pr-1">to confirm</span>
                </label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={project.name}
                  className="border-destructive/30 focus-visible:ring-destructive/40 max-w-xs text-sm"
                />
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== project.name}
                className="gap-2"
              >
                {deleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Delete Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/*  InfoTile helper  */
function InfoTile({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="bg-muted/40 border-border/60 flex items-start gap-3 rounded-lg border p-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
          {label}
        </p>
        {typeof value === 'string' ? (
          <p
            className={`text-foreground truncate text-sm ${mono ? 'font-mono text-[11px]' : 'font-medium'}`}
          >
            {value}
          </p>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
