-- Etapa 4 — direito de exclusão das avaliações (LGPD).
-- Permite que cada cliente apague as PRÓPRIAS respostas do questionário em "Minha conta".
-- Seguro para rodar mais de uma vez.

GRANT DELETE ON public.quiz_results TO authenticated;

DROP POLICY IF EXISTS "Own quiz delete" ON public.quiz_results;
CREATE POLICY "Own quiz delete" ON public.quiz_results
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
