'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabase } from '@/lib/supabase/client';
import type { Ciudad, Modalidad } from '@/types/database';
import { Loader2, Plus } from 'lucide-react';

const CITIES: Ciudad[] = ['La Paz', 'Cochabamba', 'Santa Cruz', 'Tarija', 'Sucre', 'Oruro', 'Potosí'];

export function NewProjectDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState<Ciudad>('La Paz');
  const [owner, setOwner] = useState('');
  const [modalidad, setModalidad] = useState<Modalidad>('ANPE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const sb = getSupabase();
      const { data: userData } = await sb.auth.getUser();
      if (!userData.user) throw new Error('No autenticado');

      const { data, error: err } = await sb
        .from('projects')
        .insert({
          user_id: userData.user.id,
          name,
          city,
          owner_client: owner || null,
          modalidad,
        })
        .select('id')
        .maybeSingle();

      if (err) throw err;
      if (data) {
        setOpen(false);
        router.push(`/proyectos/detalle?id=${data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando proyecto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="w-4 h-4" />
            Nuevo proyecto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>Crear un presupuesto para una obra nueva.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del proyecto</Label>
            <Input id="name" placeholder="Ej: Construcción Aulas U.E. San Calixto" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <select
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value as Ciudad)}
                className="w-full h-9 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modalidad">Modalidad SICOES</Label>
              <select
                id="modalidad"
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as Modalidad)}
                className="w-full h-9 rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm"
              >
                <option value="ANPE">ANPE (≤ Bs 200.000)</option>
                <option value="LP">Licitación Pública</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner">Cliente / Entidad convocante</Label>
            <Input id="owner" placeholder="Opcional — ej: GAM La Paz, Caja Nacional de Salud..." value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading || !name}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear proyecto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
