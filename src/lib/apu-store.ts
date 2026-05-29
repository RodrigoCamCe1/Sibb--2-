// Capa de acceso a datos del APU (catálogo-driven, normalizado).
// El breakdown se persiste en apu_materials/apu_labor/apu_equipment,
// cada línea referencia un insumo del catálogo (materials/labor/equipment).
// El precio sale del catálogo y se ajusta por factor regional de la ciudad.

import { getSupabase } from '@/lib/supabase/client';
import { calculateAPU, type APUBreakdown } from '@/lib/calc-apu';
import type { Project, Item, RegionalFactor, Ciudad } from '@/types/database';

export type InsumoTipo = 'material' | 'labor' | 'equipment';

/** Insumo del catálogo, normalizado a una forma común para el picker. */
export interface CatalogInsumo {
  id: string;
  tipo: InsumoTipo;
  code: string;
  name: string;
  unit: string;
  price: number; // base_price | base_wage | hourly_rate
}

export interface Catalog {
  material: CatalogInsumo[];
  labor: CatalogInsumo[];
  equipment: CatalogInsumo[];
}

/** Línea del editor: referencia catálogo + cantidad + merma/rendimiento. */
export interface EditorLine {
  tipo: InsumoTipo;
  ref_id: string;       // id en materials/labor/equipment
  description: string;  // cache del nombre catálogo (para mostrar)
  unit: string;
  base_price: number;   // precio catálogo sin factor regional
  quantity: number;
  waste_pct: number;        // solo materiales (0 para labor/equipment)
  performance: number | null; // solo labor/equipment
}

export interface EditorBreakdown {
  materials: EditorLine[];
  labor: EditorLine[];
  equipment: EditorLine[];
}

const FACTOR_DEFAULT: Pick<RegionalFactor, 'performance_factor' | 'labor_factor' | 'material_factor'> = {
  performance_factor: 1,
  labor_factor: 1,
  material_factor: 1,
};

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

/** Carga catálogo global + del proyecto para los 3 tipos. */
export async function loadCatalog(projectId: string): Promise<Catalog> {
  const sb = getSupabase();
  const [mats, labs, equs] = await Promise.all([
    sb.from('materials').select('id, code, name, unit, base_price').or(`project_id.is.null,project_id.eq.${projectId}`).order('code'),
    sb.from('labor').select('id, code, name, unit, base_wage').or(`project_id.is.null,project_id.eq.${projectId}`).order('code'),
    sb.from('equipment').select('id, code, name, unit, hourly_rate').or(`project_id.is.null,project_id.eq.${projectId}`).order('code'),
  ]);

  return {
    material: (mats.data ?? []).map((m) => ({ id: m.id as string, tipo: 'material' as const, code: m.code as string, name: m.name as string, unit: m.unit as string, price: Number(m.base_price) })),
    labor: (labs.data ?? []).map((l) => ({ id: l.id as string, tipo: 'labor' as const, code: l.code as string, name: l.name as string, unit: l.unit as string, price: Number(l.base_wage) })),
    equipment: (equs.data ?? []).map((e) => ({ id: e.id as string, tipo: 'equipment' as const, code: e.code as string, name: e.name as string, unit: e.unit as string, price: Number(e.hourly_rate) })),
  };
}

// ---------------------------------------------------------------------------
// Factor regional
// ---------------------------------------------------------------------------

export async function loadRegionalFactor(city: string): Promise<typeof FACTOR_DEFAULT> {
  const sb = getSupabase();
  const { data } = await sb.from('regional_factors').select('performance_factor, labor_factor, material_factor').eq('city', city as Ciudad).maybeSingle();
  if (!data) return FACTOR_DEFAULT;
  return {
    performance_factor: Number(data.performance_factor),
    labor_factor: Number(data.labor_factor),
    material_factor: Number(data.material_factor),
  };
}

// ---------------------------------------------------------------------------
// Cargar breakdown de un APU
// ---------------------------------------------------------------------------

export async function loadApuBreakdown(apuId: string): Promise<EditorBreakdown> {
  const sb = getSupabase();
  const [mats, labs, equs] = await Promise.all([
    sb.from('apu_materials').select('material_id, quantity, waste_pct, materials(name, unit, base_price)').eq('apu_id', apuId),
    sb.from('apu_labor').select('labor_id, quantity, performance, labor(name, unit, base_wage)').eq('apu_id', apuId),
    sb.from('apu_equipment').select('equipment_id, quantity, performance, equipment(name, unit, hourly_rate)').eq('apu_id', apuId),
  ]);

  type Nested = { name: string; unit: string };
  const pick = (j: unknown): Nested & { price: number } => {
    const o = (Array.isArray(j) ? j[0] : j) as Record<string, unknown> | null;
    return {
      name: (o?.name as string) ?? '',
      unit: (o?.unit as string) ?? '',
      price: Number((o?.base_price ?? o?.base_wage ?? o?.hourly_rate) ?? 0),
    };
  };

  // postgrest no infiere embeds (Relationships vacío) → casteamos las filas
  type JoinRow = { material_id?: string; labor_id?: string; equipment_id?: string; quantity: number; waste_pct?: number; performance?: number | null; materials?: unknown; labor?: unknown; equipment?: unknown };
  const matRows = (mats.data ?? []) as unknown as JoinRow[];
  const labRows = (labs.data ?? []) as unknown as JoinRow[];
  const equRows = (equs.data ?? []) as unknown as JoinRow[];

  return {
    materials: matRows.map((r) => {
      const c = pick(r.materials);
      return { tipo: 'material' as const, ref_id: r.material_id as string, description: c.name, unit: c.unit, base_price: c.price, quantity: Number(r.quantity), waste_pct: Number(r.waste_pct), performance: null };
    }),
    labor: labRows.map((r) => {
      const c = pick(r.labor);
      return { tipo: 'labor' as const, ref_id: r.labor_id as string, description: c.name, unit: c.unit, base_price: c.price, quantity: Number(r.quantity), waste_pct: 0, performance: r.performance == null ? null : Number(r.performance) };
    }),
    equipment: equRows.map((r) => {
      const c = pick(r.equipment);
      return { tipo: 'equipment' as const, ref_id: r.equipment_id as string, description: c.name, unit: c.unit, base_price: c.price, quantity: Number(r.quantity), waste_pct: 0, performance: r.performance == null ? null : Number(r.performance) };
    }),
  };
}

