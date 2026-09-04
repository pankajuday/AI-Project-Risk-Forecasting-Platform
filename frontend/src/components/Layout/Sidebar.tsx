import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import {
  Home,
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

export type TabId = 'overview' | 'docs' | 'analysis' | 'data' | 'report' | 'chat' | 'settings';

interface SidebarProps {
  project?: Project | null;
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  onNewProject?: () => void;
}

// Minimal mock auth — replace with a real auth context when backend auth is ready.
const MOCK_USER = {
  name: 'Pankaj Uday',
  email: 'pankaj@infosys.com',
  initials: 'PU',
};

export default function Sidebar({ project, activeTab, onTabChange, onNewProject }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const { toggleSidebar, state } = useSidebar();
  const { theme, setTheme } = useTheme();

  const [isLoggedIn, setIsLoggedIn] = useState(true);
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

  const isDark = theme === 'dark';

  return (
    <ShadcnSidebar collapsible="icon" className="border-border bg-sidebar border-r">
      {/*  Header  */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={toggleSidebar}
              tooltip={state === 'expanded' ? 'Collapse Sidebar' : 'Expand Sidebar'}
              className="hover:bg-sidebar-accent flex items-center gap-2.5 px-2"
            >
              <div className="border-border bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-sm border">
                <img src="/logo.png" alt="" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/*  Content  */}
      <SidebarContent className="gap-4">
        {/* WORKSPACE Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
            Workspace
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate('/projects')}
                isActive={location.pathname === '/projects' && !activeProjectId}
                tooltip="Home"
                className="gap-2.5 text-xs font-medium"
              >
                <Home size={16} />
                <span>Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem className="mt-1">
              <SidebarMenuButton
                onClick={() => {
                  if (onNewProject) onNewProject();
                  else navigate('/projects/new');
                }}
                tooltip="Create New Project"
                className="bg-foreground text-background hover:bg-foreground/10 w-full justify-start gap-2.5 text-xs font-semibold"
              >
                <Plus size={16} />
                <span>Create New Project</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* PROJECT Navigation (only when a project is open) */}
        {activeProjectId && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider uppercase">
              <span>Projects</span>
              <Badge variant="outline" className="h-4 px-1 py-0 text-[9px]">
                Active
              </Badge>
            </SidebarGroupLabel>

            <SidebarMenu className="gap-1.5">
              {project && state === 'expanded' && (
                <div className="bg-muted/60 border-border mb-2 rounded-md border px-2 py-1.5 text-xs">
                  <div className="text-foreground flex items-center gap-1.5 truncate font-semibold">
                    <FolderOpen size={13} className="text-foreground shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </div>
                </div>
              )}
              {projectNavItems.map(item => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleTabClick(item.id)}
                      isActive={isSelected}
                      tooltip={item.label}
                      className={`gap-2.5 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-accent text-foreground border-foreground border-l-2 font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon size={16} className={isSelected ? 'text-foreground' : ''} />
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
      <SidebarFooter className="border-border space-y-1 border-t p-2">
        {/* Settings row */}
        {activeProjectId && (
          <SidebarMenu>
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
            className={`hover:bg-sidebar-accent flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
              state === 'collapsed' ? 'justify-center' : ''
            }`}
            title={isLoggedIn ? MOCK_USER.name : 'Log in'}
          >
            {/* Avatar */}
            <div className="bg-primary/15 border-border text-primary flex size-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold">
              {isLoggedIn ? MOCK_USER.initials : <User size={14} />}
            </div>

            {/* Name + email — hidden when collapsed */}
            {state === 'expanded' && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-xs leading-tight font-semibold">
                    {isLoggedIn ? MOCK_USER.name : 'Guest'}
                  </p>
                  <p className="text-muted-foreground truncate text-[10px] leading-tight">
                    {isLoggedIn ? MOCK_USER.email : 'Not logged in'}
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
                className={`border-border bg-popover absolute z-50 w-52 space-y-0.5 rounded-lg border p-1 shadow-xl ${
                  state === 'expanded' ? 'bottom-full left-0 mb-2' : 'bottom-0 left-full ml-2'
                }`}
                onClick={e => e.stopPropagation()}
              >
                {/* Profile header */}
                {isLoggedIn && (
                  <div className="border-border mb-1 flex items-center gap-2.5 border-b px-3 py-2.5">
                    <div className="bg-primary/15 border-border text-primary flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                      {MOCK_USER.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-xs font-semibold">
                        {MOCK_USER.name}
                      </p>
                      <p className="text-muted-foreground truncate text-[10px]">
                        {MOCK_USER.email}
                      </p>
                    </div>
                  </div>
                )}

                {/* Theme toggle */}
                <button
                  type="button"
                  className="text-foreground hover:bg-muted flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors"
                  onClick={() => {
                    setTheme(isDark ? 'light' : 'dark');
                    setProfileMenuOpen(false);
                  }}
                >
                  {isDark ? (
                    <Sun size={13} className="text-muted-foreground" />
                  ) : (
                    <Moon size={13} className="text-muted-foreground" />
                  )}
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <div className="bg-border my-0.5 h-px" />

                {/* Login / Logout */}
                {isLoggedIn ? (
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-red-500 transition-colors hover:bg-red-500/10"
                    onClick={() => {
                      setIsLoggedIn(false);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <LogOut size={13} />
                    <span>Log out</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-primary hover:bg-primary/10 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors"
                    onClick={() => {
                      setIsLoggedIn(true);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <LogIn size={13} />
                    <span>Log in</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
