import { useState, useEffect } from 'react';
import { AlertTriangle, FileText, ChevronDown, Download } from 'lucide-react';
import { analysisApi } from '@/api';
import type { AnalysisReport, GeneratedDocument } from '@/types';
import { MdFormatter } from '../../components/MdFormatter';
import DownloadPDF from '../../components/DownloadPDF';

export default function ReportTab({ projectId }: { projectId: string }) {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [exportMenuDoc, setExportMenuDoc] = useState<string | null>(null);
  useEffect(() => {
    analysisApi
      .getReport(projectId)
      .then(res => setReport(res.data))
      .catch(err =>
        setError(err.response?.status === 404 ? 'No report found.' : 'Error loading report.'),
      )
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="skeleton h-100" />;

  if (error || !report)
    return (
      <div className="card border-dashed px-5 py-15 text-center">
        <FileText size={32} color="var(--text-muted)" className="mx-auto mb-4" />
        <p className="text-(--text-secondary)">
          {error || 'Run the analysis to generate a report.'}
        </p>
      </div>
    );

  return (
    <div className="anim-fade-in flex flex-col gap-6">
      {/* Top row: Health & Scope */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <HealthScoreCard report={report} />
        <ScopeSummaryCard report={report} />
      </div>

      {/* Risks Table */}
      <div className="card">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
          <AlertTriangle size={18} color="var(--warning)" />
          Risk Register ({report.risks.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-(--border) text-left text-(--text-muted)">
                <th className="px-2 py-3">Risk</th>
                <th className="px-2 py-3">Category</th>
                <th className="px-2 py-3">Severity</th>
                <th className="px-2 py-3">Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {report.risks.map((risk, i) => (
                <tr key={i} className="border-b border-white/4">
                  <td className="px-2 py-3 font-medium">{risk.title}</td>
                  <td className="px-2 py-3 capitalize">{risk.category}</td>
                  <td className="px-2 py-3">
                    <span className={`badge badge-${getSeverityColor(risk.severity)}`}>
                      {risk.severity}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-(--text-secondary)">{risk.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Documents */}
      <div className="card">
        <h3 className="mb-4 text-lg font-bold">AI-Generated Documents</h3>
        <div className="flex flex-col gap-3">
          {report.generated_documents.map((doc, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-(--border)">
              <div
                className="flex cursor-pointer justify-between bg-(--bg-elevated) px-4 py-3"
                onClick={() => setExpandedDoc(expandedDoc === doc.title ? null : doc.title)}
              >
                <span className="font-semibold">{doc.title}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${expandedDoc === doc.title ? 'rotate-180' : ''}`}
                />
              </div>
              {expandedDoc === doc.title && (
                <div className="border-t border-(--border) bg-(--bg-base) p-4">
                  <div className="relative mb-4 inline-block">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        setExportMenuDoc(exportMenuDoc === doc.title ? null : doc.title)
                      }
                      aria-expanded={exportMenuDoc === doc.title}
                      aria-haspopup="menu"
                    >
                      <Download size={14} /> Export
                      <ChevronDown size={14} />
                    </button>
                    {exportMenuDoc === doc.title && (
                      <div
                        className="absolute top-full left-0 z-20 mt-2 min-w-48 overflow-hidden rounded-lg border border-(--border) bg-(--bg-elevated) p-1 shadow-(--shadow-md)"
                        role="menu"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-(--text-secondary) transition-colors hover:bg-(--bg-overlay) hover:text-(--text-primary)"
                          onClick={() => {
                            downloadMarkdown(doc);
                            setExportMenuDoc(null);
                          }}
                          role="menuitem"
                        >
                          <Download size={14} /> Download Markdown
                        </button>
                        <DownloadPDF
                          markdown={doc.content}
                          filename={`${doc.title}.pdf`}
                          label="Download PDF"
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-normal text-(--text-secondary) shadow-none transition-colors hover:bg-(--bg-overlay) hover:text-(--text-primary)"
                        />
                      </div>
                    )}
                  </div>
                  <div className="markdown-body whitespace-pre-wrap">
                    <MdFormatter content={doc.content} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HealthScoreCard({ report }: { report: AnalysisReport }) {
  const score = report.health_score || 0;
  const color =
    score >= 70 ? 'text-(--success)' : score >= 40 ? 'text-(--warning)' : 'text-(--danger)';

  return (
    <div className="card flex flex-col justify-center text-center">
      <h4 className="mb-4 font-semibold text-(--text-secondary)">Health Score</h4>
      <div className={`text-[64px] leading-none font-extrabold ${color}`}>{score}</div>
      <div className="mt-6 flex flex-col gap-2 text-left text-xs">
        <BreakdownRow label="Scope Clarity" val={report.health_breakdown?.scope_clarity_percent} />
        <BreakdownRow
          label="Doc Completeness"
          val={report.health_breakdown?.documentation_completeness_percent}
        />
        <BreakdownRow label="Risk Density" val={report.health_breakdown?.risk_density_percent} />
        <BreakdownRow label="Schedule Risk" val={report.health_breakdown?.schedule_risk_percent} />
      </div>
    </div>
  );
}

function BreakdownRow({ label, val }: { label: string; val?: number }) {
  if (val == null) return null;
  return (
    <div className="flex justify-between">
      <span className="text-(--text-muted)">{label}</span>
      <span className="font-semibold">{val}%</span>
    </div>
  );
}

function ScopeSummaryCard({ report }: { report: AnalysisReport }) {
  const s = report.scope;
  if (!s) return <div className="card">No scope data.</div>;

  return (
    <div className="card">
      <h3 className="mb-3 text-base font-bold">Scope Summary</h3>
      <p className="mb-4 text-sm text-(--text-secondary)">{s.summary}</p>

      <div className="grid grid-cols-1 gap-4 text-[13px] sm:grid-cols-2">
        <div>
          <strong className="mb-1 block text-(--text-muted)">Key Deliverables</strong>
          <ul className="m-0 pl-4 text-(--text-primary)">
            {s.deliverables.slice(0, 4).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
        <div>
          <strong className="mb-1 block text-(--text-muted)">Stakeholders</strong>
          <ul className="m-0 pl-4 text-(--text-primary)">
            {s.stakeholders.slice(0, 4).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function getSeverityColor(sev: string) {
  if (sev === 'critical' || sev === 'high') return 'red';
  if (sev === 'medium') return 'yellow';
  return 'green';
}

function downloadMarkdown(doc: GeneratedDocument) {
  const blob = new Blob([doc.content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/\s+/g, '_').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
