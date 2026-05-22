'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'authed' | 'unauthed' | 'error'>('checking');

  useEffect(() => {
    let mounted = true;
    try {
      const sb = getSupabase();
      sb.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        if (data.session) {
          setStatus('authed');
        } else {
          setStatus('unauthed');
          router.replace('/login');
        }
      });
      const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        if (!session) {
          setStatus('unauthed');
          router.replace('/login');
        }
      });
      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    } catch {
      setStatus('error');
    }
  }, [router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-2xl mb-2">⚙️</div>
          <h1 className="text-lg font-bold mb-2">Supabase no configurado</h1>
          <p className="text-sm text-slate-600 mb-4">
            Faltan variables de entorno <code className="bg-slate-100 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code className="bg-slate-100 px-1 rounded text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
          <p className="text-xs text-slate-500">Copia <code className="bg-slate-100 px-1 rounded">.env.local.example</code> a <code className="bg-slate-100 px-1 rounded">.env.local</code> y configura tu proyecto Supabase.</p>
        </div>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (status === 'unauthed') return null;

  return <>{children}</>;
}
