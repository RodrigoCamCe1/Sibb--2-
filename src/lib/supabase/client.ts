'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabase() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local',
    );
  }
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}
