import { Link } from "@tanstack/react-router";

import { Logo } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background pb-28 pt-14 md:pb-14">
      <div className="container-site grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Saúde capilar com acompanhamento médico. O tratamento prescrito depende de avaliação
            individual. Resultados variam de pessoa para pessoa.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow text-muted-foreground">Navegar</p>
          <ul className="mt-4 space-y-2">
            <li><a href="/#como-funciona" className="hover:text-copper">Como funciona</a></li>
            <li><a href="/#planos" className="hover:text-copper">Planos</a></li>
            <li><Link to="/loja" className="hover:text-copper">Loja</Link></li>
            <li><Link to="/avaliacao" className="hover:text-copper">Avaliação</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow text-muted-foreground">Transparência</p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Alguns links da loja são de afiliados: podemos receber uma comissão quando você compra,
            sem custo extra para você.
          </p>
        </div>
      </div>
      <div className="container-site mt-12 flex flex-col justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
        <span>© {new Date().getFullYear()} Cia Cap</span>
        <span>Pagamentos processados com segurança.</span>
      </div>
    </footer>
  );
}
