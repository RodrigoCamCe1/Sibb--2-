// Tipos de la base de datos Supabase.
// Reemplazar después con `supabase gen types typescript` una vez deployed.

export type Modalidad = 'ANPE' | 'LP';
export type Ciudad = 'La Paz' | 'Cochabamba' | 'Santa Cruz' | 'Tarija' | 'Sucre' | 'Oruro' | 'Potosí' | 'Beni' | 'Pando';
export type Severidad = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type InsumoTipo = 'material' | 'labor' | 'equipment';

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

export type Project = {
  id: string;
  user_id: string;
  name: string;
  city: Ciudad;
  owner_client: string | null;
  start_date: string | null;
  currency: string;
  modalidad: Modalidad;
  cargas_sociales_pct: number;
  iva_mano_pct: number;
  herramientas_pct: number;
  gg_pct: number;
  utilidad_pct: number;
  it_pct: number;
  cuce: string | null;
  area_m2: number | null;
  created_at: string;
  updated_at: string;
}

export type Chapter = {
  id: string;
  project_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  order_index: number;
  created_at: string;
}

export type Item = {
  id: string;
  chapter_id: string;
  apu_id: string | null;
  code: string | null;
  codigo_sicoes: string | null;
  description: string;
  unit: string;
  quantity: number;
  order_index: number;
  tech_descripcion: string | null;
  tech_mat_herram_equipo: string | null;
  tech_forma_ejecucion: string | null;
  tech_medicion: string | null;
  tech_forma_pago: string | null;
  created_at: string;
}

export type APU = {
  id: string;
  project_id: string | null;
  code: string;
  codigo_sicoes: string | null;
  name: string;
  unit: string;
  is_global: boolean;
  cached_unit_price: number | null;
  cached_updated_at: string | null;
  created_at: string;
}

export type Material = {
  id: string;
  project_id: string | null;
  code: string;
  name: string;
  unit: string;
  base_price: number;
  category: string | null;
  created_at: string;
}

export type Labor = {
  id: string;
  project_id: string | null;
  code: string;
  name: string;
  unit: string;
  base_wage: number;
  created_at: string;
}

export type Equipment = {
  id: string;
  project_id: string | null;
  code: string;
  name: string;
  unit: string;
  hourly_rate: number;
  potencia: string | null;
  costo_basico_hora: number | null;
  costo_repuestos_hora: number | null;
  costo_combustible_hora: number | null;
  costo_otros_hora: number | null;
  created_at: string;
}

export type APUMaterial = {
  apu_id: string;
  material_id: string;
  quantity: number;
  waste_pct: number;
}

export type APULabor = {
  apu_id: string;
  labor_id: string;
  quantity: number;
  performance: number | null;
}

export type APUEquipment = {
  apu_id: string;
  equipment_id: string;
  quantity: number;
  performance: number | null;
}

export type RegionalFactor = {
  city: Ciudad;
  performance_factor: number;
  labor_factor: number;
  material_factor: number;
}

export type NormRule = {
  id: string;
  code: string;
  norm_reference: string;
  severity: Severidad;
  description: string;
  condition_json: Record<string, unknown>;
  suggestion: string;
  is_active: boolean;
  created_at: string;
}

export type DisbursementEntry = {
  id: string;
  project_id: string;
  order_index: number;
  description: string;
  escala_temporal: 'mes' | 'semana';
  periodo: number | null;
  monto_pct: number;
}

export type ScheduleEntry = {
  id: string;
  project_id: string;
  chapter_id: string;
  start_day: number;
  duration_days: number;
}

export type InsumoCatalog = {
  id: string;
  project_id: string;
  tipo: InsumoTipo;
  description: string;
  unit: string;
  precio_unitario: number;
  source_id: string | null;
  created_at: string;
}

// Esqueleto del shape Database para typing del SupabaseClient.
// Cada tabla incluye Relationships: [] — postgrest-js >= 2.x lo exige para
// satisfacer GenericTable; sin él las filas colapsan a `never`.
type Tbl<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: Tbl<Profile>;
      projects: Tbl<Project>;
      chapters: Tbl<Chapter>;
      items: Tbl<Item>;
      apus: Tbl<APU>;
      materials: Tbl<Material>;
      labor: Tbl<Labor>;
      equipment: Tbl<Equipment>;
      apu_materials: Tbl<APUMaterial>;
      apu_labor: Tbl<APULabor>;
      apu_equipment: Tbl<APUEquipment>;
      regional_factors: Tbl<RegionalFactor>;
      norm_rules: Tbl<NormRule>;
      disbursement_schedule: Tbl<DisbursementEntry>;
      schedule_entries: Tbl<ScheduleEntry>;
      insumos_catalog: Tbl<InsumoCatalog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      modalidad_t: Modalidad;
      ciudad_t: Ciudad;
      severidad_t: Severidad;
      insumo_tipo_t: InsumoTipo;
    };
  };
}
