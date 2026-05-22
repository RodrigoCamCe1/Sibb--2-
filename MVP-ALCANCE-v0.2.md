# MVP — Software de Presupuestos y Control de Obra para Bolivia

**Documento de alcance v0.2**
Mayo 2026
Audiencia: equipo fundador + arquitecto/constructor validador

> **Changelog v0.1 → v0.2**
> - Sección 6.6 reescrita: export SICOES diferenciado por modalidad (ANPE vs Licitación Pública)
> - Sección 8 modelo de datos ampliado: campos cargas sociales, IVA mano obra, herramientas%, GG%, utilidad%, IT%, código SICOES, tech_spec
> - Nueva tabla `insumos_catalog` (B-3 catálogo único proponente)
> - Nueva tabla `disbursement_schedule` (B-5)
> - Nueva tabla `equipment_cost_detail` (B-4)
> - Nueva sección 6.9 Especificaciones Técnicas (anexo profesional 5-secciones)
> - Stack: drop Drizzle ORM → Supabase puro (`@supabase/ssr` + `supabase-js`) con RLS
> - Carpeta de trabajo: `Sibbë-2/` (Sibbë = empresa paraguas, nombre comercial pendiente)

---

## 1. Resumen ejecutivo

Construir MVP web de presupuestos de obra con análisis de precios unitarios (APU), enfocado al mercado boliviano, con tres diferenciadores claros que no cubre ningún competidor nacional ni internacional disponible localmente:

1. **Ajuste regional automático** de rendimientos y precios por ciudad (La Paz, Santa Cruz, Cochabamba como base).
2. **Validación de norma boliviana** (CBH-87 hormigón armado, NB 1225001 sísmica, NB 777) integrada al APU.
3. **Exportación directa a Formularios B-1 a B-5 oficiales SICOES** (ANPE y Licitación Pública) en un clic.

Objetivo del MVP: demostrar valor a 5-10 constructoras piloto y conseguir 1-3 cartas de intención de compra.

---

## 2. Problema (sin cambios respecto v0.1)

Ver MVP-ALCANCE.md original. Confirmado en DBC research que constructoras BO entregan B-1 a B-5 manualmente cuando aplica LP — tarea repetitiva de horas por ítem.

---

## 3. Análisis competitivo (sin cambios)

---

## 4. Propuesta de valor única (refinada)

### 4.1 Hyperlocalización regional
Sin cambios respecto v0.1.

### 4.2 Validador normativo
Sin cambios. Reglas detalladas en `research/reglas-norma.md`.

### 4.3 SICOES-first **(refinado)**

Botón "Exportar SICOES" entrega paquete diferenciado por modalidad:

**Modo ANPE** (obras ≤ Bs 200.000):
- `01-B1-Presupuesto.xlsx` (Formulario B-1 oficial bit-perfect)
- `02-EspecificacionesTecnicas.docx` (5-secciones por ítem)
- `03-Presupuesto.pdf` (versión imprimible)

**Modo Licitación Pública** (obras > Bs 200.000):
- `01-B1-Presupuesto.xlsx`
- `02-B2-APU.xlsx` (1 hoja por ítem, ~25-50 hojas típico)
- `03-B3-CatalogoInsumos.xlsx`
- `04-B4-CostoEquipos.xlsx` (si la obra usa equipo pesado)
- `05-B5-Cronograma.xlsx`
- `06-EspecificacionesTecnicas.docx`
- `07-Presupuesto.pdf`

Diferencial vs competencia: ningún software local (Insucons, Apucons, SURI, etc.) genera B-2 con la fórmula encadenada correcta (CD → GG → Utilidad → IT) bit-perfect en un click.

Plantillas Excel construidas con `exceljs` siguiendo formato verificado contra 4 DBCs reales (ver `research/formularios-b.md`).

---

## 5. Alcance del MVP

### 5.1 Dentro del alcance (IN) — refinado

