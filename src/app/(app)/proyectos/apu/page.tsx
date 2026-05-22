'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatBOB, formatNumber } from '@/lib/utils';
import { calculateAPU, type APULine, type APUBreakdown } from '@/lib/calc-apu';
import type { Project, Item } from '@/types/database';
import { ChevronRight, Save, Plus, Trash2, Package, Users, Wrench, MapPin, Info, ShieldCheck, Loader2 } from 'lucide-react';

function APUPageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const itemId = searchParams.get('item');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [breakdown, setBreakdown] = useState<APUBreakdown>({
    materials: [
      { description: 'Cemento Portland IP-30', unit: 'BLS', quantity: 7.5, unit_price: 55 },
      { description: 'Arena gruesa', unit: 'M3', quantity: 0.45, unit_price: 165 },
      { description: 'Grava 3/4"', unit: 'M3', quantity: 0.85, unit_price: 195 },
      { description: 'Acero corrugado Ø12mm fy=4200', unit: 'KG', quantity: 85, unit_price: 9 },
      { description: 'Madera mara (encofrado)', unit: 'PT', quantity: 12, unit_price: 22.5 },
    ],
    labor: [
      { description: 'Albañil', unit: 'HRS', quantity: 6.5, unit_price: 28 },
      { description: 'Fierrero', unit: 'HRS', quantity: 5, unit_price: 32 },
      { description: 'Encofrador', unit: 'HRS', quantity: 3.5, unit_price: 32 },
      { description: 'Ayudante', unit: 'HRS', quantity: 8, unit_price: 18 },
    ],
    equipment: [
      { description: 'Mezcladora 1 bolsa', unit: 'HRS', quantity: 1.5, unit_price: 65 },
      { description: 'Vibrador inmersión', unit: 'HRS', quantity: 1.2, unit_price: 45 },
    ],
  });

  useEffect(() => {
    if (!projectId) return;
    const sb = getSupabase();
    Promise.all([
      sb.from('projects').select('*').eq('id', projectId).maybeSingle(),
      itemId ? sb.from('items').select('*').eq('id', itemId).maybeSingle() : Promise.resolve({ data: null }),
    ]).then(([p, i]) => {
      setProject(p.data ?? null);
      setItem((i.data as Item | null | undefined) ?? null);
      setLoading(false);
    });
  }, [projectId, itemId]);

  const calc = useMemo(() => {
    if (!project) return null;
    return calculateAPU(breakdown, project);
  }, [breakdown, project]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

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
              {item ? `APU: ${item.description}` : 'Editor de APU — Demo'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {item ? `Código ${item.code ?? '—'} • Unidad ${item.unit}` : 'Formulario B-2 oficial SICOES'} • Formulario B-2
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><MapPin className="w-3.5 h-3.5" /> Factor {project.city}</Button>
            <Button size="sm"><Save className="w-3.5 h-3.5" /> Guardar</Button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-6 bg-slate-50 max-w-7xl mx-auto">
        <Tabs defaultValue="b2">
          <TabsList>
            <TabsTrigger value="b2">Análisis B-2</TabsTrigger>
            <TabsTrigger value="esp-tec">Especificación Técnica</TabsTrigger>
          </TabsList>

          <TabsContent value="b2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* B-2 sections */}
              <div className="lg:col-span-2 space-y-4">
                <APUSection
                  icon={Package}
                  title="1. MATERIALES"
                  total={calc?.total_materials ?? 0}
                  lines={breakdown.materials}
                  onChange={(lines) => setBreakdown({ ...breakdown, materials: lines })}
                />
                <APUSection
                  icon={Users}
                  title="2. MANO DE OBRA"
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
                  title="3. EQUIPO, MAQUINARIA Y HERRAMIENTAS"
                  total={calc?.total_equipment ?? 0}
                  lines={breakdown.equipment}
                  onChange={(lines) => setBreakdown({ ...breakdown, equipment: lines })}
                  extra={calc && (
                    <TableRow className="bg-slate-50 hover:bg-slate-50 text-xs">
                      <TableCell colSpan={4} className="text-right text-slate-600">+ Herramientas ({project.herramientas_pct}% total mano obra)</TableCell>
                      <TableCell className="text-right">{formatNumber(calc.herramientas)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                />
              </div>

              {/* Sidebar resumen */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-4">
                  <h3 className="font-semibold text-sm mb-3">Resumen B-2</h3>
                  {calc && (
                    <div className="space-y-1.5 text-sm">
                      <Row label="1. Materiales" value={calc.total_materials} />
                      <Row label="2. Mano de obra" value={calc.total_labor} />
                      <Row label="3. Equipo + herram." value={calc.total_equipment} />
                      <div className="border-t border-slate-200 pt-1.5 mt-1.5">
                        <Row label="Costo directo" value={calc.costo_directo} bold />
                      </div>
                      <Row label={`4. GG (${project.gg_pct}% CD)`} value={calc.gg} />
                      <Row label={`5. Utilidad (${project.utilidad_pct}%)`} value={calc.utilidad} />
                      <Row label={`6. IT (${project.it_pct}%)`} value={calc.it} />
                      <div className="border-t-2 border-slate-900 pt-2 mt-2">
                        <Row label="P.U. Total" value={calc.total} bold xl />
                      </div>
                      <div className="text-xs text-slate-500 italic">Adoptado: {formatBOB(calc.total_adoptado)}</div>
                    </div>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Info className="w-4 h-4 text-amber-700" />
                    <span className="font-semibold text-sm text-amber-900">Factor regional activo</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Ciudad: <strong>{project.city}</strong>. Cambiar la ciudad del proyecto recalcula precios.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-semibold text-sm text-emerald-900">Sin alertas norma</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Las reglas CBH-87 y NB se validan al guardar el ítem.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="esp-tec">
            <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-3xl space-y-4">
              <h3 className="font-semibold">Especificación Técnica (plantilla 5-secciones BO)</h3>
              <SpecField label="1. Descripción" defaultValue={item?.tech_descripcion ?? ''} placeholder="Alcance del ítem, contexto, qué cubre..." />
              <SpecField label="2. Materiales, herramientas y equipos" defaultValue={item?.tech_mat_herram_equipo ?? ''} placeholder="Lista con bullets (uno por línea)..." />
              <SpecField label="3. Forma de ejecución" defaultValue={item?.tech_forma_ejecucion ?? ''} placeholder="Procedimiento paso a paso, seguridad/EPP..." />
              <SpecField label="4. Medición" defaultValue={item?.tech_medicion ?? ''} placeholder="Cómo se mide (m², m³, glb, etc.)" />
              <SpecField label="5. Forma de pago" defaultValue={item?.tech_forma_pago ?? 'El pago se realizará por el volumen de obra realmente ejecutado en sitio. Este costo incluye la compensación total por todos los materiales, mano de obra, herramientas y equipo empleado.'} />
              <Button size="sm"><Save className="w-3.5 h-3.5" /> Guardar especificación</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Row({ label, value, bold, xl }: { label: string; value: number; bold?: boolean; xl?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-slate-900' : 'text-slate-600'} ${xl ? 'text-base' : ''}`}>
      <span>{label}</span>
      <span className={bold ? 'text-slate-900 font-bold' : 'font-medium text-slate-900'}>{xl ? formatBOB(value) : formatNumber(value)}</span>
    </div>
  );
}

function APUSection({
  icon: Icon,
  title,
  total,
  lines,
  onChange,
  extra,
}: {
  icon: React.ElementType;
  title: string;
  total: number;
  lines: APULine[];
  onChange: (lines: APULine[]) => void;
  extra?: React.ReactNode;
}) {
  function updateLine(idx: number, key: keyof APULine, value: string | number) {
    const next = [...lines];
    (next[idx] as unknown as Record<string, unknown>)[key] = value;
    onChange(next);
  }
  function addLine() {
    onChange([...lines, { description: '', unit: 'UN', quantity: 0, unit_price: 0 }]);
  }
  function removeLine(idx: number) {
    onChange(lines.filter((_, i) => i !== idx));
  }

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
            <TableHead>Descripción</TableHead>
            <TableHead className="w-16 text-center">Unidad</TableHead>
            <TableHead className="w-20 text-right">Cant.</TableHead>
            <TableHead className="w-24 text-right">P. Unit.</TableHead>
            <TableHead className="w-24 text-right">Total</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, idx) => (
            <TableRow key={idx}>
              <TableCell>
                <input
                  value={line.description}
                  onChange={(e) => updateLine(idx, 'description', e.target.value)}
                  className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1"
                />
              </TableCell>
              <TableCell className="text-center">
                <input
                  value={line.unit}
                  onChange={(e) => updateLine(idx, 'unit', e.target.value.toUpperCase())}
                  className="w-14 text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1"
                />
              </TableCell>
              <TableCell className="text-right">
                <input
                  type="number"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-20 text-right bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1"
                />
              </TableCell>
              <TableCell className="text-right">
                <input
                  type="number"
                  step="0.01"
                  value={line.unit_price}
                  onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  className="w-24 text-right bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-slate-300 rounded px-1"
                />
              </TableCell>
              <TableCell className="text-right font-medium">{formatNumber(line.quantity * line.unit_price)}</TableCell>
              <TableCell>
                <button onClick={() => removeLine(idx)} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </TableCell>
            </TableRow>
          ))}
          {extra}
          <TableRow className="bg-white hover:bg-slate-50">
            <TableCell colSpan={6}>
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
