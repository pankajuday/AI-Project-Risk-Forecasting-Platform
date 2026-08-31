import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/Context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="cursor-pointer rounded-lg bg-gray-200 p-2 text-gray-800 transition-colors hover:bg-gray-300 focus:outline-none dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-slate-700" />
      )}
    </button>
  );
};
