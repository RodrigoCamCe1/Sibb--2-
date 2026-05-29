'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBOB, formatNumber } from '@/lib/utils';
import { validateProject } from '@/lib/norm-validator';
import {
  loadEDT, createChapter, updateChapter, deleteChapter,
  createItem, updateItem, deleteItem,
  type ItemWithPrice, type ItemInput,
} from '@/lib/edt-store';
import type { Project, Chapter } from '@/types/database';
import { ChevronRight, Download, Copy, Loader2, MapPin, Building2, ShieldCheck, AlertCircle, Plus, Pencil, Trash2 } from 'lucide-react';

function DetallePageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [items, setItems] = useState<ItemWithPrice[]>([]);

  // diálogos
  const [chapterDialog, setChapterDialog] = useState<{ open: boolean; editing: Chapter | null }>({ open: false, editing: null });
  const [itemDialog, setItemDialog] = useState<{ open: boolean; chapterId: string; editing: ItemWithPrice | null }>({ open: false, chapterId: '', editing: null });

  useEffect(() => {
    if (!projectId) return;
    const sb = getSupabase();
    (async () => {
      const { data: proj } = await sb.from('projects').select('*').eq('id', projectId).maybeSingle();
      setProject((proj as Project) ?? null);
      if (proj) {
        const edt = await loadEDT(projectId);
        setChapters(edt.chapters);
        setItems(edt.items);
      }
      setLoading(false);
    })();
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="p-8 text-center text-slate-500">
        Falta parámetro <code className="bg-slate-100 px-1 rounded">id</code>. <Link href="/proyectos" className="underline">Volver a proyectos</Link>
      </div>
    );
  }
  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 inline-block" /></div>;
  if (!project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

  const itemsByChapter = new Map<string, ItemWithPrice[]>();
  for (const item of items) {
    const arr = itemsByChapter.get(item.chapter_id) ?? [];
    arr.push(item);
    itemsByChapter.set(item.chapter_id, arr);
  }

  const itemTotal = (it: ItemWithPrice) => it.quantity * it.unit_price;
  const chapterTotal = (chId: string) => (itemsByChapter.get(chId) ?? []).reduce((a, it) => a + itemTotal(it), 0);
  const totalProject = items.reduce((acc, it) => acc + itemTotal(it), 0);

  const alerts = validateProject({ project, items, total_cost: totalProject });
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  // ---- handlers CRUD ----
  async function handleSaveChapter(code: string, name: string) {
    if (chapterDialog.editing) {
      await updateChapter(chapterDialog.editing.id, { code, name });
      setChapters((cs) => cs.map((c) => (c.id === chapterDialog.editing!.id ? { ...c, code, name } : c)));
    } else {
      const order = chapters.length ? Math.max(...chapters.map((c) => c.order_index)) + 1 : 0;
      const created = await createChapter(projectId!, code, name, order);
      setChapters((cs) => [...cs, created]);
    }
    setChapterDialog({ open: false, editing: null });
  }

  async function handleDeleteChapter(c: Chapter) {
    const n = (itemsByChapter.get(c.id) ?? []).length;
    if (!confirm(`Eliminar capítulo "${c.name}"${n ? ` y sus ${n} ítem(s)` : ''}? No se puede deshacer.`)) return;
    await deleteChapter(c.id);
    setChapters((cs) => cs.filter((x) => x.id !== c.id));
    setItems((its) => its.filter((x) => x.chapter_id !== c.id));
  }

  async function handleSaveItem(input: ItemInput) {
    if (itemDialog.editing) {
      await updateItem(itemDialog.editing.id, input);
      setItems((its) => its.map((x) => (x.id === itemDialog.editing!.id ? { ...x, ...input } : x)));
    } else {
      const chItems = itemsByChapter.get(itemDialog.chapterId) ?? [];
      const order = chItems.length ? Math.max(...chItems.map((i) => i.order_index)) + 1 : 0;
      const created = await createItem(itemDialog.chapterId, input, order);
      setItems((its) => [...its, created]);
    }
    setItemDialog({ open: false, chapterId: '', editing: null });
  }

  async function handleDeleteItem(it: ItemWithPrice) {
    if (!confirm(`Eliminar ítem "${it.description}"?`)) return;
    await deleteItem(it.id);
    setItems((its) => its.filter((x) => x.id !== it.id));
  }

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="px-6 md:px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
          <Link href="/proyectos" className="hover:text-slate-900">Proyectos</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">{project.name}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.city}</span>
              <span>•</span>
              <Badge variant={project.modalidad === 'LP' ? 'success' : 'info'}>{project.modalidad}</Badge>
              {project.owner_client && (<><span>•</span><span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{project.owner_client}</span></>)}
              {project.cuce && (<><span>•</span><span className="font-mono text-xs">CUCE {project.cuce}</span></>)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Copy className="w-3.5 h-3.5" /> Duplicar</Button>
            <Button size="sm" asChild>
              <Link href={`/proyectos/exportar?id=${project.id}`}>
                <Download className="w-3.5 h-3.5" />
                Exportar SICOES
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <KPI label="Costo total" value={formatBOB(totalProject)} />
          <KPI label="Costo / m²" value={project.area_m2 ? formatBOB(totalProject / project.area_m2) : '—'} />
          <KPI label="Ítems" value={`${items.length}`} />
          {alerts.length > 0 ? (
            <Link href={`/proyectos/normas?id=${project.id}`}>
              <div className="bg-amber-50 hover:bg-amber-100 rounded-lg p-3 cursor-pointer transition-colors">
                <div className="text-xs text-amber-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Alertas norma</div>
                <div className="text-lg font-bold text-amber-900">
                  {alerts.length} {criticalCount > 0 && <span className="text-xs font-normal">• {criticalCount} crítica{criticalCount > 1 ? 's' : ''}</span>}
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-emerald-50 rounded-lg p-3">
              <div className="text-xs text-emerald-700 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Norma</div>
              <div className="text-lg font-bold text-emerald-900">Cumple</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 md:px-8 py-6 bg-slate-50 max-w-7xl mx-auto">
        <Tabs defaultValue="edt">
          <TabsList>
            <TabsTrigger value="edt">EDT y Ítems</TabsTrigger>
            <TabsTrigger value="indirectos">Indirectos</TabsTrigger>
            <TabsTrigger value="regional">Ajuste regional</TabsTrigger>
          </TabsList>

          <TabsContent value="edt">
            <EDTTable
              project={project}
              chapters={chapters}
              itemsByChapter={itemsByChapter}
              chapterTotal={chapterTotal}
              itemTotal={itemTotal}
              totalProject={totalProject}
              alertsByItem={new Map(alerts.filter((a) => a.item_id).map((a) => [a.item_id!, a]))}
              onAddChapter={() => setChapterDialog({ open: true, editing: null })}
              onEditChapter={(c) => setChapterDialog({ open: true, editing: c })}
              onDeleteChapter={handleDeleteChapter}
              onAddItem={(chId) => setItemDialog({ open: true, chapterId: chId, editing: null })}
              onEditItem={(it) => setItemDialog({ open: true, chapterId: it.chapter_id, editing: it })}
              onDeleteItem={handleDeleteItem}
            />
          </TabsContent>

          <TabsContent value="indirectos">
            <IndirectosPanel project={project} onChange={setProject} />
          </TabsContent>

          <TabsContent value="regional">
            <RegionalPanel project={project} />
          </TabsContent>
        </Tabs>
      </div>

      <ChapterDialog
        open={chapterDialog.open}
        editing={chapterDialog.editing}
        onClose={() => setChapterDialog({ open: false, editing: null })}
        onSave={handleSaveChapter}
      />
      <ItemDialog
        open={itemDialog.open}
        editing={itemDialog.editing}
        onClose={() => setItemDialog({ open: false, chapterId: '', editing: null })}
        onSave={handleSaveItem}
      />
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function EDTTable({
  project, chapters, itemsByChapter, chapterTotal, itemTotal, totalProject, alertsByItem,
  onAddChapter, onEditChapter, onDeleteChapter, onAddItem, onEditItem, onDeleteItem,
}: {
  project: Project;
  chapters: Chapter[];
  itemsByChapter: Map<string, ItemWithPrice[]>;
  chapterTotal: (chId: string) => number;
  itemTotal: (it: ItemWithPrice) => number;
  totalProject: number;
  alertsByItem: Map<string, { severity: string; title: string }>;
  onAddChapter: () => void;
  onEditChapter: (c: Chapter) => void;
  onDeleteChapter: (c: Chapter) => void;
  onAddItem: (chapterId: string) => void;
  onEditItem: (it: ItemWithPrice) => void;
  onDeleteItem: (it: ItemWithPrice) => void;
}) {
  if (chapters.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-dashed border-slate-300 p-12 text-center">
        <h3 className="font-semibold text-slate-900 mb-1">EDT vacío</h3>
        <p className="text-sm text-slate-500 mb-4">Empieza creando capítulos (preliminares, obra gruesa, etc.).</p>
        <Button onClick={onAddChapter}><Plus className="w-4 h-4" /> Crear primer capítulo</Button>
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Cód.</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="w-20 text-center">Unidad</TableHead>
            <TableHead className="w-24 text-right">Cantidad</TableHead>
            <TableHead className="w-28 text-right">P. Unit.</TableHead>
            <TableHead className="w-32 text-right">Total Bs</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chapters.map((c) => {
            const its = itemsByChapter.get(c.id) ?? [];
            return (
              <Fragment key={c.id}>
                <TableRow className="bg-slate-100 hover:bg-slate-100 group">
                  <TableCell className="font-semibold">{c.code}</TableCell>
                  <TableCell colSpan={4} className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBOB(chapterTotal(c.id))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconBtn title="Agregar ítem" onClick={() => onAddItem(c.id)}><Plus className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Editar capítulo" onClick={() => onEditChapter(c)}><Pencil className="w-3.5 h-3.5" /></IconBtn>
                      <IconBtn title="Eliminar capítulo" danger onClick={() => onDeleteChapter(c)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                    </div>
                  </TableCell>
                </TableRow>
                {its.map((item) => {
                  const alert = alertsByItem.get(item.id);
                  const noPrice = item.unit_price === 0;
                  return (
                    <TableRow key={item.id} className={`group ${alert?.severity === 'CRITICAL' ? 'bg-red-50/40' : alert ? 'bg-amber-50/40' : ''}`}>
                      <TableCell className="text-slate-500">{item.code ?? '—'}</TableCell>
                      <TableCell>
                        <Link href={`/proyectos/apu?id=${project.id}&item=${item.id}`} className="hover:underline">
                          {item.description}
                        </Link>
                        {alert && <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'warning'} className="ml-2 text-[10px]">{alert.severity === 'CRITICAL' ? 'CRÍTICA' : 'ALERTA'}</Badge>}
                      </TableCell>
                      <TableCell className="text-center">{item.unit}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                      <TableCell className="text-right" title={noPrice ? 'Sin APU definido — abrí el ítem para cargar precio' : ''}>
                        {noPrice ? <span className="text-amber-600">sin APU</span> : formatNumber(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">{noPrice ? '—' : formatNumber(itemTotal(item))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconBtn title="Editar ítem" onClick={() => onEditItem(item)}><Pencil className="w-3.5 h-3.5" /></IconBtn>
                          <IconBtn title="Eliminar ítem" danger onClick={() => onDeleteItem(item)}><Trash2 className="w-3.5 h-3.5" /></IconBtn>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell colSpan={7} className="py-1.5">
                    <button onClick={() => onAddItem(c.id)} className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 italic ml-2">
                      <Plus className="w-3 h-3" /> Agregar ítem a {c.code}
                    </button>
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-slate-900 hover:bg-slate-900">
            <TableCell colSpan={5} className="text-right text-white font-bold">TOTAL</TableCell>
            <TableCell className="text-right text-white font-bold">{formatBOB(totalProject)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onAddChapter}><Plus className="w-3.5 h-3.5" /> Agregar capítulo</Button>
        <span className="text-xs text-slate-500">{chapters.length} {chapters.length === 1 ? 'capítulo' : 'capítulos'}</span>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick} className={`p-1 rounded hover:bg-slate-200 ${danger ? 'text-slate-400 hover:text-red-600' : 'text-slate-500 hover:text-slate-900'}`}>
      {children}
    </button>
  );
}

function ChapterDialog({ open, editing, onClose, onSave }: { open: boolean; editing: Chapter | null; onClose: () => void; onSave: (code: string, name: string) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? '');
      setName(editing?.name ?? '');
      setError(null);
    }
  }, [open, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await onSave(code.trim(), name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar capítulo' : 'Nuevo capítulo'}</DialogTitle>
          <DialogDescription>Agrupa ítems del presupuesto (ej: 01 Preliminares, 03 Obra gruesa).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="ch-code">Código</Label>
              <Input id="ch-code" placeholder="01" value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-name">Nombre</Label>
              <Input id="ch-name" placeholder="Trabajos preliminares" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || !code.trim() || !name.trim()}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({ open, editing, onClose, onSave }: { open: boolean; editing: ItemWithPrice | null; onClose: () => void; onSave: (input: ItemInput) => Promise<void> }) {
  const [code, setCode] = useState('');
  const [sicoes, setSicoes] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCode(editing?.code ?? '');
      setSicoes(editing?.codigo_sicoes ?? '');
      setDescription(editing?.description ?? '');
      setUnit(editing?.unit ?? '');
      setQuantity(editing?.quantity ?? 0);
      setError(null);
    }
  }, [open, editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await onSave({
        code: code.trim() || null,
        codigo_sicoes: sicoes.trim() || null,
        description: description.trim(),
        unit: unit.trim(),
        quantity,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar ítem' : 'Nuevo ítem'}</DialogTitle>
          <DialogDescription>El precio unitario se define cargando el APU del ítem.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="it-desc">Descripción</Label>
            <Input id="it-desc" placeholder="Ej: Zapata aislada H°A° fc'=210" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="it-code">Código</Label>
              <Input id="it-code" placeholder="03.03" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-unit">Unidad</Label>
              <Input id="it-unit" placeholder="M3" value={unit} onChange={(e) => setUnit(e.target.value.toUpperCase())} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="it-qty">Cantidad</Label>
              <Input id="it-qty" type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-sicoes">Código SICOES (opcional)</Label>
            <Input id="it-sicoes" placeholder="823xxx" value={sicoes} onChange={(e) => setSicoes(e.target.value)} />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || !description.trim() || !unit.trim()}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IndirectosPanel({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const [saving, setSaving] = useState(false);

  async function update<K extends keyof Project>(key: K, value: Project[K]) {
    const next = { ...project, [key]: value };
    onChange(next);
    setSaving(true);
    const sb = getSupabase();
    await sb.from('projects').update({ [key]: value } as Partial<Project>).eq('id', project.id);
    setSaving(false);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 max-w-2xl">
      <div>
        <h3 className="font-semibold text-slate-900">Indirectos del proyecto</h3>
        <p className="text-xs text-slate-500 mt-0.5">Porcentajes aplicados a todos los APUs (Formulario B-2). Al cambiarlos, reabrí y guardá cada APU para refrescar su precio cacheado.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <NumField label="Cargas sociales %" value={project.cargas_sociales_pct} onChange={(v) => update('cargas_sociales_pct', v)} hint="Default BO: 71.18%" />
        <NumField label="IVA mano de obra %" value={project.iva_mano_pct} onChange={(v) => update('iva_mano_pct', v)} hint="13% sobre 87% efectivo = 14.94%" />
        <NumField label="Herramientas %" value={project.herramientas_pct} onChange={(v) => update('herramientas_pct', v)} hint="Sobre Total Mano de Obra. Default 5%" />
        <NumField label="Gastos generales %" value={project.gg_pct} onChange={(v) => update('gg_pct', v)} hint="Sobre costo directo. Típico 8-12%" />
        <NumField label="Utilidad %" value={project.utilidad_pct} onChange={(v) => update('utilidad_pct', v)} hint="Sobre CD+GG. Típico 7-10%" />
        <NumField label="IT %" value={project.it_pct} onChange={(v) => update('it_pct', v)} hint="Impuesto Transacciones efectivo 3.09%" />
      </div>
      {saving && <p className="text-xs text-slate-500"><Loader2 className="w-3 h-3 inline-block animate-spin" /> Guardando...</p>}
    </div>
  );
}

function NumField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      <Input type="number" step="0.01" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function RegionalPanel({ project }: { project: Project }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 max-w-xl">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">Ajuste regional</h3>
        <p className="text-xs text-slate-500 mt-0.5">Factores aplicados al cargar precios de catálogo en los APUs.</p>
      </div>
      <div className="space-y-2">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
          <div className="text-sm font-semibold text-amber-900">Ciudad actual: {project.city}</div>
          <p className="text-xs text-amber-800 mt-0.5">
            El factor de material y mano de obra se aplica al precio de catálogo dentro de cada APU.
          </p>
        </div>
        <p className="text-xs text-slate-500">Configuración de factores: módulo en desarrollo.</p>
      </div>
    </div>
  );
}

export default function DetallePage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <DetallePageInner />
    </Suspense>
  );
}
