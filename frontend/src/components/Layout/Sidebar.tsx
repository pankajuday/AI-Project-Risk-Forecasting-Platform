import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import {
  Plus,
  LayoutDashboard,
  FileText,
  Activity,
  FileSpreadsheet,
  FileSearch,
  MessageSquareText,
  Settings,
  FolderOpen,
  LogOut,
  LogIn,
  User,
  ChevronsUpDown,
  Sun,
  Moon,
  CloudMoon,
  UserPlus,
} from 'lucide-react';
import type { Project } from '@/types';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';

export type TabId = 'overview' | 'docs' | 'analysis' | 'data' | 'report' | 'chat' | 'settings';

interface SidebarProps {
  project?: Project | null;
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  onNewProject?: () => void;
}

export default function Sidebar({ project, activeTab, onTabChange, onNewProject }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout, openAuthModal, getUserInitial } = useAuth();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const activeProjectId = project?.id || routeProjectId;

  const handleTabClick = (tab: TabId) => {
    if (onTabChange) {
      onTabChange(tab);
    } else if (activeProjectId) {
      navigate(`/projects/${activeProjectId}`);
    }
  };

  const projectNavItems = [
    { id: 'overview' as TabId, label: 'Overview', icon: LayoutDashboard },
    { id: 'docs' as TabId, label: 'Documents', icon: FileText },
    { id: 'analysis' as TabId, label: 'Analysis', icon: Activity },
    { id: 'report' as TabId, label: 'Reports', icon: FileSearch },
    { id: 'data' as TabId, label: 'Generated Document', icon: FileSpreadsheet },
    { id: 'chat' as TabId, label: 'Chat', icon: MessageSquareText },
  ];

  const userInitial = getUserInitial();
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <ShadcnSidebar collapsible="icon" className="border-border bg-sidebar border-r">
      {/*  Header  */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-sidebar-accent group cursor-pointer"
              onClick={() => navigate('/projects')}
            >
              <div className="border-border bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-sm border">
                <img src="/logo.png" alt="" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/*  Main Navigation  */}
      <SidebarContent>
        {/* Workspace section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
            Platform
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate('/projects')}
                isActive={location.pathname === '/projects' || location.pathname === '/'}
                tooltip="All Projects"
                className="gap-2.5 text-xs font-medium transition-colors"
              >
                <FolderOpen size={16} />
                <span>Projects</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {onNewProject && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onNewProject}
                  tooltip="New Project"
                  className="text-primary hover:text-primary gap-2.5 text-xs font-medium transition-colors"
                >
                  <Plus size={16} />
                  <span>New Project</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Project Context Navigation (visible when a project is selected) */}
        {activeProjectId && (
          <SidebarGroup>
            <div className="px-2 py-1.5">
              <SidebarGroupLabel className="text-muted-foreground flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase">
                <span>Active Project</span>
                {project && (
                  <Badge variant="outline" className="text-[9px] font-normal capitalize">
                    {project.status.replace('_', ' ')}
                  </Badge>
                )}
              </SidebarGroupLabel>
              <SidebarGroupLabel className="text-foreground flex items-center justify-between tracking-wider uppercase">
                {project && (
                  <p
                    className="text-foreground truncate px-2 text-xs font-semibold"
                    title={project.name}
                  >
                    {project.name}
                  </p>
                )}
              </SidebarGroupLabel>
            </div>

            <SidebarMenu>
              {projectNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleTabClick(item.id)}
                      isActive={isActive}
                      tooltip={item.label}
                      className={`gap-2.5 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary border-sidebar-primary border-l-2 font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-primary' : ''} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/*  Footer  */}
      <SidebarFooter className="border-border border-t p-2">
        {/* Settings Tab (if active project) */}
        {activeProjectId && (
          <SidebarMenu className="mb-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => handleTabClick('settings')}
                isActive={activeTab === 'settings'}
                tooltip="Settings"
                className={`gap-2.5 text-xs font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-accent text-foreground border-foreground border-l-2 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings size={16} className={activeTab === 'settings' ? 'text-foreground' : ''} />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        {/* Profile card with dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen(prev => !prev)}
            className={`hover:bg-sidebar-accent flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
              state === 'collapsed' ? 'justify-center' : ''
            }`}
            title={isAuthenticated ? displayName : 'Account & Settings'}
          >
            {/* Avatar */}
            <div className="bg-primary/15 border-border text-primary flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold shadow-xs">
              {isAuthenticated ? userInitial : <User size={14} />}
            </div>

            {/* Name + email — hidden when collapsed */}
            {state === 'expanded' && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-xs leading-tight font-semibold">
                    {isAuthenticated ? displayName : 'Guest User'}
                  </p>
                  <p className="text-muted-foreground truncate text-[10px] leading-tight">
                    {isAuthenticated ? user?.email : 'Click to sign in'}
                  </p>
                </div>
                <ChevronsUpDown size={13} className="text-muted-foreground shrink-0" />
              </>
            )}
          </button>

          {/* Dropdown menu */}
          {profileMenuOpen && (
            <>
              {/* Backdrop to close on outside click */}
              <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
              <div
                className={`border-border bg-popover text-popover-foreground absolute z-50 w-56 space-y-1 rounded-lg border p-1.5 shadow-xl ${
                  state === 'expanded' ? 'bottom-full left-0 mb-2' : 'bottom-0 left-full ml-2'
                }`}
                onClick={e => e.stopPropagation()}
              >
                {/* Profile header */}
                {isAuthenticated ? (
                  <div className="border-border mb-1 flex items-center gap-2.5 border-b px-2.5 py-2">
                    <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-xs">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-xs font-semibold">
                        {displayName}
                      </p>
                      <p className="text-muted-foreground truncate text-[10px]">{user?.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="border-border mb-1 border-b px-2.5 py-2">
                    <p className="text-foreground text-xs font-semibold">Welcome to Risk Advisor</p>
                    <p className="text-muted-foreground text-[10px]">
                      Sign in to access your projects
                    </p>
                  </div>
                )}

                {/* Theme selection */}
                <div className="text-muted-foreground px-2.5 pt-1 text-[10px] font-semibold tracking-wider uppercase">
                  Theme
                </div>
                <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md p-1.5 text-[11px] font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-primary/10 text-primary border-primary/30 border font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Light Theme"
                  >
                    <Sun size={13} className={theme === 'light' ? 'text-amber-500' : ''} />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dim')}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md p-1.5 text-[11px] font-medium transition-colors ${
                      theme === 'dim'
                        ? 'bg-primary/10 text-primary border-primary/30 border font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Dim Theme (Softer Blue Dark)"
                  >
                    <CloudMoon size={13} className={theme === 'dim' ? 'text-sky-400' : ''} />
                    <span>Dim</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md p-1.5 text-[11px] font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-primary/10 text-primary border-primary/30 border font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Dark Theme"
                  >
                    <Moon size={13} className={theme === 'dark' ? 'text-indigo-400' : ''} />
                    <span>Dark</span>
                  </button>
                </div>

                <div className="bg-border my-0.5 h-px" />

                {/* Login / Logout */}
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium transition-colors"
                    onClick={async () => {
                      setProfileMenuOpen(false);
                      await logout();
                    }}
                  >
                    <LogOut size={13} />
                    <span>Log out</span>
                  </button>
                ) : (
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      className="bg-primary/10 text-primary hover:bg-primary/20 flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        openAuthModal('login');
                      }}
                    >
                      <LogIn size={13} />
                      <span>Log in</span>
                    </button>
                    <button
                      type="button"
                      className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        openAuthModal('register');
                      }}
                    >
                      <UserPlus size={13} />
                      <span>Create Account</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
