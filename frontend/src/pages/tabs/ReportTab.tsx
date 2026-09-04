import { useState, useEffect } from 'react';
import { FileText, ShieldAlert, CheckCircle2, Target, Users } from 'lucide-react';
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
        setError(
          err.response?.status === 404 ? 'No analysis report found.' : 'Error loading report.',
        ),
      )
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <Card className="mx-auto my-8 max-w-2xl border-dashed py-12 text-center">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="bg-muted/60 mb-4 rounded-full p-3">
            <FileText className="text-muted-foreground size-8" />
          </div>
          <h3 className="text-foreground text-base font-medium">No Analysis Report Available</h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {error ||
              'Run the multi-agent analysis in the Analysis tab to generate a risk forecasting report.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 transition-all duration-300">
      {/* Header section */}
      <div>
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          Analysis & Risk Report
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Executive summary of project health metrics, scope breakdown, and key risk indicators.
        </p>
      </div>

      {/* Top row: Health Score & Scope Summary */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_2fr]">
        <HealthScoreCard report={report} />
        <ScopeSummaryCard report={report} />
      </div>

      {/* Risk Register Table */}
      <Card className="border-border/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldAlert className="text-primary size-4" />
              Risk Register
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              Identified project risks categorized by severity and recommended mitigation
              strategies.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="px-2.5 py-0.5 font-mono text-xs">
            {report.risks.length} {report.risks.length === 1 ? 'Risk' : 'Risks'} Identified
          </Badge>
        </CardHeader>

        <CardContent>
          {report.risks.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No specific risks identified for this project workspace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-left text-xs font-medium">
                    <th className="pr-4 pb-3 font-medium">Risk Title</th>
                    <th className="px-4 pb-3 font-medium">Category</th>
                    <th className="px-4 pb-3 font-medium">Severity</th>
                    <th className="pb-3 pl-4 font-medium">Mitigation Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-border/50 divide-y">
                  {report.risks.map((risk, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="text-foreground max-w-55 py-3.5 pr-4 font-medium">
                        {risk.title}
                      </td>
                      <td className="text-muted-foreground px-4 py-3.5 text-xs capitalize">
                        {risk.category}
                      </td>
                      <td className="px-4 py-3.5">
                        <SeverityBadge severity={risk.severity} />
                      </td>
                      <td className="text-muted-foreground max-w-md py-3.5 pl-4 text-xs leading-relaxed">
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

  const scoreLabel = score >= 70 ? 'Low Risk' : score >= 40 ? 'Moderate Risk' : 'High Risk';

  return (
    <Card className="border-border/80 flex flex-col justify-between p-6">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Health Score
          </span>
          <Badge variant="outline" className={`text-[11px] font-medium ${scoreColor}`}>
            {scoreLabel}
          </Badge>
        </div>

        <div className="my-6 text-center">
          <div className="text-foreground text-5xl font-extrabold tracking-tight">
            {score}
            <span className="text-muted-foreground font-mono text-lg font-normal">/100</span>
          </div>
        </div>
      </div>

      <div className="border-border/60 space-y-2.5 border-t pt-4 text-xs">
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
        <span className="text-foreground font-mono font-medium">{val}%</span>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
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
      <Card className="border-border/80 text-muted-foreground flex items-center justify-center p-6 text-sm">
        No scope summary available.
      </Card>
    );
  }

  return (
    <Card className="border-border/80 flex flex-col justify-between p-6">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Target className="text-primary size-4" />
          <h3 className="text-foreground text-base font-semibold">Scope Summary</h3>
        </div>
        <p className="text-muted-foreground mb-5 text-xs leading-relaxed">{s.summary}</p>
      </div>

      <div className="border-border/60 grid grid-cols-1 gap-4 border-t pt-4 text-xs sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-foreground flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="size-3.5 text-emerald-400" />
            <span>Key Deliverables</span>
          </div>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-[11px]">
            {s.deliverables.slice(0, 4).map((d, i) => (
              <li key={i} className="truncate">
                {d}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <div className="text-foreground flex items-center gap-1.5 font-medium">
            <Users className="text-primary size-3.5" />
            <span>Stakeholders</span>
          </div>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-[11px]">
            {s.stakeholders.slice(0, 4).map((d, i) => (
              <li key={i} className="truncate">
                {d}
              </li>
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
      <Badge variant="destructive" className="px-2 py-0.5 text-[11px] font-normal capitalize">
        {sev}
      </Badge>
    );
  }
  if (sev === 'medium') {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-normal text-amber-400 capitalize"
      >
        {sev}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-normal text-emerald-400 capitalize"
    >
      {sev}
    </Badge>
  );
}
