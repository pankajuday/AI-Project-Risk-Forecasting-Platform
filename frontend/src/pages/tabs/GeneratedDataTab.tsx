import { useState, useEffect } from 'react';
import { FileText, Eye, MoreVertical, Download, X } from 'lucide-react';
import { analysisApi } from '@/api';
import type { AnalysisReport, GeneratedDocument } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MdFormatter } from '../../components/MdFormatter';
import DownloadPDF from '../../components/DownloadPDF';
import downloadMarkdown from '@/lib/download-md';

export default function GeneratedDataTab({ projectId }: { projectId: string }) {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Export state
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [menuOpenDoc, setMenuOpenDoc] = useState<string | null>(null);
  const [modalExportOpen, setModalExportOpen] = useState(false);

  // Close three-dot menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => setMenuOpenDoc(null);
    if (menuOpenDoc) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [menuOpenDoc]);

  useEffect(() => {
    analysisApi
      .getReport(projectId)
      .then(res => setReport(res.data))
      .catch(err =>
        setError(
          err.response?.status === 404
            ? 'No analysis report found.'
            : 'Error loading generated data.',
        ),
      )
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <Card className="mx-auto my-8 max-w-2xl border-dashed py-12 text-center">
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-muted/60 mb-4 rounded-full p-3">
            <FileText className="text-muted-foreground size-8" />
          </div>
          <h3 className="text-foreground text-base font-medium">
            No Generated Documents Available
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {error ||
              'Run the multi-agent analysis in the Analysis tab to generate project documentation.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const generatedDocs = report.generated_documents || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 transition-all duration-300">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-foreground text-xl font-semibold tracking-tight">
              AI-Generated Documents
            </h2>
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
              {generatedDocs.length} {generatedDocs.length === 1 ? 'document' : 'documents'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Automated markdown deliverables synthesized from project context by LangGraph agents.
          </p>
        </div>
      </div>

      {/* Document List */}
      {generatedDocs.length === 0 ? (
        <Card className="bg-card/50 border-dashed py-12 text-center">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-muted/60 mb-4 rounded-full p-3">
              <FileText className="text-muted-foreground size-8" />
            </div>
            <h3 className="text-foreground text-base font-medium">No Generated Documents Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Run the analysis pipeline to produce executive summaries, user stories, risk
              registers, and sprint plans.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {generatedDocs.map((doc, idx) => (
            <Card
              key={idx}
              className="group hover:border-foreground/20 relative flex flex-col justify-between overflow-visible! p-4 transition-all duration-200 hover:shadow-xs sm:flex-row sm:items-center"
            >
              {/* Info */}
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <div className="bg-muted/60 text-muted-foreground group-hover:text-primary shrink-0 rounded-lg p-2.5 transition-colors">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-foreground group-hover:text-foreground truncate text-sm font-medium">
                      {doc.title}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground shrink-0 px-2 py-0 text-[10px] font-normal uppercase"
                    >
                      {doc.doc_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    markdown document • {doc.content.length} characters
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="border-border relative mt-3 flex items-center justify-end gap-2 border-t pt-3 sm:mt-0 sm:border-t-0 sm:pt-0">
                {/* Preview Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewDoc(doc)}
                  className="cursor-pointer gap-1.5 text-xs"
                >
                  <Eye className="size-3.5" />
                  <span>Preview</span>
                </Button>

                {/* Three dots export menu */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={e => {
                      e.stopPropagation();
                      setMenuOpenDoc(menuOpenDoc === doc.title ? null : doc.title);
                    }}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Export options"
                  >
                    <MoreVertical className="size-4" />
                    <span className="sr-only">More options</span>
                  </Button>

                  {/* Dropdown Menu */}
                  {menuOpenDoc === doc.title && (
                    <div
                      className="border-border bg-popover absolute top-full right-0 z-50 mt-1.5 min-w-44 space-y-0.5 rounded-lg border p-1 text-xs shadow-lg"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors"
                        onClick={() => {
                          downloadMarkdown(doc.title, doc.content);
                          setMenuOpenDoc(null);
                        }}
                      >
                        <Download className="text-muted-foreground size-3.5" />
                        <span>Export Markdown</span>
                      </button>
                      <div className="px-1 py-0.5">
                        <DownloadPDF
                          markdown={doc.content}
                          filename={`${doc.title.replace(/\s+/g, '_').toLowerCase()}.pdf`}
                          label="Export PDF"
                          className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-normal shadow-none transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Popup Modal */}
      {previewDoc && (
        <div
          className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => {
            setPreviewDoc(null);
            setModalExportOpen(false);
          }}
        >
          <div
            className="bg-card border-border relative mx-auto flex h-170 max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="border-border bg-muted/40 relative z-20 flex shrink-0 items-center justify-between overflow-visible! border-b px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-primary/10 text-primary shrink-0 rounded-md p-2">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground truncate text-sm font-semibold">
                      {previewDoc.title}
                    </span>
                    <Badge
                      variant="outline"
                      className="shrink-0 px-2 py-0 text-[10px] font-normal uppercase"
                    >
                      {previewDoc.doc_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Toolbar & Close Button */}
              <div className="flex items-center gap-2">
                {/* Export Dropdown inside Preview Modal */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalExportOpen(!modalExportOpen)}
                    className="cursor-pointer gap-1.5 text-xs"
                  >
                    <Download className="size-3.5" />
                    <span>Export</span>
                  </Button>

                  {modalExportOpen && (
                    <div
                      className="border-border bg-popover absolute top-full right-0 z-50 mt-1.5 min-w-44 space-y-0.5 rounded-lg border p-1 text-xs shadow-lg"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors"
                        onClick={() => {
                          downloadMarkdown(previewDoc.title, previewDoc.content);
                          setModalExportOpen(false);
                        }}
                      >
                        <Download className="text-muted-foreground size-3.5" />
                        <span>Download Markdown</span>
                      </button>
                      <div className="px-1 py-0.5">
                        <DownloadPDF
                          markdown={previewDoc.content}
                          filename={`${previewDoc.title.replace(/\s+/g, '_').toLowerCase()}.pdf`}
                          label="Download PDF"
                          className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-normal shadow-none transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setPreviewDoc(null);
                    setModalExportOpen(false);
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="bg-background min-h-0 flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-3xl">
                <MdFormatter content={previewDoc.content} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
