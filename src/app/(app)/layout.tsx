import { Suspense } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Sidebar } from '@/components/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 min-w-0">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </div>
    </AuthGuard>
  );
}
