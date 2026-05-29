// Capa de datos del cronograma: pesos reales por capítulo (costo), duración
// editable (schedule_entries) y desembolsos B-5 (disbursement_schedule).

import { getSupabase } from '@/lib/supabase/client';
import { loadEDT } from '@/lib/edt-store';
import type { Chapter } from '@/types/database';

export interface ScheduleRow {
  chapterId: string;
  code: string;
  name: string;
  cost: number;
  pct: number;          // peso = cost / total
  startDay: number;
  durationDays: number;
  entryId: string | null;
}

export interface DisbItem {
  id: string | null;
  description: string;
  escala_temporal: 'mes' | 'semana';
  periodo: number | null;
  monto_pct: number;
}

export interface CronogramaData {
  rows: ScheduleRow[];
  total: number;
  disbursements: DisbItem[];
}

interface ScheduleEntryRow { id: string; chapter_id: string; start_day: number; duration_days: number }
interface DisbDbRow { id: string; description: string; escala_temporal: string; periodo: number | null; monto_pct: number; order_index: number }

const MONTH = 30; // días por "mes" para el Gantt mensual

export async function loadCronograma(projectId: string): Promise<CronogramaData> {
  const sb = getSupabase();
  const edt = await loadEDT(projectId);
  const [schedRes, disbRes] = await Promise.all([
    sb.from('schedule_entries').select('id, chapter_id, start_day, duration_days').eq('project_id', projectId),
    sb.from('disbursement_schedule').select('id, description, escala_temporal, periodo, monto_pct, order_index').eq('project_id', projectId).order('order_index'),
  ]);

  const sched = (schedRes.data ?? []) as unknown as ScheduleEntryRow[];
  const byChapter = new Map(sched.map((s) => [s.chapter_id, s]));

  // costo por capítulo
  const costByChapter = new Map<string, number>();
  for (const it of edt.items) {
    costByChapter.set(it.chapter_id, (costByChapter.get(it.chapter_id) ?? 0) + it.quantity * it.unit_price);
  }
  const total = [...costByChapter.values()].reduce((a, c) => a + c, 0);

  // ordenar capítulos por order_index ya viene de loadEDT
  let cursor = 0;
  const rows: ScheduleRow[] = edt.chapters.map((c: Chapter) => {
    const cost = costByChapter.get(c.id) ?? 0;
    const entry = byChapter.get(c.id);
    const durationDays = entry?.duration_days ?? MONTH; // default 1 mes
    const startDay = cursor; // secuencial: capítulos uno tras otro
    cursor = startDay + durationDays;
    return {
      chapterId: c.id,
      code: c.code,
      name: c.name,
      cost,
      pct: total > 0 ? (cost / total) * 100 : 0,
      startDay,
      durationDays,
      entryId: entry?.id ?? null,
    };
  });

  const disbRows = (disbRes.data ?? []) as unknown as DisbDbRow[];
  const disbursements: DisbItem[] = disbRows.length
    ? disbRows.map((d) => ({ id: d.id, description: d.description, escala_temporal: d.escala_temporal === 'semana' ? 'semana' : 'mes', periodo: d.periodo, monto_pct: Number(d.monto_pct) }))
    : defaultDisbursements(rows);

  return { rows, total, disbursements };
}

/** B-5 default: anticipo 20% + reparto parejo del resto por mes de obra. */
function defaultDisbursements(rows: ScheduleRow[]): DisbItem[] {
  const maxDay = rows.reduce((m, r) => Math.max(m, r.startDay + r.durationDays), 0);
  const months = Math.max(1, Math.ceil(maxDay / MONTH));
  const rest = 80;
  const per = Math.round((rest / months) * 100) / 100;
  const items: DisbItem[] = [{ id: null, description: 'Anticipo', escala_temporal: 'mes', periodo: 0, monto_pct: 20 }];
  let acc = 20;
  for (let m = 1; m <= months; m++) {
    const isLast = m === months;
    const pct = isLast ? Math.round((100 - acc) * 100) / 100 : per;
    acc += pct;
    items.push({ id: null, description: isLast ? 'Liquidación final' : `${m}º Desembolso`, escala_temporal: 'mes', periodo: m, monto_pct: pct });
  }
  return items;
}

/** Curva S planeada: % acumulado por mes, peso de cada capítulo repartido
 *  linealmente en su tramo de ejecución. */
export function buildCurveS(rows: ScheduleRow[]): { mes: string; planeado: number }[] {
  const maxDay = rows.reduce((m, r) => Math.max(m, r.startDay + r.durationDays), 0);
  const months = Math.max(1, Math.ceil(maxDay / MONTH));
  const out: { mes: string; planeado: number }[] = [{ mes: 'M0', planeado: 0 }];
  for (let m = 1; m <= months; m++) {
    const dayCut = m * MONTH;
    let pct = 0;
    for (const r of rows) {
      if (r.durationDays <= 0) continue;
      const frac = Math.min(1, Math.max(0, (dayCut - r.startDay) / r.durationDays));
      pct += r.pct * frac;
    }
    out.push({ mes: `M${m}`, planeado: Math.round(pct * 10) / 10 });
  }
  return out;
}

// --------------------------------------------------------------------------
// Persistencia
// --------------------------------------------------------------------------

/** Guarda la duración (en días) de un capítulo en schedule_entries. */
export async function saveDuration(projectId: string, row: ScheduleRow, durationDays: number): Promise<string> {
  const sb = getSupabase();
  if (row.entryId) {
    const { error } = await sb.from('schedule_entries').update({ duration_days: durationDays, start_day: row.startDay }).eq('id', row.entryId);
    if (error) throw new Error(error.message);
    return row.entryId;
  }
  const { data, error } = await sb
    .from('schedule_entries')
    .insert({ project_id: projectId, chapter_id: row.chapterId, start_day: row.startDay, duration_days: durationDays })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo guardar duración');
  return (data as { id: string }).id;
}

/** Reemplaza todos los desembolsos del proyecto. */
export async function saveDisbursements(projectId: string, items: DisbItem[]): Promise<void> {
  const sb = getSupabase();
  await sb.from('disbursement_schedule').delete().eq('project_id', projectId);
  if (!items.length) return;
  const rows = items.map((d, i) => ({
    project_id: projectId,
    order_index: i,
    description: d.description,
    escala_temporal: d.escala_temporal,
    periodo: d.periodo,
    monto_pct: d.monto_pct,
  }));
  const { error } = await sb.from('disbursement_schedule').insert(rows);
  if (error) throw new Error(error.message);
}
