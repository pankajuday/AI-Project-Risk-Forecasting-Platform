import { useEffect } from 'react';
import { documentsApi } from '../../api/index';

interface DocsViewerProps {
  projectId: string;
  filename: string;
}

export default function DocsViewer({ projectId, filename }: DocsViewerProps) {
  useEffect(() => {
    documentsApi.viewUrl(projectId, filename).catch(console.error);
  }, [projectId, filename]);

  return null;
}
