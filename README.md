# Sibbë / Obras — MVP

SaaS de presupuestos de obra con APU, validación normativa BO (CBH-87, NB 1225001, NB 777) y export SICOES (Formularios B-1 a B-5) en un click.

**Stack:** Next.js 16 (App Router, static export) + TypeScript + Tailwind v4 + shadcn/ui + Supabase puro + exceljs + docx + Recharts.

**Deploy:** GitHub Pages (estático) + Supabase backend.

## Demo

Producción: `https://rodrigocamce1.github.io/Sibb--2-/`

## Setup local

### 1. Variables de entorno

```bash
cp .env.local.example .env.local
```

Editá `.env.local` con tus credenciales de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BASE_PATH=
```

### 2. Crear proyecto Supabase

1. `https://supabase.com` → New project
2. SQL Editor → ejecutar `supabase/migrations/0001_initial_schema.sql`
3. SQL Editor → ejecutar `supabase/migrations/0002_seed_norms_and_catalog.sql`
4. Authentication → Providers → habilitar Email (sin confirmation para dev)
5. Project settings → API → copiar URL y anon key a `.env.local`

### 3. Instalar y correr

```bash
npm install
npm run dev
```

App en `http://localhost:3000`.

## Build de producción

```bash
npm run build
```

Genera carpeta `out/` con HTML estático listo para subir a cualquier static host.

## Deploy a GitHub Pages

Configurado vía GitHub Actions (`.github/workflows/deploy.yml`).

### Configuración inicial del repo

1. Settings → Pages → Source: **GitHub Actions**
2. Settings → Secrets and variables → Actions → New repository secret:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Push a `main` → workflow despliega automáticamente

El workflow corre `npm run build` con `NEXT_PUBLIC_BASE_PATH=/Sibb--2-` y publica `out/` en Pages.

## Estructura

```
Sibbë-2/
├── src/
│   ├── app/                  # Next App Router
│   │   ├── (auth)/           # Login, signup públicos
│   │   ├── (app)/            # Área autenticada
│   │   │   ├── layout.tsx    # Sidebar + auth guard
│   │   │   └── proyectos/
│   │   │       ├── page.tsx           # Listado
│   │   │       ├── detalle/page.tsx   # EDT y dashboard
│   │   │       ├── apu/page.tsx       # Editor B-2
│   │   │       ├── normas/page.tsx    # Alertas norma
│   │   │       ├── exportar/page.tsx  # Generar ZIP SICOES
│   │   │       └── cronograma/page.tsx # Curva S + B-5
│   │   ├── layout.tsx        # Root
│   │   └── page.tsx          # Landing pública
│   ├── components/
│   │   ├── ui/               # shadcn/ui (button, dialog, table, ...)
│   │   ├── sidebar.tsx
│   │   ├── auth-guard.tsx
│   │   └── new-project-dialog.tsx
│   ├── lib/
│   │   ├── supabase/client.ts
│   │   ├── utils.ts          # cn, formatBOB, numberToWordsBOB
│   │   ├── calc-apu.ts       # Fórmula B-2 encadenada
│   │   ├── norm-validator.ts # 10 reglas CBH-87/NB
│   │   └── export/
│   │       ├── b1.ts         # Excel Formulario B-1
│   │       ├── b2.ts         # Excel B-2 (1 hoja/ítem)
│   │       ├── b3.ts         # Excel B-3 precios elementales
│   │       ├── b5.ts         # Excel B-5 cronograma
│   │       ├── tech-spec.ts  # docx Especificaciones Técnicas
│   │       └── bundle.ts     # ZIP final con JSZip
│   └── types/database.ts
├── supabase/migrations/
│   ├── 0001_initial_schema.sql
│   └── 0002_seed_norms_and_catalog.sql
├── research/                 # Documentación DBC SICOES + APUs + normas
├── mockups/                  # HTML mockups originales (referencia)
├── docs/                     # MVP-ALCANCE-v0.2 y otros
├── .github/workflows/deploy.yml
├── next.config.ts            # output: 'export' para Pages
└── package.json
```

## Hallazgos pre-código

Antes de codear se procesaron 4 DBCs reales SICOES (ver `research/dbc-sources/`). Hallazgos clave:

| Hallazgo | Impacto |
|---|---|
| **ANPE solo exige B-1** | Switch modalidad ANPE vs LP — UI y export distintos |
| **LP exige B-1 + B-2 + B-3 + B-5** (+ B-4 si tiene equipo) | 5 generadores Excel distintos |
| **B-2 tiene 6 secciones canónicas** con fórmula encadenada (CD → GG → Utilidad → IT) | `calculateAPU()` en `lib/calc-apu.ts` |
| **Catálogo SICOES código 823xxx** detectado en F-100 Aduana | Campo `codigo_sicoes` opcional en items/apus |
| **Especificaciones Técnicas plantilla 5-secciones** | docx generator + 5 campos en BD |

## Limitaciones MVP

- Static export → no SSR, no API routes. Auth y export 100% client-side.
- B-4 (Costo Trabajo Equipos) marcado como opcional/condicional — completar v0.3.
- PDF export pendiente (cliente quiere `react-pdf` o similar).
- Subida foto/plano e IA generadora APU explícitamente OUT MVP.

## Roadmap

- [ ] v0.2: PDF presupuesto profesional (`react-pdf`)
- [ ] v0.2: Edición inline ítems EDT con TanStack Table
- [ ] v0.2: Buscar/agregar ítem desde catálogo APU global
- [ ] v0.3: B-4 completo (costo hora-equipo desglosado)
- [ ] v0.3: Más reglas normativas (sanitarias, eléctricas detalle)
- [ ] v1.1: Avance físico real + curva S real vs planeada
- [ ] v1.1: Más ciudades (Tarija, Sucre, Oruro, Potosí, Beni, Pando)

## Licencia

Privado. © 2026 Sibbë / Rodrigo Camacho Cerruto.
