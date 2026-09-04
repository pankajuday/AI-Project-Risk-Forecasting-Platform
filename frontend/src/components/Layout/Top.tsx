import { useNavigate } from 'react-router';
import { Search, Sun, Moon, User, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
      {/* Left: Sidebar Trigger & Platform Header Title + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0" />
        
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-xs font-bold tracking-tight text-foreground truncate">
            AI-Driven Enterprise Project Intelligence & Risk Management Platform
          </h1>

          <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <span
              className="cursor-pointer hover:text-foreground font-medium transition-colors"
              onClick={() => navigate('/projects')}
            >
              Workspace
            </span>

            {breadcrumb && breadcrumb.length > 0 ? (
              breadcrumb.map((b, idx) => (
                <div key={idx} className="flex items-center gap-1 min-w-0">
                  <ChevronRight size={11} className="text-muted-foreground/60 shrink-0" />
                  {b.onClick ? (
                    <button
                      type="button"
                      onClick={b.onClick}
                      className="truncate font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-none p-0 text-[11px]"
                    >
                      {b.label}
                    </button>
                  ) : (
                    <span className="truncate font-semibold text-foreground text-[11px]">{b.label}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1">
                <ChevronRight size={11} className="text-muted-foreground/60 shrink-0" />
                <span className="font-semibold text-foreground text-[11px]">Projects</span>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* Right: Search, Theme Toggle, User Avatar */}
      <div className="flex items-center gap-2 shrink-0">
        {onSearchChange !== undefined && (
          <div className="relative hidden sm:block w-44 lg:w-56">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery || ''}
              onChange={e => onSearchChange(e.target.value)}
              className="h-8 w-full pl-8 pr-3 text-xs rounded-md bg-muted/40 border-border focus:bg-background"
            />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={15} className="text-foreground" /> : <Moon size={15} className="text-foreground" />}
        </Button>

        <div className="flex size-7 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-foreground shadow-xs">
          <User size={14} />
        </div>
      </div>
    </header>
  );
}
