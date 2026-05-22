-- ============================================================================
-- Sibbë-2 MVP — Schema inicial
-- Source: MVP-ALCANCE-v0.2.md sección 8 (modelo de datos)
-- Stack: Supabase puro (sin ORM). RLS habilitado por defecto.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles — extensión de auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique,
  name          text,
  company_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profile_self_read"  on public.profiles for select using (auth.uid() = id);
create policy "profile_self_write" on public.profiles for update using (auth.uid() = id);
create policy "profile_self_insert" on public.profiles for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create type modalidad_t as enum ('ANPE', 'LP');
create type ciudad_t as enum ('La Paz', 'Cochabamba', 'Santa Cruz', 'Tarija', 'Sucre', 'Oruro', 'Potosí', 'Beni', 'Pando');

create table public.projects (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,

  name                  text not null,
  city                  ciudad_t not null default 'La Paz',
  owner_client          text,
  start_date            date,
  currency              text not null default 'BOB',
  modalidad             modalidad_t not null default 'ANPE',

  -- Indirectos (porcentajes default constantes BO verificadas en DBC research)
  cargas_sociales_pct   numeric(5,2) not null default 71.18,
  iva_mano_pct          numeric(5,2) not null default 14.94,
  herramientas_pct      numeric(5,2) not null default 5.00,
  gg_pct                numeric(5,2) not null default 10.00,
  utilidad_pct          numeric(5,2) not null default 8.00,
  it_pct                numeric(5,2) not null default 3.09,

  -- SICOES
  cuce                  text,
  area_m2               numeric(10,2),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index projects_user_idx on public.projects (user_id);

alter table public.projects enable row level security;

create policy "project_owner_all" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- chapters (EDT)
-- ---------------------------------------------------------------------------
create table public.chapters (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  parent_id    uuid references public.chapters(id) on delete cascade,
  code         text not null,
  name         text not null,
  order_index  int not null default 0,
  created_at   timestamptz not null default now()
);

create index chapters_project_idx on public.chapters (project_id);
create index chapters_parent_idx on public.chapters (parent_id);

alter table public.chapters enable row level security;

create policy "chapter_via_project" on public.chapters
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- apus
-- ---------------------------------------------------------------------------
create table public.apus (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references public.projects(id) on delete cascade,  -- null = global seed
  code           text not null,
  codigo_sicoes  text,
  name           text not null,
  unit           text not null,
  is_global      boolean not null default false,
  cached_unit_price  numeric(12,2),
  cached_updated_at  timestamptz,
  created_at     timestamptz not null default now()
);

create index apus_project_idx on public.apus (project_id);
create index apus_global_idx on public.apus (is_global) where is_global = true;

alter table public.apus enable row level security;

create policy "apu_global_read" on public.apus for select using (is_global = true);
create policy "apu_owner_all" on public.apus
  for all using (
    project_id is not null and
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- items (líneas del presupuesto)
-- ---------------------------------------------------------------------------
create table public.items (
  id            uuid primary key default gen_random_uuid(),
  chapter_id    uuid not null references public.chapters(id) on delete cascade,
  apu_id        uuid references public.apus(id),
  code          text,
  codigo_sicoes text,
  description   text not null,
  unit          text not null,
  quantity      numeric(12,3) not null default 0,
  order_index   int not null default 0,

  -- Especificaciones técnicas (plantilla 5-secciones BO)
  tech_descripcion          text,
  tech_mat_herram_equipo    text,
  tech_forma_ejecucion      text,
  tech_medicion             text,
  tech_forma_pago           text,

  created_at    timestamptz not null default now()
);

create index items_chapter_idx on public.items (chapter_id);
create index items_apu_idx on public.items (apu_id);

alter table public.items enable row level security;

create policy "item_via_chapter" on public.items
  for all using (
    exists (
      select 1
      from public.chapters c
      join public.projects p on p.id = c.project_id
      where c.id = chapter_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- CATÁLOGOS BASE — materials, labor, equipment
-- ---------------------------------------------------------------------------
create type insumo_categoria_t as enum (
  'aridos_aglomerantes', 'acero', 'mamposteria', 'encofrado', 'pintura_acabados',
  'pisos_ceramicas', 'cubiertas', 'carpinteria', 'sanitaria_plomeria', 'electrica',
  'drywall_cielos', 'aditivos', 'varios_obra'
);

create table public.materials (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,  -- null = global
  code        text not null,
  name        text not null,
  unit        text not null,
  base_price  numeric(12,2) not null default 0,
  category    insumo_categoria_t,
  created_at  timestamptz not null default now()
);

create table public.labor (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  code        text not null,
  name        text not null,
  unit        text not null default 'HRS',
  base_wage   numeric(12,2) not null default 0,
  created_at  timestamptz not null default now()
);

create table public.equipment (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid references public.projects(id) on delete cascade,
  code                     text not null,
  name                     text not null,
  unit                     text not null default 'HRS',
  hourly_rate              numeric(12,2) not null default 0,
  -- B-4 desglose
  potencia                 text,
  costo_basico_hora        numeric(12,2),
  costo_repuestos_hora     numeric(12,2),
  costo_combustible_hora   numeric(12,2),
  costo_otros_hora         numeric(12,2),
  created_at               timestamptz not null default now()
);

alter table public.materials enable row level security;
alter table public.labor     enable row level security;
alter table public.equipment enable row level security;

create policy "mat_global_read" on public.materials for select using (project_id is null);
create policy "mat_owner_all" on public.materials
  for all using (
    project_id is not null and
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "lab_global_read" on public.labor for select using (project_id is null);
create policy "lab_owner_all" on public.labor
  for all using (
    project_id is not null and
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "eq_global_read" on public.equipment for select using (project_id is null);
create policy "eq_owner_all" on public.equipment
  for all using (
    project_id is not null and
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- DESGLOSE APU
-- ---------------------------------------------------------------------------
create table public.apu_materials (
  apu_id        uuid not null references public.apus(id) on delete cascade,
  material_id   uuid not null references public.materials(id),
  quantity      numeric(12,4) not null default 0,
  waste_pct     numeric(5,2) not null default 0,
  primary key (apu_id, material_id)
);

create table public.apu_labor (
  apu_id        uuid not null references public.apus(id) on delete cascade,
  labor_id      uuid not null references public.labor(id),
  quantity      numeric(12,4) not null default 0,   -- horas por unidad APU
  performance   numeric(8,4),                       -- rendimiento (opcional)
  primary key (apu_id, labor_id)
);

create table public.apu_equipment (
  apu_id        uuid not null references public.apus(id) on delete cascade,
  equipment_id  uuid not null references public.equipment(id),
  quantity      numeric(12,4) not null default 0,
  performance   numeric(8,4),
  primary key (apu_id, equipment_id)
);

-- RLS via apu
alter table public.apu_materials enable row level security;
alter table public.apu_labor     enable row level security;
alter table public.apu_equipment enable row level security;

create policy "apumat_via_apu" on public.apu_materials
  for all using (
    exists (
      select 1 from public.apus a
      where a.id = apu_id and (
        a.is_global = true or
        exists (select 1 from public.projects p where p.id = a.project_id and p.user_id = auth.uid())
      )
    )
  );

create policy "apulab_via_apu" on public.apu_labor
  for all using (
    exists (
      select 1 from public.apus a
      where a.id = apu_id and (
        a.is_global = true or
        exists (select 1 from public.projects p where p.id = a.project_id and p.user_id = auth.uid())
      )
    )
  );

create policy "apueq_via_apu" on public.apu_equipment
  for all using (
    exists (
      select 1 from public.apus a
      where a.id = apu_id and (
        a.is_global = true or
        exists (select 1 from public.projects p where p.id = a.project_id and p.user_id = auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- B-3 catálogo insumos del proponente (snapshot al export)
-- ---------------------------------------------------------------------------
create type insumo_tipo_t as enum ('material', 'labor', 'equipment');

create table public.insumos_catalog (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  tipo            insumo_tipo_t not null,
  description     text not null,
  unit            text not null,
  precio_unitario numeric(12,2) not null,
  source_id       uuid,
  created_at      timestamptz not null default now()
);

create index insumos_project_idx on public.insumos_catalog (project_id);

alter table public.insumos_catalog enable row level security;

create policy "insumo_via_project" on public.insumos_catalog
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- regional_factors (3 ciudades base MVP)
-- ---------------------------------------------------------------------------
create table public.regional_factors (
  city                 ciudad_t primary key,
  performance_factor   numeric(5,3) not null default 1.000,
  labor_factor         numeric(5,3) not null default 1.000,
  material_factor      numeric(5,3) not null default 1.000
);

-- Tabla de referencia pública, sin RLS
insert into public.regional_factors (city, performance_factor, labor_factor, material_factor) values
  ('La Paz',      1.000, 1.000, 1.000),
  ('Cochabamba',  1.050, 0.880, 0.950),
  ('Santa Cruz',  0.950, 1.050, 1.080);

-- ---------------------------------------------------------------------------
-- norm_rules (validador normativo)
-- ---------------------------------------------------------------------------
create type severidad_t as enum ('CRITICAL', 'HIGH', 'MEDIUM');

create table public.norm_rules (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  norm_reference  text not null,
  severity        severidad_t not null,
  description     text not null,
  condition_json  jsonb not null,
  suggestion      text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Tabla pública (semilla compartida), sin RLS
-- Seed inicial: ver reglas-norma.md (10 reglas)

-- ---------------------------------------------------------------------------
-- schedule_entries + disbursement_schedule (Curva S + B-5)
-- ---------------------------------------------------------------------------
create table public.schedule_entries (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  chapter_id    uuid not null references public.chapters(id) on delete cascade,
  start_day     int not null default 0,
  duration_days int not null default 1
);

create table public.disbursement_schedule (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  order_index  int not null default 0,
  description  text not null,
  escala_temporal text not null default 'mes',  -- 'mes' | 'semana'
  periodo      int,                              -- nº mes o nº semana
  monto_pct    numeric(5,2) not null default 0
);

alter table public.schedule_entries     enable row level security;
alter table public.disbursement_schedule enable row level security;

create policy "sched_via_project" on public.schedule_entries
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "disb_via_project" on public.disbursement_schedule
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Trigger updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-creación profile cuando user firma
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
