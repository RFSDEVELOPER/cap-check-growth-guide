import { createFileRoute } from "@tanstack/react-router";

import { Contact, LegalPage, LegalSection } from "@/components/site/LegalPage";
import { COMPANY, companyValue } from "@/lib/company";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Cia Cap" },
      {
        name: "description",
        content: "Como a Cia Cap coleta, usa e protege seus dados pessoais, conforme a LGPD.",
      },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro="Explicamos aqui, de forma direta, quais dados pessoais a Cia Cap coleta, para que usamos, com quem compartilhamos e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD)."
    >
      <LegalSection title="1. Quem é o controlador dos dados">
        <p>
          O controlador é <strong>{companyValue("legalName", COMPANY.tradeName)}</strong>
          {companyValue("cnpj") && `, CNPJ ${COMPANY.cnpj}`}
          {companyValue("address") && `, ${COMPANY.address}`}. Para qualquer assunto sobre seus
          dados, fale com o encarregado pelo tratamento de dados:{" "}
          {companyValue("dpoName", "equipe de privacidade")}
          , pelo e-mail <Contact field="dpoEmail" />.
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados coletamos">
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, e-mail, telefone e senha (guardada de forma protegida
            pelo serviço de autenticação, nunca em texto aberto). No login com Google ou Apple
            recebemos nome e e-mail dessas contas.
          </li>
          <li>
            <strong>Entrega:</strong> CEP, rua, número, complemento, bairro, cidade e estado.
          </li>
          <li>
            <strong>Compras e assinaturas:</strong> itens, valores, cupom usado, status do
            pagamento, código de rastreio e histórico dos pedidos. Os dados do cartão, do Pix ou do
            boleto são informados diretamente no Mercado Pago;{" "}
            <strong>nós não recebemos nem guardamos</strong> o número do seu cartão.
          </li>
          <li>
            <strong>Questionário capilar (dado sensível):</strong> respostas sobre tempo e área da
            queda, histórico na família, hábitos e sinais de alerta. Por se tratar de informação
            sobre saúde, só salvamos essas respostas <strong>se você marcar o consentimento</strong>{" "}
            na hora. Sem o seu aceite, o resultado aparece na tela e não é guardado.
          </li>
          <li>
            <strong>Dados técnicos:</strong> registros de acesso e de erros do servidor, necessários
            para segurança e funcionamento do site.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Para que usamos e qual é a base legal">
        <ul>
          <li>
            Criar e manter sua conta, e processar pedidos e assinaturas (execução de contrato).
          </li>
          <li>
            Calcular frete, entregar e avisar sobre o andamento do pedido (execução de contrato).
          </li>
          <li>
            Emitir documentos fiscais e cumprir obrigações legais e contábeis (obrigação legal).
          </li>
          <li>Prevenir fraudes e proteger o site (legítimo interesse).</li>
          <li>
            Guardar e mostrar na sua conta o resultado do questionário capilar (
            <strong>consentimento</strong>, que você pode retirar a qualquer momento).
          </li>
        </ul>
        <p>
          Não vendemos seus dados e não os usamos para decisões automatizadas que produzam efeitos
          jurídicos sobre você. A indicação de rotina do questionário é apenas informativa e não
          substitui avaliação de um profissional de saúde.
        </p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <p>Compartilhamos o mínimo necessário com empresas que nos ajudam a operar:</p>
        <ul>
          <li>
            <strong>Mercado Pago:</strong> processamento de pagamentos e assinaturas (recebe nome,
            e-mail e valor do pedido).
          </li>
          <li>
            <strong>Melhor Envio e transportadoras (Correios, Jadlog):</strong> cotação e envio
            (recebem CEP e, para a entrega, nome e endereço).
          </li>
          <li>
            <strong>Supabase:</strong> banco de dados e autenticação, onde seus dados ficam
            armazenados.
          </li>
          <li>
            <strong>ViaCEP:</strong> ao digitar o CEP, seu navegador consulta o endereço
            correspondente.
          </li>
          <li>
            <strong>Google e Apple:</strong> apenas se você escolher entrar com essas contas.
          </li>
          <li>
            <strong>Provedor de hospedagem:</strong> para manter o site no ar.
          </li>
          <li>
            <strong>Autoridades:</strong> quando houver obrigação legal ou ordem judicial.
          </li>
        </ul>
        <p>
          Alguns desses fornecedores podem tratar dados fora do Brasil. Nesses casos, buscamos
          fornecedores que adotem salvaguardas compatíveis com a LGPD.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies e armazenamento no navegador">
        <p>
          Usamos apenas o que é necessário: o armazenamento local do navegador guarda seu carrinho e
          mantém sua sessão de login. Não usamos cookies de publicidade nem de rastreamento. Se isso
          mudar (por exemplo, ao incluir uma ferramenta de métricas), atualizaremos esta política e
          pediremos seu consentimento quando necessário.
        </p>
      </LegalSection>

      <LegalSection title="6. Por quanto tempo guardamos">
        <ul>
          <li>Dados de cadastro: enquanto sua conta existir.</li>
          <li>
            Pedidos e dados fiscais: pelo prazo exigido pela legislação tributária e de defesa do
            consumidor (em regra, 5 anos).
          </li>
          <li>Respostas do questionário: até você excluí-las ou pedir a exclusão da conta.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Seus direitos">
        <p>Você pode, a qualquer momento, pedir:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos ou desatualizados;</li>
          <li>exclusão de dados tratados com base no seu consentimento;</li>
          <li>portabilidade e informação sobre com quem compartilhamos;</li>
          <li>retirada do consentimento e revisão de decisões automatizadas.</li>
        </ul>
        <p>
          Em <strong>Minha conta</strong> você corrige seus dados e exclui as avaliações salvas.
          Para os demais pedidos, incluindo a exclusão da conta, escreva para{" "}
          <Contact field="dpoEmail" />. Respondemos em até 15 dias. Alguns dados, como os de pedidos
          pagos, podem precisar ser mantidos por obrigação legal. Você também pode reclamar à
          Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection title="8. Segurança">
        <p>
          Usamos conexão criptografada (HTTPS), controle de acesso por usuário no banco de dados,
          credenciais de pagamento guardadas de forma criptografada e acesso administrativo
          restrito. Nenhum sistema é totalmente imune a falhas; se houver um incidente que possa
          afetar você, avisaremos você e a ANPD conforme a lei.
        </p>
      </LegalSection>

      <LegalSection title="9. Crianças e adolescentes">
        <p>
          O site é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de menores.
          Se você acredita que isso aconteceu, entre em contato para que possamos excluir as
          informações.
        </p>
      </LegalSection>

      <LegalSection title="10. Mudanças nesta política">
        <p>
          Podemos atualizar este texto. A data da última revisão fica no topo da página, e mudanças
          relevantes serão avisadas no site ou por e-mail.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
