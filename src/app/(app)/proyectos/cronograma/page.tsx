'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatBOB } from '@/lib/utils';
import {
  loadCronograma, buildCurveS, saveDuration, saveDisbursements,
  type ScheduleRow, type DisbItem,
} from '@/lib/schedule-store';
import type { Project } from '@/types/database';
import { ChevronRight, Loader2, Plus, Trash2, Save } from 'lucide-react';

const MONTH = 30;
const COLORS = ['bg-slate-700', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600', 'bg-emerald-600', 'bg-violet-600', 'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600'];

function CronogramaPageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [disb, setDisb] = useState<DisbItem[]>([]);
  const [savingDisb, setSavingDisb] = useState(false);
  const [disbMsg, setDisbMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const sb = getSupabase();
    (async () => {
      const { data: p } = await sb.from('projects').select('*').eq('id', projectId).maybeSingle();
      setProject((p as Project) ?? null);
      if (p) {
        const cr = await loadCronograma(projectId);
        setRows(cr.rows);
        setTotal(cr.total);
        setDisb(cr.disbursements);
      }
      setLoading(false);
    })();
  }, [projectId]);

  // recalcula startDay secuencial cada vez que cambian duraciones
  const sequenced = useMemo(() => {
    let cursor = 0;
    return rows.map((r) => {
      const startDay = cursor;
      cursor += r.durationDays;
      return { ...r, startDay };
    });
  }, [rows]);

  const totalMonths = Math.max(1, Math.ceil(sequenced.reduce((m, r) => Math.max(m, r.startDay + r.durationDays), 0) / MONTH));
  const curve = useMemo(() => buildCurveS(sequenced), [sequenced]);
  const disbTotal = disb.reduce((a, d) => a + d.monto_pct, 0);

  async function changeDuration(idx: number, months: number) {
    const durationDays = Math.max(1, Math.round(months)) * MONTH;
    const updated = rows.map((r, i) => (i === idx ? { ...r, durationDays } : r));
    setRows(updated);
    // persistir (usar startDay secuencial recalculado)
    let cursor = 0;
    for (let i = 0; i < updated.length; i++) {
      const startDay = cursor;
      cursor += updated[i].durationDays;
      if (i === idx) {
        try {
          const entryId = await saveDuration(projectId!, { ...updated[i], startDay }, durationDays);
          setRows((rs) => rs.map((r, j) => (j === idx ? { ...r, entryId, startDay } : r)));
        } catch { /* noop visual */ }
      }
    }
  }

  async function persistDisb() {
    setSavingDisb(true); setDisbMsg(null);
    try {
      await saveDisbursements(projectId!, disb);
      setDisbMsg('Desembolsos guardados');
    } catch (e) {
      setDisbMsg(e instanceof Error ? e.message : 'Error guardando');
    } finally {
      setSavingDisb(false);
    }
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

  return (
    <div className="px-6 md:px-8 py-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Link href="/proyectos" className="hover:text-slate-900">Proyectos</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/proyectos/detalle?id=${project.id}`} className="hover:text-slate-900">{project.name}</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Cronograma</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Cronograma y Curva S</h1>
        <p className="text-sm text-slate-500 mt-1">
          {sequenced.length} capítulo{sequenced.length === 1 ? '' : 's'} • plazo estimado {totalMonths} mes{totalMonths === 1 ? '' : 'es'} • total {formatBOB(total)}
        </p>
      </div>

      {sequenced.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <h3 className="font-semibold text-slate-900 mb-1">Sin capítulos</h3>
          <p className="text-sm text-slate-500">Agregá capítulos e ítems en el <Link href={`/proyectos/detalle?id=${project.id}`} className="underline">detalle</Link> para generar el cronograma.</p>
        </div>
      ) : (
        <>
          {/* Gantt */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 mb-5 overflow-x-auto">
            <h3 className="font-semibold text-sm mb-4">Cronograma por capítulo — peso por costo real</h3>
            <div className="min-w-[640px]">
              <div className="flex text-xs text-slate-500 mb-2">
                <div className="w-64 shrink-0" />
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${totalMonths}, minmax(0, 1fr))` }}>
                  {Array.from({ length: totalMonths }, (_, i) => <div key={i} className="text-center">M{i + 1}</div>)}
                </div>
              </div>
              <div className="space-y-2">
                {sequenced.map((g, idx) => {
                  const startMonth = Math.round(g.startDay / MONTH);
                  const durMonths = Math.max(1, Math.round(g.durationDays / MONTH));
                  return (
                    <div key={g.chapterId} className="flex items-center">
                      <div className="w-64 shrink-0 flex items-center gap-2 pr-2">
                        <span className="text-xs truncate flex-1"><span className="font-semibold">{g.code}.</span> {g.name}</span>
                        <span className="text-[10px] text-slate-400 w-10 text-right">{g.pct.toFixed(1)}%</span>
                        <Input
                          type="number" min={1} value={durMonths}
                          onChange={(e) => changeDuration(idx, parseInt(e.target.value) || 1)}
                          className="h-6 w-12 px-1 text-xs text-center"
                          title="Duración (meses)"
                        />
                      </div>
                      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${totalMonths}, minmax(0, 1fr))` }}>
                        <div
                          className={`h-5 rounded-sm flex items-center justify-center text-white text-[10px] font-medium ${COLORS[idx % COLORS.length]}`}
                          style={{ gridColumnStart: startMonth + 1, gridColumnEnd: startMonth + 1 + durMonths }}
                        >
                          {g.pct >= 4 ? `${g.pct.toFixed(0)}%` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Curva S */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="font-semibold text-sm mb-4">Curva S — Inversión acumulada planeada</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={curve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} unit="%" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="planeado" stroke="#0f172a" fill="#0f172a" fillOpacity={0.1} strokeWidth={2} name="Planeado %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-400 mt-2">Avance real (vs planeado) llega en v1.1.</p>
            </div>

            {/* B-5 editable */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Desembolsos (B-5)</h3>
                <button onClick={() => setDisb((d) => [...d, { id: null, description: 'Nuevo', escala_temporal: 'mes', periodo: d.length, monto_pct: 0 }])} className="text-slate-500 hover:text-slate-900" title="Agregar">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                {disb.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input value={d.description} onChange={(e) => setDisb((ds) => ds.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} className="h-7 text-xs flex-1 px-2" />
                    <Input type="number" step="0.01" value={d.monto_pct} onChange={(e) => setDisb((ds) => ds.map((x, j) => j === i ? { ...x, monto_pct: parseFloat(e.target.value) || 0 } : x))} className="h-7 text-xs w-16 px-1 text-right" />
                    <span className="text-xs text-slate-400">%</span>
                    <button onClick={() => setDisb((ds) => ds.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <div className={`border-t-2 pt-2 mt-2 flex justify-between items-center px-1 font-bold ${Math.abs(disbTotal - 100) < 0.01 ? 'border-slate-900' : 'border-red-400 text-red-600'}`}>
                  <span>Total</span>
                  <span>{disbTotal.toFixed(2)}%</span>
                </div>
                {Math.abs(disbTotal - 100) >= 0.01 && <p className="text-[10px] text-red-600">Debe sumar 100%.</p>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={persistDisb} disabled={savingDisb}>
                  {savingDisb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar B-5
                </Button>
                {disbMsg && <span className="text-xs text-slate-500">{disbMsg}</span>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CronogramaPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <CronogramaPageInner />
    </Suspense>
  );
}
