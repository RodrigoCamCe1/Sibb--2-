'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = getSupabase();
      const { error: err } = await sb.auth.signInWithPassword({ email, password });
      if (err) throw err;
      router.push('/proyectos');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold">S</div>
            <div className="text-left">
              <div className="font-semibold text-slate-900 leading-none text-lg">Sibbë</div>
              <div className="text-xs text-slate-500 leading-none mt-1">/ Obras</div>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Iniciar sesión</h1>
          <p className="text-sm text-slate-500 mb-6">Accede para gestionar tus proyectos.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="constructora@ejemplo.bo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500 mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-slate-900 font-medium hover:underline">
              Regístrate
            </Link>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">© 2026 Sibbë • La Paz, Bolivia</p>
      </div>
    </div>
  );
}
