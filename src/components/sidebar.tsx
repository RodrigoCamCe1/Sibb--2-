'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Settings,
  HelpCircle,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/types/database';

const TOP_LINKS = [
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
];

const PROJECT_LINKS = [
  { sub: 'detalle', label: 'EDT y Ítems', icon: LayoutDashboard },
  { sub: 'cronograma', label: 'Cronograma', icon: ChevronRight },
  { sub: 'normas', label: 'Alertas norma', icon: ChevronRight },
  { sub: 'exportar', label: 'Exportar SICOES', icon: ChevronRight },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const [profile, setProfile] = useState<{ email: string; name: string | null; company_name: string | null } | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        sb.from('profiles').select('email, name, company_name').eq('id', data.user.id).maybeSingle().then(({ data }) => {
          if (data) setProfile(data);
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      return;
    }
    const sb = getSupabase();
    sb.from('projects').select('*').eq('id', projectId).maybeSingle().then(({ data }) => {
      if (data) setProject(data);
    });
  }, [projectId]);

  async function signOut() {
    const sb = getSupabase();
    await sb.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="hidden md:flex w-60 border-r border-slate-200 bg-white flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-slate-200">
        <Link href="/proyectos" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold text-sm">S</div>
          <div>
            <div className="font-semibold text-slate-900 leading-none text-sm">Sibbë</div>
            <div className="text-[10px] text-slate-500 leading-none mt-0.5">/ Obras</div>
          </div>
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {TOP_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + '/');
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100',
              )}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}

        {project && (
          <div className="pt-4">
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Proyecto activo
            </div>
            <div className="px-3 py-2 mb-2 border-l-2 border-slate-900">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{project.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                <Building2 className="w-2.5 h-2.5" />
                {project.city} • {project.modalidad}
              </div>
            </div>
            {PROJECT_LINKS.map((link) => {
              const href = `/proyectos/${link.sub}?id=${project.id}`;
              const active = pathname?.includes(`/proyectos/${link.sub}`);
              return (
                <Link
                  key={link.sub}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
                    active
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <span className="w-1 h-1 rounded-full bg-current opacity-60"></span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50">
          <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-semibold text-slate-700">
            {profile?.name?.[0] ?? profile?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-900 truncate">{profile?.name || profile?.email || 'Cargando...'}</div>
            {profile?.company_name && <div className="text-[10px] text-slate-500 truncate">{profile.company_name}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <button
            onClick={signOut}
            className="flex-1 flex items-center gap-1.5 justify-center px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
            title="Cerrar sesión"
          >
            <LogOut className="w-3 h-3" />
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
