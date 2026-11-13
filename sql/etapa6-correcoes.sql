-- Etapa 6 — correções do relatório: validar constraints e tirar alegações médicas dos planos.
-- Rodar pelo editor SQL do Supabase (ou pelo Lovable). Pode ser executado mais de uma vez.

-- 1) Validar as constraints criadas como NOT VALID na etapa 3 (só passa se os dados antigos estiverem ok).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_percent_max') THEN
    ALTER TABLE public.coupons VALIDATE CONSTRAINT coupons_percent_max;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_results_plan_valid') THEN
    ALTER TABLE public.quiz_results VALIDATE CONSTRAINT quiz_results_plan_valid;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_needs_payment') THEN
    ALTER TABLE public.orders VALIDATE CONSTRAINT orders_fulfillment_needs_payment;
  END IF;
END $$;

-- 2) Textos dos planos sem alegação de tratamento, telemedicina ou prescrição.
--    Os textos abaixo são neutros de propósito: termos como "estimulante", "antiqueda",
--    "fórmula manipulada" e "suplementação" dependem de revisão regulatória (Anvisa) antes de voltar.
UPDATE public.plans SET
  tagline  = 'Para começar sua rotina de cuidados capilares.',
  features = ARRAY['Tônico capilar de uso tópico', 'Reposição mensal programada', 'Orientação de uso pelo rótulo']
WHERE id = 'essencial';

UPDATE public.plans SET
  tagline  = 'O plano que a maioria escolhe.',
  features = ARRAY['Tudo do Essencial', 'Shampoo e tônico capilares', 'Revisão trimestral da sua rotina no questionário']
WHERE id = 'completo';

UPDATE public.plans SET
  tagline  = 'Para uma rotina capilar mais completa.',
  features = ARRAY['Tudo do Completo', 'Kit de finalização capilar', 'Prioridade no atendimento']
WHERE id = 'avancado';

-- Conferência (deve retornar zero linhas):
-- SELECT id, features FROM public.plans
-- WHERE array_to_string(features, ' ') ~* 'telemedicina|consulta|tratamento|receita|prescri';
