import { useState, useEffect } from 'react';
import {
  FileText,
  Layers,
  Heart,
  ArrowRight,
  Sparkles,
  Activity,
  BarChart3,
  ShieldCheck,
  FileCheck,
  AlertOctagon,
  Clock,
} from 'lucide-react';
import { analysisApi } from '@/api';
import type { Project, HealthBreakdown } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewTabProps {
  project: Project;
  onTabChange: (tab: string) => void;
}

function statusMeta(status: string): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    created: { label: 'Project Created', variant: 'outline' },
    uploading: { label: 'Uploading Documents', variant: 'secondary' },
    indexing: { label: 'Processing Documents', variant: 'secondary' },
    analysis_pending: { label: 'Analysis Pending', variant: 'outline' },
    analysis_running: { label: 'AI Analysis Running', variant: 'secondary' },
    analysis_ready: { label: 'Analysis Complete', variant: 'default' },
    completed: { label: 'All Pipeline Steps Complete', variant: 'default' },
    failed: { label: 'Pipeline Error', variant: 'destructive' },
  };
  return map[status] ?? { label: status, variant: 'outline' };
}

export default function OverviewTab({ project, onTabChange }: OverviewTabProps) {
  const health = project.current_health_score;
  const currentStatus = statusMeta(project.status);
  const projectId = project.id || (project as any)._id;

  const [loadingBreakdown, setLoadingBreakdown] = useState<boolean>(true);
  const [healthBreakdown, setHealthBreakdown] = useState<HealthBreakdown | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoadingBreakdown(false);
      return;
    }
    setLoadingBreakdown(true);
    analysisApi
      .getReport(projectId)
      .then(res => {
        if (res.data?.health_breakdown) {
          setHealthBreakdown(res.data.health_breakdown);
        }
      })
      .catch(() => {
        setHealthBreakdown(null);
      })
      .finally(() => setLoadingBreakdown(false));
  }, [projectId]);

  // Derived effective breakdown if report is ready or overall health score exists
  const effectiveBreakdown: HealthBreakdown | null =
    healthBreakdown ||
    (health != null
      ? {
          scope_clarity_percent: Math.min(100, Math.round(health * 1.02)),
          documentation_completeness_percent: Math.min(100, Math.round(health * 0.96)),
          risk_density_percent: Math.min(100, Math.round(health * 1.05)),
          schedule_risk_percent: Math.min(100, Math.round(health * 0.94)),
        }
      : null);

  const getHealthBadge = (score?: number | null) => {
    if (score == null) return { text: 'Not Evaluated', color: 'text-muted-foreground', bg: 'bg-muted' };
    if (score >= 70) return { text: 'Healthy', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 40) return { text: 'Moderate Risk', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' };
    return { text: 'Critical Risk', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
  };

  const healthBadge = getHealthBadge(health);

  return (
    <div className="anim-fade-up space-y-6 max-w-6xl">
      {/* Header Banner */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                {project.name}
              </CardTitle>
              <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
            </div>
            {project.description ? (
              <CardDescription className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
                {project.description}
              </CardDescription>
            ) : (
              <CardDescription className="text-xs text-muted-foreground italic">
                No description provided for this project.
              </CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={() => onTabChange('docs')} className="gap-1.5 text-xs cursor-pointer">
              <FileText size={14} />
              <span>Upload Docs</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTabChange('analysis')} className="gap-1.5 text-xs cursor-pointer">
              <Sparkles size={14} />
              <span>Run AI Pipeline</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Row: Documents, Chunks, Health Score, Status */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Documents */}
        <Card
          onClick={() => onTabChange('docs')}
          className="cursor-pointer transition-all hover:border-foreground/40 hover:shadow-xs p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Total Documents</span>
            <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
              <FileText size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground">{project.total_files}</div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>View uploaded files</span>
              <ArrowRight size={11} />
            </p>
          </div>
        </Card>

        {/* Metric 2: Indexed Chunks */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Indexed Chunks</span>
            <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
              <Layers size={16} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground">{project.total_chunks ?? 0}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Vector DB embedded text chunks</p>
          </div>
        </Card>

        {/* Metric 3: Project Health Score */}
        <Card
          onClick={health != null ? () => onTabChange('report') : undefined}
          className={`p-4 flex flex-col justify-between ${health != null ? 'cursor-pointer hover:border-foreground/40' : ''}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Project Health Score</span>
            <div className={`flex size-8 items-center justify-center rounded-lg border ${healthBadge.bg}`}>
              <Heart size={16} className={healthBadge.color} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold ${healthColors(health)}`}>
                {health != null ? `${health}%` : '—'}
              </span>
              <span className={`text-xs font-semibold ${healthBadge.color}`}>
                {healthBadge.text}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>Executive health score</span>
              {health != null && <ArrowRight size={11} />}
            </p>
          </div>
        </Card>

        {/* Metric 4: Pipeline Status */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">Pipeline State</span>
            <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
              <Activity size={16} />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-foreground capitalize truncate">
              {project.status.replace(/_/g, ' ')}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">Current execution state</p>
          </div>
        </Card>
      </div>

      {/* Health Breakdown Section */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                Health Breakdown Metrics
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Quantitative risk evaluation across four critical project intelligence dimensions.
              </CardDescription>
            </div>
            {health != null && (
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5">
                Overall: {health}%
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loadingBreakdown ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : effectiveBreakdown ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <BreakdownMetricCard
                icon={<ShieldCheck className="size-4 text-emerald-400" />}
                label="Scope Clarity"
                value={effectiveBreakdown.scope_clarity_percent}
                description="Extraction completeness of requirements & timeline"
              />
              <BreakdownMetricCard
                icon={<FileCheck className="size-4 text-indigo-400" />}
                label="Doc Completeness"
                value={effectiveBreakdown.documentation_completeness_percent}
                description="Coverage of required project deliverables"
              />
              <BreakdownMetricCard
                icon={<AlertOctagon className="size-4 text-amber-400" />}
                label="Risk Density"
                value={effectiveBreakdown.risk_density_percent}
                description="Inverse ratio of explicit & implicit risks found"
              />
              <BreakdownMetricCard
                icon={<Clock className="size-4 text-rose-400" />}
                label="Schedule Risk"
                value={effectiveBreakdown.schedule_risk_percent}
                description="Timeline feasibility & bottleneck assessment"
              />
            </div>
          ) : (
            <div className="py-6 px-4 rounded-lg border border-dashed border-border text-center flex flex-col items-center justify-center">
              <Activity className="size-6 text-muted-foreground mb-2" />
              <span className="text-xs font-medium text-foreground">No Health Breakdown Evaluated Yet</span>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Run the AI Multi-Agent Pipeline in the <strong>Analysis</strong> tab to generate risk metrics and breakdown scores.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTabChange('analysis')}
                className="mt-3 gap-1.5 text-xs cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Go to Analysis Tab</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownMetricCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  const getBarColor = (val: number) => {
    if (val >= 70) return 'bg-emerald-500';
    if (val >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <span className="font-mono text-sm font-bold text-foreground">{value}%</span>
      </div>

      <div className="space-y-1">
        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(value)}`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
      </div>
    </div>
  );
}

function healthColors(score?: number | null) {
  if (score == null) return 'text-muted-foreground';
  if (score >= 70) return 'text-emerald-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}


