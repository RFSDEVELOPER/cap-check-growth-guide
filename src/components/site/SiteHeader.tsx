import { Link } from "@tanstack/react-router";
import { ArrowRight, Menu, ShoppingBag, Sprout, UserRound } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#planos", label: "Planos" },
  { href: "/loja", label: "Loja" },
  { href: "/#perguntas", label: "Perguntas" },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-foreground">
      <Sprout className="size-5 text-primary" strokeWidth={1.75} />
      <span className="font-display text-xl tracking-tight">Cia Cap</span>
    </Link>
  );
}

function CartLink() {
  const { count } = useCart();
  return (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Carrinho, ${count} itens`}>
      <Link to="/carrinho">
        <ShoppingBag className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-copper px-1 font-mono text-[0.65rem] text-copper-foreground">
            {count}
          </span>
        )}
      </Link>
    </Button>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <CartLink />
          <Button asChild variant="pill-outline" size="lg" className="px-5">
            <Link to={user ? "/conta" : "/auth"}>
              <UserRound /> {user ? "Minha conta" : "Já sou paciente"}
            </Link>
          </Button>
          <Button asChild variant="pill" size="lg" className="px-5">
            <Link to="/avaliacao">
              Fazer avaliação <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <CartLink />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85%] bg-background">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 font-display text-2xl text-foreground hover:bg-secondary"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 px-3">
              <Button asChild variant="pill" size="xl">
                <Link to="/avaliacao" onClick={() => setOpen(false)}>
                  Fazer avaliação <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="pill-outline" size="xl">
                <Link to={user ? "/conta" : "/auth"} onClick={() => setOpen(false)}>
                  {user ? "Minha conta" : "Já sou paciente"}
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  );
}
