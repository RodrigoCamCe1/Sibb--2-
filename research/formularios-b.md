# Formularios B SICOES — Spec exacto

Fuente: DBC ANPE 2022 genérico + DBC LP caso-4-muro (Sibbë-2/research/dbc-sources/).
Validado contra 4 casos reales (Aduana LP, CNS SC, GAM Potosí, Muro LP).

## Aplicabilidad por modalidad

| Form | ANPE | LP | Notas |
|---|:---:|:---:|---|
| B-1 | OBLIG | OBLIG | Único B en ANPE |
| B-2 | — | OBLIG | APU detallado por cada ítem |
| B-3 | — | OBLIG | Catálogo único insumos del proponente |
| B-4 | — | Condic. | "Cuando objeto/naturaleza lo requiera" — obra con equipo pesado |
| B-5 | — | OBLIG | Cronograma desembolsos |

Decisión MVP: implementar 5 formularios. Switch ANPE oculta B-2..B-5 en export. LP genera todos.

---

## B-1 — Presupuesto por Ítems y General de la Obra

### Encabezado
- Título grande centrado: "FORMULARIO B-1"
- Subtítulo: "PRESUPUESTO POR ÍTEMS Y GENERAL DE LA OBRA"
- Línea: "(En bolivianos)"
- Sub-encabezado dividido en dos bloques:
  - Izquierda: "Volúmenes de Obra requeridos por la entidad convocante (Información que debe ser registrada por la entidad convocante)"
  - Derecha: "Presupuesto (Costo propuesto por el proponente según los ítems de Volumen de Obra requeridos)"

### Tabla principal — 7 columnas
| # | Columna | Tipo | Fuente | Ancho sugerido (px) |
|---|---|---|---|---|
| 1 | Ítem | int | Auto | 50 |
| 2 | Descripción | text | Entidad (volumen obra) | 320 |
| 3 | Unidad | text (UPPER) | Entidad | 70 |
| 4 | Cantidad | decimal (2) | Entidad | 90 |
| 5 | Precio Unitario (Numeral) | decimal (2) | Proponente | 110 |
| 6 | Precio Unitario (Literal) | text | Proponente (autogenerable desde col 5) | 240 |
| 7 | Precio Total (Numeral) | decimal (2) | = col4 × col5 | 130 |

### Fila totalizadora
- Última fila: spanea col 1-6 con texto "PRECIO TOTAL (Numeral)" → valor en col 7
- Fila siguiente: spanea col 1-6 con texto "PRECIO TOTAL (Literal)" → valor literal del total (autogenerable)

### Formato Excel (exceljs)
- Font: Arial 10 default, Arial 11 bold encabezados
- Bordes: all-sides thin negro
- Alignment: ítem/cantidad/precios center-right, descripción left
- Number format: `#,##0.00`
- Merges: A1:G1 (título), A2:G2 (subtítulo), A3:G3 (moneda)

---

## B-2 — Análisis de Precios Unitarios

**Repetición**: una hoja Excel por cada ítem del B-1. Nombre hoja: `B2-Item-{N}` (max 31 char Excel).

### Datos generales (bloque superior)
| Campo | Source |
|---|---|
| Proyecto | `projects.name` |
| Actividad | `items.description` |
| Cantidad | `items.quantity` |
| Unidad | `items.unit` |
| Moneda | `projects.currency` (default BOB) |

### Sección 1 — MATERIALES
Tabla: `N° | DESCRIPCIÓN | UNIDAD | CANTIDAD | PRECIO PRODUCTIVO | COSTO TOTAL`
- COSTO TOTAL = CANTIDAD × PRECIO PRODUCTIVO
- Fila final: **TOTAL MATERIALES** = SUM(COSTO TOTAL)

### Sección 2 — MANO DE OBRA
Tabla idéntica.
- SUBTOTAL MANO DE OBRA = SUM(COSTO TOTAL)
- **CARGAS SOCIALES** = `cargas_sociales_pct` × SUBTOTAL — % típico BO: 55-71.18% (depende régimen, validar con arquitecto)
- **IMPUESTOS IVA MANO DE OBRA** = `iva_mano_pct` × (SUBTOTAL + CARGAS SOCIALES) — % típico: 14.94% (IVA 13% sobre 87% del precio)
- **TOTAL MANO DE OBRA** = SUBTOTAL + CARGAS + IVA

### Sección 3 — EQUIPO, MAQUINARIA Y HERRAMIENTAS
Tabla idéntica (cantidad expresada en horas-equipo).
- Subtotal EQUIPO = SUM(COSTO TOTAL)
- **HERRAMIENTAS** = `herramientas_pct` × TOTAL MANO DE OBRA — % típico: 5%
- **TOTAL EQUIPO + MAQUINARIA + HERRAMIENTAS** = Subtotal + HERRAMIENTAS

### Sección 4 — GASTOS GENERALES Y ADMINISTRATIVOS
- **GG** = `gg_pct` × (Sección 1 + 2 + 3) — % típico: 8-12%

### Sección 5 — UTILIDAD
- **UTILIDAD** = `utilidad_pct` × (1 + 2 + 3 + 4) — % típico: 7-10%

### Sección 6 — IMPUESTOS IT
- **IT** = `it_pct` × (1 + 2 + 3 + 4 + 5) — % fijo: 3.09% (IT 3% / 0.97 para reposición)

