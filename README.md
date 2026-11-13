# Cia Cap

Loja e assinatura de produtos capilares: questionário, loja própria com carrinho e frete, links de
afiliados, planos mensais e painel administrativo.

**Stack:** TanStack Start (React 19, SSR) · Tailwind CSS 4 · Supabase (banco, login e arquivos) ·
Mercado Pago (pagamentos e assinaturas) · Melhor Envio (frete) · Vitest.

## Como rodar

Requisitos: [Bun](https://bun.sh) (o repositório usa `bun.lock`) ou Node.js 20+.

```sh
bun install
cp .env.example .env     # preencha os valores (veja a tabela abaixo)
bun run dev
```

| Comando             | O que faz                   |
| ------------------- | --------------------------- |
| `bun run dev`       | Servidor de desenvolvimento |
| `bun run test`      | Testes (Vitest)             |
| `bunx tsc --noEmit` | Checagem de tipos           |
| `bun run lint`      | ESLint + Prettier           |
| `bun run format`    | Formata o código            |
| `bun run build`     | Build de produção           |

O CI (`.github/workflows/ci.yml`) roda tipos, lint, testes e build a cada push e pull request.

## Variáveis de ambiente

Modelo em `.env.example`. Nunca envie o `.env` real ao Git.

| Variável                                                                         | Obrigatória | Para que serve                                                                                         |
| -------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Sim         | Conexão do navegador com o Supabase (valores públicos)                                                 |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`                                       | Sim         | Mesma conexão, no servidor                                                                             |
| `SUPABASE_SERVICE_ROLE_KEY`                                                      | Sim         | Acesso administrativo do servidor. **Segredo**, nunca vai ao navegador                                 |
| `SETTINGS_ENCRYPTION_KEY`                                                        | Sim         | Chave que criptografa os tokens salvos em Configurações. Se perder, é preciso salvar os tokens de novo |
| `SITE_URL`                                                                       | Recomendada | Endereço público (ex.: `https://ciacap.com.br`). Fixa as URLs de retorno e do webhook                  |
| `SHIPPING_CONTACT_EMAIL`                                                         | Opcional    | E-mail enviado ao Melhor Envio                                                                         |
| `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`                         | Opcional    | Alternativa aos tokens salvos no painel                                                                |

## Banco de dados

As migrações estão em `drizzle/migrations` e são geradas pelo Lovable (não edite à mão). Ajustes
manuais ficam em `sql/`: aplique **na ordem** pelo Lovable ou pelo editor SQL do Supabase.

1. `sql/etapa3-banco.sql`: data do pagamento, aviso de estoque insuficiente, estorno devolvendo
   estoque, tabela de cobranças de assinatura e regras de validação.
2. `sql/etapa4-banco.sql`: permite o cliente excluir as próprias avaliações (LGPD).
3. `sql/etapa6-correcoes.sql`: valida as constraints pendentes e remove alegações médicas dos planos.

Os scripts podem ser rodados mais de uma vez sem efeito colateral.

## Primeiro uso em produção

1. Crie sua conta pelo site e torne-a administradora, no editor SQL do Supabase:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   SELECT id, 'admin' FROM auth.users WHERE email = 'seu@email.com';
   ```
2. Em **Admin → Configurações → Pagamentos**: cole o token do Mercado Pago, o segredo do webhook e
   troque o modo para **produção**.
3. No painel do Mercado Pago, cadastre o webhook `https://SEU-SITE/api/public/mercadopago/webhook`
   com os eventos de **Pagamentos** e **Planos e assinaturas**. Copie o segredo gerado para o passo 2.
   Em produção o webhook recusa notificações sem assinatura.
4. Em **Configurações → Frete**: token do Melhor Envio e CEP de origem. Informe peso e medidas reais
   de cada produto. Sem isso o site usa o frete fixo.
5. Preencha os dados da empresa em `src/lib/company.ts` (CNPJ, endereço, atendimento, encarregado de
   dados) e peça revisão jurídica de `/privacidade`, `/termos` e `/trocas`.
6. A **Visão geral** do painel avisa o que ainda falta configurar.

## Como o pagamento funciona

- O navegador nunca define valores: `buildOrder` (`src/lib/checkout.ts`) recalcula preço, promoção,
  estoque, cupom e frete no servidor.
- O Mercado Pago avisa pelo webhook; o servidor **relê** o pagamento na API deles e confere moeda e
  valor antes de marcar o pedido como pago. Um pedido pago só pode mudar para reembolsado.
- Se o webhook falhar, o botão **Conferir pagamentos** (admin) e a volta do cliente à conta
  sincronizam os pendentes.

## Estrutura

```
src/lib/            regras de negócio (catalog, checkout), pagamentos, frete, credenciais
src/routes/         páginas; admin em _authenticated/admin; webhook em api/public
src/components/     site/ (vitrine), admin/ (painel), ui/ (shadcn)
src/integrations/   Supabase e Lovable (gerados, não edite)
sql/                ajustes de banco aplicados manualmente
drizzle/migrations  migrações do banco (geradas)
```

Mais detalhes de arquitetura e convenções em `AGENTS.md`.
