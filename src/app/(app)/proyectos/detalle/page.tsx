'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { formatBOB, formatNumber } from '@/lib/utils';
import { validateProject } from '@/lib/norm-validator';
import type { Project, Chapter, Item } from '@/types/database';
import { ChevronRight, Download, Copy, Loader2, MapPin, Building2, ShieldCheck, AlertCircle, Plus } from 'lucide-react';

function DetallePageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!projectId) return;
    const sb = getSupabase();
    Promise.all([
      sb.from('projects').select('*').eq('id', projectId).maybeSingle(),
      sb.from('chapters').select('*').eq('project_id', projectId).order('order_index'),
      sb.from('items').select('*, chapters!inner(project_id)').eq('chapters.project_id', projectId).order('order_index'),
    ]).then(([p, c, i]) => {
      setProject(p.data ?? null);
      setChapters(c.data ?? []);
      setItems((i.data as Item[]) ?? []);
      setLoading(false);
    });
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="p-8 text-center text-slate-500">
        Falta parámetro <code className="bg-slate-100 px-1 rounded">id</code>. <Link href="/proyectos" className="underline">Volver a proyectos</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 inline-block" /></div>;
  }

  if (!project) {
    return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;
  }

  // Sumar totales por capítulo (placeholder mientras no hay APU cached)
  const itemsByChapter = new Map<string, Item[]>();
  for (const item of items) {
    const arr = itemsByChapter.get(item.chapter_id) ?? [];
    arr.push(item);
    itemsByChapter.set(item.chapter_id, arr);
  }

  const totalProject = items.reduce((acc, it) => {
    // sin precio cached, asumir 0; el cálculo real necesita join apus.cached_unit_price
    return acc;
  }, 0);

  const alerts = validateProject({ project, items, total_cost: totalProject });
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="px-6 md:px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Link href="/proyectos" className="hover:text-slate-900">Proyectos</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">{project.name}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.city}</span>
              <span>•</span>
              <Badge variant={project.modalidad === 'LP' ? 'success' : 'info'}>{project.modalidad}</Badge>
              {project.owner_client && (<><span>•</span><span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{project.owner_client}</span></>)}
              {project.cuce && (<><span>•</span><span className="font-mono text-xs">CUCE {project.cuce}</span></>)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Copy className="w-3.5 h-3.5" /> Duplicar</Button>
            <Button size="sm" asChild>
              <Link href={`/proyectos/exportar?id=${project.id}`}>
                <Download className="w-3.5 h-3.5" />
                Exportar SICOES
              </Link>
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <KPI label="Costo total" value={formatBOB(totalProject)} />
          <KPI label="Costo / m²" value={project.area_m2 ? formatBOB(totalProject / project.area_m2) : '—'} />
          <KPI label="Ítems" value={`${items.length}`} />
          {alerts.length > 0 ? (
            <Link href={`/proyectos/normas?id=${project.id}`}>
              <div className="bg-amber-50 hover:bg-amber-100 rounded-lg p-3 cursor-pointer transition-colors">
                <div className="text-xs text-amber-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Alertas norma</div>
                <div className="text-lg font-bold text-amber-900">
                  {alerts.length} {criticalCount > 0 && <span className="text-xs font-normal">• {criticalCount} crítica{criticalCount > 1 ? 's' : ''}</span>}
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Norma</div>
              <div className="text-lg font-bold text-emerald-900">Cumple</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 md:px-8 py-6 bg-slate-50 max-w-7xl mx-auto">
        <Tabs defaultValue="edt">
          <TabsList>
            <TabsTrigger value="edt">EDT y Ítems</TabsTrigger>
            <TabsTrigger value="indirectos">Indirectos</TabsTrigger>
            <TabsTrigger value="regional">Ajuste regional</TabsTrigger>
          </TabsList>

          <TabsContent value="edt">
            <EDTTable
              project={project}
              chapters={chapters}
              itemsByChapter={itemsByChapter}
              alertsByItem={new Map(alerts.filter((a) => a.item_id).map((a) => [a.item_id!, a]))}
            />
          </TabsContent>

          <TabsContent value="indirectos">
            <IndirectosPanel project={project} onChange={setProject} />
          </TabsContent>

          <TabsContent value="regional">
            <RegionalPanel project={project} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function EDTTable({
  project,
  chapters,
  itemsByChapter,
  alertsByItem,
}: {
  project: Project;
  chapters: Chapter[];
  itemsByChapter: Map<string, Item[]>;
  alertsByItem: Map<string, { severity: string; title: string }>;
}) {
  if (chapters.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-dashed border-slate-300 p-12 text-center">
        <h3 className="font-semibold text-slate-900 mb-1">EDT vacío</h3>
        <p className="text-sm text-slate-500 mb-4">Empieza creando capítulos (preliminares, obra gruesa, etc.).</p>
        <Button><Plus className="w-4 h-4" /> Crear primer capítulo</Button>
        <p className="text-xs text-slate-400 mt-3">O importa una plantilla con los 11 capítulos típicos BO</p>
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Cód.</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="w-20 text-center">Unidad</TableHead>
            <TableHead className="w-24 text-right">Cantidad</TableHead>
            <TableHead className="w-28 text-right">P. Unit.</TableHead>
            <TableHead className="w-32 text-right">Total Bs</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chapters.map((c) => {
            const its = itemsByChapter.get(c.id) ?? [];
            const chTotal = 0; // placeholder
            return (
              <>
                <TableRow key={c.id} className="bg-slate-100 hover:bg-slate-100">
                  <TableCell className="font-semibold">{c.code}</TableCell>
                  <TableCell colSpan={4} className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBOB(chTotal)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                {its.map((item) => {
                  const alert = alertsByItem.get(item.id);
                  return (
                    <TableRow key={item.id} className={alert?.severity === 'CRITICAL' ? 'bg-red-50/40' : alert ? 'bg-amber-50/40' : ''}>
                      <TableCell className="text-slate-500">{item.code ?? '—'}</TableCell>
                      <TableCell>
                        <Link href={`/proyectos/apu?id=${project.id}&item=${item.id}`} className="hover:underline">
                          {item.description}
                        </Link>
                        {alert && <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'warning'} className="ml-2 text-[10px]">{alert.severity === 'CRITICAL' ? 'CRÍTICA' : 'ALERTA'}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">{item.unit}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right font-medium">—</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  );
                })}
              </>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-slate-900 hover:bg-slate-900">
            <TableCell colSpan={5} className="text-right text-white font-bold">TOTAL</TableCell>
            <TableCell className="text-right text-white font-bold">{formatBOB(0)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <Button variant="ghost" size="sm"><Plus className="w-3.5 h-3.5" /> Agregar capítulo</Button>
        <span className="text-xs text-slate-500">{chapters.length} {chapters.length === 1 ? 'capítulo' : 'capítulos'}</span>
      </div>
    </div>
  );
}

function IndirectosPanel({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const [saving, setSaving] = useState(false);

  async function update<K extends keyof Project>(key: K, value: Project[K]) {
    const next = { ...project, [key]: value };
    onChange(next);
    setSaving(true);
    const sb = getSupabase();
    await sb.from('projects').update({ [key]: value }).eq('id', project.id);
    setSaving(false);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 max-w-2xl">
      <div>
        <h3 className="font-semibold text-slate-900">Indirectos del proyecto</h3>
        <p className="text-xs text-slate-500 mt-0.5">Porcentajes aplicados a todos los APUs (Formulario B-2).</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumField label="Cargas sociales %" value={project.cargas_sociales_pct} onChange={(v) => update('cargas_sociales_pct', v)} hint="Default BO: 71.18%" />
        <NumField label="IVA mano de obra %" value={project.iva_mano_pct} onChange={(v) => update('iva_mano_pct', v)} hint="13% sobre 87% efectivo = 14.94%" />
        <NumField label="Herramientas %" value={project.herramientas_pct} onChange={(v) => update('herramientas_pct', v)} hint="Sobre Total Mano de Obra. Default 5%" />
        <NumField label="Gastos generales %" value={project.gg_pct} onChange={(v) => update('gg_pct', v)} hint="Sobre costo directo. Típico 8-12%" />
        <NumField label="Utilidad %" value={project.utilidad_pct} onChange={(v) => update('utilidad_pct', v)} hint="Sobre CD+GG. Típico 7-10%" />
        <NumField label="IT %" value={project.it_pct} onChange={(v) => update('it_pct', v)} hint="Impuesto Transacciones efectivo 3.09%" />
      </div>
      {saving && <p className="text-xs text-slate-500"><Loader2 className="w-3 h-3 inline-block animate-spin" /> Guardando...</p>}
    </div>
  );
}

function NumField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      <Input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function RegionalPanel({ project }: { project: Project }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-xl">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">Ajuste regional</h3>
        <p className="text-xs text-slate-500 mt-0.5">Factores aplicados al cambiar ciudad del proyecto.</p>
      </div>
      <div className="space-y-2">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
          <div className="text-sm font-semibold text-amber-900">Ciudad actual: {project.city}</div>
          <p className="text-xs text-amber-800 mt-0.5">
            Factor de rendimiento, mano de obra y materiales aplicados según la región. Cambiar la ciudad recalcula todos los APUs del proyecto.
          </p>
        </div>
        <p className="text-xs text-slate-500">Configuración de factores: módulo en desarrollo.</p>
      </div>
    </div>
  );
}

export default function DetallePage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <DetallePageInner />
    </Suspense>
  );
}
