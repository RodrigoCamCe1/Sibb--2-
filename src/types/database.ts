// Tipos de la base de datos Supabase.
// Reemplazar después con `supabase gen types typescript` una vez deployed.

export type Modalidad = 'ANPE' | 'LP';
export type Ciudad = 'La Paz' | 'Cochabamba' | 'Santa Cruz' | 'Tarija' | 'Sucre' | 'Oruro' | 'Potosí' | 'Beni' | 'Pando';
export type Severidad = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export type InsumoTipo = 'material' | 'labor' | 'equipment';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
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

export interface Chapter {
  id: string;
  project_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  order_index: number;
  created_at: string;
}

export interface Item {
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

export interface APU {
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

export interface Material {
  id: string;
  project_id: string | null;
  code: string;
  name: string;
  unit: string;
  base_price: number;
  category: string | null;
  created_at: string;
}

export interface Labor {
  id: string;
  project_id: string | null;
  code: string;
  name: string;
  unit: string;
  base_wage: number;
  created_at: string;
}

export interface Equipment {
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

export interface APUMaterial {
  apu_id: string;
  material_id: string;
  quantity: number;
  waste_pct: number;
}

export interface APULabor {
  apu_id: string;
  labor_id: string;
  quantity: number;
  performance: number | null;
}

export interface APUEquipment {
  apu_id: string;
  equipment_id: string;
  quantity: number;
  performance: number | null;
}

export interface RegionalFactor {
  city: Ciudad;
  performance_factor: number;
  labor_factor: number;
  material_factor: number;
}

export interface NormRule {
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

export interface DisbursementEntry {
  id: string;
  project_id: string;
  order_index: number;
  description: string;
  escala_temporal: 'mes' | 'semana';
  periodo: number | null;
  monto_pct: number;
}

// Esqueleto del shape Database para typing del SupabaseClient
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      projects: { Row: Project; Insert: Partial<Project>; Update: Partial<Project> };
      chapters: { Row: Chapter; Insert: Partial<Chapter>; Update: Partial<Chapter> };
      items: { Row: Item; Insert: Partial<Item>; Update: Partial<Item> };
      apus: { Row: APU; Insert: Partial<APU>; Update: Partial<APU> };
      materials: { Row: Material; Insert: Partial<Material>; Update: Partial<Material> };
      labor: { Row: Labor; Insert: Partial<Labor>; Update: Partial<Labor> };
      equipment: { Row: Equipment; Insert: Partial<Equipment>; Update: Partial<Equipment> };
      apu_materials: { Row: APUMaterial; Insert: Partial<APUMaterial>; Update: Partial<APUMaterial> };
      apu_labor: { Row: APULabor; Insert: Partial<APULabor>; Update: Partial<APULabor> };
      apu_equipment: { Row: APUEquipment; Insert: Partial<APUEquipment>; Update: Partial<APUEquipment> };
      regional_factors: { Row: RegionalFactor; Insert: Partial<RegionalFactor>; Update: Partial<RegionalFactor> };
      norm_rules: { Row: NormRule; Insert: Partial<NormRule>; Update: Partial<NormRule> };
      disbursement_schedule: { Row: DisbursementEntry; Insert: Partial<DisbursementEntry>; Update: Partial<DisbursementEntry> };
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
