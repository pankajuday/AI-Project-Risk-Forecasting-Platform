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
      <div className="max-w-3xl mx-auto space-y-6">
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
    <div className="max-w-3xl mx-auto space-y-6 transition-all duration-300">
      {/* Main Status & Pipeline Card */}
      <Card className="relative overflow-hidden border-border/80 bg-card">
        <CardContent className="p-8 text-center flex flex-col items-center">
          <div className="p-3.5 rounded-full bg-primary/10 text-primary mb-5 ring-1 ring-primary/20">
            <Activity className="size-8" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Multi-Agent Risk Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Our autonomous multi-agent pipeline extracts deliverables, scans for project risks, and generates documentation.
          </p>

          {/* Warning banner if no documents uploaded */}
          {uploadedDocCount === 0 && status !== 'running' && (
            <div className="w-full max-w-lg mt-6 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-left flex items-start gap-3">
              <UploadCloud className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-amber-400 block mb-0.5">No Documents Uploaded</span>
                <span className="text-muted-foreground">
                  Upload project documents (BRD, SOW, SRS, etc.) in the <strong>Documents</strong> tab before running the AI risk analysis pipeline.
                </span>
              </div>
            </div>
          )}

          {/* Running State */}
          {status === 'running' ? (
            <div className="w-full max-w-md mt-6 space-y-4">
              <div className="flex items-center justify-center gap-2.5 text-primary text-sm font-medium">
                <RefreshCw className="size-4 animate-spin" />
                <span>{STEP_NAME_MAP[pipelineStep] || 'Processing pipeline step...'}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden p-0.5 ring-1 ring-foreground/5">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${getStepProgress(pipelineStep)}%` }}
                />
              </div>

              <div className="text-xs text-muted-foreground flex justify-between items-center px-1 font-mono">
                <span>Current Step: {pipelineStep || 'initializing'}</span>
                <span>{getStepProgress(pipelineStep)}%</span>
              </div>
            </div>
          ) : status === 'failed' ? (
            /* Failed State */
            <div className="mt-6 space-y-4 flex flex-col items-center">
              <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs">
                <AlertTriangle className="size-3.5" />
                Analysis Pipeline Failed
              </Badge>
              <p className="text-xs text-muted-foreground">
                An error occurred during the analysis run. You can retry below.
              </p>
              <Button
                onClick={handleRunFullAnalysis}
                disabled={actionLoading || uploadedDocCount === 0}
                className="gap-2 cursor-pointer mt-2"
              >
                <RefreshCw className="size-4" />
                Re-Run Full Analysis
              </Button>
            </div>
          ) : status === 'ready' ? (
            /* Ready State */
            <div className="mt-6 space-y-4 flex flex-col items-center">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1.5 px-3 py-1 text-xs">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                Workspace Analysis Complete
              </Badge>
              <p className="text-xs text-muted-foreground max-w-sm">
                AI risk forecasts and documentation audit have been generated and are ready for review.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunFullAnalysis}
                  disabled={actionLoading || uploadedDocCount === 0}
                  className="gap-2 cursor-pointer"
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
                className="gap-2 cursor-pointer px-6"
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
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Document Deliverables Audit
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                LangGraph pipeline checks existing documentation against project requirements.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5">
              {docAudit.present_count} / {docAudit.total} Built
            </Badge>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Horizontal deliverables status pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {docAudit.all_doc_types.map(docType => {
                const isPresent = docAudit.existing_doc_types.includes(docType);
                return (
                  <div
                    key={docType}
                    className={`flex items-center justify-between gap-2 p-3 rounded-lg border text-xs font-medium transition-all ${
                      isPresent
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                        : 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`size-5 rounded-full flex items-center justify-center shrink-0 ${
                          isPresent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {isPresent ? (
                          <Check className="size-3 stroke-[2.5]" />
                        ) : (
                          <Clock className="size-3" />
                        )}
                      </div>
                      <span className="truncate text-xs font-medium text-foreground">
                        {DOC_NAME_MAP[docType] || docType}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 font-normal px-1.5 py-0 ${
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-primary/20 bg-primary/5 mt-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Missing documents detected ({docAudit.missing_count})
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Generate missing files only without re-running full risk analysis.
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateMissing}
                  disabled={actionLoading}
                  className="shrink-0 gap-2 cursor-pointer border-primary/30 hover:bg-primary/10"
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

