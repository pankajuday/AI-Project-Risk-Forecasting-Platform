import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { projectsApi } from '@/api';
import type { Project } from '@/types';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Sidebar, { type TabId } from '@/components/Layout/Sidebar';
import Top from '@/components/Layout/Top';

import OverviewTab from './tabs/OverviewTab';
import DocumentsTab from './tabs/DocumentsTab';
import AnalysisTab from './tabs/AnalysisTab';
import ReportTab from './tabs/ReportTab';
import GeneratedDataTab from './tabs/GeneratedDataTab';
import ChatTab from './tabs/ChatTab';
import ProjectSettingsTab from './tabs/ProjectSettingsTab';

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  docs: 'Documents',
  analysis: 'Analysis',
  data: 'Generated Document',
  report: 'Reports',
  chat: 'Chat',
  settings: 'Settings',
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(() => {
    if (!projectId) return;
    projectsApi
      .get(projectId)
      .then(res => setProject(res.data))
      .catch(err => {
        console.error(err);
        navigate('/projects');
      })
      .finally(() => setLoading(false));
  }, [projectId, navigate]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  if (loading) {
    return (
      <div className="bg-background flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-muted-foreground text-xs font-medium">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const breadcrumb = [
    { label: 'Projects', onClick: () => navigate('/projects') },
    { label: project.name, onClick: () => setActiveTab('overview') },
    ...(activeTab !== 'overview' ? [{ label: TAB_LABELS[activeTab] }] : []),
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="bg-background text-foreground flex h-screen w-full overflow-hidden">
        {/* Side Component */}
        <Sidebar
          project={project}
          activeTab={activeTab}
          onTabChange={tab => setActiveTab(tab)}
          onNewProject={() => navigate('/projects/new')}
        />

        {/* Top & Main Container */}
        <SidebarInset className="bg-background flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top Component */}
          <Top breadcrumb={breadcrumb} />

          {/* Main Component Render Area */}
          <main
            className={`flex-1 overflow-x-hidden overflow-y-auto p-6 ${
              activeTab === 'chat' ? 'flex flex-col overflow-hidden p-0!' : ''
            }`}
          >
            {activeTab === 'overview' && (
              <OverviewTab project={project} onTabChange={tab => setActiveTab(tab as TabId)} />
            )}
            {activeTab === 'docs' && <DocumentsTab projectId={projectId!} />}
            {activeTab === 'analysis' && <AnalysisTab projectId={projectId!} />}
            {activeTab === 'data' && <GeneratedDataTab projectId={projectId!} />}
            {activeTab === 'report' && <ReportTab projectId={projectId!} />}
            {activeTab === 'chat' && (
              <div className="flex flex-1 flex-col overflow-hidden p-6">
                <ChatTab projectId={projectId!} />
              </div>
            )}
            {activeTab === 'settings' && (
              <ProjectSettingsTab project={project} onProjectUpdated={fetchProject} />
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
