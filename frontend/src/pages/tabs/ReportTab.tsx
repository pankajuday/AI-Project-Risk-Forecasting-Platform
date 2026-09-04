import { useState, useEffect } from 'react';
import {
  FileText,
  ShieldAlert,
  CheckCircle2,
  Target,
  Users,
} from 'lucide-react';
import { analysisApi } from '@/api';
import type { AnalysisReport } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportTab({ projectId }: { projectId: string }) {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    analysisApi
      .getReport(projectId)
      .then(res => setReport(res.data))
      .catch(err =>
        setError(err.response?.status === 404 ? 'No analysis report found.' : 'Error loading report.'),
      )
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <Card className="border-dashed py-12 text-center max-w-2xl mx-auto my-8">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="p-3 rounded-full bg-muted/60 mb-4">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground">No Analysis Report Available</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {error || 'Run the multi-agent analysis in the Analysis tab to generate a risk forecasting report.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto transition-all duration-300">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Analysis & Risk Report</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Executive summary of project health metrics, scope breakdown, and key risk indicators.
        </p>
      </div>

      {/* Top row: Health Score & Scope Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-stretch">
        <HealthScoreCard report={report} />
        <ScopeSummaryCard report={report} />
      </div>

      {/* Risk Register Table */}
      <Card className="border-border/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" />
              Risk Register
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Identified project risks categorized by severity and recommended mitigation strategies.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5">
            {report.risks.length} {report.risks.length === 1 ? 'Risk' : 'Risks'} Identified
          </Badge>
        </CardHeader>

        <CardContent>
          {report.risks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No specific risks identified for this project workspace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Risk Title</th>
                    <th className="pb-3 px-4 font-medium">Category</th>
                    <th className="pb-3 px-4 font-medium">Severity</th>
                    <th className="pb-3 pl-4 font-medium">Mitigation Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {report.risks.map((risk, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 pr-4 font-medium text-foreground max-w-[220px] ">
                        {risk.title}
                      </td>
                      <td className="py-3.5 px-4 capitalize text-muted-foreground text-xs">
                        {risk.category}
                      </td>
                      <td className="py-3.5 px-4">
                        <SeverityBadge severity={risk.severity} />
                      </td>
                      <td className="py-3.5 pl-4 text-xs text-muted-foreground leading-relaxed max-w-md">
                        {risk.mitigation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthScoreCard({ report }: { report: AnalysisReport }) {
  const score = report.health_score || 0;
  const scoreColor =
    score >= 70
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : score >= 40
        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-destructive border-destructive/30 bg-destructive/10';

  const scoreLabel =
    score >= 70 ? 'Low Risk' : score >= 40 ? 'Moderate Risk' : 'High Risk';

  return (
    <Card className="flex flex-col justify-between border-border/80 p-6">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Health Score
          </span>
          <Badge variant="outline" className={`text-[11px] font-medium ${scoreColor}`}>
            {scoreLabel}
          </Badge>
        </div>

        <div className="my-6 text-center">
          <div className="text-5xl font-extrabold tracking-tight text-foreground">
            {score}
            <span className="text-lg font-normal text-muted-foreground font-mono">/100</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 pt-4 border-t border-border/60 text-xs">
        <BreakdownRow label="Scope Clarity" val={report.health_breakdown?.scope_clarity_percent} />
        <BreakdownRow
          label="Doc Completeness"
          val={report.health_breakdown?.documentation_completeness_percent}
        />
        <BreakdownRow label="Risk Density" val={report.health_breakdown?.risk_density_percent} />
        <BreakdownRow label="Schedule Risk" val={report.health_breakdown?.schedule_risk_percent} />
      </div>
    </Card>
  );
}

function BreakdownRow({ label, val }: { label: string; val?: number }) {
  if (val == null) return null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium text-foreground">{val}%</span>
      </div>
      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-primary/80 h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
        />
      </div>
    </div>
  );
}

function ScopeSummaryCard({ report }: { report: AnalysisReport }) {
  const s = report.scope;
  if (!s) {
    return (
      <Card className="border-border/80 p-6 flex items-center justify-center text-sm text-muted-foreground">
        No scope summary available.
      </Card>
    );
  }

  return (
    <Card className="border-border/80 p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="size-4 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Scope Summary</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-5">
          {s.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60 text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Key Deliverables</span>
          </div>
          <ul className="space-y-1 pl-5 text-muted-foreground list-disc text-[11px]">
            {s.deliverables.slice(0, 4).map((d, i) => (
              <li key={i} className="truncate">{d}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Users className="size-3.5 text-primary" />
            <span>Stakeholders</span>
          </div>
          <ul className="space-y-1 pl-5 text-muted-foreground list-disc text-[11px]">
            {s.stakeholders.slice(0, 4).map((d, i) => (
              <li key={i} className="truncate">{d}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const sev = severity.toLowerCase();
  if (sev === 'critical' || sev === 'high') {
    return (
      <Badge variant="destructive" className="capitalize text-[11px] px-2 py-0.5 font-normal">
        {sev}
      </Badge>
    );
  }
  if (sev === 'medium') {
    return (
      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 capitalize text-[11px] px-2 py-0.5 font-normal">
        {sev}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 capitalize text-[11px] px-2 py-0.5 font-normal">
      {sev}
    </Badge>
  );
}

