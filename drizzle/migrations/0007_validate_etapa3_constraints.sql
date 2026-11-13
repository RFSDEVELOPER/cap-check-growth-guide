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