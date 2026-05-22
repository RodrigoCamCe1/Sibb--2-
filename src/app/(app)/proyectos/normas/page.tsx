'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { validateProject, severityLabel, severityVariant, type NormAlert } from '@/lib/norm-validator';
import type { Project, Item } from '@/types/database';
import { ChevronRight, AlertOctagon, AlertTriangle, Info, Loader2, ShieldCheck } from 'lucide-react';

function NormsPageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!projectId) return;
    const sb = getSupabase();
    Promise.all([
      sb.from('projects').select('*').eq('id', projectId).maybeSingle(),
      sb.from('items').select('*, chapters!inner(project_id)').eq('chapters.project_id', projectId),
    ]).then(([p, i]) => {
      setProject(p.data ?? null);
      setItems((i.data as Item[]) ?? []);
      setLoading(false);
    });
  }, [projectId]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

  const alerts = validateProject({ project, items, total_cost: 0 });
  const grouped = {
    CRITICAL: alerts.filter((a) => a.severity === 'CRITICAL'),
    HIGH: alerts.filter((a) => a.severity === 'HIGH'),
    MEDIUM: alerts.filter((a) => a.severity === 'MEDIUM'),
  };

  return (
    <div className="px-6 md:px-8 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Link href="/proyectos" className="hover:text-slate-900">Proyectos</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/proyectos/detalle?id=${project.id}`} className="hover:text-slate-900">{project.name}</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Validador normativo</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Alertas normativas</h1>
        <p className="text-sm text-slate-500 mt-1">{alerts.length} alertas detectadas contra CBH-87 / NB 1225001 / NB 777</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SevCard variant="destructive" icon={AlertOctagon} label="CRÍTICA" count={grouped.CRITICAL.length} hint="Bloquea export" />
        <SevCard variant="warning" icon={AlertTriangle} label="ALTA" count={grouped.HIGH.length} hint="Resolver antes" />
        <SevCard variant="info" icon={Info} label="MEDIA" count={grouped.MEDIUM.length} hint="Recomendación" />
      </div>

      {alerts.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h3 className="font-semibold text-emerald-900 mb-1">Cumple normativa</h3>
          <p className="text-sm text-emerald-700">
            Las 10 reglas del validador (CBH-87 / NB 1225001 / NB 777) se cumplen para este proyecto.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a, idx) => (
            <AlertCard key={idx} alert={a} projectId={project.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function SevCard({ variant, icon: Icon, label, count, hint }: { variant: 'destructive' | 'warning' | 'info'; icon: React.ElementType; label: string; count: number; hint: string }) {
  const styles = {
    destructive: 'bg-red-50 border-red-200 text-red-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-sky-50 border-sky-200 text-sky-900',
  };
  const iconStyles = {
    destructive: 'text-red-700',
    warning: 'text-amber-700',
    info: 'text-sky-700',
  };
  return (
    <div className={`border rounded-lg p-4 ${styles[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconStyles[variant]}`} />
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs opacity-80">{hint}</div>
    </div>
  );
}

function AlertCard({ alert, projectId }: { alert: NormAlert; projectId: string }) {
  const borderColor = alert.severity === 'CRITICAL' ? 'border-l-red-500' : alert.severity === 'HIGH' ? 'border-l-amber-500' : 'border-l-sky-500';
  return (
    <div className={`bg-white border-l-4 ${borderColor} border-y border-r border-slate-200 rounded-r-lg p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={severityVariant(alert.severity)}>{severityLabel(alert.severity)}</Badge>
            <span className="text-xs text-slate-500">{alert.code} • {alert.norm_reference}</span>
          </div>
          <h3 className="font-semibold text-slate-900">{alert.title}</h3>
          <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
          <div className="mt-2 bg-slate-50 rounded p-2 text-xs">
            <strong className="text-slate-700">Sugerencia:</strong> <span className="text-slate-600">{alert.suggestion}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {alert.item_id && (
            <Button size="sm" asChild>
              <Link href={`/proyectos/apu?id=${projectId}&item=${alert.item_id}`}>Ir al ítem</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NormsPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <NormsPageInner />
    </Suspense>
  );
}