| # | Módulo | Cambio v0.2 |
|---|---|---|
| 1 | Autenticación básica | Sin cambios |
| 2 | Gestión proyectos | + campo `modalidad` (ANPE / LP) |
| 3 | Estructura EDT | Sin cambios |
| 4 | Ítems de presupuesto | + campo `codigo_sicoes` opcional |
| 5 | Editor de APU (estructura B-2 oficial) | Refactor: 6 secciones canónicas con fórmula encadenada |
| 6 | Catálogos precargados | + tabla `insumos_catalog` por proyecto (alimenta B-3) |
| 7 | Cálculo de indirectos | + campos: cargas_sociales_pct, iva_mano_pct, herramientas_pct (default 5%), gg_pct, utilidad_pct, it_pct (3.09%) |
| 8 | Ajuste regional | Sin cambios |
| 9 | Validador normativo | Sin cambios |
| 10 | Export SICOES | **Reescrito**: B-1 a B-5 según modalidad + Especificaciones Técnicas docx + PDF |
| 11 | Curva S planeada | + Cronograma desembolsos B-5 (anticipo + tramos) |
| 12 | Dashboard proyecto | Sin cambios |

### 5.2 Fuera del alcance MVP — sin cambios v0.1

### 5.3 Postergado v1.1 — sin cambios

---

## 6. Especificación funcional

### 6.1 - 6.4 Sin cambios v0.1

### 6.5 Validador normativo

Ver `research/reglas-norma.md` para las 10 reglas hardcoded MVP con referencia a artículo.

### 6.6 Export SICOES **(reescrito v0.2)**

Workflow:
1. Usuario click "Exportar SICOES"
2. Sistema lee `projects.modalidad`
3. Genera ZIP según matriz:

| Archivo | ANPE | LP |
|---|:---:|:---:|
| 01-B1-Presupuesto.xlsx | ✓ | ✓ |
| 02-B2-APU.xlsx | — | ✓ |
| 03-B3-CatalogoInsumos.xlsx | — | ✓ |
| 04-B4-CostoEquipos.xlsx | — | Si tiene equipo |
| 05-B5-Cronograma.xlsx | — | ✓ |
| 06-EspecificacionesTecnicas.docx | ✓ | ✓ |
| 07-Presupuesto.pdf | ✓ | ✓ |

Spec exacto cada formulario: `research/formularios-b.md`.

### 6.7 Curva S y B-5

Asignar duración por capítulo + porcentaje de desembolso. Generar:
- Curva S planeada (gráfico Recharts)
- Formulario B-5 cronograma desembolsos (Excel)

### 6.8 Dashboard — sin cambios

### 6.9 Especificaciones Técnicas (nuevo)

Cada APU tiene 5 campos texto:
- `tech_descripcion`
- `tech_materiales_herramientas_equipo` (markdown bullets)
- `tech_forma_ejecucion`
- `tech_medicion`
- `tech_forma_pago` (boilerplate auto-llenable)

Editor: tab adicional en el modal APU.
Export: documento Word con 1 ítem por sección, formato profesional.

---

## 7. Stack técnico **(actualizado v0.2)**

| Capa | Tecnología | Cambio |
|---|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript | Mismo |
| UI | Tailwind v4 + shadcn/ui | Mismo |
| Tablas | TanStack Table | Mismo |
| Charts | Recharts | Mismo |
| Backend | Next.js API routes + Supabase Edge Functions | Mismo |
| DB | PostgreSQL vía Supabase | Mismo |
| **ORM** | **Supabase puro (sin Drizzle)** | **DROP Drizzle**, usar `@supabase/ssr` + `supabase-js` con RLS |
| Auth | Supabase Auth | Mismo |
| Excel | exceljs | Mismo |
| Word | docx (npm) | **Nuevo** (Especificaciones Técnicas) |
| PDF | react-pdf o pdfmake | Mismo |
| Hosting | Vercel | Mismo |

---

