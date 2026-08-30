import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { Brain, FolderKanban, Sun, Moon } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--bg-base)] font-sans text-[var(--text-primary)] transition-colors duration-200">
      {/* Premium Global Navigation Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)]/80 px-6 py-3.5 backdrop-blur-md">
        <Link to="/projects" className="flex items-center gap-3 no-underline">
          <div className="flex size-9 items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[0_4px_14px_rgba(99,102,241,0.25)]">
            <Brain size={18} className="text-[var(--text-primary)]" />
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
                ? 'border-indigo-500/25 bg-[var(--accent-soft)] text-indigo-500'
                : 'border-transparent bg-transparent text-[var(--text-secondary)]'
            }`}
          >
            <FolderKanban size={15} />
            <span>Projects</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex cursor-pointer items-center justify-center rounded-[10px] border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-[var(--text-secondary)] transition-all duration-150 hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)]"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main content body centered */}
      <main className="mx-auto w-full max-w-300 flex-1 px-6 py-7">
        <Outlet />
      </main>
    </div>
  );
}