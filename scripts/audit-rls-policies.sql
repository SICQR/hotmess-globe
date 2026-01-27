-- RLS Policy Audit Script
-- Run this against your Supabase database to audit all RLS policies

-- ============================================================
-- 1. Check which tables have RLS enabled
-- ============================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;

-- ============================================================
-- 2. List all RLS policies by table
-- ============================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  qual as using_clause,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================
-- 3. Find tables WITHOUT RLS enabled (SECURITY RISK!)
-- ============================================================
SELECT 
  '⚠️  WARNING: Table without RLS' as alert,
  tablename,
  'This table has no row-level security!' as risk
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false
ORDER BY tablename;

-- ============================================================
-- 4. Find tables with RLS but NO policies (will block all access)
-- ============================================================
SELECT 
  '⚠️  WARNING: RLS enabled but no policies' as alert,
  t.tablename,
  'Users cannot access this table!' as issue
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
  AND t.rowsecurity = true
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- ============================================================
-- 5. Find overly permissive policies (using = true)
-- ============================================================
SELECT 
  '⚠️  REVIEW: Potentially permissive policy' as alert,
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  CASE 
    WHEN qual = 'true' THEN 'Allows ALL rows'
    ELSE qual
  END as access_level
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;

-- ============================================================
-- 6. Check critical tables have proper RLS
-- ============================================================
WITH critical_tables AS (
  SELECT unnest(ARRAY[
    'User', 'users', 'orders', 'messages', 'cart_items',
    'notifications', 'user_privacy_settings', 'user_private_profile',
    'subscriptions', 'billing_receipts', 'payment_methods'
  ]) as tablename
)
SELECT 
  ct.tablename,
  COALESCE(pt.rowsecurity, false) as rls_enabled,
  COUNT(pp.policyname) as policy_count,
  CASE 
    WHEN COALESCE(pt.rowsecurity, false) = false THEN '❌ CRITICAL: No RLS'
    WHEN COUNT(pp.policyname) = 0 THEN '❌ CRITICAL: No policies'
    WHEN COUNT(pp.policyname) < 2 THEN '⚠️  WARNING: Limited policies'
    ELSE '✅ Has policies'
  END as status
FROM critical_tables ct
LEFT JOIN pg_tables pt ON ct.tablename = pt.tablename AND pt.schemaname = 'public'
LEFT JOIN pg_policies pp ON ct.tablename = pp.tablename AND pp.schemaname = 'public'
GROUP BY ct.tablename, pt.rowsecurity
ORDER BY status DESC, ct.tablename;

-- ============================================================
-- 7. Analyze User table policies (should allow discovery)
-- ============================================================
SELECT 
  'User Table Policies' as section,
  policyname,
  cmd as operation,
  roles,
  qual as using_clause,
  CASE 
    WHEN cmd = 'SELECT' AND qual = 'true' THEN '✅ Allows discovery (intentional)'
    WHEN cmd = 'SELECT' AND qual != 'true' THEN '⚠️  Restricts discovery'
    WHEN cmd = 'INSERT' THEN '✅ Create profile'
    WHEN cmd = 'UPDATE' THEN CASE 
      WHEN qual LIKE '%auth.uid()%' THEN '✅ Self-update only'
      ELSE '⚠️  Review update policy'
    END
    WHEN cmd = 'DELETE' THEN '⚠️  Review delete policy'
    ELSE 'Review needed'
  END as assessment
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('User', 'users')
ORDER BY cmd, policyname;

-- ============================================================
-- 8. Analyze orders/payments policies (should be party-only)
-- ============================================================
SELECT 
  'Orders/Payments Policies' as section,
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  CASE 
    WHEN qual LIKE '%buyer_email%' OR qual LIKE '%seller_email%' THEN '✅ Party-only access'
    WHEN qual LIKE '%auth%email%' THEN '✅ Owner-only access'
    WHEN qual = 'true' THEN '❌ CRITICAL: Too permissive!'
    ELSE '⚠️  Review access logic'
  END as assessment
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'order_items', 'cart_items', 'subscriptions', 'billing_receipts')
ORDER BY tablename, cmd, policyname;

-- ============================================================
-- 9. Analyze messaging policies (should be participant-only)
-- ============================================================
SELECT 
  'Messaging Policies' as section,
  tablename,
  policyname,
  cmd as operation,
  qual as using_clause,
  CASE 
    WHEN qual LIKE '%participant%' OR qual LIKE '%sender%' OR qual LIKE '%receiver%' THEN '✅ Participant access'
    WHEN qual LIKE '%auth%' THEN '✅ Auth-based access'
    WHEN qual = 'true' THEN '❌ CRITICAL: Too permissive!'
    ELSE '⚠️  Review access logic'
  END as assessment
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('messages', 'chat_threads', 'notifications')
ORDER BY tablename, cmd, policyname;

-- ============================================================
-- 10. Summary Report
-- ============================================================
WITH rls_stats AS (
  SELECT 
    COUNT(*) as total_tables,
    SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) as tables_with_rls,
    SUM(CASE WHEN NOT rowsecurity THEN 1 ELSE 0 END) as tables_without_rls
  FROM pg_tables 
  WHERE schemaname = 'public'
),
policy_stats AS (
  SELECT 
    COUNT(DISTINCT tablename) as tables_with_policies,
    COUNT(*) as total_policies
  FROM pg_policies 
  WHERE schemaname = 'public'
)
SELECT 
  '📊 RLS Summary' as report,
  rs.total_tables as total_public_tables,
  rs.tables_with_rls as tables_with_rls_enabled,
  rs.tables_without_rls as tables_without_rls,
  ps.tables_with_policies,
  ps.total_policies as total_rls_policies,
  ROUND(100.0 * rs.tables_with_rls / NULLIF(rs.total_tables, 0), 1) || '%' as rls_coverage,
  CASE 
    WHEN rs.tables_without_rls = 0 AND ps.tables_with_policies = rs.tables_with_rls THEN '✅ Excellent'
    WHEN rs.tables_without_rls > 0 THEN '❌ Needs attention'
    WHEN ps.tables_with_policies < rs.tables_with_rls THEN '⚠️  Some tables have no policies'
    ELSE '✅ Good'
  END as overall_status
FROM rls_stats rs, policy_stats ps;

-- ============================================================
-- INSTRUCTIONS:
-- ============================================================
-- 1. Run this script in your Supabase SQL Editor
-- 2. Review each section's output
-- 3. Pay special attention to:
--    - Tables without RLS (section 3)
--    - Critical tables status (section 6)
--    - Overly permissive policies (section 5)
-- 4. Address any ❌ CRITICAL issues immediately
-- 5. Review ⚠️  WARNING items for your use case
-- 6. Document intentional design decisions (e.g., User discovery)
-- ============================================================
