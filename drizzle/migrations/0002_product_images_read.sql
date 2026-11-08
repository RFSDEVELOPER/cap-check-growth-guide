CREATE POLICY "Anyone reads product images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
COMMENT ON COLUMN public.products.image_url IS 'Path inside the product-images storage bucket';
COMMENT ON COLUMN public.affiliate_products.image_url IS 'Path inside the product-images storage bucket';