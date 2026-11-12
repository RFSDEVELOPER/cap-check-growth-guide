import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Link2,
  LogOut,
  Package,
  Repeat,
  Settings,
  Tag,
  Truck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user || !(await checkIsAdmin(data.user.id))) {
      throw redirect({ to: "/conta" });
    }
  },
  head: () => ({
    meta: [
      { title: "Administração — Cia Cap" },
      {
        name: "description",
        content: "Painel de gestão da Cia Cap: pedidos, entregas, produtos, planos e promoções.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administração — Cia Cap" },
      { property: "og:description", content: "Painel de gestão da Cia Cap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", label: "Pedidos e entregas", icon: Truck },
  { to: "/admin/produtos", label: "Produtos e estoque", icon: Package },
  { to: "/admin/promocoes", label: "Promoções e cupons", icon: Tag },
  { to: "/admin/planos", label: "Planos", icon: Repeat },
  { to: "/admin/assinaturas", label: "Assinaturas", icon: CreditCard },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/afiliados", label: "Links de afiliado", icon: Link2 },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

function AdminLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="print:hidden sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="eyebrow rounded-full bg-forest px-2.5 py-1 text-forest-foreground">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ExternalLink /> <span className="hidden sm:inline">Ver site</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut /> <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto border-t border-border/60 px-3 py-2 lg:hidden"
          aria-label="Administração"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item }}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              <item.icon className="size-4" /> {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex">
        <aside className="print:hidden sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 border-r border-border/70 p-4 lg:block">
          <nav className="grid gap-1" aria-label="Administração">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: "exact" in item }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
              >
                <item.icon className="size-4" /> {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-20 pt-8 md:px-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
