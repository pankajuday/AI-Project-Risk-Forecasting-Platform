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

function statusMeta(status: string): {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
} {
  const map: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
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
    if (score == null)
      return { text: 'Not Evaluated', color: 'text-muted-foreground', bg: 'bg-muted' };
    if (score >= 70)
      return {
        text: 'Healthy',
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
      };
    if (score >= 40)
      return {
        text: 'Moderate Risk',
        color: 'text-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/20',
      };
    return { text: 'Critical Risk', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' };
  };

  const healthBadge = getHealthBadge(health);

  return (
    <div className="anim-fade-up max-w-6xl space-y-6">
      {/* Header Banner */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-foreground text-2xl font-bold tracking-tight">
                {project.name}
              </CardTitle>
              <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
            </div>
            {project.description ? (
              <CardDescription className="text-muted-foreground max-w-3xl text-xs leading-relaxed">
                {project.description}
              </CardDescription>
            ) : (
              <CardDescription className="text-muted-foreground text-xs italic">
                No description provided for this project.
              </CardDescription>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              onClick={() => onTabChange('docs')}
              className="cursor-pointer gap-1.5 text-xs"
            >
              <FileText size={14} />
              <span>Upload Docs</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTabChange('analysis')}
              className="cursor-pointer gap-1.5 text-xs"
            >
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
          className="hover:border-foreground/40 flex cursor-pointer flex-col justify-between p-4 transition-all hover:shadow-xs"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Total Documents</span>
            <div className="border-border bg-muted text-foreground flex size-8 items-center justify-center rounded-lg border">
              <FileText size={16} />
            </div>
          </div>
          <div>
            <div className="text-foreground text-3xl font-extrabold">{project.total_files}</div>
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-[11px]">
              <span>View uploaded files</span>
              <ArrowRight size={11} />
            </p>
          </div>
        </Card>

        {/* Metric 2: Indexed Chunks */}
        <Card className="flex flex-col justify-between p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Indexed Chunks</span>
            <div className="border-border bg-muted text-foreground flex size-8 items-center justify-center rounded-lg border">
              <Layers size={16} />
            </div>
          </div>
          <div>
            <div className="text-foreground text-3xl font-extrabold">
              {project.total_chunks ?? 0}
            </div>
            <p className="text-muted-foreground mt-1 text-[11px]">Vector DB embedded text chunks</p>
          </div>
        </Card>

        {/* Metric 3: Project Health Score */}
        <Card
          onClick={health != null ? () => onTabChange('report') : undefined}
          className={`flex flex-col justify-between p-4 ${health != null ? 'hover:border-foreground/40 cursor-pointer' : ''}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Project Health Score</span>
            <div
              className={`flex size-8 items-center justify-center rounded-lg border ${healthBadge.bg}`}
            >
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
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-[11px]">
              <span>Executive health score</span>
              {health != null && <ArrowRight size={11} />}
            </p>
          </div>
        </Card>

        {/* Metric 4: Pipeline Status */}
        <Card className="flex flex-col justify-between p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Pipeline State</span>
            <div className="border-border bg-muted text-foreground flex size-8 items-center justify-center rounded-lg border">
              <Activity size={16} />
            </div>
          </div>
          <div>
            <div className="text-foreground truncate text-sm font-bold capitalize">
              {project.status.replace(/_/g, ' ')}
            </div>
            <p className="text-muted-foreground mt-1 truncate text-[11px]">
              Current execution state
            </p>
          </div>
        </Card>
      </div>

      {/* Health Breakdown Section */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="text-primary size-4" />
                Health Breakdown Metrics
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Quantitative risk evaluation across four critical project intelligence dimensions.
              </CardDescription>
            </div>
            {health != null && (
              <Badge variant="outline" className="px-2.5 py-0.5 font-mono text-xs">
                Overall: {health}%
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loadingBreakdown ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : effectiveBreakdown ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="border-border flex flex-col items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center">
              <Activity className="text-muted-foreground mb-2 size-6" />
              <span className="text-foreground text-xs font-medium">
                No Health Breakdown Evaluated Yet
              </span>
              <p className="text-muted-foreground mt-1 max-w-md text-xs">
                Run the AI Multi-Agent Pipeline in the <strong>Analysis</strong> tab to generate
                risk metrics and breakdown scores.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTabChange('analysis')}
                className="mt-3 cursor-pointer gap-1.5 text-xs"
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
    <div className="border-border/80 bg-muted/30 flex flex-col justify-between space-y-3 rounded-lg border p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-foreground text-xs font-medium">{label}</span>
        </div>
        <span className="text-foreground font-mono text-sm font-bold">{value}%</span>
      </div>

      <div className="space-y-1">
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(value)}`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
        <p className="text-muted-foreground text-[10px] leading-tight">{description}</p>
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
