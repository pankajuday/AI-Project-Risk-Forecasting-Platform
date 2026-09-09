import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { documentsApi } from '@/api';
import { Loader2, AlertCircle, Download, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExcelViewerProps {
  projectId: string;
  filename: string;
}

export default function ExcelViewer({ projectId, filename }: ExcelViewerProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExcel() {
      try {
        setLoading(true);
        setError(null);

        // ExcelViewer always needs raw binary data so SheetJS can parse it
        const response = await documentsApi.viewUrl(projectId, filename);
        if (cancelled) return;

        const buffer =
          response.data instanceof ArrayBuffer
            ? response.data
            : new Uint8Array(response.data).buffer;

        if (!buffer.byteLength) throw new Error('Excel file is empty');

        const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
        if (cancelled) return;

        setWorkbook(wb);
        if (wb.SheetNames.length) setActiveSheet(wb.SheetNames[0]);
      } catch (err) {
        console.error('Excel loading error:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load spreadsheet.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExcel();
    return () => { cancelled = true; };
  }, [projectId, filename]);

  const handleDownload = async () => {
    try {
      const url = await documentsApi.getDownloadUrl(projectId, filename);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Failed to generate download link.');
    }
  };

  
  // States
  

  if (loading) {
    return (
      <div className="bg-background/50 text-muted-foreground flex h-full w-full items-center justify-center gap-2 text-xs">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading spreadsheet...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background/50 flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-xs">
        <AlertCircle className="text-destructive h-6 w-6" />
        <p className="text-foreground font-semibold">Unable to preview spreadsheet</p>
        <p className="text-muted-foreground max-w-sm">{error}</p>
        <Button onClick={handleDownload} variant="outline" size="sm" className="mt-3 gap-2 text-xs">
          <Download size={13} />
          <span>Download File</span>
        </Button>
      </div>
    );
  }

  if (!workbook) return null;

  const worksheet = workbook.Sheets[activeSheet];
  if (!worksheet) return null;

  const html = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-table', editable: false });

  
  // Render
  
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">

      {/* Header bar with sheet tabs + download button */}
      <div className="border-border flex h-10 shrink-0 items-center justify-between border-b bg-gray-50 px-2">
        {/* Sheet tabs */}
        <div className="flex h-full min-w-0 flex-1 overflow-x-auto">
          {workbook.SheetNames.map(sheetName => (
            <button
              key={sheetName}
              type="button"
              onClick={() => setActiveSheet(sheetName)}
              className={`flex h-full shrink-0 items-center gap-1.5 border-r px-4 text-xs transition-colors ${
                activeSheet === sheetName
                  ? 'border-b-2 border-blue-500 bg-white font-medium text-gray-900'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Table2 size={12} className="shrink-0" />
              {sheetName}
            </button>
          ))}
        </div>

        {/* Download button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="ml-2 h-7 shrink-0 gap-1.5 text-xs"
        >
          <Download size={13} />
          <span className="hidden sm:inline">Download</span>
        </Button>
      </div>

      {/* Spreadsheet viewport */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="excel-viewer"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
