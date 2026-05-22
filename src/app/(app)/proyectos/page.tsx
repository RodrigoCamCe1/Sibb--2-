'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NewProjectDialog } from '@/components/new-project-dialog';
import { formatBOB, timeAgo } from '@/lib/utils';
import type { Project, Ciudad, Modalidad } from '@/types/database';
import { Building2, MapPin, FileText, Loader2, Plus } from 'lucide-react';

const CITIES = ['Todas', 'La Paz', 'Cochabamba', 'Santa Cruz', 'Tarija', 'Sucre', 'Oruro', 'Potosí'] as const;

export default function ProyectosPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState<typeof CITIES[number]>('Todas');
  const [modalidadFilter, setModalidadFilter] = useState<'Todas' | Modalidad>('Todas');

  useEffect(() => {
    const sb = getSupabase();
    sb.from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = projects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter !== 'Todas' && p.city !== cityFilter) return false;
    if (modalidadFilter !== 'Todas' && p.modalidad !== modalidadFilter) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis proyectos</h1>
            <p className="text-sm text-slate-500 mt-1">
              {loading ? 'Cargando...' : `${projects.length} ${projects.length === 1 ? 'proyecto' : 'proyectos'}`}
            </p>
          </div>
          <NewProjectDialog />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            placeholder="Buscar proyecto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] max-w-md"
          />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value as typeof CITIES[number])}
            className="h-9 rounded-md border border-[var(--color-input)] bg-white px-3 text-sm"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={modalidadFilter}
            onChange={(e) => setModalidadFilter(e.target.value as 'Todas' | Modalidad)}
            className="h-9 rounded-md border border-[var(--color-input)] bg-white px-3 text-sm"
          >
            <option value="Todas">Todas modalidades</option>
            <option value="ANPE">ANPE</option>
            <option value="LP">Licitación Pública</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 inline-block" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={projects.length > 0} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
            <NewProjectDialog
              trigger={
                <button className="bg-white border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-5 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors min-h-[200px]">
                  <div className="text-center">
                    <Plus className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-sm font-medium">Crear proyecto</div>
                  </div>
                </button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/proyectos/detalle?id=${project.id}`}
      className="bg-white rounded-lg border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all p-5 block group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
          {project.cuce ? project.cuce.slice(0, 12) : project.id.slice(0, 8).toUpperCase()}
        </span>
        <Badge variant={project.modalidad === 'LP' ? 'success' : 'info'}>{project.modalidad}</Badge>
      </div>
      <h3 className="font-semibold text-slate-900 leading-tight mb-1 group-hover:text-slate-700">{project.name}</h3>
      <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
        {project.owner_client ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
        {project.owner_client ?? project.city}
      </p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-slate-500">Monto</div>
          <div className="font-bold text-slate-900 text-sm">{project.area_m2 ? formatBOB(0) : formatBOB(0)}</div>
        </div>
        <div>
          <div className="text-slate-500">Ciudad</div>
          <div className="font-bold text-slate-900 text-sm">{project.city}</div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-500">Editado {timeAgo(project.updated_at)}</span>
        <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
      </div>
    </Link>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center">
      <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 className="font-semibold text-slate-900 mb-1">
        {hasAny ? 'No hay proyectos con esos filtros' : 'Crea tu primer proyecto'}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {hasAny ? 'Ajusta los filtros o ' : 'Para empezar a armar un presupuesto, '}
        <span className="text-slate-700 font-medium">crea uno nuevo</span>.
      </p>
      <NewProjectDialog />
    </div>
  );
}
