import { Outlet } from 'react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Sidebar from './Sidebar';
import Top from './Top';

export default function Layout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        {/* Side Component */}
        <Sidebar />

        {/* Top & Main Component Container */}
        <SidebarInset className="flex flex-col flex-1 min-w-0 h-full bg-background overflow-hidden">
          {/* Top Component */}
          <Top />

          {/* Main Component Render Area */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
