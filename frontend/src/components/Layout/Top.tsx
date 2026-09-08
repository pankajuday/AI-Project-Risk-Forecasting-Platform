import { useNavigate } from 'react-router';
import { Search, ChevronRight, LogOut, LogIn } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface TopProps {
  breadcrumb?: BreadcrumbItem[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export default function Top({ breadcrumb, searchQuery, onSearchChange }: TopProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthModal, logout, getUserInitial } = useAuth();

  const userInitial = getUserInitial();
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="border-border bg-background/80 sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b px-4 backdrop-blur-md">
      {/* Left: Sidebar Trigger & Platform Header Title + Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0" />

        <div className="flex min-w-0 flex-col justify-center">
          <h1 className="text-foreground truncate text-xs font-bold tracking-tight">
            AI-Driven Enterprise Project Intelligence & Risk Management Platform
          </h1>

          <nav className="text-muted-foreground flex items-center gap-1.5 truncate text-[11px]">
            <span
              className="hover:text-foreground cursor-pointer font-medium transition-colors"
              onClick={() => navigate('/projects')}
            >
              Workspace
            </span>

            {breadcrumb && breadcrumb.length > 0 ? (
              breadcrumb.map((b, idx) => (
                <div key={idx} className="flex min-w-0 items-center gap-1">
                  <ChevronRight size={11} className="text-muted-foreground/60 shrink-0" />
                  {b.onClick ? (
                    <button
                      type="button"
                      onClick={b.onClick}
                      className="text-muted-foreground hover:text-foreground cursor-pointer truncate border-none bg-transparent p-0 text-[11px] font-medium transition-colors"
                    >
                      {b.label}
                    </button>
                  ) : (
                    <span className="text-foreground truncate text-[11px] font-semibold">
                      {b.label}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1">
                <ChevronRight size={11} className="text-muted-foreground/60 shrink-0" />
                <span className="text-foreground text-[11px] font-semibold">Projects</span>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Right: Search, Theme Toggle, User Avatar */}
      <div className="flex shrink-0 items-center gap-2">
        {onSearchChange !== undefined && (
          <div className="relative hidden w-44 sm:block lg:w-56">
            <Search
              size={14}
              className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
            />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery || ''}
              onChange={e => onSearchChange(e.target.value)}
              className="bg-muted/40 border-border focus:bg-background h-8 w-full rounded-md pr-3 pl-8 text-xs"
            />
          </div>
        )}

        <ThemeToggle className="h-8 w-8 p-0!" />

        {/* User profile dropdown / login trigger */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className="bg-primary text-primary-foreground focus:ring-ring flex size-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold shadow-xs transition-transform hover:scale-105 focus:ring-2 focus:ring-offset-2 focus:outline-none"
              title={displayName}
              aria-label="User account menu"
            >
              {userInitial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-foreground text-xs leading-none font-semibold">
                      {displayName}
                    </p>
                    <p className="text-muted-foreground text-[11px] leading-none">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs font-medium"
                >
                  <LogOut className="mr-2 size-3.5" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAuthModal('login')}
            className="h-8 gap-1.5 px-3 text-xs font-medium"
          >
            <LogIn size={13} />
            <span className="hidden sm:inline">Sign In</span>
          </Button>
        )}
      </div>
    </header>
  );
}
