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
    return <div className="skeleton" style={{ height: 260 }} />;
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
    <div
      className="anim-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        maxWidth: 800,
        margin: '20px auto',
      }}
    >
      {/* 1. Main Status Card */}
      <div className="card text-center" style={{ padding: '40px 20px' }}>
        <Activity size={44} color="var(--accent-glow)" style={{ margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          LangGraph Agent Workspace
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 14.5 }}>
          Our multi-agent pipeline coordinates state updates across analysis and generation steps.
        </p>

        {status === 'running' ? (
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                marginBottom: 14,
                color: '#a5b4fc',
              }}
            >
              <RefreshCw size={18} className="anim-spin" />
              <span style={{ fontWeight: 600, fontSize: 15 }}>
                {STEP_NAME_MAP[pipelineStep] || 'Processing...'}
              </span>
            </div>
            <div
              className="progress-bar"
              style={{
                width: '100%',
                height: 6,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 99,
                overflow: 'hidden',
                marginBottom: 6,
              }}
            >
              <div
                className="progress-bar-fill"
                style={{
                  background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  height: '100%',
                  width: `${getStepProgress(pipelineStep)}%`,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Step Progress: {getStepProgress(pipelineStep)}%
            </div>
          </div>
        ) : status === 'failed' ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: 'var(--danger)',
                marginBottom: 20,
              }}
            >
              <AlertTriangle size={20} />
              <span style={{ fontWeight: 600 }}>Previous analysis attempt failed</span>
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
          <div style={{ color: 'var(--success)' }}>
            <CheckCircle size={44} style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Workspace Analysis Complete
            </h3>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 13.5,
                marginTop: 6,
                marginBottom: 20,
              }}
            >
              AI reports and risk metrics have been successfully compiled.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
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
              className="btn btn-primary"
              onClick={handleRunFullAnalysis}
              disabled={actionLoading}
              style={{ padding: '12px 24px', fontSize: 15 }}
            >
              <Play size={16} /> Run Full Analysis
            </button>
          </div>
        )}
      </div>

      {/* 2. Document Audit Checklist Card */}
      {docAudit && (
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <FileText size={18} color="#a5b4fc" />
                Document Deliverables Audit
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                LangGraph tracks document generation status to prevent redundant LLM invocations.
              </p>
            </div>
            <span className="badge badge-muted" style={{ padding: '4px 10px' }}>
              {docAudit.present_count} / {docAudit.total} Built
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {docAudit.all_doc_types.map(docType => {
              const isPresent = docAudit.existing_doc_types.includes(docType);
              return (
                <div
                  key={docType}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 10,
                    border: isPresent
                      ? '1px solid rgba(16,185,129,0.1)'
                      : '1px solid rgba(245,158,11,0.1)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: isPresent ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isPresent ? (
                        <Check size={12} color="var(--success)" />
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>
                          -
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        color: isPresent ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {DOC_NAME_MAP[docType] || docType}
                    </span>
                  </div>
                  <span
                    className={`badge badge-${isPresent ? 'green' : 'yellow'}`}
                    style={{ fontSize: 10.5 }}
                  >
                    {isPresent ? 'Ready' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Conditional Action based on missing documents */}
          {!docAudit.all_present && status !== 'running' && (
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Missing documents detected ({docAudit.missing_count})
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Generate only the missing files without re-running the full agent analysis.
                </div>
              </div>
              <button
                className="btn"
                style={{
                  background: '#021023',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
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
