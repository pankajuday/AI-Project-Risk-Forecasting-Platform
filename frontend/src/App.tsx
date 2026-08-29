import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import Layout from '@/components/Layout';
import ProjectList from '@/pages/ProjectList';
import CreateProject from '@/pages/CreateProject';
import ProjectDetail from '@/pages/ProjectDetail';
import DownloadPDF from './components/DownloadPDF';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectList /> },
      { path: 'projects/new', element: <CreateProject /> },
      { path: 'projects/:projectId', element: <ProjectDetail /> },
      { path: '*', element: <Navigate to="/projects" replace /> },
      {
        path: 'test',
        element: (
          <DownloadPDF
            markdown={`| Risk | Severity | Status |
|---|---|---|
| Missing API documentation | High | Open |
| Low test coverage | Medium | Open |
| Outdated dependency | Low | Monitoring |`}
            filename="hello.pdf"
          />
        ),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
