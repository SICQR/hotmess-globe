-- ============================================================================
-- Anti-stalking invariant test — JWT-scoped, designed to FAIL if the invariant
-- is violated. Fills the "missing test" gap (brief §3.5). Run in CI against a
-- seeded shadow DB with two test users A and B who have presence rows.
-- This is the test the original service-role test could not be: it runs AS the
-- authenticated role, so RLS is actually exercised.
-- ============================================================================

-- ---- TEST 1: table path — user B must NOT read user A's precise coords ------
BEGIN;
  SET LOCAL role authenticated;
  SET LOCAL "request.jwt.claims" =
    '{"sub":"00000000-0000-0000-0000-0000000000B0","role":"authenticated"}';
  DO $$
  DECLARE leaked int;
  BEGIN
    SELECT count(lat) INTO leaked FROM public.user_presence_locations
    WHERE auth_user_id = '00000000-0000-0000-0000-0000000000A0';
    IF leaked <> 0 THEN
      RAISE EXCEPTION 'ANTI-STALKING FAIL: user B read % precise coords of user A', leaked;
    END IF;
  END $$;
ROLLBACK;

-- ---- TEST 2: function path — distance must be unbruteforceable -------------
-- Call nearby_candidates_secure from two viewpoints 1m apart targeting A.
-- After the DB-01 fix (100m banding + 50m floor) the returned distance_meters
-- must be IDENTICAL for sub-band viewer moves; assert it does not change by <100m.
BEGIN;
  SET LOCAL role authenticated;
  SET LOCAL "request.jwt.claims" =
    '{"sub":"00000000-0000-0000-0000-0000000000B0","role":"authenticated"}';
  DO $$
  DECLARE d1 int; d2 int;
  BEGIN
    SELECT distance_meters INTO d1 FROM public.nearby_candidates_secure(
      51.5074, -0.1278, 5000, 50, '00000000-0000-0000-0000-0000000000B0')
      WHERE user_id='00000000-0000-0000-0000-0000000000A0';
    SELECT distance_meters INTO d2 FROM public.nearby_candidates_secure(
      51.50741, -0.1278, 5000, 50, '00000000-0000-0000-0000-0000000000B0')
      WHERE user_id='00000000-0000-0000-0000-0000000000A0';
    IF d1 IS DISTINCT FROM d2 THEN
      RAISE EXCEPTION 'TRILATERATION FAIL: 1m viewer move changed distance %->% (must be banded)', d1, d2;
    END IF;
  END $$;
ROLLBACK;
