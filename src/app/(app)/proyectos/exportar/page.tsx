'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { validateProject } from '@/lib/norm-validator';
import { generateSicoesBundle } from '@/lib/export/bundle';
import type { Project, Item } from '@/types/database';
import { ChevronRight, FileSpreadsheet, FileText, FileImage, AlertOctagon, Download, Loader2 } from 'lucide-react';

const FILES: { key: string; name: string; description: string; modality: 'both' | 'lp'; icon: 'sheet' | 'doc' | 'pdf' }[] = [
  { key: 'B1', name: '01-B1-Presupuesto.xlsx', description: 'Formulario B-1 oficial — ítems con precios numeral + literal', modality: 'both', icon: 'sheet' },
  { key: 'B2', name: '02-B2-APU.xlsx', description: 'Análisis de Precios Unitarios (1 hoja por ítem)', modality: 'lp', icon: 'sheet' },
  { key: 'B3', name: '03-B3-CatalogoInsumos.xlsx', description: 'Precios elementales materiales / mano / equipo', modality: 'lp', icon: 'sheet' },
  { key: 'B4', name: '04-B4-CostoEquipos.xlsx', description: 'Opcional — desglose hora-equipo (si tiene equipo pesado)', modality: 'lp', icon: 'sheet' },
  { key: 'B5', name: '05-B5-Cronograma.xlsx', description: 'Cronograma desembolsos (anticipo + tramos)', modality: 'lp', icon: 'sheet' },
  { key: 'TECH', name: '06-EspecificacionesTecnicas.docx', description: '5 secciones por ítem (descripción, materiales, ejecución, medición, pago)', modality: 'both', icon: 'doc' },
  { key: 'PDF', name: '07-Presupuesto.pdf', description: 'Versión imprimible con membrete editable', modality: 'both', icon: 'pdf' },
];

function ExportarPageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(['B1', 'B2', 'B3', 'B5', 'TECH']));
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const sb = getSupabase();
    Promise.all([
      sb.from('projects').select('*').eq('id', projectId).maybeSingle(),
      sb.from('items').select('*, chapters!inner(project_id)').eq('chapters.project_id', projectId).order('order_index'),
    ]).then(([p, i]) => {
      setProject(p.data ?? null);
      setItems((i.data as Item[]) ?? []);
      setLoading(false);
    });
  }, [projectId]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

  const isLP = project.modalidad === 'LP';
  const alerts = validateProject({ project, items, total_cost: 0 });
  const blockers = alerts.filter((a) => a.severity === 'CRITICAL');

  function toggleFile(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onExport() {
    if (!project) return;
    setGenerating(true);
    try {
      // Datos mínimos para demo (TODO: alimentar con datos reales del proyecto)
      const b1Rows = items.map((it, idx) => ({
        item_n: idx + 1,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unit_price: 0, // TODO: leer cached_unit_price del APU
      }));

      await generateSicoesBundle(
        {
          project,
          items,
          b1Rows,
          b2Inputs: [],
          b3Insumos: [],
          b5Entries: [
            { n: 1, description: 'Anticipo', mes_o_semana: 'M0', total_pct: 20 },
            { n: 2, description: '1er Desembolso', mes_o_semana: 'M1', total_pct: 20 },
            { n: 3, description: '2do Desembolso', mes_o_semana: 'M2', total_pct: 20 },
            { n: 4, description: '3er Desembolso', mes_o_semana: 'M3', total_pct: 20 },
            { n: 5, description: 'Liquidación final', mes_o_semana: 'M4', total_pct: 20 },
          ],
          includeB4: false,
        },
        { selected },
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="px-6 md:px-8 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
        <Link href="/proyectos" className="hover:text-slate-900">Proyectos</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/proyectos/detalle?id=${project.id}`} className="hover:text-slate-900">{project.name}</Link>
        <ChevronRight className="w-3 h-3" />
        <span>Exportar SICOES</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Exportar a SICOES</h1>
      <p className="text-sm text-slate-500 mb-6">
        Modalidad <Badge variant={isLP ? 'success' : 'info'} className="ml-1">{project.modalidad}</Badge> • {isLP ? 'Genera B-1 a B-5' : 'Genera solo B-1'}
      </p>

      {blockers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-red-900">Export bloqueado por {blockers.length} alerta{blockers.length > 1 ? 's' : ''} crítica{blockers.length > 1 ? 's' : ''}</div>
            <p className="text-sm text-red-700 mt-1">
              Resuelve las alertas críticas en{' '}
              <Link href={`/proyectos/normas?id=${project.id}`} className="underline font-medium">
                Validador normativo
              </Link>{' '}
              antes de exportar.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-sm">Archivos a generar (paquete ZIP)</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {FILES.filter((f) => f.modality === 'both' || isLP).map((f) => {
            const isSelected = selected.has(f.key);
            const Icon = f.icon === 'sheet' ? FileSpreadsheet : f.icon === 'doc' ? FileText : FileImage;
            return (
              <label key={f.key} className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 ${!isSelected ? 'opacity-60' : ''}`}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleFile(f.key)} className="rounded" />
                <Icon className={`w-5 h-5 ${isSelected ? (f.icon === 'sheet' ? 'text-emerald-600' : f.icon === 'doc' ? 'text-sky-600' : 'text-rose-600') : 'text-slate-300'}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{f.name}</div>
                  <div className="text-xs text-slate-500">{f.description}</div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">{selected.size} archivo{selected.size === 1 ? '' : 's'} seleccionado{selected.size === 1 ? '' : 's'}</span>
          <Button disabled={generating || blockers.length > 0} onClick={onExport}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generar paquete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ExportarPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <ExportarPageInner />
    </Suspense>
  );
}
