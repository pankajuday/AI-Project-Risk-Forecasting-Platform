import { createBrowserRouter, RouterProvider, Navigate } from 'react-router';
import Layout from '@/components/Layout/Layout';
import ProjectList from '@/pages/ProjectList';
import CreateProject from '@/pages/CreateProject';
import ProjectDetail from '@/pages/ProjectDetail';
import { Toaster } from '@/components/ui/sonner';

const router = createBrowserRouter([
  {
    // Global shell (sidebar + topbar) for top-level pages
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectList /> },
      { path: 'projects/new', element: <CreateProject /> },
      { path: '*', element: <Navigate to="/projects" replace /> },
    ],
  },
  {
    // Project workspace has its own full-height layout with project sidebar
    // It is outside the global Layout so it can control its own sidebar
    path: '/projects/:projectId',
    element: <ProjectDetail />,
  },
]);

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <RouterProvider router={router} />
    </>
  );
}

