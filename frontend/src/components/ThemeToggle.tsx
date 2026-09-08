import React, { useEffect, useState } from 'react';
import { Sun, Moon, CloudMoon, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className={`border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer rounded-lg border p-2 transition-colors focus:outline-none ${className}`}
        aria-label="Toggle theme"
      >
        <Moon className="h-4 w-4 opacity-70" />
      </button>
    );
  }

  const currentTheme = theme || 'dark';

  const themeConfig = {
    light: {
      label: 'Light',
      icon: (
        <Sun className="h-4 w-4 text-amber-500 transition-transform duration-200 hover:rotate-45" />
      ),
    },
    dim: {
      label: 'Dim',
      icon: <CloudMoon className="h-4 w-4 text-sky-400 transition-transform duration-200" />,
    },
    dark: {
      label: 'Dark',
      icon: (
        <Moon className="h-4 w-4 text-indigo-400 transition-transform duration-200 hover:-rotate-12" />
      ),
    },
  }[currentTheme as 'light' | 'dim' | 'dark'] || {
    label: 'Dark',
    icon: <Moon className="h-4 w-4 text-indigo-400" />,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={`border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors focus:outline-none ${className}`}
        title={`Theme: ${themeConfig.label}`}
        aria-label={`Current theme: ${themeConfig.label}. Open theme menu`}
      >
        {themeConfig.icon}
        {showLabel && <span>{themeConfig.label}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex items-center justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            Light
          </span>
          {currentTheme === 'light' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dim')}
          className="flex items-center justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <CloudMoon className="h-4 w-4 text-sky-400" />
            Dim
          </span>
          {currentTheme === 'dim' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex items-center justify-between"
        >
          <span className="inline-flex items-center gap-2">
            <Moon className="h-4 w-4 text-indigo-400" />
            Dark
          </span>
          {currentTheme === 'dark' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
