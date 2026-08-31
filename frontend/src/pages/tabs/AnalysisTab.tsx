import { useState, useEffect } from 'react';
import {
  Play,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Check,
  ArrowRight,
} from 'lucide-react';
import { analysisApi } from '@/api';
import type { AnalysisStatus } from '@/types';

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

  const fetchStatusAndAudit = async () => {
    try {
      const [statusRes, auditRes] = await Promise.all([
        analysisApi.getStatus(projectId),
        analysisApi.getDocAudit(projectId).catch(() => null), // fail gracefully if no report yet
      ]);

      setStatus(statusRes.data.status);
      setPipelineStep(statusRes.data.pipeline_step || '');

      if (auditRes) {
        setDocAudit(auditRes.data);
      }
    } catch (err) {
      console.error('Error fetching status/audit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndAudit();
    const interval = setInterval(() => {
      fetchStatusAndAudit();
    }, 2500);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleRunFullAnalysis = async () => {
    try {
      setActionLoading(true);
      await analysisApi.run(projectId);
      setStatus('running');
      setPipelineStep('starting');
    } catch (err) {
      console.error(err);
      alert('Failed to start full analysis');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateMissing = async () => {
    try {
      setActionLoading(true);
      await analysisApi.generateMissing(projectId);
      setStatus('running');
      setPipelineStep('doc_audit');
    } catch (err) {
      console.error(err);
      alert('Failed to generate missing documents');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && status === 'not_started') {
    return <div className="skeleton h-65" />;
  }

  // Calculate progress estimation based on pipeline step
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
    <div className="anim-fade-in mx-auto my-5 flex max-w-200 flex-col gap-6">
      {/* 1. Main Status Card */}
      <div className="card px-5 py-10 text-center">
        <Activity size={44} color="var(--accent-glow)" className="mx-auto mb-5" />
        <h2 className="mb-2 text-[22px] font-extrabold">LangGraph Agent Workspace</h2>
        <p className="mb-7 text-[14.5px] text-(--text-secondary)">
          Our multi-agent pipeline coordinates state updates across analysis and generation steps.
        </p>

        {status === 'running' ? (
          <div className="mx-auto max-w-115">
            <div className="mb-3.5 flex items-center justify-center gap-3 text-[#a5b4fc]">
              <RefreshCw size={18} className="anim-spin" />
              <span className="text-[15px] font-semibold">
                {STEP_NAME_MAP[pipelineStep] || 'Processing...'}
              </span>
            </div>
            <div className="progress-bar mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/6">
              <div
                className="progress-bar-fill h-full bg-linear-to-r from-[#6366f1] to-[#8b5cf6] transition-[width] duration-400 ease-in-out"
                style={{ width: `${getStepProgress(pipelineStep)}%` }}
              />
            </div>
            <div className="text-xs text-(--text-muted)">
              Step Progress: {getStepProgress(pipelineStep)}%
            </div>
          </div>
        ) : status === 'failed' ? (
          <div>
            <div className="mb-5 flex items-center justify-center gap-2 text-(--danger)">
              <AlertTriangle size={20} />
              <span className="font-semibold">Previous analysis attempt failed</span>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleRunFullAnalysis}
              disabled={actionLoading}
            >
              <RefreshCw size={15} /> Re-Run Full Analysis
            </button>
          </div>
        ) : status === 'ready' ? (
          <div className="text-(--success)">
            <CheckCircle size={44} className="mx-auto mb-4" />
            <h3 className="text-lg font-bold text-(--text-primary)">Workspace Analysis Complete</h3>
            <p className="mt-1.5 mb-5 text-[13.5px] text-(--text-secondary)">
              AI reports and risk metrics have been successfully compiled.
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="btn btn-ghost"
                onClick={handleRunFullAnalysis}
                disabled={actionLoading}
              >
                <RefreshCw size={14} /> Full Re-run
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              className="btn btn-primary px-6 py-3 text-[15px]"
              onClick={handleRunFullAnalysis}
              disabled={actionLoading}
            >
              <Play size={16} /> Run Full Analysis
            </button>
          </div>
        )}
      </div>

      {/* 2. Document Audit Checklist Card */}
      {docAudit && (
        <div className="card">
          <div className="mb-4.5 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-[16px] font-bold">
                <FileText size={18} color="#a5b4fc" />
                Document Deliverables Audit
              </h3>
              <p className="mt-1 text-[12.5px] text-(--text-muted)">
                LangGraph tracks document generation status to prevent redundant LLM invocations.
              </p>
            </div>
            <span className="badge badge-muted px-2.5 py-1">
              {docAudit.present_count} / {docAudit.total} Built
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-2.5">
            {docAudit.all_doc_types.map(docType => {
              const isPresent = docAudit.existing_doc_types.includes(docType);
              return (
                <div
                  key={docType}
                  className={`flex items-center justify-between rounded-xl border bg-(--bg-elevated) px-3.5 py-2.5 ${
                    isPresent ? 'border-emerald-500/10' : 'border-amber-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        isPresent ? 'bg-emerald-500/15' : 'bg-amber-500/15'
                      }`}
                    >
                      {isPresent ? (
                        <Check size={12} color="var(--success)" />
                      ) : (
                        <span className="text-sm font-bold text-(--warning)">-</span>
                      )}
                    </div>
                    <span
                      className={`text-[13.5px] font-medium ${
                        isPresent ? 'text-(--text-primary)' : 'text-(--text-secondary)'
                      }`}
                    >
                      {DOC_NAME_MAP[docType] || docType}
                    </span>
                  </div>
                  <span className={`badge badge-${isPresent ? 'green' : 'yellow'} text-[10.5px]`}>
                    {isPresent ? 'Ready' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Conditional Action based on missing documents */}
          {!docAudit.all_present && status !== 'running' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4">
              <div className="min-w-65 flex-1">
                <div className="text-[13.5px] font-semibold text-(--text-primary)">
                  Missing documents detected ({docAudit.missing_count})
                </div>
                <div className="mt-0.5 text-xs text-(--text-secondary)">
                  Generate only the missing files without re-running the full agent analysis.
                </div>
              </div>
              <button
                className="btn border border-indigo-500/30 bg-[#021023] text-[#a5b4fc]"
                onClick={handleGenerateMissing}
                disabled={actionLoading}
              >
                <span>Generate Missing Only</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
