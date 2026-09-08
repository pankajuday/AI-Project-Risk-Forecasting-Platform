import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import './index.css';
import App from '@/App.tsx';
import { TooltipProvider } from '@/components/ui/tooltip';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      themes={['light', 'dark', 'dim']}
      value={{ light: 'light', dark: 'dark', dim: 'dim' }}
    >
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