// ---------------------------------------------------------------------------
// Conversión a APUBreakdown (aplica merma + factor regional) para calcular
// ---------------------------------------------------------------------------

export function toCalcBreakdown(b: EditorBreakdown, factor: typeof FACTOR_DEFAULT): APUBreakdown {
  return {
    materials: b.materials.map((l) => ({
      description: l.description,
      unit: l.unit,
      quantity: l.quantity * (1 + l.waste_pct / 100),
      unit_price: l.base_price * factor.material_factor,
    })),
    labor: b.labor.map((l) => ({
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unit_price: l.base_price * factor.labor_factor,
    })),
    equipment: b.equipment.map((l) => ({
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unit_price: l.base_price,
    })),
  };
}

// ---------------------------------------------------------------------------
// Asegurar que el ítem tenga un APU propio (crea si falta, linkea al ítem)
// ---------------------------------------------------------------------------

export async function ensureApuForItem(item: Item, projectId: string): Promise<string> {
  if (item.apu_id) return item.apu_id;
  const sb = getSupabase();
  const { data, error } = await sb
    .from('apus')
    .insert({
      project_id: projectId,
      code: item.code ?? item.id.slice(0, 8),
      codigo_sicoes: item.codigo_sicoes,
      name: item.description,
      unit: item.unit,
      is_global: false,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`No se pudo crear APU: ${error?.message ?? 'desconocido'}`);
  const apuId = data.id as string;
  const { error: linkErr } = await sb.from('items').update({ apu_id: apuId }).eq('id', item.id);
  if (linkErr) throw new Error(`No se pudo linkear APU al ítem: ${linkErr.message}`);
  return apuId;
}

// ---------------------------------------------------------------------------
// Guardar breakdown (delete-all + insert) y cachear precio unitario
// ---------------------------------------------------------------------------

export async function saveApuBreakdown(
  apuId: string,
  b: EditorBreakdown,
  project: Project,
  factor: typeof FACTOR_DEFAULT,
): Promise<number> {
  const sb = getSupabase();

  // Validar: toda línea debe referenciar un insumo del catálogo
  const all = [...b.materials, ...b.labor, ...b.equipment];
  if (all.some((l) => !l.ref_id)) {
    throw new Error('Hay líneas sin insumo seleccionado del catálogo.');
  }

  // Reemplazo total: borrar filas previas, insertar actuales
  await Promise.all([
    sb.from('apu_materials').delete().eq('apu_id', apuId),
    sb.from('apu_labor').delete().eq('apu_id', apuId),
    sb.from('apu_equipment').delete().eq('apu_id', apuId),
  ]);

  // Dedup por ref_id (PK compuesta apu_id+ref_id no admite duplicados)
  const dedupe = <T extends EditorLine>(lines: T[]) => {
    const map = new Map<string, T>();
    for (const l of lines) {
      const prev = map.get(l.ref_id);
      if (prev) prev.quantity += l.quantity;
      else map.set(l.ref_id, { ...l });
    }
    return [...map.values()];
  };

  const mats = dedupe(b.materials).map((l) => ({ apu_id: apuId, material_id: l.ref_id, quantity: l.quantity, waste_pct: l.waste_pct }));
  const labs = dedupe(b.labor).map((l) => ({ apu_id: apuId, labor_id: l.ref_id, quantity: l.quantity, performance: l.performance }));
  const equs = dedupe(b.equipment).map((l) => ({ apu_id: apuId, equipment_id: l.ref_id, quantity: l.quantity, performance: l.performance }));

  const inserts = [];
  if (mats.length) inserts.push(sb.from('apu_materials').insert(mats));
  if (labs.length) inserts.push(sb.from('apu_labor').insert(labs));
  if (equs.length) inserts.push(sb.from('apu_equipment').insert(equs));
  const results = await Promise.all(inserts);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Error guardando insumos: ${failed.error.message}`);

  // Cachear precio unitario del APU
  const calc = calculateAPU(toCalcBreakdown(b, factor), project);
  const { error: cacheErr } = await sb
    .from('apus')
    .update({ cached_unit_price: calc.total_adoptado, cached_updated_at: new Date().toISOString() })
    .eq('id', apuId);
  if (cacheErr) throw new Error(`Error cacheando precio: ${cacheErr.message}`);

  return calc.total_adoptado;
}
