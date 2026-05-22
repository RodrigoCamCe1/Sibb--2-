# 10 reglas normativas — validador MVP

Reglas hardcoded del MVP, cruzan APU/proyecto contra norma boliviana clave.
Referencia exacta artículo. Pendiente validación arquitecto/ing estructural.

## Normas fuente

- **CBH-87** — Código Boliviano del Hormigón Armado (1987, vigente)
- **NB 1225001** — Diseño sismorresistente (basada en ASCE 7 / ACI 318)
- **NB 777** — Diseño y construcción instalaciones eléctricas interiores baja tensión
- **NB 55001** — Sistemas gestión seguridad y salud ocupacional
- **APNB 689001-1** — Instalaciones sanitarias interiores (referenciada NB-RIDAA)

## Severidades

- **CRÍTICA** — Bloquea export. Violación pone en riesgo legal/estructural.
- **ALTA** — Warning prominente. Posible descalificación SICOES o riesgo técnico significativo.
- **MEDIA** — Aviso visible. Cumplimiento recomendado.

---

## Regla 1 — Resistencia mínima H°A° columnas

| Campo | Valor |
|---|---|
| Código | NORM-001 |
| Norma | CBH-87 |
| Artículo | Art. 10.1.2 (resistencias mínimas) |
| Severidad | CRÍTICA |
| Condición | Ítem con descripción contiene "COLUMNA" + "H°A°" o "HORMIGÓN ARMADO" y `fc' < 210 kg/cm²` |
| Mensaje | "Resistencia hormigón en columnas debe ser fc' ≥ 210 kg/cm² (CBH-87 Art. 10.1.2)" |
| Sugerencia | "Cambiar especificación a fc'=210 o superior" |

## Regla 2 — Resistencia mínima H°A° zapatas/cimentación

| Campo | Valor |
|---|---|
| Código | NORM-002 |
| Norma | CBH-87 |
| Artículo | Art. 10.1.2 |
| Severidad | CRÍTICA |
| Condición | Descripción contiene "ZAPATA" o "CIMIENTO" + H°A° y `fc' < 210 kg/cm²` |
| Mensaje | "Resistencia H°A° en cimentación debe ser fc' ≥ 210 kg/cm²" |
| Sugerencia | "Especificar fc'=210 mínimo. Para suelos agresivos considerar fc'=250" |

## Regla 3 — Acero de refuerzo grado mínimo

| Campo | Valor |
|---|---|
| Código | NORM-003 |
| Norma | CBH-87 |
| Artículo | Art. 9.2 (tipos de acero) |
| Severidad | ALTA |
| Condición | Ítem "ACERO DE REFUERZO" con `fy < 4200 kg/cm²` |
| Mensaje | "Acero de refuerzo grado AH-42 (fy=4200) es estándar mínimo en BO" |
| Sugerencia | "Especificar fy=4200 (corrugado). Acero liso fy=2400 solo para estribos en estructuras secundarias" |

## Regla 4 — Cuantía mínima acero en losas

| Campo | Valor |
|---|---|
| Código | NORM-004 |
| Norma | CBH-87 |
| Artículo | Art. 11.4.4 (armaduras mínimas) |
| Severidad | ALTA |
| Condición | Ítem "LOSA" sin ítem hermano "ACERO DE REFUERZO" en mismo capítulo |
| Mensaje | "Losa de H°A° requiere ítem de acero asociado. Cuantía mínima 0.18% sección bruta" |
| Sugerencia | "Agregar ítem 'ACERO DE REFUERZO fy=4200' al capítulo de losas" |

## Regla 5 — Recubrimiento mínimo armaduras

| Campo | Valor |
|---|---|
| Código | NORM-005 |
| Norma | CBH-87 |
| Artículo | Art. 12.3 (recubrimientos) |
| Severidad | MEDIA |
| Condición | Si Especificación Técnica del ítem H°A° no menciona "recubrimiento" o lo especifica < 2cm (interior) / < 3cm (exterior) / < 5cm (contacto suelo) |
| Mensaje | "Recubrimiento armaduras: 2cm interior, 3cm exterior, 5cm contacto suelo (CBH-87 Art. 12.3)" |
| Sugerencia | "Agregar en Especificaciones Técnicas el recubrimiento según elemento" |

## Regla 6 — Plan SySO obligatorio en obras mayores

