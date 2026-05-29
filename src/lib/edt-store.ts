// Capa de acceso a datos del EDT: capítulos + ítems con precio (cached del APU).
// El precio unitario del ítem = apus.cached_unit_price del APU enlazado (ya
// incluye indirectos + factor regional al momento de guardar el APU).

import { getSupabase } from '@/lib/supabase/client';
import type { Chapter, Item } from '@/types/database';

export type ItemWithPrice = Item & { unit_price: number };

interface ItemJoinRow extends Item {
  apus?: { cached_unit_price: number | null } | { cached_unit_price: number | null }[] | null;
}

function priceOf(row: ItemJoinRow): number {
  const a = Array.isArray(row.apus) ? row.apus[0] : row.apus;
  return Number(a?.cached_unit_price ?? 0);
}

export async function loadEDT(projectId: string): Promise<{ chapters: Chapter[]; items: ItemWithPrice[] }> {
  const sb = getSupabase();
  const [ch, it] = await Promise.all([
    sb.from('chapters').select('*').eq('project_id', projectId).order('order_index'),
    sb.from('items').select('*, chapters!inner(project_id), apus(cached_unit_price)').eq('chapters.project_id', projectId).order('order_index'),
  ]);
  const rows = (it.data ?? []) as unknown as ItemJoinRow[];
  return {
    chapters: (ch.data ?? []) as Chapter[],
    items: rows.map((r) => ({ ...(r as Item), unit_price: priceOf(r) })),
  };
}

// --------------------------------------------------------------------------
// Capítulos
// --------------------------------------------------------------------------

export async function createChapter(projectId: string, code: string, name: string, orderIndex: number): Promise<Chapter> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('chapters')
    .insert({ project_id: projectId, code, name, order_index: orderIndex })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear capítulo');
  return data as Chapter;
}

export async function updateChapter(id: string, patch: { code?: string; name?: string }): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('chapters').update(patch as Partial<Chapter>).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteChapter(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('chapters').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// --------------------------------------------------------------------------
// Ítems
// --------------------------------------------------------------------------

export interface ItemInput {
  code: string | null;
  codigo_sicoes: string | null;
  description: string;
  unit: string;
  quantity: number;
}

export async function createItem(chapterId: string, input: ItemInput, orderIndex: number): Promise<ItemWithPrice> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('items')
    .insert({ chapter_id: chapterId, order_index: orderIndex, ...input })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'No se pudo crear ítem');
  return { ...(data as Item), unit_price: 0 };
}

export async function updateItem(id: string, input: ItemInput): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('items').update(input as Partial<Item>).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteItem(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
