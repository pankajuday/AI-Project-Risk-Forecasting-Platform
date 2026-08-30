import { Outlet, Link, useLocation } from 'react-router';
import { Brain, FolderKanban } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--bg-base)] font-sans text-[var(--text-primary)] transition-colors duration-200">
      {/* Global Navigation Header */}
      <header className="relative top-0 bottom-2.5 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 py-3.5 backdrop-blur-md transition-colors duration-200">
        <Link to="/projects" className="flex items-center gap-3 no-underline">
          <div className="flex size-9 items-center justify-center rounded-[10px] border border-indigo-500/25 bg-[var(--accent)] shadow-[0_4px_14px_rgba(99,102,241,0.35)]">
            <Brain size={18} color="#f0f0ff" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
              Project Intel
            </div>
            <div className="text-[10px] font-medium text-[var(--text-muted)]">
              AI-Driven Enterprise Project Intelligence & Risk Management Platform
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/projects"
            className={`flex items-center gap-2 rounded-[10px] border px-4 py-2 text-[13px] font-semibold no-underline transition-all duration-150 ease-in-out ${
              location.pathname.startsWith('/projects')
                ? 'border-indigo-500/25 bg-[var(--accent-soft)] text-indigo-500 dark:text-indigo-300'
                : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FolderKanban size={15} />
            <span>Projects</span>
          </Link>

          {/* Dark / Light Mode Toggle Button */}
          <ThemeToggle />
        </div>
      </header>

      {/* Main content body centered */}
      <main className="mx-auto w-full max-w-300 flex-1 px-6 py-7">
        <Outlet />
      </main>
    </div>
  );
}