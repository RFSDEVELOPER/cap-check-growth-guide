DROP POLICY IF EXISTS "Settings readable" ON public.store_settings;
CREATE POLICY "Admins read settings" ON public.store_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone reads product images" ON storage.objects;
CREATE POLICY "Admins read product images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));