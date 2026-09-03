import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { FolderKanban, Sun, Moon } from 'lucide-react';

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
    <div className="flex min-h-screen w-full flex-col bg-(--bg-base) font-sans text-(--text-primary) transition-colors duration-200">
      {/* Premium Global Navigation Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-(--border) bg-(--bg-surface)/80 px-6 py-3.5 backdrop-blur-md">
        <Link to="/projects" className="flex items-center gap-3 no-underline">
          <div className="flex size-9 items-center justify-center rounded-sm border border-(--border)">
            {/* <Brain size={18} className="text-(--text-primary)" /> */}
            <img src="/logo.png" alt="" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold tracking-[-0.02em] text-(--text-primary)">
              AI-Driven Enterprise Project Intelligence & Risk Management Platform
            </div>
            <div className="text-[10px] font-medium text-(--text-muted)">
              Upload your project documents and get instant AI-powered risk analysis, forecasts, and
              recommendations in plain language.
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/projects"
            className={`flex items-center gap-2 rounded-[10px] border px-4 py-2 text-[13px] font-semibold no-underline transition-all duration-150 ease-in-out ${
              location.pathname.startsWith('/projects')
                ? 'border-indigo-500/25 bg-(--accent-soft) text-indigo-500'
                : 'border-transparent bg-transparent text-(--text-secondary)'
            }`}
          >
            <FolderKanban size={15} />
            <span>Projects</span>
          </Link>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex cursor-pointer items-center justify-center rounded-[10px] border border-(--border) bg-(--bg-elevated) p-2 text-(--text-secondary) transition-all duration-150 hover:bg-(--bg-overlay) hover:text-(--text-primary)"
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