## 8. Modelo de datos **(ampliado v0.2)**

```
-- AUTH (Supabase nativo)
auth.users (provisto por Supabase)

profiles
  id (= auth.users.id), email, name, company_name, created_at

-- PROYECTO
projects
  id, user_id, name, city, owner_client, start_date,
  currency (default 'BOB'),
  modalidad ('ANPE' | 'LP'),
  -- indirectos
  cargas_sociales_pct,    -- default 71.18
  iva_mano_pct,           -- default 14.94
  herramientas_pct,       -- default 5.00
  gg_pct,                 -- default 10.00
  utilidad_pct,           -- default 8.00
  it_pct,                 -- default 3.09
  -- SICOES
  cuce,                   -- nullable, identificador convocatoria
  area_m2,                -- nullable, para costo/m²
  created_at, updated_at

-- EDT
chapters
  id, project_id, parent_id, code, name, order_index

items
  id, chapter_id, code, codigo_sicoes (nullable),
  description, unit, quantity,
  apu_id, order_index,
  -- Especificación técnica (5-secciones)
  tech_descripcion, tech_mat_herram_equipo,
  tech_forma_ejecucion, tech_medicion, tech_forma_pago

-- APU
apus
  id, code, name, unit, is_global, project_id (null si global),
  -- precios calculados (cache)
  cached_unit_price, cached_updated_at

apu_materials   (apu_id, material_id, quantity, waste_pct)
apu_labor       (apu_id, labor_id, quantity, performance)
apu_equipment   (apu_id, equipment_id, quantity, performance)

-- CATÁLOGOS BASE
materials  (id, name, unit, base_price, category, project_id (null=global))
labor      (id, name, unit, base_wage, project_id)
equipment  (id, name, unit, hourly_rate, project_id,
            -- B-4 detail
            potencia, costo_basico_hora, costo_repuestos_hora,
            costo_combustible_hora, costo_otros_hora)

-- B-3 catálogo único proponente (snapshot al export)
insumos_catalog
  id, project_id, tipo ('material'|'labor'|'equipment'),
  description, unit, precio_unitario, source_id

-- REGIONAL
regional_factors
  city, performance_factor, labor_factor, material_factor

-- NORMA
norm_rules
  id, code, norm_reference, description,
  severity, condition_json, suggestion

-- CRONOGRAMA + B-5
schedule_entries
  id, project_id, chapter_id, start_day, duration_days

disbursement_schedule  -- B-5
  id, project_id, order_index, description (Anticipo/1er Desembolso/...),
  mes_o_semana, monto_pct
```

---

## 9. Data seed mínima requerida (sin cambios)

Ver `research/apus-seed.md` y `research/catalogo-base.md`.

---

## 10. Cronograma estimado (sin cambios estructurales)

Sigue siendo 6 semanas. Posible riesgo: B-2 export con fórmula encadenada + B-3 catálogo consistencia → +2-3 días en semana 4.

---

## 11. Validación pre-código

Estado al 2026-05-22:
- ✅ 4 DBCs SICOES reales descargados y procesados
- ✅ Formularios B-1 a B-5 mapeados
- ✅ Plantilla Especificaciones Técnicas 5-secciones confirmada
- ⏳ Lista 60-80 APUs seed — en producción (`research/apus-seed.md`)
- ⏳ 10 reglas normativas — en producción (`research/reglas-norma.md`)
- ⏳ Mockups HTML 5-7 pantallas — en producción (`mockups/`)
- ⏳ Reunión arquitecto piloto — pendiente
- ⏳ Identificar 3-5 constructoras validadoras — pendiente
- ⏳ Nombre comercial + dominio — pendiente (usar Sibbë-2 hasta entonces)

---

## 12-16. Sin cambios estructurales respecto v0.1

Demo plan, métricas validación, modelo negocio, riesgos, próximos pasos: ver MVP-ALCANCE.md v0.1.

---

**Fin del documento — v0.2**
