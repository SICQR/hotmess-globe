-- Fix get_revenue_dashboard() RPC
CREATE OR REPLACE FUNCTION get_revenue_dashboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN jsonb_build_object(
    'paying_members', (SELECT COUNT(*) FROM memberships WHERE status='active'),
    'mrr_pence', (SELECT COALESCE(SUM(map.monthly_pence),0)
      FROM memberships m
      JOIN membership_annual_pricing map ON m.tier=map.tier_name
      WHERE m.status='active'),
    'tier_breakdown', (SELECT jsonb_object_agg(tier, cnt)
      FROM (SELECT tier, COUNT(*) cnt FROM memberships WHERE status='active' GROUP BY tier) t),
    'active_listings', (SELECT COUNT(*) FROM market_listings WHERE status='active'),
    'generated_at', NOW()
  );
END; $$;

-- Clear test market listings
DELETE FROM public.market_listings
WHERE seller_id IS NULL
   OR title ILIKE '%test%' OR title ILIKE '%seed%'
   OR description ILIKE '%lorem%' OR title ILIKE '%Leather Harness%';
