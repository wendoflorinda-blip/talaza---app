-- DEV only: allow authenticated explorers and creators to submit proof
-- for any active plan classified by plan_type OR area as Opportunities.
-- Keep ownership, empty business/event/job/promotion references and exact price checks.
ALTER POLICY "Users can submit opportunity access payments"
ON public.payment_submissions
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND business_id IS NULL
  AND event_id IS NULL
  AND job_post_id IS NULL
  AND premium_promotion_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.plans p
    WHERE p.id = payment_submissions.plan_id
      AND p.is_active = true
      AND (
        lower(trim(coalesce(p.plan_type, ''))) = 'opportunities'
        OR lower(trim(coalesce(p.area, ''))) = 'oportunidades'
      )
      AND p.price = payment_submissions.amount
  )
);
