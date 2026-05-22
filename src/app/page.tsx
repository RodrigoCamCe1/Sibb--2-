'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle2, FileSpreadsheet, MapPin, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    try {
      const sb = getSupabase();
      sb.auth.getSession().then(({ data }) => {
        setIsAuthed(!!data.session);
        setLoaded(true);
      });
    } catch {
      setLoaded(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <div>
              <div className="font-semibold text-slate-900 leading-none">Sibbë</div>
              <div className="text-[10px] text-slate-500 leading-none mt-0.5">/ Obras</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loaded && isAuthed ? (
              <Button asChild>
                <Link href="/proyectos">Mis proyectos</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Empezar gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <Badge variant="info" className="mb-6">
          MVP en desarrollo — Mayo 2026
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.1]">
          Presupuestos de obra con APU,{' '}
          <span className="text-slate-500">hechos para Bolivia.</span>
        </h1>
        <p className="text-lg text-slate-600 mt-6 max-w-2xl mx-auto">
          Exporta formularios SICOES (B-1 a B-5) en un click. Valida cumplimiento de CBH-87 y NB 1225001
          automáticamente. Ajuste regional LP / SC / CB.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button size="lg" asChild>
            <Link href="/signup">
              Probar gratis <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#diferenciadores">Cómo funciona</a>
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Demo en vivo • Sin tarjeta • Modo sandbox con data de ejemplo
        </p>
      </section>

      {/* Diferenciadores */}
      <section id="diferenciadores" className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <div className="w-10 h-10 bg-amber-100 rounded-md flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5 text-amber-700" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Ajuste regional</h3>
            <p className="text-sm text-slate-600">
              Cambia ciudad y recalcula rendimientos + precios de mano obra y materiales para La Paz,
              Santa Cruz y Cochabamba.
            </p>
          </div>
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <div className="w-10 h-10 bg-emerald-100 rounded-md flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Validador normativo</h3>
            <p className="text-sm text-slate-600">
              10 reglas activas contra CBH-87, NB 1225001 y NB 777. Te avisa antes que el fiscalizador
              te lo rechace.
            </p>
          </div>
          <div className="p-6 bg-white border border-slate-200 rounded-lg">
            <div className="w-10 h-10 bg-sky-100 rounded-md flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5 text-sky-700" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Export SICOES en 1 click</h3>
            <p className="text-sm text-slate-600">
              Formularios B-1 a B-5 oficiales, Especificaciones Técnicas y PDF. ANPE o Licitación
              Pública, lo que corresponda.
            </p>
          </div>
        </div>
      </section>

      {/* Comparativa */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-2">
          Lo que Excel y la competencia no hacen
        </h2>
        <p className="text-slate-600 text-center mb-10">
          Comparado con Insucons, Apucons, SURI Costos y plantillas Excel.
        </p>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 border-b border-slate-200 px-4 py-2">
            <div className="col-span-1">Feature</div>
            <div className="text-center">Sibbë</div>
            <div className="text-center">Competencia BO</div>
            <div className="text-center">Excel</div>
          </div>
          {[
            ['APU con norma BO', true, false, false],
            ['Ajuste regional automático', true, false, false],
            ['Export B-1 a B-5 SICOES', true, 'partial', false],
            ['Cloud + colaboración', true, 'partial', false],
            ['Cronograma + Curva S', true, 'partial', 'partial'],
          ].map(([label, sibbe, comp, excel]) => (
            <div key={label as string} className="grid grid-cols-4 text-sm border-b border-slate-100 last:border-0 px-4 py-3">
              <div className="text-slate-900">{label}</div>
              <CellMark val={sibbe} />
              <CellMark val={comp} />
              <CellMark val={excel} />
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-slate-500 flex items-center justify-between">
          <div>© 2026 Sibbë • La Paz, Bolivia</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-900">Contacto</a>
            <a href="#" className="hover:text-slate-900">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CellMark({ val }: { val: boolean | string }) {
  if (val === true) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-5 h-5 inline-block text-emerald-600" />
      </div>
    );
  }
  if (val === 'partial') {
    return <div className="text-center text-amber-600 text-sm font-medium">~</div>;
  }
  return <div className="text-center text-slate-300 text-lg">—</div>;
}
