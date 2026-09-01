import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, FolderOpen, Activity, FileText, MessageSquare } from 'lucide-react';
import { projectsApi } from '@/api';
import type { Project } from '@/types';

import DocumentsTab from './tabs/DocumentsTab';
import AnalysisTab from './tabs/AnalysisTab';
import ReportTab from './tabs/ReportTab';
import ChatTab from './tabs/ChatTab';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'analysis' | 'report' | 'chat'>('docs');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    projectsApi
      .get(projectId)
      .then(res => setProject(res.data))
      .catch(err => {
        console.error(err);
        navigate('/projects'); // redirect if not found
      })
      .finally(() => setLoading(false));
  }, [projectId, navigate]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="skeleton h-65" />
      </div>
    );
  }

  if (!project) return null;

  const tabs = [
    { id: 'docs', label: 'Documents', icon: <FolderOpen size={16} /> },
    { id: 'analysis', label: 'Analysis', icon: <Activity size={16} /> },
    { id: 'report', label: 'Report', icon: <FileText size={16} /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={16} /> },
  ] as const;

  return (
    <div className="anim-fade-up flex flex-wrap items-start gap-6">
      {/*  Project Details Sidebar  */}
      <aside className="flex w-65 shrink-0 flex-col gap-4">
        {/* Back link & Project Card */}
        <div className="card flex flex-col gap-3.5 p-4.5">
          <button
            className="btn btn-ghost -ml-1 self-start border-0 px-2 py-1 text-xs"
            onClick={() => navigate('/projects')}
          >
            <ChevronLeft size={15} /> Projects
          </button>

          <div>
            <h1 className="mb-1.5 text-xl leading-[1.3] font-extrabold">{project.name}</h1>
            {project.description && (
              <p className="m-0 text-[12.5px] leading-normal text-(--text-muted)">
                {project.description}
              </p>
            )}
          </div>

          {project.current_health_score != null && (
            <div className="flex items-center justify-between rounded-[10px] border border-(--border) bg-(--bg-elevated) px-3.5 py-2.5">
              <div className="text-xs font-semibold text-(--text-secondary)">Health Score</div>
              <div
                className={`text-xl font-extrabold ${getHealthColor(project.current_health_score)}`}
              >
                {project.current_health_score}/100
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Tabs List */}
        <div className="card flex flex-col gap-1 p-2">
          <div className="px-3 pt-2 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-(--text-muted) uppercase">
            Project Views
          </div>
          {tabs.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex w-full items-center gap-3 rounded-[10px] border px-3.5 py-2.75 text-left text-[13.5px] transition-all duration-200 ${isActive ? 'border-indigo-500/30 bg-(--accent-soft) font-bold text-indigo-300' : 'border-transparent font-medium text-(--text-secondary)'}`}
              >
                <span className={isActive ? 'text-indigo-400' : 'text-(--text-muted)'}>
                  {t.icon}
                </span>
                <span className="flex-1">{t.label}</span>
                {isActive && (
                  <div className="size-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/*  Active Tab Content Area  */}
      <main className="min-w-[320px] flex-1">
        {activeTab === 'docs' && <DocumentsTab projectId={projectId!} />}
        {activeTab === 'analysis' && <AnalysisTab projectId={projectId!} />}
        {activeTab === 'report' && <ReportTab projectId={projectId!} />}
        {activeTab === 'chat' && <ChatTab projectId={projectId!} />}
      </main>
    </div>
  );
}

function getHealthColor(score: number) {
  if (score >= 70) return 'text-(--success)';
  if (score >= 40) return 'text-(--warning)';
  return 'text-(--danger)';
}
