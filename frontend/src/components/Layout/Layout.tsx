import { Outlet } from 'react-router';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Sidebar from './Sidebar';
import Top from './Top';

export default function Layout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="bg-background text-foreground flex h-screen w-full overflow-hidden">
        {/* Side Component */}
        <Sidebar />

        {/* Top & Main Component Container */}
        <SidebarInset className="bg-background flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          {/* Top Component */}
          <Top />

          {/* Main Component Render Area */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