| Campo | Valor |
|---|---|
| Código | NORM-006 |
| Norma | NB 55001 + Ley 16998 (Seguridad e Higiene) |
| Artículo | Art. 23 Decreto Reglamentario |
| Severidad | ALTA |
| Condición | Costo total proyecto > Bs 1.000.000 y NO existe ítem con descripción que contenga "SEGURIDAD" + "SALUD" o "SySO" o "PLAN DE SEGURIDAD" |
| Mensaje | "Obras > Bs 1.000.000 requieren plan de Seguridad y Salud Ocupacional explícito" |
| Sugerencia | "Agregar ítem 'PLAN DE SEGURIDAD Y SALUD OCUPACIONAL' (GLB) al capítulo Varios" |

## Regla 7 — Diseño sísmico en edificios >2 plantas

| Campo | Valor |
|---|---|
| Código | NORM-007 |
| Norma | NB 1225001 |
| Artículo | Cap. 11 (análisis sísmico) |
| Severidad | CRÍTICA |
| Condición | Proyecto con > 2 plantas (campo `plantas` o detectado por presencia "LOSA" + "ESCALERA" en EDT) y costo > Bs 500.000 y SIN ítem de "CÁLCULO ESTRUCTURAL" o "ESTUDIO SÍSMICO" |
| Mensaje | "Edificios > 2 plantas requieren cálculo sísmico según NB 1225001" |
| Sugerencia | "Agregar ítem de cálculo estructural o adjuntar memoria sísmica al expediente" |

## Regla 8 — Tierra física obligatoria en eléctricas

| Campo | Valor |
|---|---|
| Código | NORM-008 |
| Norma | NB 777 |
| Artículo | Sección 6 (puesta a tierra) |
| Severidad | CRÍTICA |
| Condición | Proyecto tiene ítem(s) instalación eléctrica (capítulo 09 o similar) y NO tiene ítem con descripción que contenga "TIERRA FÍSICA" o "PUESTA A TIERRA" o "ATERRAMIENTO" |
| Mensaje | "Instalación eléctrica requiere puesta a tierra (NB 777 Sección 6)" |
| Sugerencia | "Agregar ítem 'SISTEMA DE PUESTA A TIERRA' (GLB o PZA) — incluye varilla, conductor, mejorador de suelo" |

## Regla 9 — Pendiente mínima desagües sanitarios

| Campo | Valor |
|---|---|
| Código | NORM-009 |
| Norma | NB-RIDAA / APNB 689 |
| Artículo | Tabla pendientes mínimas |
| Severidad | MEDIA |
| Condición | Ítem "TUBERÍA SANITARIA" presente y Especificaciones Técnicas no mencionan pendiente o pendiente < 1% (tuberías 4") o < 2% (tuberías 2") |
| Mensaje | "Pendiente mínima desagües: 2% para Ø ≤ 2", 1% para Ø ≥ 4"" |
| Sugerencia | "Agregar pendiente mínima en Especificaciones Técnicas del ítem" |

## Regla 10 — Tipo de cemento por elemento

| Campo | Valor |
|---|---|
| Código | NORM-010 |
| Norma | CBH-87 |
| Artículo | Art. 9.1 (cementos) + NB 011 |
| Severidad | MEDIA |
| Condición | Ítem H°A° en contacto con suelo (zapata/cimiento/muro contención) sin mención de cemento tipo IP-30 o resistente a sulfatos en Esp. Técnicas |
| Mensaje | "Elementos en contacto con suelo deberían usar cemento IP-30 o resistente a sulfatos" |
| Sugerencia | "Especificar cemento Portland IP-30 (puzolánico) o tipo MH/HS según agresividad del suelo" |

---

## Cobertura por capítulo del seed (75 APUs)

| Cap. | Reglas que ejercita |
|---|---|
| 03 Obra Gruesa | 1, 2, 3, 4, 5, 7, 10 |
| 04 Mampostería | (ninguna directa) |
| 05 Revestimientos | (ninguna directa) |
| 07 Carpintería | (ninguna directa) |
| 08 Sanitaria | 9 |
| 09 Eléctrica | 8 |
| 11 Varios | 6 |

→ 100% de reglas ejercitables con el corpus seed propuesto.

## Implementación BD

Cargar al seed inicial de `norm_rules`:

```sql
INSERT INTO norm_rules (code, norm_reference, severity, description, condition_json, suggestion)
VALUES
  ('NORM-001', 'CBH-87 Art. 10.1.2', 'CRITICAL',
   'Resistencia hormigón en columnas debe ser fc'' ≥ 210 kg/cm²',
   '{"item_contains": ["COLUMNA", "H°A°"], "fc_min": 210}',
   'Cambiar especificación a fc''=210 o superior'),
  -- ... 9 más
```

## Próximo paso

Validar con arquitecto / ing estructural:
1. Severidades correctas
2. Condiciones de detección bien planteadas (cómo parsear "fc'=210" del texto del ítem)
3. Falta alguna regla CRÍTICA común
4. Agregar artículos exactos donde puse referencia genérica
