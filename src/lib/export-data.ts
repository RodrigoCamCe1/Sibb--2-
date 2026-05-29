// Arma los datos reales del proyecto para el paquete SICOES.
// Lee ítems + APU breakdown (catálogo) + factor regional, calcula precios
// con la fórmula B-2 y recolecta el catálogo de insumos para B-3.

import { getSupabase } from '@/lib/supabase/client';
import { loadApuBreakdown, loadRegionalFactor, toCalcBreakdown, type EditorLine } from '@/lib/apu-store';
import { calculateAPU } from '@/lib/calc-apu';
import type { Project, Item } from '@/types/database';
import type { B1Row } from '@/lib/export/b1';
import type { B2Input } from '@/lib/export/b2';
import type { B3Insumo } from '@/lib/export/b3';
import type { B5Entry } from '@/lib/export/b5';

export interface ExportData {
  items: Item[];
  b1Rows: B1Row[];
  b2Inputs: B2Input[];
  b3Insumos: B3Insumo[];
  b5Entries: B5Entry[];
  includeB4: boolean;
  total: number;
}

const DEFAULT_B5: B5Entry[] = [
  { n: 1, description: 'Anticipo', mes_o_semana: 'M0', total_pct: 20 },
  { n: 2, description: '1er Desembolso', mes_o_semana: 'M1', total_pct: 20 },
  { n: 3, description: '2do Desembolso', mes_o_semana: 'M2', total_pct: 20 },
  { n: 4, description: '3er Desembolso', mes_o_semana: 'M3', total_pct: 20 },
  { n: 5, description: 'Liquidación final', mes_o_semana: 'M4', total_pct: 20 },
];

function addInsumo(map: Map<string, B3Insumo>, tipo: B3Insumo['tipo'], line: EditorLine, factor: number) {
  if (!line.ref_id) return;
  const key = `${tipo}:${line.ref_id}`;
  if (map.has(key)) return;
  map.set(key, { tipo, description: line.description, unit: line.unit, precio_unitario: line.base_price * factor });
}

interface DisbRow { description: string; escala_temporal: string; periodo: number | null; monto_pct: number }

export async function buildExportData(project: Project): Promise<ExportData> {
  const sb = getSupabase();
  const [itemsRes, factor, disbRes] = await Promise.all([
    sb.from('items').select('*, chapters!inner(project_id)').eq('chapters.project_id', project.id).order('order_index'),
    loadRegionalFactor(project.city),
    sb.from('disbursement_schedule').select('description, escala_temporal, periodo, monto_pct').eq('project_id', project.id).order('order_index'),
  ]);

  const items = (itemsRes.data ?? []) as unknown as Item[];

  const b1Rows: B1Row[] = [];
  const b2Inputs: B2Input[] = [];
  const insumoMap = new Map<string, B3Insumo>();

  let itemN = 0;
  for (const it of items) {
    itemN++;
    let unitPrice = 0;
    if (it.apu_id) {
      const bd = await loadApuBreakdown(it.apu_id);
      const calcBd = toCalcBreakdown(bd, factor);
      unitPrice = calculateAPU(calcBd, project).total_adoptado;
      b2Inputs.push({
        item_n: itemN,
        proyecto: project.name,
        actividad: it.description,
        cantidad: it.quantity,
        unidad: it.unit,
        moneda: project.currency,
        breakdown: calcBd,
      });
      bd.materials.forEach((l) => addInsumo(insumoMap, 'material', l, factor.material_factor));
      bd.labor.forEach((l) => addInsumo(insumoMap, 'labor', l, factor.labor_factor));
      bd.equipment.forEach((l) => addInsumo(insumoMap, 'equipment', l, 1));
    }
    b1Rows.push({ item_n: itemN, description: it.description, unit: it.unit, quantity: it.quantity, unit_price: unitPrice });
  }

  const total = b1Rows.reduce((a, r) => a + r.quantity * r.unit_price, 0);

  const disbRows = (disbRes.data ?? []) as unknown as DisbRow[];
  const b5Entries: B5Entry[] = disbRows.length
    ? disbRows.map((d, i) => ({
        n: i + 1,
        description: d.description,
        mes_o_semana: `${d.escala_temporal === 'semana' ? 'S' : 'M'}${d.periodo ?? i}`,
        total_pct: Number(d.monto_pct),
      }))
    : DEFAULT_B5;

  // B-4 (equipo pesado desglosado) queda para v0.3
  return { items, b1Rows, b2Inputs, b3Insumos: [...insumoMap.values()], b5Entries, includeB4: false, total };
}
