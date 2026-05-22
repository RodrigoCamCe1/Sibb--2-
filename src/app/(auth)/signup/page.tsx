'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = getSupabase();
      const { error: err, data } = await sb.auth.signUp({
        email,
        password,
        options: { data: { name, company_name: company } },
      });
      if (err) throw err;
      if (data.user && !data.session) {
        setSuccess(true);
      } else {
        router.push('/proyectos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-md text-center bg-white rounded-lg border border-slate-200 p-8">
          <div className="text-2xl mb-2">✉️</div>
          <h1 className="text-xl font-bold mb-2">Confirma tu email</h1>
          <p className="text-sm text-slate-600">
            Te enviamos un email a <strong>{email}</strong> con un link para activar la cuenta.
          </p>
          <Link href="/login" className="text-sm text-slate-900 font-medium hover:underline mt-4 inline-block">
            Ir al login
          </Link>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Crear cuenta</h1>
          <p className="text-sm text-slate-500 mb-6">Empieza gratis. No necesitas tarjeta.</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa / Constructora</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-slate-500">Mínimo 8 caracteres</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear cuenta
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500 mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-slate-900 font-medium hover:underline">
              Inicia sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
