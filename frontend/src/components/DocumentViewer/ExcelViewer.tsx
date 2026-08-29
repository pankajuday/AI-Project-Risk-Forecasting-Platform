import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import '../../App.css';
import { documentsApi } from '../../api';

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

        const response = await documentsApi.viewUrl(projectId, filename);

        const buffer =
          response.data instanceof ArrayBuffer
            ? response.data
            : new Uint8Array(response.data).buffer;

        if (!buffer.byteLength) {
          throw new Error('Excel file is empty');
        }

        const wb = XLSX.read(buffer, {
          type: 'array',
          cellDates: true,
        });

        if (cancelled) return;

        setWorkbook(wb);

        if (wb.SheetNames.length) {
          setActiveSheet(wb.SheetNames[0]);
        }
      } catch (err) {
        console.error('Excel loading error:', err);

        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Excel');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExcel();

    return () => {
      cancelled = true;
    };
  }, [projectId, filename]);

  if (loading) {
    return <div className="flex h-[85vh] w-full items-center justify-center">Loading Excel...</div>;
  }

  if (error) {
    return (
      <div className="flex h-[85vh] w-full items-center justify-center text-red-500">{error}</div>
    );
  }

  if (!workbook) {
    return null;
  }

  const worksheet = workbook.Sheets[activeSheet];

  if (!worksheet) {
    return null;
  }

  const html = XLSX.utils.sheet_to_html(worksheet, {
    id: 'excel-table',
    editable: false,
  });

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/*  Sheet tabs */}

      <div className="flex h-10 shrink-0 overflow-x-auto border-b bg-gray-50">
        {workbook.SheetNames.map(sheetName => (
          <button
            key={sheetName}
            type="button"
            onClick={() => setActiveSheet(sheetName)}
            className={`h-full shrink-0 border-r px-4 text-sm transition-colors ${
              activeSheet === sheetName
                ? 'border-b-2 border-blue-500 bg-white font-medium text-gray-900'
                : 'text-gray-500 hover:bg-gray-100'
            } `}
          >
            {sheetName}
          </button>
        ))}
      </div>

      {/*  Spreadsheet viewport*/}

      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="excel-viewer"
          dangerouslySetInnerHTML={{
            __html: html,
          }}
        />
      </div>
    </div>
  );
}
