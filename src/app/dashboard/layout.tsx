import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen px-2 py-2 md:px-3 md:py-3">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-[1700px] gap-3 rounded-[1.5rem] border border-border/60 bg-white/45 p-2 backdrop-blur-sm md:p-3">
        <Sidebar />
        <div className="flex min-h-full flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/75">
          <Header />
          <main className="flex-1 overflow-auto px-4 py-5 md:px-6 md:py-6">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
