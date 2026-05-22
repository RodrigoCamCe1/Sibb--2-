import type { Project } from '@/types/database';

export interface APULine {
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

export interface APUBreakdown {
  materials: APULine[];
  labor: APULine[];
  equipment: APULine[];
}

export interface APUCalculation {
  total_materials: number;
  subtotal_labor: number;
  cargas_sociales: number;
  iva_mano: number;
  total_labor: number;
  subtotal_equipment: number;
  herramientas: number;
  total_equipment: number;
  costo_directo: number;
  gg: number;
  utilidad: number;
  it: number;
  total: number;
  total_adoptado: number;
}

/**
 * Calcula APU según Formulario B-2 oficial SICOES.
 * Fórmula encadenada: Materiales → Mano (+cargas, +IVA) → Equipo (+herramientas % MO)
 *                   → GG (% CD) → Utilidad (% CD+GG) → IT (% todo lo anterior)
 */
export function calculateAPU(breakdown: APUBreakdown, project: Pick<Project, 'cargas_sociales_pct' | 'iva_mano_pct' | 'herramientas_pct' | 'gg_pct' | 'utilidad_pct' | 'it_pct'>): APUCalculation {
  const lineTotal = (l: APULine) => l.quantity * l.unit_price;
  const sum = (lines: APULine[]) => lines.reduce((acc, l) => acc + lineTotal(l), 0);

  const total_materials = sum(breakdown.materials);

  const subtotal_labor = sum(breakdown.labor);
  const cargas_sociales = subtotal_labor * (project.cargas_sociales_pct / 100);
  const iva_mano = (subtotal_labor + cargas_sociales) * (project.iva_mano_pct / 100);
  const total_labor = subtotal_labor + cargas_sociales + iva_mano;

  const subtotal_equipment = sum(breakdown.equipment);
  const herramientas = total_labor * (project.herramientas_pct / 100);
  const total_equipment = subtotal_equipment + herramientas;

  const costo_directo = total_materials + total_labor + total_equipment;
  const gg = costo_directo * (project.gg_pct / 100);
  const utilidad = (costo_directo + gg) * (project.utilidad_pct / 100);
  const it = (costo_directo + gg + utilidad) * (project.it_pct / 100);

  const total = costo_directo + gg + utilidad + it;
  const total_adoptado = Math.round(total * 100) / 100;

  return {
    total_materials,
    subtotal_labor,
    cargas_sociales,
    iva_mano,
    total_labor,
    subtotal_equipment,
    herramientas,
    total_equipment,
    costo_directo,
    gg,
    utilidad,
    it,
    total,
    total_adoptado,
  };
}