### Totales
- **TOTAL PRECIO UNITARIO** = SUM(1..6)
- **TOTAL PRECIO UNITARIO ADOPTADO** = ROUND(TOTAL, 2)

### Nota footer
> "El Proponente declara que la información ha sido llenada de acuerdo con las especificaciones técnicas, aplicando las leyes sociales y tributarias vigentes, y es consistente con el Formulario B-3."

---

## B-3 — Precios Unitarios Elementales

**Catálogo único del proponente**. Lista todos los insumos referenciados en cualquier B-2.
Una sola hoja Excel con 3 sub-tablas.

### Estructura
3 tablas idénticas (Materiales / Mano de Obra / Maquinaria-Equipo), cada una:
| Col | Campo |
|---|---|
| 1 | N° |
| 2 | DESCRIPCIÓN |
| 3 | UNIDAD |
| 4 | PRECIO UNITARIO |

### Reglas
- PRECIO UNITARIO sin recargos (sin GG/utilidad/IT/IVA)
- Cada ítem aparece **una sola vez** en B-3 — mismo precio referenciado por todos los B-2 que lo usen
- Consistencia: precio de un insumo en B-2 debe coincidir con su precio en B-3

### Footer
> "La información registrada asegura que lo señalado en cada rubro como Costo Directo (Sin que esté afectado por alguna incidencia), corresponde a los Análisis de Precios Unitarios desarrollados en los Formularios B-2."

---

## B-4 — Costo de Trabajo de los Equipos (cuando aplique)

Solo si la obra usa equipo pesado (excavadoras, motoniveladoras, mixers, etc.).

### Tabla
| Col | Campo | Tipo |
|---|---|---|
| 1 | N° | int |
| 2 | Descripción | text |
| 3 | Potencia | text (HP/kW) |
| 4 | Básico (Bs/Unidad) | decimal |
| 5 | Reparación Repuestos (Bs/Unidad) | decimal |
| 6 | Combustible Lubricantes (Bs/Unidad) | decimal |
| 7 | Otros (Bs/Unidad) | decimal |
| 8 | TOTAL (Bs/hora) | = SUM(4..7) |

### Reglas
- "Unidad" implícita: hora-equipo
- TOTAL debe coincidir con PRECIO PRODUCTIVO del mismo equipo en B-2

---

## B-5 — Cronograma de Desembolsos

### Tabla
| Col | Campo |
|---|---|
| 1 | N° |
| 2 | Descripción (Anticipo / Primer Desembolso / Segundo Desembolso / ...) |
| 3 | Mes/Semana (referencia temporal) |
| 4 | Total (%) — del monto total del contrato |

### Reglas
- Fila 1 obligatoria: "Anticipo" (típicamente 20%)
- SUM(col 4) = 100%
- Escala temporal: semanas o meses, define proponente (a menos que entidad imponga)

---

## Anexo no-form — Especificaciones Técnicas por ítem

No es Formulario B oficial pero **toda obra LP lo exige como adjunto**. ANPE lo incluye dentro del DBC.

### Plantilla 5-secciones por ítem (confirmada en 3 DBCs ANPE)

```
ITEM N: <NOMBRE EN MAYÚSCULAS>
UNIDAD: <M2 / ML / M3 / GLB / PZA / PTO / KG>

1. DESCRIPCIÓN
   <párrafo: alcance del ítem, contexto, qué cubre>

2. MATERIALES, HERRAMIENTAS Y EQUIPOS
   <párrafo intro estándar sobre obligación del Contratista>
   - <bullet material 1>
   - <bullet material 2>
   - ...

3. FORMA DE EJECUCIÓN
   <párrafos procedimiento paso a paso>
   Sub-bloques opcionales:
   - Seguridad y Preparación: EPP, protecciones
   - Limpieza y Gestión de Escombros
   - Andamios

4. MEDICIÓN
   <una oración: "será medido en <UNIDAD>, autorizados por el supervisor">

5. FORMA DE PAGO
   <párrafo estándar: precio incluye material + mano + herramientas + equipo>
   "El pago se realizará por el volumen de obra realmente ejecutado en sitio."
```

### Implicación MVP
- Cada APU/ítem en BD necesita campo `tech_spec_*` (5 secciones)
- Generador export "Especificaciones Técnicas.docx" usa pandoc o `docx` lib
- Plantillas de boilerplate para sección 2 (intro estándar) y sección 5 (pago) — auto-llenar

---

## Constantes verificadas en DBCs

| Concepto | Valor |
|---|---|
| Cargas sociales BO | 55%-71.18% del subtotal MO (variable según régimen) |
| IVA mano obra | 13% sobre (subtotal MO + CS), efectivo ~14.94% |
| Herramientas | 5% del total mano de obra |
| GG típico | 8-12% del costo directo |
| Utilidad típica | 7-10% sobre (CD + GG) |
| IT efectivo | 3.09% (3% / 0.97) |
| Garantía cumplimiento | 7% del monto contrato |
| Garantía seriedad propuesta | 1% precio referencial (solo si > Bs 200.000) |
| Anticipo típico | 20% del contrato |

## Ítems con código catálogo SICOES (muestra)

Códigos públicos detectados en F-100 Aduana (rango 823xxx — catálogo activo 2026):
ver `apus-seed.md` para corpus completo.
