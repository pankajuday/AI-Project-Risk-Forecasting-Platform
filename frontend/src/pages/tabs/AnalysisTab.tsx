import { useState, useEffect } from 'react';
import {
  Play,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Check,
  Clock,
  ArrowRight,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { analysisApi, documentsApi } from '@/api';
import type { AnalysisStatus } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface DocAudit {
  all_doc_types: string[];
  existing_doc_types: string[];
  missing_doc_types: string[];
  total: number;
  present_count: number;
  missing_count: number;
  all_present: boolean;
}

const DOC_NAME_MAP: Record<string, string> = {
  executive_summary: 'Executive Summary',
  user_stories: 'User Stories',
  risk_register: 'Risk Register',
  sprint_plan: 'Sprint Plan',
};

const STEP_NAME_MAP: Record<string, string> = {
  starting: 'Initializing Pipeline...',
  scope_node: 'Scope Agent: Extracting deliverables & timeline',
  risk_node: 'Risk Agent: Scanning for explicit & implied risks',
  health_node: 'Health Agent: Computing project risk metrics',
  doc_audit_node: 'Audit Agent: Checking document repository',
  doc_gen_node: 'Document Generator: Creating missing markdown documents',
  skip_gen_node: 'Document Generator: Skipping (all files up-to-date)',
  save_node: 'Persisting analysis report...',
  complete: 'Analysis complete!',
  failed: 'Pipeline failed.',
};

export default function AnalysisTab({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<AnalysisStatus | 'not_started'>('not_started');
  const [pipelineStep, setPipelineStep] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [docAudit, setDocAudit] = useState<DocAudit | null>(null);
  const [uploadedDocCount, setUploadedDocCount] = useState<number | null>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [statusRes, docsRes] = await Promise.all([
        analysisApi.getStatus(projectId),
        documentsApi.list(projectId).catch(() => null),
      ]);

      const currentStatus = statusRes.data.status;
      setStatus(currentStatus);
      setPipelineStep(statusRes.data.pipeline_step || '');

      if (docsRes) {
        setUploadedDocCount(docsRes.data.length);
      } else if (statusRes.data.uploaded_doc_count !== undefined) {
        setUploadedDocCount(statusRes.data.uploaded_doc_count);
      }

      if (currentStatus === 'ready') {
        const auditRes = await analysisApi.getDocAudit(projectId).catch(() => null);
        if (auditRes) setDocAudit(auditRes.data);
      } else {
        setDocAudit(null);
      }
    } catch (err) {
      console.error('Error fetching initial analysis data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async () => {
    try {
      const statusRes = await analysisApi.getStatus(projectId);
      const newStatus = statusRes.data.status;
      setStatus(newStatus);
      setPipelineStep(statusRes.data.pipeline_step || '');

      if (newStatus === 'ready') {
        const auditRes = await analysisApi.getDocAudit(projectId).catch(() => null);
        if (auditRes) setDocAudit(auditRes.data);
      }
    } catch (err) {
      console.error('Error polling status:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [projectId]);

  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      pollStatus();
    }, 2500);

    return () => clearInterval(interval);
  }, [status, projectId]);

  const handleRunFullAnalysis = async () => {
    if (uploadedDocCount === 0) {
      toast.error('Cannot run analysis on an empty project.', {
        description: 'Please upload at least one document in the Documents tab first.',
      });
      return;
    }
    try {
      setActionLoading(true);
      await analysisApi.run(projectId);
      setStatus('running');
      setPipelineStep('starting');
      toast.info('Multi-agent analysis pipeline started');
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to start full analysis';
      toast.error(detail);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateMissing = async () => {
    if (uploadedDocCount === 0) {
      toast.error('Cannot generate documents for an empty project.', {
        description: 'Please upload at least one document first.',
      });
      return;
    }
    try {
      setActionLoading(true);
      await analysisApi.generateMissing(projectId);
      setStatus('running');
      setPipelineStep('doc_audit');
      toast.info('Generating missing project documents...');
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to generate missing documents';
      toast.error(detail);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && status === 'not_started') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const getStepProgress = (step: string) => {
    const steps = [
      'starting',
      'scope_node',
      'risk_node',
      'health_node',
      'doc_audit_node',
      'doc_gen_node',
      'save_node',
    ];
    const idx = steps.indexOf(step);
    if (idx === -1) return 10;
    return Math.round(((idx + 1) / steps.length) * 100);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 transition-all duration-300">
      {/* Main Status & Pipeline Card */}
      <Card className="border-border/80 bg-card relative overflow-hidden">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="bg-primary/10 text-primary ring-primary/20 mb-5 rounded-full p-3.5 ring-1">
            <Activity className="size-8" />
          </div>

          <h2 className="text-foreground text-2xl font-bold tracking-tight">
            Multi-Agent Risk Analysis
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            Our autonomous multi-agent pipeline extracts deliverables, scans for project risks, and
            generates documentation.
          </p>

          {/* Warning banner if no documents uploaded */}
          {uploadedDocCount === 0 && status !== 'running' && (
            <div className="mt-6 flex w-full max-w-lg items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-left">
              <UploadCloud className="mt-0.5 size-5 shrink-0 text-amber-400" />
              <div className="text-xs">
                <span className="mb-0.5 block font-semibold text-amber-400">
                  No Documents Uploaded
                </span>
                <span className="text-muted-foreground">
                  Upload project documents (BRD, SOW, SRS, etc.) in the <strong>Documents</strong>{' '}
                  tab before running the AI risk analysis pipeline.
                </span>
              </div>
            </div>
          )}

          {/* Running State */}
          {status === 'running' ? (
            <div className="mt-6 w-full max-w-md space-y-4">
              <div className="text-primary flex items-center justify-center gap-2.5 text-sm font-medium">
                <RefreshCw className="size-4 animate-spin" />
                <span>{STEP_NAME_MAP[pipelineStep] || 'Processing pipeline step...'}</span>
              </div>

              {/* Progress bar */}
              <div className="bg-muted ring-foreground/5 h-2.5 w-full overflow-hidden rounded-full p-0.5 ring-1">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${getStepProgress(pipelineStep)}%` }}
                />
              </div>

              <div className="text-muted-foreground flex items-center justify-between px-1 font-mono text-xs">
                <span>Current Step: {pipelineStep || 'initializing'}</span>
                <span>{getStepProgress(pipelineStep)}%</span>
              </div>
            </div>
          ) : status === 'failed' ? (
            /* Failed State */
            <div className="mt-6 flex flex-col items-center space-y-4">
              <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs">
                <AlertTriangle className="size-3.5" />
                Analysis Pipeline Failed
              </Badge>
              <p className="text-muted-foreground text-xs">
                An error occurred during the analysis run. You can retry below.
              </p>
              <Button
                onClick={handleRunFullAnalysis}
                disabled={actionLoading || uploadedDocCount === 0}
                className="mt-2 cursor-pointer gap-2"
              >
                <RefreshCw className="size-4" />
                Re-Run Full Analysis
              </Button>
            </div>
          ) : status === 'ready' ? (
            /* Ready State */
            <div className="mt-6 flex flex-col items-center space-y-4">
              <Badge
                variant="outline"
                className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400"
              >
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                Workspace Analysis Complete
              </Badge>
              <p className="text-muted-foreground max-w-sm text-xs">
                AI risk forecasts and documentation audit have been generated and are ready for
                review.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunFullAnalysis}
                  disabled={actionLoading || uploadedDocCount === 0}
                  className="cursor-pointer gap-2"
                >
                  <RefreshCw className="size-3.5" />
                  Full Re-run
                </Button>
              </div>
            </div>
          ) : (
            /* Initial State */
            <div className="mt-6">
              <Button
                size="lg"
                onClick={handleRunFullAnalysis}
                disabled={actionLoading || uploadedDocCount === 0}
                className="cursor-pointer gap-2 px-6"
              >
                <Play className="size-4 fill-current" />
                Run Full Analysis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Deliverables Audit Card */}
      {docAudit && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="text-primary size-4" />
                Document Deliverables Audit
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                LangGraph pipeline checks existing documentation against project requirements.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="px-2.5 py-0.5 font-mono text-xs">
              {docAudit.present_count} / {docAudit.total} Built
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Horizontal deliverables status pills */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {docAudit.all_doc_types.map(docType => {
                const isPresent = docAudit.existing_doc_types.includes(docType);
                return (
                  <div
                    key={docType}
                    className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-xs font-medium transition-all ${
                      isPresent
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                          isPresent
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {isPresent ? (
                          <Check className="size-3 stroke-[2.5]" />
                        ) : (
                          <Clock className="size-3" />
                        )}
                      </div>
                      <span className="text-foreground truncate text-xs font-medium">
                        {DOC_NAME_MAP[docType] || docType}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`shrink-0 px-1.5 py-0 text-[10px] font-normal ${
                        isPresent
                          ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                          : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isPresent ? 'Ready' : 'Pending'}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Action banner if missing documents detected */}
            {!docAudit.all_present && status !== 'running' && (
              <div className="border-primary/20 bg-primary/5 mt-4 flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="text-foreground text-sm font-semibold">
                    Missing documents detected ({docAudit.missing_count})
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    Generate missing files only without re-running full risk analysis.
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMissing}
                  disabled={actionLoading}
                  className="border-primary/30 hover:bg-primary/10 shrink-0 cursor-pointer gap-2"
                >
                  <span>Generate Missing</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
