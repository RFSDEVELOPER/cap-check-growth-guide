import { createFileRoute, Link } from "@tanstack/react-router";

import { Contact, LegalPage, LegalSection } from "@/components/site/LegalPage";
import { COMPANY, companyValue } from "@/lib/company";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Cia Cap" },
      {
        name: "description",
        content: "Regras de uso do site, compras, pagamentos, entrega e assinaturas da Cia Cap.",
      },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro="Ao navegar, criar uma conta, comprar ou assinar na Cia Cap, você concorda com as regras abaixo. Leia com calma e, se tiver dúvidas, fale com a gente antes de comprar."
    >
      <LegalSection title="1. Quem somos">
        <p>
          O site é operado por <strong>{companyValue("legalName", COMPANY.tradeName)}</strong>
          {companyValue("cnpj") && `, CNPJ ${COMPANY.cnpj}`}
          {companyValue("address") && `, ${COMPANY.address}`}. Atendimento:{" "}
          <Contact field="email" />
          {companyValue("whatsapp") && (
            <>
              {" "}
              ou WhatsApp <Contact field="whatsapp" />
            </>
          )}
          {companyValue("hours") && ` (${COMPANY.hours})`}.
        </p>
      </LegalSection>

      <LegalSection title="2. Natureza dos produtos e das informações">
        <p>
          Vendemos produtos de cuidado capilar (shampoos, tônicos, suplementos e itens relacionados)
          sem exigência de receita. As informações do site, incluindo o questionário capilar, são
          <strong> informativas</strong>: não são diagnóstico, não substituem consulta com médico ou
          dermatologista e não garantem resultados, que variam de pessoa para pessoa. Siga sempre as
          instruções e advertências do rótulo e procure um profissional diante de queda súbita,
          falhas no couro cabeludo, dor, coceira intensa ou qualquer reação inesperada.
        </p>
      </LegalSection>

      <LegalSection title="3. Conta de usuário">
        <ul>
          <li>Você precisa ter 18 anos ou mais e informar dados verdadeiros e atualizados.</li>
          <li>
            Você é responsável por manter sua senha em segredo e pelas ações feitas na sua conta.
          </li>
          <li>Podemos suspender contas usadas para fraude ou em desacordo com estes termos.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Produtos, preços e estoque">
        <p>
          Os preços estão em reais e podem mudar sem aviso, mas o valor confirmado no pagamento é o
          que vale para o seu pedido. Promoções e cupons têm prazo e condições próprias. Se um item
          esgotar ou houver erro evidente de preço, avisaremos você e ofereceremos troca por outro
          produto, espera ou o reembolso integral.
        </p>
      </LegalSection>

      <LegalSection title="5. Pagamento">
        <p>
          Os pagamentos são processados pelo Mercado Pago (cartão, Pix e boleto, conforme
          disponibilidade). O pedido só é confirmado e enviado após a aprovação do pagamento. Pix e
          boleto têm prazo para pagar; vencido o prazo, o pedido pode ser cancelado, e você pode
          pagar novamente em <strong>Minha conta</strong> dentro de 24 horas ou refazer o pedido.
        </p>
      </LegalSection>

      <LegalSection title="6. Frete e entrega">
        <p>
          O frete é calculado pelo CEP e o prazo mostrado começa a contar a partir da confirmação do
          pagamento e da postagem. O endereço informado na sua conta é o usado na entrega: confira-o
          antes de pagar. Atrasos causados por transportadoras ou endereço incorreto não dependem só
          de nós, mas acompanharemos o caso com você. Ao receber, confira a embalagem e avise-nos
          imediatamente se houver avaria.
        </p>
      </LegalSection>

      <LegalSection title="7. Assinaturas mensais">
        <ul>
          <li>
            A assinatura é cobrada todo mês no meio de pagamento escolhido no Mercado Pago, pelo
            valor exibido no momento da contratação, até ser cancelada.
          </li>
          <li>
            Você pode cancelar quando quiser em <strong>Minha conta → Minha assinatura</strong>. O
            cancelamento interrompe as cobranças futuras; o período já pago não é devolvido
            automaticamente, salvo nos casos previstos em lei ou na nossa{" "}
            <Link to="/trocas">política de trocas e devoluções</Link>.
          </li>
          <li>
            Mudanças de preço do plano só valem para cobranças futuras, e avisaremos com
            antecedência.
          </li>
          <li>
            O que cada plano inclui e como é entregue está descrito na página do plano antes da
            contratação.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Links de afiliados e lojas parceiras">
        <p>
          Alguns produtos da seção <strong>Loja</strong> levam a lojas parceiras (como Mercado Livre
          e TikTok Shop). Podemos receber comissão pelas compras, sem custo extra para você. Nesses
          casos a venda, o pagamento, a entrega e as trocas seguem as regras da loja parceira, que é
          a responsável pela transação.
        </p>
      </LegalSection>

      <LegalSection title="9. Uso adequado do site">
        <p>
          Não é permitido tentar acessar áreas restritas, sobrecarregar o site, copiar conteúdo em
          massa ou usá-lo para fins ilegais. Textos, imagens e a marca Cia Cap são protegidos por
          direitos autorais e não podem ser usados sem autorização.
        </p>
      </LegalSection>

      <LegalSection title="10. Privacidade">
        <p>
          O tratamento dos seus dados segue a <Link to="/privacidade">Política de Privacidade</Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Seus direitos como consumidor">
        <p>
          Nada nestes termos limita os direitos garantidos pelo Código de Defesa do Consumidor (Lei
          nº 8.078/1990), incluindo o direito de arrependimento descrito em{" "}
          <Link to="/trocas">Trocas e devoluções</Link>.
        </p>
      </LegalSection>

      <LegalSection title="12. Alterações e foro">
        <p>
          Podemos atualizar estes termos; a data de revisão fica no topo da página e o uso do site
          após a mudança significa concordância com a nova versão. Fica eleito o foro do domicílio
          do consumidor para resolver conflitos.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
