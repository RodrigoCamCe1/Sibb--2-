'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { validateProject } from '@/lib/norm-validator';
import { generateSicoesBundle } from '@/lib/export/bundle';
import { generatePresupuestoPDF } from '@/lib/export/pdf';
import { buildExportData, type ExportData } from '@/lib/export-data';
import { formatBOB } from '@/lib/utils';
import { saveAs } from 'file-saver';
import type { Project } from '@/types/database';
import { ChevronRight, FileSpreadsheet, FileText, FileImage, AlertOctagon, Download, Eye, Loader2 } from 'lucide-react';

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
  const [data, setData] = useState<ExportData | null>(null);
  const [empresa, setEmpresa] = useState<{ name?: string; nit?: string; direccion?: string }>({});
  const [selected, setSelected] = useState<Set<string>>(new Set(['B1', 'B2', 'B3', 'B5', 'TECH', 'PDF']));
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const sb = getSupabase();
    (async () => {
      const [{ data: p }, prof] = await Promise.all([
        sb.from('projects').select('*').eq('id', projectId).maybeSingle(),
        sb.auth.getUser().then(async ({ data: u }) => {
          if (!u.user) return null;
          const { data: profile } = await sb.from('profiles').select('company_name, name').eq('id', u.user.id).maybeSingle();
          return profile as { company_name?: string; name?: string } | null;
        }),
      ]);
      const proj = (p as Project | null) ?? null;
      setProject(proj);
      if (prof) setEmpresa({ name: prof.company_name ?? prof.name ?? undefined });
      if (proj) setData(await buildExportData(proj));
      setLoading(false);
    })();
  }, [projectId]);

  async function onPreviewPDF() {
    if (!project || !data) return;
    setPreviewing(true);
    try {
      const blob = await generatePresupuestoPDF({ project, rows: data.b1Rows, empresa });
      const slug = project.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      saveAs(blob, `presupuesto-${slug}.pdf`);
    } finally {
      setPreviewing(false);
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

  const isLP = project.modalidad === 'LP';
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const alerts = validateProject({ project, items, total_cost: total });
  const blockers = alerts.filter((a) => a.severity === 'CRITICAL');
  const noPriced = data ? data.b1Rows.every((r) => r.unit_price === 0) : true;

  function toggleFile(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function onExport() {
    if (!project || !data) return;
    setGenerating(true);
    try {
      await generateSicoesBundle(
        {
          project,
          items: data.items,
          b1Rows: data.b1Rows,
          b2Inputs: data.b2Inputs,
          b3Insumos: data.b3Insumos,
          b5Entries: data.b5Entries,
          includeB4: data.includeB4,
          empresa,
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
      <p className="text-sm text-slate-500 mb-4">
        Modalidad <Badge variant={isLP ? 'success' : 'info'} className="ml-1">{project.modalidad}</Badge> • {isLP ? 'Genera B-1 a B-5' : 'Genera solo B-1'} • {items.length} ítem{items.length === 1 ? '' : 's'} • Total {formatBOB(total)}
      </p>

      {noPriced && items.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
          Ningún ítem tiene APU cargado — los formularios saldrán con precio 0. Cargá los APUs desde el detalle antes de exportar.
        </div>
      )}
      {items.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
          El proyecto no tiene ítems. Agregá capítulos e ítems en el <Link href={`/proyectos/detalle?id=${project.id}`} className="underline font-medium">detalle</Link>.
        </div>
      )}

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
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-slate-500">{selected.size} archivo{selected.size === 1 ? '' : 's'} seleccionado{selected.size === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={previewing} onClick={onPreviewPDF}>
              {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Vista previa PDF
            </Button>
            <Button disabled={generating || blockers.length > 0} onClick={onExport}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Generar paquete
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        El PDF lee el nombre de la empresa de tu perfil. Editalo después si necesitás cambiar el membrete.
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
