'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSupabase } from '@/lib/supabase/client';
import type { Project } from '@/types/database';
import { ChevronRight, Loader2 } from 'lucide-react';

function CronogramaPageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const sb = getSupabase();
    sb.from('projects').select('*').eq('id', projectId).maybeSingle().then(({ data }) => {
      setProject(data ?? null);
      setLoading(false);
    });
  }, [projectId]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

  // Datos de demo curva S — distribución típica
  const curveData = [
    { mes: 'M0', planeado: 0, real: 0 },
    { mes: 'M1', planeado: 8, real: 6 },
    { mes: 'M2', planeado: 25, real: 22 },
    { mes: 'M3', planeado: 50, real: 45 },
    { mes: 'M4', planeado: 75, real: null },
    { mes: 'M5', planeado: 92, real: null },
    { mes: 'M6', planeado: 100, real: null },
  ];

  const gantt = [
    { code: '01', name: 'Preliminares', start: 1, duration: 2, color: 'bg-slate-700', pct: 3.1 },
    { code: '02', name: 'Mov. Tierras', start: 2, duration: 2, color: 'bg-amber-600', pct: 8.5 },
    { code: '03', name: 'Obra Gruesa', start: 4, duration: 5, color: 'bg-rose-600', pct: 55 },
    { code: '04', name: 'Mampostería', start: 7, duration: 3, color: 'bg-sky-600', pct: 12 },
    { code: '05', name: 'Revestimientos', start: 9, duration: 3, color: 'bg-emerald-600', pct: 14.2 },
    { code: '08-09', name: 'Sanitaria + Eléctrica', start: 10, duration: 2, color: 'bg-violet-600', pct: 7.2 },
  ];

  const disbursements = [
    { period: 'Anticipo', pct: 20, highlight: true },
    { period: 'M1 — 1er desembolso', pct: 5 },
    { period: 'M2 — 2do desembolso', pct: 15 },
    { period: 'M3 — 3er desembolso', pct: 25 },
    { period: 'M4 — 4to desembolso', pct: 20 },
    { period: 'M5 — 5to desembolso', pct: 10 },
    { period: 'M6 — Liquidación', pct: 5 },
  ];

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
        <p className="text-sm text-slate-500 mt-1">Plazo total estimado 120 días calendario</p>
      </div>

      {/* Gantt */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-5">
        <h3 className="font-semibold text-sm mb-4">Cronograma por capítulo (Gantt)</h3>
        <div className="grid grid-cols-12 gap-1 text-xs text-slate-500 mb-2 ml-32">
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i}>S{i + 1}</div>
          ))}
        </div>
        <div className="space-y-2">
          {gantt.map((g) => (
            <div key={g.code} className="grid grid-cols-12 gap-1 items-center">
              <div className="text-xs col-span-3 truncate"><span className="font-semibold">{g.code}.</span> {g.name}</div>
              <div
                className={`h-5 rounded-sm flex items-center justify-center text-white text-[10px] font-medium ${g.color}`}
                style={{ gridColumnStart: g.start + 3, gridColumnEnd: g.start + 3 + g.duration }}
              >
                {g.pct}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Curva S */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold text-sm mb-4">Curva S — Inversión acumulada</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="planeado"
                  stroke="#0f172a"
                  fill="#0f172a"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Planeado %"
                />
                <Area
                  type="monotone"
                  dataKey="real"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.1}
                  strokeWidth={2}
                  name="Real %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* B-5 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold text-sm mb-4">Desembolsos (B-5)</h3>
          <div className="space-y-2 text-sm">
            {disbursements.map((d) => (
              <div key={d.period} className={`flex justify-between items-center ${d.highlight ? 'p-2 bg-slate-100 rounded font-semibold' : 'px-2 py-1.5 hover:bg-slate-50'}`}>
                <span className={d.highlight ? '' : 'text-slate-600'}>{d.period}</span>
                <span className="font-medium">{d.pct}%</span>
              </div>
            ))}
            <div className="border-t-2 border-slate-900 pt-2 mt-2 flex justify-between items-center px-2 font-bold">
              <span>Total</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
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
