import { Link } from "@tanstack/react-router";

import { COMPANY, companyValue } from "@/lib/company";

import { Logo } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background pb-28 pt-14 md:pb-14">
      <div className="container-site grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Dermocosméticos, tônicos, shampoos estimulantes e suplementos sem prescrição médica.
            Siga as orientações do rótulo. Produtos não substituem cuidados de saúde e não garantem
            resultados.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow text-muted-foreground">Navegar</p>
          <ul className="mt-4 space-y-2">
            <li>
              <a href="/#como-funciona" className="hover:text-copper">
                Como funciona
              </a>
            </li>
            <li>
              <a href="/#planos" className="hover:text-copper">
                Planos
              </a>
            </li>
            <li>
              <Link to="/loja" className="hover:text-copper">
                Loja
              </Link>
            </li>
            <li>
              <Link to="/avaliacao" className="hover:text-copper">
                Questionário capilar
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow text-muted-foreground">Transparência</p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Alguns links da loja são de afiliados: podemos receber uma comissão quando você compra,
            sem custo extra para você.
          </p>
          <ul className="mt-4 space-y-2">
            <li>
              <Link to="/privacidade" className="hover:text-copper">
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link to="/termos" className="hover:text-copper">
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link to="/trocas" className="hover:text-copper">
                Trocas e devoluções
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container-site mt-12 grid gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {companyValue("legalName", COMPANY.tradeName)}
          {companyValue("cnpj") && ` · CNPJ ${COMPANY.cnpj}`}
          {companyValue("address") && ` · ${COMPANY.address}`}
        </p>
        <p>
          {[
            companyValue("email") && `Atendimento: ${COMPANY.email}`,
            companyValue("whatsapp") && `WhatsApp: ${COMPANY.whatsapp}`,
            companyValue("hours"),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p>Pagamentos processados com segurança pelo Mercado Pago.</p>
      </div>
    </footer>
  );
}
