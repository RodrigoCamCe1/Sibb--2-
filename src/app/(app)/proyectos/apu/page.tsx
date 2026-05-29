'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBOB, formatNumber } from '@/lib/utils';
import { calculateAPU } from '@/lib/calc-apu';
import {
  loadCatalog, loadRegionalFactor, loadApuBreakdown, toCalcBreakdown,
  ensureApuForItem, saveApuBreakdown,
  type Catalog, type EditorBreakdown, type EditorLine, type InsumoTipo, type CatalogInsumo,
} from '@/lib/apu-store';
import type { Project, Item } from '@/types/database';
import { ChevronRight, Save, Plus, Trash2, Package, Users, Wrench, MapPin, Info, ShieldCheck, Loader2 } from 'lucide-react';

const EMPTY: EditorBreakdown = { materials: [], labor: [], equipment: [] };
const DEFAULT_FACTOR = { performance_factor: 1, labor_factor: 1, material_factor: 1 };

/** Precio efectivo de la línea aplicando factor regional. */
function effPrice(line: EditorLine, factor: typeof DEFAULT_FACTOR): number {
  if (line.tipo === 'material') return line.base_price * factor.material_factor;
  if (line.tipo === 'labor') return line.base_price * factor.labor_factor;
  return line.base_price;
}

/** Cantidad efectiva (materiales suman merma). */
function effQty(line: EditorLine): number {
  return line.tipo === 'material' ? line.quantity * (1 + line.waste_pct / 100) : line.quantity;
}

function APUPageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const itemId = searchParams.get('item');

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [catalog, setCatalog] = useState<Catalog>({ material: [], labor: [], equipment: [] });
  const [factor, setFactor] = useState(DEFAULT_FACTOR);
  const [breakdown, setBreakdown] = useState<EditorBreakdown>(EMPTY);
  const [apuId, setApuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const sb = getSupabase();
    (async () => {
      const [{ data: proj }, { data: it }] = await Promise.all([
        sb.from('projects').select('*').eq('id', projectId).maybeSingle(),
        itemId ? sb.from('items').select('*').eq('id', itemId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setProject((proj as Project) ?? null);
      const itm = (it as Item | null) ?? null;
      setItem(itm);

      if (proj) {
        const [cat, fac] = await Promise.all([
          loadCatalog(projectId),
          loadRegionalFactor((proj as Project).city),
        ]);
        setCatalog(cat);
        setFactor(fac);
        if (itm?.apu_id) {
          setApuId(itm.apu_id);
          setBreakdown(await loadApuBreakdown(itm.apu_id));
        }
      }
      setLoading(false);
    })();
  }, [projectId, itemId]);

  const calc = useMemo(() => {
    if (!project) return null;
    return calculateAPU(toCalcBreakdown(breakdown, factor), project);
  }, [breakdown, project, factor]);

  async function handleSave() {
    if (!project || !item) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const id = await ensureApuForItem(item, project.id);
      setApuId(id);
      if (!item.apu_id) setItem({ ...item, apu_id: id });
      const total = await saveApuBreakdown(id, breakdown, project, factor);
      setSaved(`Guardado · precio unitario ${formatBOB(total)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!projectId || !project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

  const canSave = !!item && !saving;
  const factorActive = factor.material_factor !== 1 || factor.labor_factor !== 1;

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="px-6 md:px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Link href="/proyectos" className="hover:text-slate-900">Proyectos</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/proyectos/detalle?id=${project.id}`} className="hover:text-slate-900">{project.name}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">APU</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {item ? `APU: ${item.description}` : 'Editor de APU'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {item ? `Código ${item.code ?? '—'} • Unidad ${item.unit}` : 'Abrí un ítem desde el detalle para poder guardar'} • Formulario B-2
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" title={factorActive ? `Material ×${factor.material_factor} · Mano ×${factor.labor_factor}` : 'Sin ajuste'}>
              <MapPin className="w-3.5 h-3.5" /> Factor {project.city}{factorActive ? ' ✓' : ''}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar
            </Button>
          </div>
        </div>
        {!item && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
            Editor sin ítem: podés explorar pero no se guarda. Entrá desde un ítem del presupuesto.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">{error}</p>}
        {saved && <p className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">{saved}</p>}
      </div>

      <div className="px-6 md:px-8 py-6 bg-slate-50 max-w-7xl mx-auto">
        <Tabs defaultValue="b2">
          <TabsList>
            <TabsTrigger value="b2">Análisis B-2</TabsTrigger>
            <TabsTrigger value="esp-tec">Especificación Técnica</TabsTrigger>
          </TabsList>

          <TabsContent value="b2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4">
                <APUSection
                  icon={Package}
                  title="1. MATERIALES"
                  tipo="material"
                  options={catalog.material}
                  factor={factor}
                  total={calc?.total_materials ?? 0}
                  lines={breakdown.materials}
                  onChange={(lines) => setBreakdown({ ...breakdown, materials: lines })}
                />
                <APUSection
                  icon={Users}
                  title="2. MANO DE OBRA"
                  tipo="labor"
                  options={catalog.labor}
                  factor={factor}
                  total={calc?.total_labor ?? 0}
                  lines={breakdown.labor}
                  onChange={(lines) => setBreakdown({ ...breakdown, labor: lines })}
                  extra={calc && (
                    <>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 text-xs">
                        <TableCell colSpan={4} className="text-right font-medium">SUBTOTAL MANO DE OBRA</TableCell>
                        <TableCell className="text-right font-bold">{formatNumber(calc.subtotal_labor)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 text-xs">
                        <TableCell colSpan={4} className="text-right text-slate-600">+ Cargas sociales ({project.cargas_sociales_pct}% subtotal)</TableCell>
                        <TableCell className="text-right">{formatNumber(calc.cargas_sociales)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 text-xs">
                        <TableCell colSpan={4} className="text-right text-slate-600">+ IVA mano obra ({project.iva_mano_pct}%)</TableCell>
                        <TableCell className="text-right">{formatNumber(calc.iva_mano)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  )}
                />
                <APUSection
                  icon={Wrench}
                  title="3. EQUIPO Y HERRAMIENTAS"
                  tipo="equipment"
                  options={catalog.equipment}
                  factor={factor}
                  total={calc?.total_equipment ?? 0}
                  lines={breakdown.equipment}
                  onChange={(lines) => setBreakdown({ ...breakdown, equipment: lines })}
                  extra={calc && (
                    <TableRow className="bg-slate-50 hover:bg-slate-50 text-xs">
                      <TableCell colSpan={4} className="text-right text-slate-600">+ Herramientas ({project.herramientas_pct}% mano de obra)</TableCell>
                      <TableCell className="text-right">{formatNumber(calc.herramientas)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-4">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Info className="w-4 h-4 text-slate-500" /> Resumen B-2
                  </h3>
                  {calc && (
                    <dl className="space-y-1.5 text-sm">
                      <Row label="Materiales" value={calc.total_materials} />
                      <Row label="Mano de obra" value={calc.total_labor} />
                      <Row label="Equipo + herram." value={calc.total_equipment} />
                      <div className="border-t border-slate-200 my-2" />
                      <Row label="Costo directo" value={calc.costo_directo} bold />
                      <Row label={`Gastos generales (${project.gg_pct}%)`} value={calc.gg} />
                      <Row label={`Utilidad (${project.utilidad_pct}%)`} value={calc.utilidad} />
                      <Row label={`IT (${project.it_pct}%)`} value={calc.it} />
                      <div className="border-t-2 border-slate-900 my-2" />
                      <div className="flex justify-between items-center">
                        <dt className="font-bold">PRECIO UNITARIO</dt>
                        <dd className="font-bold text-lg">{formatBOB(calc.total_adoptado)}</dd>
                      </div>
                    </dl>
                  )}
                  {factorActive && (
                    <p className="mt-3 text-xs text-slate-500 flex items-start gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Precios ajustados a {project.city}: material ×{factor.material_factor}, mano ×{factor.labor_factor}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="esp-tec">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 max-w-3xl">
              <p className="text-xs text-slate-500">Especificación técnica del ítem (5 secciones SICOES). Se guarda junto al ítem — próximo paso.</p>
              <SpecField label="1. Descripción" defaultValue={item?.tech_descripcion ?? ''} placeholder="Alcance del ítem, contexto, qué cubre..." />
              <SpecField label="2. Materiales, herramientas y equipos" defaultValue={item?.tech_mat_herram_equipo ?? ''} placeholder="Lista con bullets (uno por línea)..." />
              <SpecField label="3. Forma de ejecución" defaultValue={item?.tech_forma_ejecucion ?? ''} placeholder="Procedimiento paso a paso, seguridad/EPP..." />
              <SpecField label="4. Medición" defaultValue={item?.tech_medicion ?? ''} placeholder="Cómo se mide (m², m³, glb, etc.)" />
              <SpecField label="5. Forma de pago" defaultValue={item?.tech_forma_pago ?? ''} placeholder="Boilerplate auto-llenable..." />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? 'font-semibold' : 'text-slate-600'}>{label}</dt>
      <dd className={bold ? 'font-semibold' : ''}>{formatNumber(value)}</dd>
    </div>
  );
}

function APUSection({
  icon: Icon, title, tipo, options, factor, total, lines, onChange, extra,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tipo: InsumoTipo;
  options: CatalogInsumo[];
  factor: typeof DEFAULT_FACTOR;
  total: number;
  lines: EditorLine[];
  onChange: (lines: EditorLine[]) => void;
  extra?: React.ReactNode;
}) {
  function pickInsumo(idx: number, insumoId: string) {
    const ins = options.find((o) => o.id === insumoId);
    const next = [...lines];
    if (ins) {
      next[idx] = { ...next[idx], ref_id: ins.id, description: ins.name, unit: ins.unit, base_price: ins.price };
    } else {
      next[idx] = { ...next[idx], ref_id: '', description: '', unit: '', base_price: 0 };
    }
    onChange(next);
  }
  function updateNum(idx: number, key: 'quantity' | 'waste_pct' | 'performance', value: number) {
    const next = [...lines];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  }
  function addLine() {
    onChange([...lines, { tipo, ref_id: '', description: '', unit: '', base_price: 0, quantity: 0, waste_pct: 0, performance: null }]);
  }
  function removeLine(idx: number) {
    onChange(lines.filter((_, i) => i !== idx));
  }

  const isMaterial = tipo === 'material';

  return (
    <details open className="bg-white border border-slate-200 rounded-lg">
      <summary className="px-4 py-3 cursor-pointer font-semibold flex items-center justify-between hover:bg-slate-50 list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4 text-slate-500" />
          {title}
        </span>
        <span className="text-sm font-bold">{formatBOB(total)}</span>
      </summary>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Insumo (catálogo)</TableHead>
            <TableHead className="w-14 text-center">Unid.</TableHead>
            <TableHead className="w-20 text-right">Cant.</TableHead>
            <TableHead className="w-16 text-right">{isMaterial ? 'Merma%' : 'Rend.'}</TableHead>
            <TableHead className="w-24 text-right">P. Unit.</TableHead>
            <TableHead className="w-24 text-right">Total</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, idx) => {
            const price = effPrice(line, factor);
            return (
              <TableRow key={idx}>
                <TableCell>
                  <select
                    value={line.ref_id}
                    onChange={(e) => pickInsumo(idx, e.target.value)}
                    className="w-full bg-transparent border border-slate-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="">— elegir insumo —</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>{o.code} · {o.name} ({o.unit})</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell className="text-center text-slate-500">{line.unit || '—'}</TableCell>
                <TableCell className="text-right">
                  <input
                    type="number" step="0.0001" value={line.quantity}
                    onChange={(e) => updateNum(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-20 text-right bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1"
                  />
                </TableCell>
                <TableCell className="text-right">
                  {isMaterial ? (
                    <input
                      type="number" step="0.01" value={line.waste_pct}
                      onChange={(e) => updateNum(idx, 'waste_pct', parseFloat(e.target.value) || 0)}
                      className="w-14 text-right bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1"
                    />
                  ) : (
                    <input
                      type="number" step="0.0001" value={line.performance ?? ''}
                      onChange={(e) => updateNum(idx, 'performance', parseFloat(e.target.value) || 0)}
                      placeholder="—"
                      className="w-14 text-right bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1"
                    />
                  )}
                </TableCell>
                <TableCell className="text-right text-slate-600">{formatNumber(price)}</TableCell>
                <TableCell className="text-right font-medium">{formatNumber(effQty(line) * price)}</TableCell>
                <TableCell>
                  <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
          {extra}
          <TableRow className="bg-white hover:bg-slate-50">
            <TableCell colSpan={7}>
              <button onClick={addLine} className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 italic">
                <Plus className="w-3 h-3" /> Agregar línea
              </button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </details>
  );
}

function SpecField({ label, defaultValue, placeholder }: { label: string; defaultValue: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <textarea
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
    </div>
  );
}

export default function APUPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <APUPageInner />
    </Suspense>
  );
}
