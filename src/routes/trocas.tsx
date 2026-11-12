import { createFileRoute, Link } from "@tanstack/react-router";

import { Contact, LegalPage, LegalSection } from "@/components/site/LegalPage";

export const Route = createFileRoute("/trocas")({
  head: () => ({
    meta: [
      { title: "Trocas e Devoluções — Cia Cap" },
      {
        name: "description",
        content:
          "Direito de arrependimento em 7 dias, troca por defeito e como cancelar sua assinatura na Cia Cap.",
      },
    ],
  }),
  component: Trocas,
});

function Trocas() {
  return (
    <LegalPage
      title="Trocas e Devoluções"
      intro="Queremos que você compre com tranquilidade. Veja como funcionam o arrependimento, a troca por defeito e o cancelamento de assinaturas."
    >
      <LegalSection title="1. Direito de arrependimento (7 dias)">
        <p>
          Em compras feitas pelo site, você pode desistir em até <strong>7 dias corridos</strong>,
          contados do recebimento do produto, sem precisar justificar (Código de Defesa do
          Consumidor, art. 49). Devolvemos <strong>todo o valor pago</strong>, incluindo o frete da
          ida.
        </p>
        <ul>
          <li>
            Avise-nos dentro do prazo pelo canal de atendimento: <Contact field="email" />.
          </li>
          <li>
            Devolva o produto na embalagem original e sem sinais de uso indevido. Enviaremos as
            instruções de postagem e o custo do envio da devolução é por nossa conta.
          </li>
          <li>
            O reembolso é feito no mesmo meio de pagamento (estorno no cartão, devolução via Pix ou
            conforme o Mercado Pago), em até 10 dias úteis após recebermos o produto.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Produto com defeito, avaria ou item errado">
        <p>
          Se o produto chegar com defeito, avariado, vencido ou diferente do pedido, avise em até{" "}
          <strong>30 dias</strong> do recebimento, enviando fotos do produto e da embalagem. Você
          pode escolher entre troca, reembolso integral ou abatimento proporcional, e o frete da
          troca é por nossa conta.
        </p>
      </LegalSection>

      <LegalSection title="3. Reação ou desconforto ao usar">
        <p>
          Se sentir qualquer reação (vermelhidão, coceira intensa, ardência), pare de usar, procure
          orientação profissional e fale com a gente. Analisaremos o caso individualmente, e a
          desistência por arrependimento continua valendo dentro do prazo.
        </p>
      </LegalSection>

      <LegalSection title="4. Assinaturas">
        <ul>
          <li>
            Cancele quando quiser em <strong>Minha conta → Minha assinatura</strong>; as próximas
            cobranças são interrompidas.
          </li>
          <li>
            Na primeira contratação, vale também o arrependimento de 7 dias: peça o cancelamento e o
            reembolso da cobrança pelo canal de atendimento dentro desse prazo.
          </li>
          <li>Cobrança indevida? Fale com a gente e resolveremos com prioridade.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Compras em lojas parceiras">
        <p>
          Produtos comprados nos links de afiliados (Mercado Livre, TikTok Shop etc.) seguem a
          política de troca e devolução da loja onde a compra foi feita.
        </p>
      </LegalSection>

      <LegalSection title="6. Como pedir">
        <p>
          Escreva para <Contact field="email" /> informando o e-mail da sua conta, a data da compra,
          os itens (você vê seus pedidos em <Link to="/conta">Minha conta</Link>) e o motivo.
          Respondemos em até 2 dias úteis.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
