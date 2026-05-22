import type { Severidad, Item, Project } from '@/types/database';

export interface NormAlert {
  code: string;
  norm_reference: string;
  severity: Severidad;
  title: string;
  description: string;
  suggestion: string;
  item_id?: string;
  item_description?: string;
}

interface ProjectContext {
  project: Project;
  items: Item[];
  total_cost: number;
}

/**
 * Engine de validación normativa. Ejecuta las 10 reglas hardcoded del MVP.
 * Source: research/reglas-norma.md
 */
export function validateProject(ctx: ProjectContext): NormAlert[] {
  const alerts: NormAlert[] = [];
  const itemText = (i: Item) => `${i.description} ${i.code ?? ''} ${i.tech_descripcion ?? ''}`.toUpperCase();

  // Helper detectar fc'
  const fcMatch = (text: string): number | null => {
    const m = text.match(/FC['\s]*[=:]?\s*(\d{2,4})/);
    return m ? parseInt(m[1], 10) : null;
  };

  // NORM-001: Resistencia mínima H°A° columnas (fc' >= 210)
  for (const item of ctx.items) {
    const text = itemText(item);
    if ((text.includes('COLUMNA')) && (text.includes('H°A°') || text.includes('HORMIGON ARMADO') || text.includes('HORMIGÓN ARMADO'))) {
      const fc = fcMatch(text);
      if (fc != null && fc < 210) {
        alerts.push({
          code: 'NORM-001',
          norm_reference: 'CBH-87 Art. 10.1.2',
          severity: 'CRITICAL',
          title: 'Resistencia hormigón columnas insuficiente',
          description: `Ítem "${item.description}" tiene fc'=${fc} kg/cm². CBH-87 exige fc' ≥ 210 kg/cm² en columnas.`,
          suggestion: 'Cambiar especificación a fc\'=210 o superior. Considerar fc\'=250 para edificios > 4 plantas.',
          item_id: item.id,
          item_description: item.description,
        });
      }
    }
  }

  // NORM-002: Zapatas/cimientos
  for (const item of ctx.items) {
    const text = itemText(item);
    if ((text.includes('ZAPATA') || text.includes('CIMIENTO') || text.includes('FUNDACI')) && (text.includes('H°A°') || text.includes('HORMIGON ARMADO') || text.includes('HORMIGÓN ARMADO'))) {
      const fc = fcMatch(text);
      if (fc != null && fc < 210) {
        alerts.push({
          code: 'NORM-002',
          norm_reference: 'CBH-87 Art. 10.1.2',
          severity: 'CRITICAL',
          title: 'Resistencia H°A° en cimentación insuficiente',
          description: `Ítem "${item.description}" tiene fc'=${fc} kg/cm². Cimentación requiere fc' ≥ 210.`,
          suggestion: 'Especificar fc\'=210 mínimo. Para suelos agresivos considerar fc\'=250.',
          item_id: item.id,
          item_description: item.description,
        });
      }
    }
  }

  // NORM-003: Acero refuerzo grado mínimo
  for (const item of ctx.items) {
    const text = itemText(item);
    if (text.includes('ACERO') && (text.includes('REFUERZO') || text.includes('FY'))) {
      const fyMatch = text.match(/FY\s*[=:]?\s*(\d{2,5})/);
      if (fyMatch) {
        const fy = parseInt(fyMatch[1], 10);
        if (fy < 4200) {
          alerts.push({
            code: 'NORM-003',
            norm_reference: 'CBH-87 Art. 9.2',
            severity: 'HIGH',
            title: 'Acero de refuerzo grado insuficiente',
            description: `Ítem "${item.description}" usa fy=${fy}. Estándar BO es AH-42 (fy=4200).`,
            suggestion: 'Especificar fy=4200 (corrugado). Acero liso fy=2400 solo para estribos secundarios.',
            item_id: item.id,
            item_description: item.description,
          });
        }
      }
    }
  }

  // NORM-004: Losa requiere acero asociado
  const hasLosa = ctx.items.some((i) => itemText(i).includes('LOSA'));
  const hasAcero = ctx.items.some((i) => itemText(i).includes('ACERO'));
  if (hasLosa && !hasAcero) {
    alerts.push({
      code: 'NORM-004',
      norm_reference: 'CBH-87 Art. 11.4.4',
      severity: 'HIGH',
      title: 'Losa de H°A° sin acero asociado',
      description: 'El proyecto incluye ítem de losa pero no se detecta ítem de acero de refuerzo. Cuantía mínima 0.18% sección bruta.',
      suggestion: 'Agregar ítem "ACERO DE REFUERZO fy=4200" al capítulo correspondiente.',
    });
  }

  // NORM-006: Plan SySO en obras > Bs 1M
  if (ctx.total_cost > 1_000_000) {
    const hasSySO = ctx.items.some((i) => {
      const t = itemText(i);
      return t.includes('SEGURIDAD') && (t.includes('SALUD') || t.includes('SYSO'));
    });
    if (!hasSySO) {
      alerts.push({
        code: 'NORM-006',
        norm_reference: 'NB 55001 + Ley 16998 Art. 23',
        severity: 'HIGH',
        title: 'Plan SySO obligatorio en obras mayores',
        description: `Obra con monto Bs ${ctx.total_cost.toLocaleString('es-BO')} requiere Plan de Seguridad y Salud Ocupacional explícito.`,
        suggestion: 'Agregar ítem "PLAN DE SEGURIDAD Y SALUD OCUPACIONAL" (GLB) al capítulo Varios.',
      });
    }
  }

  // NORM-008: Tierra física en eléctricas
  const hasElectrica = ctx.items.some((i) => {
    const t = itemText(i);
    return t.includes('LUMINARIA') || t.includes('INTERRUPTOR') || t.includes('TOMACORRIENTE') || t.includes('TABLERO ELECTRIC') || t.includes('TABLERO ELÉCTRIC');
  });
  const hasTierra = ctx.items.some((i) => {
    const t = itemText(i);
    return t.includes('TIERRA FÍSICA') || t.includes('TIERRA FISICA') || t.includes('PUESTA A TIERRA') || t.includes('ATERRAMIENTO');
  });
  if (hasElectrica && !hasTierra) {
    alerts.push({
      code: 'NORM-008',
      norm_reference: 'NB 777 Sección 6',
      severity: 'CRITICAL',
      title: 'Falta puesta a tierra física',
      description: 'Proyecto tiene ítems eléctricos pero no incluye sistema de puesta a tierra.',
      suggestion: 'Agregar ítem "SISTEMA DE PUESTA A TIERRA" (GLB) — varilla copperweld + conductor + mejorador de suelo.',
    });
  }

  // NORM-009: Pendientes desagüe
  for (const item of ctx.items) {
    const text = itemText(item);
    if (text.includes('TUBERÍA SANITARIA') || text.includes('TUBERIA SANITARIA') || text.includes('DESAGÜE') || text.includes('DESAGUE')) {
      const tech = (item.tech_forma_ejecucion ?? '').toUpperCase();
      const hasPendiente = tech.includes('PENDIENTE');
      if (!hasPendiente) {
        alerts.push({
          code: 'NORM-009',
          norm_reference: 'NB-RIDAA / APNB 689',
          severity: 'MEDIUM',
          title: 'Pendiente mínima desagües no especificada',
          description: `Ítem "${item.description}" no menciona pendiente mínima en su especificación técnica.`,
          suggestion: 'Pendiente mínima: 2% para Ø ≤ 2", 1% para Ø ≥ 4". Documentar en Especificaciones Técnicas.',
          item_id: item.id,
          item_description: item.description,
        });
        break;
      }
    }
  }

  // NORM-010: Tipo cemento en contacto con suelo
  for (const item of ctx.items) {
    const text = itemText(item);
    if ((text.includes('ZAPATA') || text.includes('CIMIENTO') || text.includes('MURO DE CONTENCIÓN') || text.includes('MURO DE CONTENCION'))) {
      const tech = (item.tech_mat_herram_equipo ?? '').toUpperCase();
      const hasCementoEspecial = tech.includes('IP-30') || tech.includes('PUZOLÁNIC') || tech.includes('PUZOLANIC') || tech.includes('SULFATO') || tech.includes('MH/HS');
      if (!hasCementoEspecial) {
        alerts.push({
          code: 'NORM-010',
          norm_reference: 'CBH-87 Art. 9.1 / NB 011',
          severity: 'MEDIUM',
          title: 'Tipo de cemento para elemento en contacto con suelo',
          description: `Ítem "${item.description}" no especifica cemento resistente a sulfatos o puzolánico.`,
          suggestion: 'Especificar cemento Portland IP-30 (puzolánico) o tipo MH/HS según agresividad del suelo.',
          item_id: item.id,
          item_description: item.description,
        });
        break;
      }
    }
  }

  return alerts;
}

export function severityRank(s: Severidad): number {
  return s === 'CRITICAL' ? 0 : s === 'HIGH' ? 1 : 2;
}

export function severityLabel(s: Severidad): string {
  return s === 'CRITICAL' ? 'CRÍTICA' : s === 'HIGH' ? 'ALTA' : 'MEDIA';
}

export function severityVariant(s: Severidad): 'destructive' | 'warning' | 'info' {
  return s === 'CRITICAL' ? 'destructive' : s === 'HIGH' ? 'warning' : 'info';
}
